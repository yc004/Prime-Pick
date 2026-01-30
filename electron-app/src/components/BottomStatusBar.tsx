import React from 'react'
import { Progress } from 'antd'
import { shallow } from 'zustand/shallow'
import { useStore } from '../store/useStore'

const BottomStatusBar: React.FC = () => {
  const {
    computing,
    progress,
    grouping,
    groupProgress,
    writingXmp,
    xmpProgress,
    photos,
    selectedPhotos,
  } = useStore(
    (s) => ({
      computing: s.computing,
      progress: s.progress,
      grouping: s.grouping,
      groupProgress: s.groupProgress,
      writingXmp: s.writingXmp,
      xmpProgress: s.xmpProgress,
      photos: s.photos,
      selectedPhotos: s.selectedPhotos,
    }),
    shallow,
  )

  const totalCount = photos.length
  const selectionCount = selectedPhotos.size

  // Compute Progress
  let percent = 0
  let statusText = ''
  let isActive = false

  if (computing && progress) {
    isActive = true
    percent = Math.round((progress.done / Math.max(1, progress.total)) * 100)
    statusText = `正在计算: ${progress.done} / ${progress.total}`
  } else if (grouping && groupProgress) {
    isActive = true
    if (groupProgress.stage === 'embedding') {
       percent = Math.round((groupProgress.done / Math.max(1, groupProgress.total)) * 100)
       statusText = `正在分组 (生成特征): ${groupProgress.done} / ${groupProgress.total}`
       if (groupProgress.cache_hit) {
           statusText += ` (缓存命中: ${groupProgress.cache_hit})`
       }
    } else if (groupProgress.stage.startsWith('clustering')) {
        // Clustering often doesn't have a clear total, or it's just one step
        // We can just show indeterminate or 100% or just the text
        percent = 100
        statusText = `正在分组 (聚类): ${groupProgress.stage.split('/')[1] || ''}`
    } else if (groupProgress.stage === 'write') {
        percent = 100
        statusText = '正在保存分组结果...'
    }
  } else if (writingXmp) {
    isActive = true
    if (xmpProgress) {
        percent = Math.round((xmpProgress.done / Math.max(1, xmpProgress.total)) * 100)
        statusText = `正在写入 XMP: ${xmpProgress.done} / ${xmpProgress.total}`
    } else {
        percent = 0
        statusText = '正在写入 XMP...'
    }
  }

  return (
    <div className="h-8 shrink-0 flex items-center justify-between px-3 bg-surface-2 border-t border-border text-xs text-muted select-none">
      <div className="flex items-center gap-4 flex-1">
        <div>
          共 {totalCount} 项 · 选中 {selectionCount} 项
        </div>
        {isActive && (
          <div className="flex items-center gap-2 flex-1 max-w-[400px]">
            <span className="whitespace-nowrap">{statusText}</span>
            <Progress 
                percent={percent} 
                size="small" 
                showInfo={false} 
                strokeColor="#1677ff" 
                trailColor="var(--color-border)"
                className="flex-1 m-0"
            />
            <span>{percent}%</span>
          </div>
        )}
      </div>
      <div>
        {/* Right side status items if needed */}
      </div>
    </div>
  )
}

export default BottomStatusBar
