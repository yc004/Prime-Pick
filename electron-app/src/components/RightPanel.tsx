import React, { useEffect, useMemo, useState } from 'react'
import { Button, Tag, Typography } from 'antd'
import { useStore } from '../store/useStore'
import { shallow } from 'zustand/shallow'

const { Title, Text } = Typography

interface Props {
    isElectron: boolean
}

const RightPanel: React.FC<Props> = ({ isElectron }) => {
    const { 
        selectedPhotos, photos, config, inputDir
    } = useStore(
        (s) => ({
            selectedPhotos: s.selectedPhotos,
            photos: s.photos,
            config: s.config,
            inputDir: s.inputDir,
        }),
        shallow,
    )

    const lastSelected = Array.from(selectedPhotos).pop()
    const selectedPhoto = lastSelected ? photos.find(p => p.filename === lastSelected) : null
    const previewSrc = useMemo(() => {
        if (!isElectron) return undefined
        if (!selectedPhoto?.filename) return undefined
        return `media://local/${encodeURIComponent(selectedPhoto.filename)}`
    }, [isElectron, selectedPhoto?.filename])
    const [imgOk, setImgOk] = useState(true)
    useEffect(() => {
        setImgOk(true)
    }, [previewSrc])

    const lrPreview = useMemo(() => {
        if (!selectedPhoto) return null
        if (selectedPhoto.is_unusable) return { rating: 1, label: 'Red' as const }
        if (selectedPhoto.technical_score >= 80) return { rating: 5, label: 'Green' as const }
        if (selectedPhoto.technical_score >= 60) return { rating: 4, label: null }
        if (selectedPhoto.technical_score >= 40) return { rating: 3, label: null }
        return { rating: 2, label: null }
    }, [selectedPhoto])

    const handleWriteXmp = (onlySelected: boolean) => {
        if (!inputDir || !window.electronAPI) return
        window.electronAPI.writeXmp({
            inputDir,
            selection: Array.from(selectedPhotos),
            config,
            onlySelected
        })
    }

    return (
        <div className="flex flex-col h-full">
            <div className="h-64 bg-black flex items-center justify-center overflow-hidden shrink-0 relative border-b border-secondary/80">
                {selectedPhoto ? (
                    previewSrc && imgOk ? (
                        <img 
                            src={previewSrc}
                            className="max-w-full max-h-full object-contain" 
                            onError={() => setImgOk(false)}
                        />
                    ) : (
                        <Text type="secondary">预览不可用</Text>
                    )
                ) : (
                    <Text type="secondary">请选择一张照片</Text>
                )}
                {selectedPhoto && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 px-2">
                        <Text className="text-xs text-white">
                            {selectedPhoto.filename.split(/[/\\]/).pop()}
                        </Text>
                    </div>
                )}
            </div>

            {selectedPhoto && (
                <div className="px-4 py-3 border-b border-secondary/80">
                    <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <Text className="!text-text font-semibold truncate">
                                {selectedPhoto.filename.split(/[/\\]/).pop()}
                            </Text>
                            <div className="text-xs text-slate-400">
                                清晰 {selectedPhoto.sharpness.score.toFixed(1)} · 曝光 {selectedPhoto.exposure.score.toFixed(1)}
                            </div>
                        </div>
                        <Tag color={selectedPhoto.technical_score >= 80 ? 'green' : selectedPhoto.technical_score >= 50 ? 'orange' : 'red'}>
                            {selectedPhoto.technical_score.toFixed(1)}
                        </Tag>
                    </div>

                    {lrPreview && (
                        <div className="mt-2 text-xs text-slate-400">
                            LR 写入预览：{lrPreview.rating} 星{lrPreview.label ? ` · ${lrPreview.label}` : ''}
                        </div>
                    )}

                    {selectedPhoto.reasons?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {selectedPhoto.reasons.slice(0, 6).map((r, i) => (
                                <Tag key={i} color="red" className="mr-0 text-[10px] leading-tight px-1 py-0.5">
                                    {r}
                                </Tag>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            <div className="p-4 flex-1 overflow-y-auto">
                <Title level={5} className="!text-text">操作</Title>
                <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => handleWriteXmp(true)} disabled={selectedPhotos.size === 0 || !isElectron}>
                            写入 XMP (选中)
                        </Button>
                        <Button onClick={() => handleWriteXmp(false)} disabled={!inputDir || !isElectron}>
                            写入 XMP (全部)
                        </Button>
                    </div>
                    <Button type="primary" onClick={() => window.electronAPI?.openPreferencesWindow?.()}>
                        打开偏好设置（参数/筛选）
                    </Button>
                    <div className="text-xs text-slate-400">
                        评分、筛选、排序、分组参数已迁移到“偏好设置”。
                    </div>
                </div>

                {!isElectron && (
                    <div className="mt-3 text-xs text-amber-300">
                        当前为浏览器预览模式：计算与 XMP 写入不可用
                    </div>
                )}
            </div>
        </div>
    )
}

export default RightPanel
