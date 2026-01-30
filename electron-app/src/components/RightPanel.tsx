import React, { useEffect, useMemo, useState } from 'react'
import { Button, Divider, InputNumber, Select, Slider, Tag, Typography } from 'antd'
import {
  PlayCircleOutlined,
  StopOutlined,
  ApartmentOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useStore } from '../store/useStore'
import { shallow } from 'zustand/shallow'

const { Title, Text } = Typography

interface Props {
    isElectron: boolean
}

const RightPanel: React.FC<Props> = ({ isElectron }) => {
    const { 
        selectedPhotos, photos, config, inputDir,
        computing, setComputing, setProgress,
        grouping, setGrouping, setGroupProgress,
        profile, rebuildCache, groupingParams,
        setWritingXmp,
        computeWorkers,
        setProfile,
        updateConfig,
    } = useStore(
        (s) => ({
            selectedPhotos: s.selectedPhotos,
            photos: s.photos,
            config: s.config,
            inputDir: s.inputDir,
            computing: s.computing,
            setComputing: s.setComputing,
            setProgress: s.setProgress,
            grouping: s.grouping,
            setGrouping: s.setGrouping,
            setGroupProgress: s.setGroupProgress,
            profile: s.profile,
            rebuildCache: s.rebuildCache,
            groupingParams: s.groupingParams,
            setWritingXmp: s.setWritingXmp,
            computeWorkers: s.computeWorkers,
            setProfile: s.setProfile,
            updateConfig: s.updateConfig,
        }),
        shallow,
    )

    const presets = useMemo(
        () => [
            { label: '通用 (默认)', value: 'daylight' },
            { label: '室内活动', value: 'event_indoor' },
            { label: '户外人像', value: 'outdoor_portrait' },
            { label: '夜景 / 暗光', value: 'night' },
        ],
        [],
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

    const canRun = isElectron && !!inputDir && !!window.electronAPI

    const handleStartCompute = () => {
        if (!canRun) return
        window.electronAPI.startCompute({ inputDir, profile, config, rebuildCache, workers: computeWorkers })
        setComputing(true)
    }

    const handleCancelCompute = () => {
        if (!isElectron || !window.electronAPI) return
        window.electronAPI.cancelCompute()
        setComputing(false)
        setProgress(null)
    }

    const handleStartGroup = () => {
        if (!canRun) return
        setGrouping(true)
        setGroupProgress(null)
        window.electronAPI.startGroup({ inputDir, params: groupingParams })
    }

    const handleCancelGroup = () => {
        if (!isElectron || !window.electronAPI) return
        window.electronAPI.cancelGroup()
        setGrouping(false)
        setGroupProgress(null)
    }

    const handleWriteXmp = (onlySelected: boolean) => {
        if (!canRun) return
        window.electronAPI.writeXmp({
            inputDir,
            selection: Array.from(selectedPhotos),
            config,
            onlySelected
        })
        setWritingXmp(true)
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
                            <div className="text-xs text-muted">
                                清晰 {selectedPhoto.sharpness.score.toFixed(1)} · 曝光 {selectedPhoto.exposure.score.toFixed(1)}
                            </div>
                        </div>
                        <Tag color={selectedPhoto.technical_score >= 80 ? 'green' : selectedPhoto.technical_score >= 50 ? 'orange' : 'red'}>
                            {selectedPhoto.technical_score.toFixed(1)}
                        </Tag>
                    </div>

                    {lrPreview && (
                        <div className="mt-2 text-xs text-muted">
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
                <Title level={5} className="!text-text">调整</Title>
                <div className="app-panel p-3 mt-2">
                    <div className="flex flex-col gap-2">
                        <div>
                            <Text type="secondary" className="text-xs">
                                场景预设
                            </Text>
                            <Select size="small" value={profile} onChange={setProfile} options={presets} className="w-full mt-1" />
                        </div>

                        <Divider className="bg-secondary my-1" />

                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <Text type="secondary" className="text-xs">
                                    清晰度权重
                                </Text>
                                <InputNumber
                                    size="small"
                                    min={0}
                                    max={5}
                                    step={0.1}
                                    value={config.weights.sharpness}
                                    onChange={(v) => updateConfig({ weights: { ...config.weights, sharpness: Number(v ?? 0) } })}
                                    className="w-16"
                                />
                            </div>
                            <Slider
                                min={0}
                                max={5}
                                step={0.1}
                                value={config.weights.sharpness}
                                onChange={(v) => updateConfig({ weights: { ...config.weights, sharpness: v } })}
                                className="!my-0"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <Text type="secondary" className="text-xs">
                                    曝光权重
                                </Text>
                                <InputNumber
                                    size="small"
                                    min={0}
                                    max={5}
                                    step={0.1}
                                    value={config.weights.exposure}
                                    onChange={(v) => updateConfig({ weights: { ...config.weights, exposure: Number(v ?? 0) } })}
                                    className="w-16"
                                />
                            </div>
                            <Slider
                                min={0}
                                max={5}
                                step={0.1}
                                value={config.weights.exposure}
                                onChange={(v) => updateConfig({ weights: { ...config.weights, exposure: v } })}
                                className="!my-0"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <Text type="secondary" className="text-xs">
                                    模糊阈值（清晰度）
                                </Text>
                                <InputNumber
                                    size="small"
                                    min={0}
                                    max={300}
                                    step={5}
                                    value={config.thresholds.sharpness}
                                    onChange={(v) => updateConfig({ thresholds: { ...config.thresholds, sharpness: Number(v ?? 0) } })}
                                    className="w-16"
                                />
                            </div>
                            <Slider
                                min={0}
                                max={300}
                                step={5}
                                value={config.thresholds.sharpness}
                                onChange={(v) => updateConfig({ thresholds: { ...config.thresholds, sharpness: v } })}
                                className="!my-0"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <Text type="secondary" className="text-xs">
                                    暗光阈值
                                </Text>
                                <InputNumber
                                    size="small"
                                    min={0}
                                    max={50}
                                    step={1}
                                    value={config.thresholds.low_light}
                                    onChange={(v) => updateConfig({ thresholds: { ...config.thresholds, low_light: Number(v ?? 0) } })}
                                    className="w-16"
                                />
                            </div>
                            <Slider
                                min={0}
                                max={50}
                                step={1}
                                value={config.thresholds.low_light}
                                onChange={(v) => updateConfig({ thresholds: { ...config.thresholds, low_light: v } })}
                                className="!my-0"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4" />
                <Title level={5} className="!text-text">操作</Title>
                <div className="flex flex-col gap-2">
                    <Button 
                        type={computing ? 'primary' : 'default'} 
                        danger={computing}
                        icon={computing ? <StopOutlined /> : <PlayCircleOutlined />} 
                        onClick={computing ? handleCancelCompute : handleStartCompute}
                        disabled={!canRun}
                        block
                    >
                        {computing ? '停止计算' : '开始计算'}
                    </Button>

                    <Button
                        type={grouping ? 'primary' : 'default'}
                        danger={grouping}
                        icon={grouping ? <StopOutlined /> : <ApartmentOutlined />}
                        onClick={grouping ? handleCancelGroup : handleStartGroup}
                        disabled={!canRun}
                        block
                    >
                        {grouping ? '停止分组' : '相似分组'}
                    </Button>

                    <div className="flex gap-2">
                        <Button 
                            className="flex-1"
                            onClick={() => handleWriteXmp(true)} 
                            disabled={selectedPhotos.size === 0 || !canRun}
                            icon={<FileTextOutlined />}
                        >
                            写入选中
                        </Button>
                        <Button 
                            className="flex-1"
                            onClick={() => handleWriteXmp(false)} 
                            disabled={!canRun}
                            icon={<FileTextOutlined />}
                        >
                            写入全部
                        </Button>
                    </div>

                    <Button type="dashed" block onClick={() => window.electronAPI?.openPreferencesWindow?.()}>
                        偏好设置 (参数/筛选)
                    </Button>
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
