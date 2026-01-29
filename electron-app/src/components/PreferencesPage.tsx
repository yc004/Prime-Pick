import React, { useMemo } from 'react'
import { Button, Divider, InputNumber, Radio, Select, Slider, Switch, Typography } from 'antd'
import { shallow } from 'zustand/shallow'
import { useStore } from '../store/useStore'

const { Title, Text } = Typography

const PreferencesPage: React.FC = () => {
  const {
    photos,
    config,
    updateConfig,
    profile,
    setProfile,
    showUnusable,
    toggleShowUnusable,
    sortOption,
    setSortOption,
    filterOption,
    setFilterOption,
    showOnlyGroupBest,
    toggleShowOnlyGroupBest,
    groupingParams,
    updateGroupingParams,
    rebuildCache,
    setRebuildCache,
    rightPanelVisible,
    toggleRightPanelVisible,
  } = useStore(
    (s) => ({
      photos: s.photos,
      config: s.config,
      updateConfig: s.updateConfig,
      profile: s.profile,
      setProfile: s.setProfile,
      showUnusable: s.showUnusable,
      toggleShowUnusable: s.toggleShowUnusable,
      sortOption: s.sortOption,
      setSortOption: s.setSortOption,
      filterOption: s.filterOption,
      setFilterOption: s.setFilterOption,
      showOnlyGroupBest: s.showOnlyGroupBest,
      toggleShowOnlyGroupBest: s.toggleShowOnlyGroupBest,
      groupingParams: s.groupingParams,
      updateGroupingParams: s.updateGroupingParams,
      rebuildCache: s.rebuildCache,
      setRebuildCache: s.setRebuildCache,
      rightPanelVisible: s.rightPanelVisible,
      toggleRightPanelVisible: s.toggleRightPanelVisible,
    }),
    shallow,
  )

  const presets = [
    { label: '通用 (默认)', value: 'daylight' },
    { label: '室内活动', value: 'event_indoor' },
    { label: '户外人像', value: 'outdoor_portrait' },
    { label: '夜景 / 暗光', value: 'night' },
  ]

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

      const flags = Array.isArray(p?.exposure?.flags) ? p.exposure.flags.map((v: any) => String(v)) : []
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

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-secondary/80 flex items-center justify-between">
        <div className="min-w-0">
          <Title level={5} className="app-section-title m-0">
            偏好设置
          </Title>
          <div className="text-xs text-slate-400 mt-1">修改后会自动生效；关闭窗口返回主界面。</div>
        </div>
        <Button onClick={() => window.close()}>关闭</Button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
        <div className="app-panel p-4">
          <Title level={5} className="app-section-title m-0">
            快捷入口
          </Title>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Text type="secondary" className="text-xs">
                右侧预览面板
              </Text>
              <Switch checked={rightPanelVisible} onChange={toggleRightPanelVisible} />
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary" className="text-xs">
                忽略缓存（下次重算）
              </Text>
              <Switch checked={rebuildCache} onChange={setRebuildCache} />
            </div>
          </div>
        </div>

        <div className="app-panel p-4">
          <Title level={5} className="app-section-title m-0">
            过滤与排序
          </Title>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Text type="secondary" className="text-xs">
                显示不可用
              </Text>
              <Switch checked={showUnusable} onChange={toggleShowUnusable} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Text type="secondary" className="text-xs">
                  最低评分
                </Text>
                <Text className="text-xs text-slate-300">{filterOption?.minScore ?? 0}</Text>
              </div>
              <Slider min={0} max={100} step={5} value={filterOption?.minScore ?? 0} onChange={(v) => setFilterOption({ minScore: v })} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Text type="secondary" className="text-xs">
                  模糊筛选
                </Text>
                <Text className="text-xs text-slate-300">
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

            <div>
              <div className="flex justify-between items-center mb-1">
                <Text type="secondary" className="text-xs">
                  模糊阈值（清晰度）
                </Text>
                <Text className="text-xs text-slate-300">{config?.thresholds?.sharpness ?? 0}</Text>
              </div>
              <Slider
                min={0}
                max={300}
                step={5}
                value={config?.thresholds?.sharpness ?? 0}
                onChange={(v) => updateConfig({ thresholds: { ...config.thresholds, sharpness: v } })}
              />
            </div>

            <Divider className="bg-secondary my-2" />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Text type="secondary" className="text-xs">
                  排序字段
                </Text>
                <Select
                  className="w-full"
                  size="small"
                  value={sortOption.field}
                  onChange={(v) => setSortOption({ ...sortOption, field: v })}
                  options={sortOptions}
                />
              </div>
              <div>
                <Text type="secondary" className="text-xs">
                  排序方向
                </Text>
                <Radio.Group
                  size="small"
                  value={sortOption.order}
                  onChange={(e) => setSortOption({ ...sortOption, order: e.target.value })}
                  buttonStyle="solid"
                >
                  <Radio.Button value="asc">升序</Radio.Button>
                  <Radio.Button value="desc">降序</Radio.Button>
                </Radio.Group>
              </div>
            </div>
          </div>
        </div>

        <div className="app-panel p-4">
          <Title level={5} className="app-section-title m-0">
            评分参数
          </Title>
          <div className="mt-3 flex flex-col gap-4">
            <div>
              <Text type="secondary" className="text-xs">
                场景预设
              </Text>
              <Select value={profile} onChange={setProfile} options={presets} className="w-full mt-1" />
            </div>

            <div>
              <Text type="secondary" className="text-xs">
                清晰度权重
              </Text>
              <div className="flex gap-2 items-center mt-1">
                <Slider
                  min={0}
                  max={5}
                  step={0.1}
                  value={config.weights.sharpness}
                  onChange={(v) => updateConfig({ weights: { ...config.weights, sharpness: v } })}
                  className="flex-1"
                />
                <InputNumber
                  size="small"
                  min={0}
                  max={5}
                  step={0.1}
                  value={config.weights.sharpness}
                  onChange={(v) => updateConfig({ weights: { ...config.weights, sharpness: Number(v ?? 0) } })}
                  className="w-20"
                />
              </div>
            </div>

            <div>
              <Text type="secondary" className="text-xs">
                曝光权重
              </Text>
              <div className="flex gap-2 items-center mt-1">
                <Slider
                  min={0}
                  max={5}
                  step={0.1}
                  value={config.weights.exposure}
                  onChange={(v) => updateConfig({ weights: { ...config.weights, exposure: v } })}
                  className="flex-1"
                />
                <InputNumber
                  size="small"
                  min={0}
                  max={5}
                  step={0.1}
                  value={config.weights.exposure}
                  onChange={(v) => updateConfig({ weights: { ...config.weights, exposure: Number(v ?? 0) } })}
                  className="w-20"
                />
              </div>
            </div>

            <div>
              <Text type="secondary" className="text-xs">
                暗光阈值
              </Text>
              <div className="flex gap-2 items-center mt-1">
                <Slider
                  min={0}
                  max={50}
                  step={1}
                  value={config.thresholds.low_light}
                  onChange={(v) => updateConfig({ thresholds: { ...config.thresholds, low_light: v } })}
                  className="flex-1"
                />
                <InputNumber
                  size="small"
                  min={0}
                  max={50}
                  step={1}
                  value={config.thresholds.low_light}
                  onChange={(v) => updateConfig({ thresholds: { ...config.thresholds, low_light: Number(v ?? 0) } })}
                  className="w-20"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="app-panel p-4">
          <Title level={5} className="app-section-title m-0">
            相似分组参数
          </Title>
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Text type="secondary" className="text-xs">
                  模型
                </Text>
                <Select
                  size="small"
                  className="w-full mt-1"
                  value={groupingParams.embedModel}
                  onChange={(v) => updateGroupingParams({ embedModel: v })}
                  options={[
                    { label: 'OpenCV-Hist（无需Torch）', value: 'cv2_hist' },
                    { label: 'MobileNetV3-Small', value: 'mobilenet_v3_small' },
                    { label: 'MobileNetV3-Large', value: 'mobilenet_v3_large' },
                    { label: 'ResNet50', value: 'resnet50' },
                  ]}
                />
              </div>
              <div>
                <Text type="secondary" className="text-xs">
                  缩略长边
                </Text>
                <InputNumber
                  size="small"
                  className="w-full mt-1"
                  min={128}
                  max={768}
                  step={32}
                  value={groupingParams.thumbLongEdge}
                  onChange={(v) => updateGroupingParams({ thumbLongEdge: Number(v ?? 256) })}
                />
              </div>
              <div>
                <Text type="secondary" className="text-xs">
                  eps
                </Text>
                <InputNumber
                  size="small"
                  className="w-full mt-1"
                  min={0.02}
                  max={0.5}
                  step={0.01}
                  value={groupingParams.eps}
                  onChange={(v) => updateGroupingParams({ eps: Number(v ?? 0.12) })}
                />
              </div>
              <div>
                <Text type="secondary" className="text-xs">
                  min_samples
                </Text>
                <InputNumber
                  size="small"
                  className="w-full mt-1"
                  min={1}
                  max={10}
                  step={1}
                  value={groupingParams.minSamples}
                  onChange={(v) => updateGroupingParams({ minSamples: Number(v ?? 2) })}
                />
              </div>
              <div>
                <Text type="secondary" className="text-xs">
                  邻域窗口
                </Text>
                <InputNumber
                  size="small"
                  className="w-full mt-1"
                  min={10}
                  max={300}
                  step={10}
                  value={groupingParams.neighborWindow}
                  onChange={(v) => updateGroupingParams({ neighborWindow: Number(v ?? 80) })}
                />
              </div>
              <div>
                <Text type="secondary" className="text-xs">
                  TopK
                </Text>
                <InputNumber
                  size="small"
                  className="w-full mt-1"
                  min={1}
                  max={5}
                  step={1}
                  value={groupingParams.topk}
                  onChange={(v) => updateGroupingParams({ topk: Number(v ?? 2) })}
                />
              </div>
              <div>
                <Text type="secondary" className="text-xs">
                  时间窗口（秒）
                </Text>
                <InputNumber
                  size="small"
                  className="w-full mt-1"
                  min={0}
                  max={60}
                  step={1}
                  value={groupingParams.timeWindowSecs}
                  onChange={(v) => updateGroupingParams({ timeWindowSecs: Number(v ?? 6) })}
                />
              </div>
              <div>
                <Text type="secondary" className="text-xs">
                  时间来源
                </Text>
                <Select
                  size="small"
                  className="w-full mt-1"
                  value={groupingParams.timeSource}
                  onChange={(v) => updateGroupingParams({ timeSource: v as any })}
                  options={[
                    { label: '自动', value: 'auto' },
                    { label: 'EXIF', value: 'exif' },
                    { label: '文件时间', value: 'mtime' },
                  ]}
                />
              </div>
              <div>
                <Text type="secondary" className="text-xs">
                  workers
                </Text>
                <InputNumber
                  size="small"
                  className="w-full mt-1"
                  min={1}
                  max={16}
                  step={1}
                  value={groupingParams.workers}
                  onChange={(v) => updateGroupingParams({ workers: Number(v ?? 4) })}
                />
              </div>
              <div>
                <Text type="secondary" className="text-xs">
                  batchSize
                </Text>
                <InputNumber
                  size="small"
                  className="w-full mt-1"
                  min={1}
                  max={256}
                  step={1}
                  value={groupingParams.batchSize}
                  onChange={(v) => updateGroupingParams({ batchSize: Number(v ?? 32) })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Text type="secondary" className="text-xs">
                分组视图只显示每组最佳
              </Text>
              <Switch checked={showOnlyGroupBest} onChange={toggleShowOnlyGroupBest} />
            </div>
          </div>
        </div>

        <div className="app-panel p-4">
          <Title level={5} className="app-section-title m-0">
            统计
          </Title>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
            <Text type="secondary" className="text-xs">
              已加载
            </Text>
            <Text className="!text-text text-xs text-right">{stats.total}</Text>

            <Text type="secondary" className="text-xs">
              模糊
            </Text>
            <Text className="!text-text text-xs text-right">{stats.blurry}</Text>

            <Text type="secondary" className="text-xs">
              曝光偏差
            </Text>
            <Text className="!text-text text-xs text-right">{stats.exposureLowScore}</Text>

            <Text type="secondary" className="text-xs">
              过曝
            </Text>
            <Text className="!text-text text-xs text-right">{stats.overexposed}</Text>

            <Text type="secondary" className="text-xs">
              欠曝
            </Text>
            <Text className="!text-text text-xs text-right">{stats.underexposed}</Text>

            <Text type="secondary" className="text-xs">
              高光溢出
            </Text>
            <Text className="!text-text text-xs text-right">{stats.highlightClipping}</Text>

            <Text type="secondary" className="text-xs">
              暗部死黑
            </Text>
            <Text className="!text-text text-xs text-right">{stats.shadowCrushing}</Text>

            <Text type="secondary" className="text-xs">
              低对比
            </Text>
            <Text className="!text-text text-xs text-right">{stats.lowContrast}</Text>

            <Text type="secondary" className="text-xs">
              不可用
            </Text>
            <Text className="!text-text text-xs text-right">{stats.unusable}</Text>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PreferencesPage
