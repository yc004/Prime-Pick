import React, { useMemo } from 'react'
import { Alert, Button, Select, Divider, Switch, Typography } from 'antd'
import { FolderOpenOutlined } from '@ant-design/icons'
import { useStore } from '../store/useStore'

const { Title, Text } = Typography

interface Props {
    onSelectDir: () => void
    isElectron: boolean
}

const SidebarFilters: React.FC<Props> = ({ onSelectDir, isElectron }) => {
    const { 
        inputDir, profile, setProfile, 
        showUnusable, toggleShowUnusable,
        photos
    } = useStore()

    const stats = useMemo(() => {
        const total = photos.length
        let unusable = 0
        let blurry = 0
        let exposureLowScore = 0
        let underexposed = 0
        let overexposed = 0
        let highlightClipping = 0
        let shadowCrushing = 0
        let lowContrast = 0

        for (const p of photos as any[]) {
            if (p?.is_unusable) unusable += 1
            if (p?.sharpness?.is_blurry) blurry += 1
            if (typeof p?.exposure?.score === 'number' && p.exposure.score < 90) exposureLowScore += 1

            const flags = Array.isArray(p?.exposure?.flags)
                ? p.exposure.flags.map((v: any) => String(v))
                : []

            if (flags.includes('underexposed')) underexposed += 1
            if (flags.includes('overexposed')) overexposed += 1
            if (flags.includes('highlight_clipping')) highlightClipping += 1
            if (flags.includes('shadow_crushing')) shadowCrushing += 1
            if (flags.includes('low_contrast')) lowContrast += 1
        }

        return {
            total,
            unusable,
            blurry,
            exposureLowScore,
            underexposed,
            overexposed,
            highlightClipping,
            shadowCrushing,
            lowContrast,
        }
    }, [photos])

    const presets = [
        { label: '通用 (默认)', value: 'daylight' },
        { label: '室内活动', value: 'event_indoor' },
        { label: '户外人像', value: 'outdoor_portrait' },
        { label: '夜景 / 暗光', value: 'night' },
    ]

    return (
        <div className="p-4 flex flex-col gap-4 h-full">
            {!isElectron && (
                <Alert
                    type="warning"
                    title="当前为浏览器预览模式"
                    description="请在 Electron 窗口中使用：浏览器里无法打开文件夹/运行计算。"
                    showIcon
                />
            )}

            <div className="app-panel p-3 flex flex-col gap-2">
                <Title level={5} className="app-section-title m-0">媒体库</Title>
                <Button
                    icon={<FolderOpenOutlined />}
                    onClick={onSelectDir}
                    block
                    type="primary"
                    disabled={!isElectron}
                >
                    {inputDir ? inputDir.split(/[/\\]/).pop() : '打开文件夹'}
                </Button>
                {inputDir && (
                    <Text type="secondary" className="text-xs truncate" title={inputDir}>
                        {inputDir}
                    </Text>
                )}
            </div>

            <Divider className="bg-secondary my-2" />

            <div className="app-panel p-3 flex flex-col gap-2">
                <Title level={5} className="app-section-title m-0">场景预设</Title>
                <Select
                    value={profile}
                    onChange={setProfile}
                    options={presets}
                    className="w-full"
                />
            </div>

            <Divider className="bg-secondary my-2" />

            <div className="app-panel p-3 flex flex-col gap-2">
                <Title level={5} className="app-section-title m-0">过滤筛选</Title>
                <div className="flex justify-between items-center">
                    <Text className="!text-text">显示不可用照片</Text>
                    <Switch checked={showUnusable} onChange={toggleShowUnusable} />
                </div>
            </div>
            
            <div className="mt-auto">
                <div className="app-panel p-3 flex flex-col gap-2">
                    <Title level={5} className="app-section-title m-0">计算结果</Title>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        <Text type="secondary" className="text-xs">模糊</Text>
                        <Text className="!text-text text-xs text-right">{stats.blurry}</Text>

                        <Text type="secondary" className="text-xs">曝光偏差</Text>
                        <Text className="!text-text text-xs text-right">{stats.exposureLowScore}</Text>

                        <Text type="secondary" className="text-xs">过曝</Text>
                        <Text className="!text-text text-xs text-right">{stats.overexposed}</Text>

                        <Text type="secondary" className="text-xs">欠曝</Text>
                        <Text className="!text-text text-xs text-right">{stats.underexposed}</Text>

                        <Text type="secondary" className="text-xs">高光溢出</Text>
                        <Text className="!text-text text-xs text-right">{stats.highlightClipping}</Text>

                        <Text type="secondary" className="text-xs">暗部死黑</Text>
                        <Text className="!text-text text-xs text-right">{stats.shadowCrushing}</Text>

                        <Text type="secondary" className="text-xs">低对比</Text>
                        <Text className="!text-text text-xs text-right">{stats.lowContrast}</Text>

                        <Text type="secondary" className="text-xs">不可用</Text>
                        <Text className="!text-text text-xs text-right">{stats.unusable}</Text>
                    </div>
                </div>

                <div className="app-panel p-3 flex items-center justify-between">
                    <Text type="secondary" className="text-xs">已加载</Text>
                    <Text className="!text-text text-sm font-semibold">{photos.length}</Text>
                </div>
                <div className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                    快捷键：Ctrl 多选 · Shift 连选
                </div>
            </div>
        </div>
    )
}

export default SidebarFilters
