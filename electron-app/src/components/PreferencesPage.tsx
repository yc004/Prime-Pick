import React, { useMemo, useState } from 'react'
import { Button, Divider, InputNumber, Radio, Select, Slider, Switch, Typography } from 'antd'
import { shallow } from 'zustand/shallow'
import { useStore } from '../store/useStore'

const { Title, Text } = Typography

const PreferencesPage: React.FC = () => {
  const {
    photos,
    config,
    themeMode,
    setThemeMode,
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
    computeWorkers,
    setComputeWorkers,
    rightPanelVisible,
    toggleRightPanelVisible,
  } = useStore(
    (s) => ({
      photos: s.photos,
      config: s.config,
      themeMode: s.themeMode,
      setThemeMode: s.setThemeMode,
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
      computeWorkers: s.computeWorkers,
      setComputeWorkers: s.setComputeWorkers,
      rightPanelVisible: s.rightPanelVisible,
      toggleRightPanelVisible: s.toggleRightPanelVisible,
    }),
    shallow,
  )

  const sections = useMemo(
    () => [
      { key: 'general', label: '通用' },
      { key: 'display', label: '显示与排序' },
      { key: 'grouping', label: '相似分组' },
      { key: 'stats', label: '统计' },
    ],
    [],
  )
  const [activeSection, setActiveSection] = useState(sections[0].key)

  const scrollToSection = (key: string) => {
    setActiveSection(key)
    const el = document.getElementById(`pref-${key}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
          <div className="text-xs text-muted mt-1">修改后会自动生效；关闭窗口返回主界面。</div>
        </div>
        <Button onClick={() => window.close()}>关闭</Button>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="w-64 shrink-0 border-r border-secondary/80 p-3">
          <div className="flex flex-col gap-1">
            {sections.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => scrollToSection(s.key)}
                className={[
                  'text-left px-3 py-2 rounded-md text-sm',
                  s.key === activeSection ? 'bg-secondary text-text' : 'text-text hover:bg-secondary/60',
                ].join(' ')}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-muted leading-relaxed px-3">
            这些设置会自动保存并立即生效。
          </div>
        </div>

        <div className="flex-1 min-w-0 overflow-y-auto p-4 flex flex-col gap-4">
          <div id="pref-general" className="scroll-mt-20 app-panel p-4">
            <Title level={5} className="app-section-title m-0">
              通用
            </Title>
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <Text type="secondary" className="text-xs">
                  外观
                </Text>
                <div className="mt-1">
                  <Radio.Group
                    size="small"
                    value={themeMode}
                    onChange={(e) => setThemeMode(e.target.value)}
                    buttonStyle="solid"
                  >
                    <Radio.Button value="system">跟随系统</Radio.Button>
                    <Radio.Button value="dark">深色</Radio.Button>
                    <Radio.Button value="light">浅色</Radio.Button>
                  </Radio.Group>
                </div>
                <div className="text-[10px] text-muted mt-1">选择“跟随系统”会随系统外观自动切换。</div>
              </div>
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
              <div>
                <Text type="secondary" className="text-xs">
                  并行线程数 (Workers)
                </Text>
                <InputNumber
                  size="small"
                  className="w-full mt-1"
                  min={1}
                  max={32}
                  step={1}
                  value={computeWorkers}
                  onChange={(v) => setComputeWorkers(Number(v ?? 4))}
                />
                <div className="text-[10px] text-muted mt-1">影响计算速度与内存占用，建议设置为 CPU 核心数。</div>
              </div>
            </div>
          </div>

          <div id="pref-display" className="scroll-mt-20 app-panel p-4">
            <Title level={5} className="app-section-title m-0">
              显示与排序
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
                  <Text className="text-xs text-muted">{filterOption?.minScore ?? 0}</Text>
                </div>
                <Slider min={0} max={100} step={5} value={filterOption?.minScore ?? 0} onChange={(v) => setFilterOption({ minScore: v })} />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Text type="secondary" className="text-xs">
                    模糊筛选
                  </Text>
                  <Text className="text-xs text-muted">
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

          <div id="pref-grouping" className="scroll-mt-20 app-panel p-4">
            <Title level={5} className="app-section-title m-0">
              相似分组
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

          <div id="pref-stats" className="scroll-mt-20 app-panel p-4">
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
    </div>
  )
}

export default PreferencesPage
