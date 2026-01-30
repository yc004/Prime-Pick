import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Select, Divider, Switch, Typography, Slider, Radio, InputNumber, Checkbox } from 'antd'
import { FolderOpenOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons'
import { useStore } from '../store/useStore'
import { shallow } from 'zustand/shallow'

const { Title, Text } = Typography

interface Props {
    onSelectDir: () => void
    isElectron: boolean
}

const SidebarFilters: React.FC<Props> = ({ onSelectDir, isElectron }) => {
    const [modelsChecking, setModelsChecking] = useState(false)
    const [modelsStatus, setModelsStatus] = useState<string>('')

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
        filterEmotions, toggleFilterEmotion,
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
            filterEmotions: s.filterEmotions,
            toggleFilterEmotion: s.toggleFilterEmotion,
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

    const emotionOptions = ['happiness', 'neutral', 'surprise', 'sadness', 'anger', 'disgust', 'fear', 'contempt']

    const hasEmotionData = useMemo(() => {
        return (photos as any[]).some((p) => typeof p?.emotion === 'string' && p.emotion) ||
            (photos as any[]).some((p) => typeof p?.emotion_score === 'number')
    }, [photos])

    useEffect(() => {
        if (!isElectron || !window.electronAPI) return
        const offProgress = window.electronAPI.onCheckModelsProgress?.((evt: any) => {
            if (evt && evt.type === 'log' && typeof evt.line === 'string') {
                setModelsStatus(evt.line.trim())
            }
        })
        const offDone = window.electronAPI.onCheckModelsDone?.((code: number) => {
            setModelsChecking(false)
            setModelsStatus(code === 0 ? '模型检查完成' : `模型检查失败 (code=${code})`)
        })
        return () => {
            if (typeof offProgress === 'function') offProgress()
            if (typeof offDone === 'function') offDone()
        }
    }, [isElectron])

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
                <Title level={5} className="app-section-title m-0">人物表情 (实验性)</Title>
                {!hasEmotionData && photos.length > 0 && (
                    <Alert
                        type="info"
                        showIcon
                        message="未检测到表情数据"
                        description={
                            <div className="text-xs leading-relaxed">
                                <div>可能原因：未重新运行计算、旧结果文件、照片无人脸、或表情模型未下载。</div>
                                {isElectron ? (
                                    <div className="mt-2 flex gap-2 flex-wrap items-center">
                                        <Button
                                            size="small"
                                            onClick={() => {
                                                if (!window.electronAPI) return
                                                setModelsChecking(true)
                                                setModelsStatus('开始检查/下载模型…')
                                                window.electronAPI.checkModels?.({ force: false })
                                            }}
                                            loading={modelsChecking}
                                        >
                                            检查/下载模型
                                        </Button>
                                        <span className="text-muted">{modelsStatus}</span>
                                    </div>
                                ) : (
                                    <div className="mt-2">浏览器预览模式无法运行模型下载/计算，请在 Electron 中打开。</div>
                                )}
                                <div className="mt-2">提示：要生成表情分，需要重新运行一次计算（建议开启重建缓存）。</div>
                            </div>
                        }
                    />
                )}
                <div className="flex flex-wrap gap-y-1">
                    {emotionOptions.map(em => (
                        <Checkbox 
                            key={em} 
                            checked={filterEmotions.has(em)}
                            onChange={() => toggleFilterEmotion(em)}
                            className="text-xs !ml-0 w-[50%]"
                        >
                            {em}
                        </Checkbox>
                    ))}
                </div>
                <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                        <Text className="!text-text text-xs">最低表情分</Text>
                        <Text className="text-xs text-secondary">{filterOption?.minEmotionScore ?? 0}</Text>
                    </div>
                    <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={filterOption?.minEmotionScore ?? 0}
                        onChange={(v) => setFilterOption({ minEmotionScore: v })}
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
                        <Text type="secondary" className="text-xs">时间窗口(秒)</Text>
                        <InputNumber
                            size="small"
                            className="w-full"
                            min={0}
                            max={600}
                            step={1}
                            value={groupingParams.timeWindowSecs}
                            onChange={(v) => updateGroupingParams({ timeWindowSecs: Number(v ?? 6) })}
                        />
                    </div>
                    <div>
                        <Text type="secondary" className="text-xs">时间来源</Text>
                        <Select
                            size="small"
                            className="w-full"
                            value={groupingParams.timeSource}
                            onChange={(v) => updateGroupingParams({ timeSource: v })}
                            options={[
                                { label: 'Auto(EXIF→mtime)', value: 'auto' },
                                { label: 'EXIF', value: 'exif' },
                                { label: 'mtime', value: 'mtime' },
                            ]}
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
                    <div className="text-xs text-muted leading-relaxed">
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
                <div className="mt-2 text-[11px] text-muted leading-relaxed">
                    快捷键请在顶部菜单「帮助 → 快捷键」查看
                </div>
            </div>
        </div>
    )
}

export default SidebarFilters
