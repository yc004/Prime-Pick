import React, { useMemo, useState } from 'react'
import { List } from 'react-window'
import { AutoSizer } from 'react-virtualized-auto-sizer'
import clsx from 'clsx'
import { Button, Input, Tag, Typography } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import { useStore } from '../store/useStore'
import type { MetricsResult } from '../types'

const { Text } = Typography

type PhotoRowData = {
  photos: MetricsResult[]
  selectedPhotos: Set<string>
  onRowClick: (filename: string, e: React.MouseEvent) => void
  getImgSrc: (filename: string) => string | undefined
}

type PhotoRowProps = PhotoRowData & {
  index: number
  style: React.CSSProperties
  ariaAttributes: {
    'aria-posinset': number
    'aria-setsize': number
    role: 'listitem'
  }
}

const PhotoRow = ({
  index,
  style,
  ariaAttributes,
  photos,
  selectedPhotos,
  onRowClick,
  getImgSrc,
}: PhotoRowProps) => {
  const photo = photos[index]
  const isSelected = selectedPhotos.has(photo.filename)
  const imgSrc = getImgSrc(photo.filename)
  const [imgOk, setImgOk] = useState(true)

  return (
    <div
      {...ariaAttributes}
      style={style}
      className={clsx(
        'flex items-center p-2 border-b border-secondary/80 hover:bg-secondary/40 cursor-pointer transition-colors select-none',
        isSelected ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : '',
        photo.is_unusable ? 'opacity-60' : '',
      )}
      onClick={(e) => onRowClick(photo.filename, e)}
    >
      <div className="w-24 h-16 bg-black flex-shrink-0 mr-4 overflow-hidden rounded relative">
        {imgSrc && imgOk ? (
          <img
            src={imgSrc}
            alt={photo.filename}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
            无预览
          </div>
        )}
        {photo.is_unusable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <WarningOutlined className="text-red-500 text-xl" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1 gap-2">
          <Text className="!text-text font-medium truncate" title={photo.filename}>
            {photo.filename.split(/[/\\]/).pop()}
          </Text>
          <Tag
            color={
              photo.technical_score >= 80
                ? 'green'
                : photo.technical_score >= 50
                  ? 'orange'
                  : 'red'
            }
          >
            {photo.technical_score.toFixed(1)}
          </Tag>
        </div>

        <div className="flex gap-3 text-xs text-gray-400">
          <span>清晰: {photo.sharpness.score.toFixed(1)}</span>
          <span>曝光: {photo.exposure.score.toFixed(1)}</span>
        </div>

        {photo.reasons.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {photo.reasons.slice(0, 3).map((r: string, i: number) => (
              <Tag
                key={i}
                color="red"
                className="mr-0 text-[10px] leading-tight px-1 py-0.5"
              >
                {r}
              </Tag>
            ))}
            {photo.reasons.length > 3 && (
              <Tag className="mr-0 text-[10px] leading-tight px-1 py-0.5">
                +{photo.reasons.length - 3}
              </Tag>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  isElectron: boolean
}

const PhotoList: React.FC<Props> = ({ isElectron }) => {
  const {
    photos,
    showUnusable,
    selectedPhotos,
    toggleSelection,
    selectRange,
    clearSelection,
    selectAll,
    sortOption,
    filterOption,
    config,
  } = useStore()

  const [keyword, setKeyword] = useState('')
  const [lastClicked, setLastClicked] = useState<string | null>(null)

  const filteredPhotos = useMemo(() => {
    // 1. Filter Unusable
    let res = showUnusable ? photos : photos.filter((p) => !p.is_unusable)
    
    // 2. Filter Min Score
    if (filterOption?.minScore > 0) {
        res = res.filter(p => p.technical_score >= filterOption.minScore)
    }

    // 3. Filter Blurry
    const sharpnessThreshold = config?.thresholds?.sharpness ?? 0
    const blurryMode = filterOption?.blurryMode ?? 'all'
    if (blurryMode !== 'all') {
        res = res.filter((p) => {
            const sharpnessScore = typeof (p as any)?.sharpness?.score === 'number' ? (p as any).sharpness.score : 0
            const isBlurry = sharpnessScore < sharpnessThreshold
            return blurryMode === 'only' ? isBlurry : !isBlurry
        })
    }

    // 4. Sort
    const sortField = sortOption?.field || 'filename'
    const sortOrder = sortOption?.order || 'asc'

    res = [...res].sort((a, b) => {
        let valA: any = a
        let valB: any = b
        
        // Handle nested fields like sharpness.score
        if (sortField.includes('.')) {
            const parts = sortField.split('.')
            valA = parts.reduce((obj: any, key: string) => obj?.[key], a) ?? 0
            valB = parts.reduce((obj: any, key: string) => obj?.[key], b) ?? 0
        } else {
            valA = (a as any)[sortField] ?? (sortField === 'filename' ? '' : 0)
            valB = (b as any)[sortField] ?? (sortField === 'filename' ? '' : 0)
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
    })

    return res
  }, [photos, showUnusable, sortOption, filterOption, config?.thresholds?.sharpness])

  const visiblePhotos = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return filteredPhotos
    return filteredPhotos.filter((p) => p.filename.toLowerCase().includes(q))
  }, [filteredPhotos, keyword])

  const onRowClick = (filename: string, e: React.MouseEvent) => {
    const multi = e.metaKey || e.ctrlKey
    const range = e.shiftKey && lastClicked
    if (range && lastClicked) {
      selectRange(lastClicked, filename)
    } else {
      toggleSelection(filename, Boolean(multi))
    }
    setLastClicked(filename)
  }

  const getImgSrc = (filename: string) => {
    if (!isElectron) return undefined
    if (!filename) return undefined
    return `media://local/${encodeURIComponent(filename)}`
  }

  if (!List) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        列表组件加载失败
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        未加载照片
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-secondary/80 flex items-center gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <Text className="!text-text font-semibold">照片</Text>
          <Text type="secondary" className="text-xs">
            {visiblePhotos.length} / {photos.length}
          </Text>
          <Text className="text-xs text-emerald-300">已选 {selectedPhotos.size}</Text>
        </div>

        <div className="flex-1" />

        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索文件名"
          allowClear
          className="w-56"
        />
        <Button
          onClick={() => selectAll(visiblePhotos.map((p) => p.filename))}
          disabled={!isElectron || visiblePhotos.length === 0}
        >
          全选
        </Button>
        <Button onClick={clearSelection} disabled={!isElectron || selectedPhotos.size === 0}>
          清空
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <AutoSizer
          style={{ width: '100%', height: '100%' }}
          renderProp={({ height, width }) => {
            if (height == null || width == null) return null
            return (
              <List<PhotoRowData>
                rowCount={visiblePhotos.length}
                rowHeight={100}
                rowComponent={PhotoRow}
                rowProps={{
                  photos: visiblePhotos,
                  selectedPhotos,
                  onRowClick,
                  getImgSrc,
                }}
                style={{ height, width }}
              />
            )
          }}
        />
      </div>

      {!isElectron && (
        <div className="px-3 py-2 border-t border-secondary/80 text-xs text-amber-300">
          当前为浏览器预览模式：无法打开文件夹/运行计算/写入 XMP
        </div>
      )}
    </div>
  )
}

export default PhotoList
