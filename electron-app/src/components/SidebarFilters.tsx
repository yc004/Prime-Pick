import React, { useMemo } from 'react'
import { Alert, Button, Select, Divider, Switch, Typography, Slider, Radio, InputNumber } from 'antd'
import { FolderOpenOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons'
import { useStore } from '../store/useStore'
import { shallow } from 'zustand/shallow'

const { Title, Text } = Typography

interface Props {
    onSelectDir: () => void
    isElectron: boolean
}

const SidebarFilters: React.FC<Props> = ({ onSelectDir, isElectron }) => {
    const { 
        inputDir, profile, setProfile, 
        showUnusable, toggleShowUnusable,
        photos,
        sortOption, setSortOption,
        filterOption, setFilterOption,
        config, updateConfig,
        viewMode, setViewMode,
        groupingParams, updateGroupingParams,
        grouping, setGrouping,
        groupProgress, setGroupProgress,
        showOnlyGroupBest, toggleShowOnlyGroupBest,
    } = useStore(
        (s) => ({
            inputDir: s.inputDir,
            profile: s.profile,
            setProfile: s.setProfile,
            showUnusable: s.showUnusable,
            toggleShowUnusable: s.toggleShowUnusable,
            photos: s.photos,
            sortOption: s.sortOption,
            setSortOption: s.setSortOption,
            filterOption: s.filterOption,
            setFilterOption: s.setFilterOption,
            config: s.config,
            updateConfig: s.updateConfig,
            viewMode: s.viewMode,
            setViewMode: s.setViewMode,
            groupingParams: s.groupingParams,
            updateGroupingParams: s.updateGroupingParams,
            grouping: s.grouping,
            setGrouping: s.setGrouping,
            groupProgress: s.groupProgress,
            setGroupProgress: s.setGroupProgress,
            showOnlyGroupBest: s.showOnlyGroupBest,
            toggleShowOnlyGroupBest: s.toggleShowOnlyGroupBest,
        }),
        shallow,
    )

    const sortOptions = [
        { label: '文件名', value: 'filename' },
        { label: '综合评分', value: 'technical_score' },
        { label: '清晰度', value: 'sharpness.score' },
        { label: '曝光度', value: 'exposure.score' },
    ]

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

        const sharpnessThreshold = config?.thresholds?.sharpness ?? 0

        for (const p of photos as any[]) {
            if (p?.is_unusable) unusable += 1
            if (typeof p?.sharpness?.score === 'number' && p.sharpness.score < sharpnessThreshold) blurry += 1
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
    }, [photos, config?.thresholds?.sharpness])

    const presets = [
        { label: '通用 (默认)', value: 'daylight' },
        { label: '室内活动', value: 'event_indoor' },
        { label: '户外人像', value: 'outdoor_portrait' },
        { label: '夜景 / 暗光', value: 'night' },
    ]

    const handleStartGroup = () => {
        if (!isElectron || !window.electronAPI) return
        if (!inputDir) return
        setGrouping(true)
        setGroupProgress(null)
        window.electronAPI.startGroup({
            inputDir,
            params: groupingParams,
        })
    }

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
                <Title level={5} className="app-section-title m-0">视图</Title>
                <Radio.Group
                    size="small"
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    buttonStyle="solid"
                >
                    <Radio.Button value="all">All Photos</Radio.Button>
                    <Radio.Button value="grouped">Grouped</Radio.Button>
                </Radio.Group>
            </div>

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
                    <Text className="!text-text text-xs">显示不可用</Text>
                    <Switch size="small" checked={showUnusable} onChange={toggleShowUnusable} />
                </div>
                
                <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                        <Text className="!text-text text-xs">最低评分</Text>
                        <Text className="text-xs text-secondary">{filterOption?.minScore ?? 0}</Text>
                    </div>
                    <Slider 
                        min={0} max={100} step={5} 
                        value={filterOption?.minScore ?? 0} 
                        onChange={(v) => setFilterOption({ minScore: v })}
                    />
                </div>

                <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                        <Text className="!text-text text-xs">模糊筛选</Text>
                        <Text className="text-xs text-secondary">
                            {filterOption?.blurryMode === 'only' ? '仅模糊' : filterOption?.blurryMode === 'exclude' ? '排除模糊' : '全部'}
                        </Text>
                    </div>
                    <Radio.Group
                        size="small"
                        value={filterOption?.blurryMode ?? 'all'}
                        onChange={(e) => setFilterOption({ blurryMode: e.target.value })}
                        buttonStyle="solid"
                    >
                        <Radio.Button value="all">全部</Radio.Button>
                        <Radio.Button value="exclude">排除模糊</Radio.Button>
                        <Radio.Button value="only">仅模糊</Radio.Button>
                    </Radio.Group>
                </div>

                <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                        <Text className="!text-text text-xs">模糊阈值 (清晰度)</Text>
                        <Text className="text-xs text-secondary">{config?.thresholds?.sharpness ?? 0}</Text>
                    </div>
                    <Slider
                        min={0}
                        max={300}
                        step={5}
                        value={config?.thresholds?.sharpness ?? 0}
                        onChange={(v) =>
                            updateConfig({
                                thresholds: { ...config.thresholds, sharpness: v },
                            })
                        }
                    />
                </div>
            </div>

            <Divider className="bg-secondary my-2" />

            <div className="app-panel p-3 flex flex-col gap-2">
                <Title level={5} className="app-section-title m-0">排序</Title>
                <div className="flex gap-2">
                    <Select
                        className="flex-1"
                        size="small"
                        value={sortOption.field}
                        onChange={(v) => setSortOption({ ...sortOption, field: v })}
                        options={sortOptions}
                    />
                    <Radio.Group 
                        size="small" 
                        value={sortOption.order} 
                        onChange={(e) => setSortOption({ ...sortOption, order: e.target.value })}
                        buttonStyle="solid"
                    >
                        <Radio.Button value="asc"><SortAscendingOutlined /></Radio.Button>
                        <Radio.Button value="desc"><SortDescendingOutlined /></Radio.Button>
                    </Radio.Group>
                </div>
            </div>

            <Divider className="bg-secondary my-2" />

            <div className="app-panel p-3 flex flex-col gap-2">
                <Title level={5} className="app-section-title m-0">相似分组</Title>

                <div className="flex justify-between items-center">
                    <Text className="!text-text text-xs">只显示每组最佳</Text>
                    <Switch size="small" checked={showOnlyGroupBest} onChange={toggleShowOnlyGroupBest} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Text type="secondary" className="text-xs">模型</Text>
                        <Select
                            size="small"
                            className="w-full"
                            value={groupingParams.embedModel}
                            onChange={(v) => updateGroupingParams({ embedModel: v })}
                            options={[
                                { label: 'OpenCV-Hist (无需Torch)', value: 'cv2_hist' },
                                { label: 'MobileNetV3-Small', value: 'mobilenet_v3_small' },
                                { label: 'MobileNetV3-Large', value: 'mobilenet_v3_large' },
                                { label: 'ResNet50', value: 'resnet50' },
                            ]}
                        />
                    </div>
                    <div>
                        <Text type="secondary" className="text-xs">缩略长边</Text>
                        <InputNumber
                            size="small"
                            className="w-full"
                            min={128}
                            max={768}
                            step={32}
                            value={groupingParams.thumbLongEdge}
                            onChange={(v) => updateGroupingParams({ thumbLongEdge: Number(v ?? 256) })}
                        />
                    </div>
                    <div>
                        <Text type="secondary" className="text-xs">eps</Text>
                        <InputNumber
                            size="small"
                            className="w-full"
                            min={0.02}
                            max={0.5}
                            step={0.01}
                            value={groupingParams.eps}
                            onChange={(v) => updateGroupingParams({ eps: Number(v ?? 0.12) })}
                        />
                    </div>
                    <div>
                        <Text type="secondary" className="text-xs">min_samples</Text>
                        <InputNumber
                            size="small"
                            className="w-full"
                            min={1}
                            max={10}
                            step={1}
                            value={groupingParams.minSamples}
                            onChange={(v) => updateGroupingParams({ minSamples: Number(v ?? 2) })}
                        />
                    </div>
                    <div>
                        <Text type="secondary" className="text-xs">邻域窗口</Text>
                        <InputNumber
                            size="small"
                            className="w-full"
                            min={10}
                            max={300}
                            step={10}
                            value={groupingParams.neighborWindow}
                            onChange={(v) => updateGroupingParams({ neighborWindow: Number(v ?? 80) })}
                        />
                    </div>
                    <div>
                        <Text type="secondary" className="text-xs">TopK</Text>
                        <InputNumber
                            size="small"
                            className="w-full"
                            min={1}
                            max={5}
                            step={1}
                            value={groupingParams.topk}
                            onChange={(v) => updateGroupingParams({ topk: Number(v ?? 2) })}
                        />
                    </div>
                </div>

                <Button
                    type="primary"
                    block
                    disabled={!isElectron || !inputDir || grouping}
                    loading={grouping}
                    onClick={handleStartGroup}
                >
                    运行相似分组
                </Button>

                {groupProgress && (
                    <div className="text-xs text-slate-400 leading-relaxed">
                        <div>阶段：{groupProgress.stage}</div>
                        <div>
                            进度：{groupProgress.done}/{groupProgress.total}
                            {typeof groupProgress.cache_hit === 'number' ? ` · cache hit: ${groupProgress.cache_hit}` : ''}
                        </div>
                    </div>
                )}
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
