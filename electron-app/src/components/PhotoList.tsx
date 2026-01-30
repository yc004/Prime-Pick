import React, { useDeferredValue, useMemo, useState } from 'react'
import { Grid, List } from 'react-window'
import { AutoSizer } from 'react-virtualized-auto-sizer'
import clsx from 'clsx'
import { Button, Input, Segmented, Select, Tag, Typography } from 'antd'
import { AppstoreOutlined, UnorderedListOutlined, WarningOutlined } from '@ant-design/icons'
import { useStore } from '../store/useStore'
import { shallow } from 'zustand/shallow'
import type { MetricsResult } from '../types'
import SmartImage from './SmartImage'

const { Text } = Typography

type PhotoRowData = {
  photos: MetricsResult[]
  selectedPhotos: Set<string>
  onRowClick: (filename: string, e: React.MouseEvent) => void
  getThumbSrc: (filename: string) => string | undefined
  getOriginalSrc: (filename: string) => string | undefined
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
  getThumbSrc,
  getOriginalSrc,
}: PhotoRowProps) => {
  const photo = photos[index]
  const isSelected = selectedPhotos.has(photo.filename)
  const thumbSrc = getThumbSrc(photo.filename)
  const originalSrc = getOriginalSrc(photo.filename)

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
        <SmartImage
          primarySrc={thumbSrc}
          fallbackSrc={originalSrc}
          alt={photo.filename}
          className="w-full h-full object-cover"
          placeholder={<div className="w-full h-full flex items-center justify-center text-[10px] text-muted">无预览</div>}
        />
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

        <div className="flex gap-3 text-xs text-muted">
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

type PhotoCellData = {
  photos: MetricsResult[]
  columnCount: number
  selectedPhotos: Set<string>
  onCellClick: (filename: string, e: React.MouseEvent) => void
  getThumbSrc: (filename: string) => string | undefined
  getOriginalSrc: (filename: string) => string | undefined
}

type PhotoCellProps = PhotoCellData & {
  columnIndex: number
  rowIndex: number
  style: React.CSSProperties
  ariaAttributes: {
    'aria-colindex': number
    role: 'gridcell'
  }
}

const PhotoCell = ({
  columnIndex,
  rowIndex,
  style,
  ariaAttributes,
  photos,
  columnCount,
  selectedPhotos,
  onCellClick,
  getThumbSrc,
  getOriginalSrc,
}: PhotoCellProps) => {
  const index = rowIndex * columnCount + columnIndex
  if (index >= photos.length) return null
  const photo = photos[index]
  const isSelected = selectedPhotos.has(photo.filename)
  const thumbSrc = getThumbSrc(photo.filename)
  const originalSrc = getOriginalSrc(photo.filename)

  return (
    <div {...ariaAttributes} style={style} className="p-1 select-none">
      <div
        className={clsx(
          'h-full rounded-md overflow-hidden border border-secondary/80 hover:bg-secondary/30 transition-colors cursor-pointer',
          isSelected ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-surface-2/60',
          photo.is_unusable ? 'opacity-60' : '',
        )}
        onClick={(e) => onCellClick(photo.filename, e)}
      >
        <div className="relative w-full aspect-square bg-black overflow-hidden">
          <SmartImage
            primarySrc={thumbSrc}
            fallbackSrc={originalSrc}
            alt={photo.filename}
            className="w-full h-full object-cover"
            placeholder={<div className="w-full h-full flex items-center justify-center text-[10px] text-muted">无预览</div>}
          />
          <div
            className={clsx(
              'absolute top-1 right-1 text-[10px] px-1 py-0.5 rounded text-white',
              photo.technical_score >= 80 ? 'bg-emerald-500/85' : photo.technical_score >= 50 ? 'bg-orange-500/85' : 'bg-red-500/85',
            )}
          >
            {photo.technical_score.toFixed(0)}
          </div>
          {photo.is_unusable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <WarningOutlined className="text-red-500 text-xl" />
            </div>
          )}
        </div>

        <div className="px-2 py-1.5">
          <Text className="!text-text text-[11px] leading-tight block truncate" title={photo.filename}>
            {photo.filename.split(/[/\\]/).pop()}
          </Text>
          <div className="mt-0.5 flex justify-between text-[10px] text-muted">
            <span>清晰 {photo.sharpness.score.toFixed(0)}</span>
            <span>曝光 {photo.exposure.score.toFixed(0)}</span>
          </div>
        </div>
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
    setSortOption,
    filterOption,
    config,
    photoLayout,
    setPhotoLayout,
  } = useStore(
    (s) => ({
      photos: s.photos,
      showUnusable: s.showUnusable,
      selectedPhotos: s.selectedPhotos,
      toggleSelection: s.toggleSelection,
      selectRange: s.selectRange,
      clearSelection: s.clearSelection,
      selectAll: s.selectAll,
      sortOption: s.sortOption,
      setSortOption: s.setSortOption,
      filterOption: s.filterOption,
      config: s.config,
      photoLayout: s.photoLayout,
      setPhotoLayout: s.setPhotoLayout,
    }),
    shallow,
  )

  const [keyword, setKeyword] = useState('')
  const [lastClicked, setLastClicked] = useState<string | null>(null)
  const deferredKeyword = useDeferredValue(keyword)

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

    const getFieldValue = (p: MetricsResult) => {
      if (sortField === 'filename') return String(p.filename ?? '')
      if (sortField === 'technical_score') return Number((p as any).technical_score ?? 0)
      if (sortField === 'capture_ts') return Number((p as any).capture_ts ?? 0)
      if (sortField === 'group_id') return Number((p as any).group_id ?? -1)
      if (sortField === 'rank_in_group') return Number((p as any).rank_in_group ?? 1)
      if (sortField === 'sharpness.score') return Number((p as any)?.sharpness?.score ?? 0)
      if (sortField === 'exposure.score') return Number((p as any)?.exposure?.score ?? 0)
      if (sortField.includes('.')) {
        const parts = sortField.split('.')
        const v = parts.reduce((obj: any, key: string) => obj?.[key], p)
        return typeof v === 'number' ? v : v ?? 0
      }
      return (p as any)[sortField] ?? 0
    }

    res = [...res].sort((a, b) => {
      const valA = getFieldValue(a)
      const valB = getFieldValue(b)

      let cmp = 0
      if (typeof valA === 'string' || typeof valB === 'string') {
        cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' })
      } else {
        const na = Number(valA)
        const nb = Number(valB)
        cmp = na < nb ? -1 : na > nb ? 1 : 0
      }
      if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp
      return String(a.filename ?? '').localeCompare(String(b.filename ?? ''), undefined, { numeric: true, sensitivity: 'base' })
    })

    return res
  }, [photos, showUnusable, sortOption, filterOption, config?.thresholds?.sharpness])

  const visiblePhotos = useMemo(() => {
    const q = deferredKeyword.trim().toLowerCase()
    if (!q) return filteredPhotos
    return filteredPhotos.filter((p) => p.filename.toLowerCase().includes(q))
  }, [filteredPhotos, deferredKeyword])

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

  const getThumbSrc = (filename: string) => {
    if (!isElectron) return undefined
    if (!filename) return undefined
    return `thumb://local/${encodeURIComponent(filename)}?w=160&q=55`
  }

  if (!List) {
    return (
      <div className="h-full flex items-center justify-center text-muted">
        列表组件加载失败
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted">
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

        <Select
          size="small"
          value={sortOption?.field ?? 'filename'}
          onChange={(v) => {
            const nextField = String(v)
            const defaultOrder =
              nextField === 'filename' ? 'asc' : nextField === 'capture_ts' ? 'desc' : 'desc'
            setSortOption({ field: nextField, order: defaultOrder as any })
          }}
          options={[
            { label: '文件名', value: 'filename' },
            { label: '技术评分', value: 'technical_score' },
            { label: '清晰度', value: 'sharpness.score' },
            { label: '曝光', value: 'exposure.score' },
            { label: '拍摄时间', value: 'capture_ts' },
            { label: '分组 ID', value: 'group_id' },
            { label: '组内排名', value: 'rank_in_group' },
          ]}
          className="w-32"
        />
        <Segmented
          size="small"
          value={sortOption?.order ?? 'asc'}
          onChange={(v) => setSortOption({ field: sortOption?.field ?? 'filename', order: v as any })}
          options={[
            { label: '升序', value: 'asc' },
            { label: '降序', value: 'desc' },
          ]}
        />
        <Segmented
          size="small"
          value={photoLayout}
          onChange={(v) => setPhotoLayout(v as any)}
          options={[
            { label: <UnorderedListOutlined />, value: 'list' },
            { label: <AppstoreOutlined />, value: 'grid' },
          ]}
        />
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
            if (photoLayout === 'grid') {
              const targetCellWidth = 150
              const columnCount = Math.max(1, Math.floor(width / targetCellWidth))
              const columnWidth = Math.floor(width / columnCount)
              const rowCount = Math.ceil(visiblePhotos.length / columnCount)
              const rowHeight = columnWidth + 44

              return (
                <Grid<PhotoCellData>
                  columnCount={columnCount}
                  columnWidth={columnWidth}
                  rowCount={rowCount}
                  rowHeight={rowHeight}
                  cellComponent={PhotoCell}
                  cellProps={{
                    photos: visiblePhotos,
                    columnCount,
                    selectedPhotos,
                    onCellClick: onRowClick,
                    getThumbSrc,
                    getOriginalSrc: getImgSrc,
                  }}
                  style={{ height, width }}
                />
              )
            }

            return (
              <List<PhotoRowData>
                rowCount={visiblePhotos.length}
                rowHeight={100}
                rowComponent={PhotoRow}
                rowProps={{
                  photos: visiblePhotos,
                  selectedPhotos,
                  onRowClick,
                  getThumbSrc,
                  getOriginalSrc: getImgSrc,
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
