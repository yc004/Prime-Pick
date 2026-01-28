import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Button, Switch, Tag, Typography } from 'antd'
import { AutoSizer } from 'react-virtualized-auto-sizer'
import { List } from 'react-window'
import { StarFilled } from '@ant-design/icons'
import { useStore } from '../store/useStore'
import { shallow } from 'zustand/shallow'
import type { GroupInfo, MetricsResult } from '../types'
import SmartImage from './SmartImage'

const { Text } = Typography

type GroupRowData = {
  groups: GroupInfo[]
  selectedGroupId: number | null
  onSelect: (groupId: number) => void
  getThumbSrc: (filename: string) => string | undefined
  getOriginalSrc: (filename: string) => string | undefined
}

type GroupRowProps = GroupRowData & {
  index: number
  style: React.CSSProperties
  ariaAttributes: {
    'aria-posinset': number
    'aria-setsize': number
    role: 'listitem'
  }
}

const GroupRow = ({
  index,
  style,
  ariaAttributes,
  groups,
  selectedGroupId,
  onSelect,
  getThumbSrc,
  getOriginalSrc,
}: GroupRowProps) => {
  const g = groups[index]
  const isActive = selectedGroupId === g.group_id
  const thumb = g.best?.[0]
  const thumbSrc = thumb ? getThumbSrc(thumb) : undefined
  const originalSrc = thumb ? getOriginalSrc(thumb) : undefined

  return (
    <div
      {...ariaAttributes}
      style={style}
      className={clsx(
        'flex items-center gap-2 p-2 border-b border-secondary/80 cursor-pointer hover:bg-secondary/40 transition-colors select-none',
        isActive ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : '',
      )}
      onClick={() => onSelect(g.group_id)}
    >
      <div className="w-14 h-10 bg-black flex-shrink-0 overflow-hidden rounded">
        <SmartImage
          primarySrc={thumbSrc}
          fallbackSrc={originalSrc}
          className="w-full h-full object-cover"
          placeholder={<div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">无预览</div>}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Text className="!text-text text-xs font-medium">组 #{g.group_id}</Text>
          <Tag className="mr-0 text-[10px] leading-tight px-1 py-0.5">{g.group_size}</Tag>
        </div>
        <div className="text-[11px] text-slate-400 truncate">
          {g.best?.slice(0, 2).map((x) => x.split(/[/\\]/).pop()).join(' · ')}
        </div>
      </div>
    </div>
  )
}

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

const GroupPhotoRow = ({
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
  const isBest = Boolean(photo.is_group_best)
  const rank = Number(photo.rank_in_group ?? 0)

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
          placeholder={<div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">无预览</div>}
        />
        {isBest && (
          <div className="absolute top-1 left-1 bg-emerald-500/80 text-white text-[10px] px-1 py-0.5 rounded flex items-center gap-1">
            <StarFilled className="text-[10px]" />
            Top{rank || ''}
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
              photo.technical_score >= 80 ? 'green' : photo.technical_score >= 50 ? 'orange' : 'red'
            }
          >
            {photo.technical_score.toFixed(1)}
          </Tag>
        </div>

        <div className="flex gap-3 text-xs text-gray-400">
          <span>组内排名: {rank || '-'}</span>
          <span>清晰: {photo.sharpness.score.toFixed(1)}</span>
          <span>曝光: {photo.exposure.score.toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}

interface Props {
  isElectron: boolean
}

const GroupedView: React.FC<Props> = ({ isElectron }) => {
  const {
    inputDir,
    photos,
    groups,
    selectedGroupId,
    setSelectedGroupId,
    showOnlyGroupBest,
    toggleShowOnlyGroupBest,
    selectedPhotos,
    toggleSelection,
    selectRange,
    clearSelection,
    config,
  } = useStore(
    (s) => ({
      inputDir: s.inputDir,
      photos: s.photos,
      groups: s.groups,
      selectedGroupId: s.selectedGroupId,
      setSelectedGroupId: s.setSelectedGroupId,
      showOnlyGroupBest: s.showOnlyGroupBest,
      toggleShowOnlyGroupBest: s.toggleShowOnlyGroupBest,
      selectedPhotos: s.selectedPhotos,
      toggleSelection: s.toggleSelection,
      selectRange: s.selectRange,
      clearSelection: s.clearSelection,
      config: s.config,
    }),
    shallow,
  )

  const [lastClicked, setLastClicked] = useState<string | null>(null)

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

  const derivedGroups = useMemo<GroupInfo[]>(() => {
    if (groups?.groups?.length) return groups.groups
    const byId = new Map<number, MetricsResult[]>()
    for (const p of photos) {
      const gid = typeof p.group_id === 'number' ? p.group_id : -1
      if (gid < 0) continue
      const arr = byId.get(gid) ?? []
      arr.push(p)
      byId.set(gid, arr)
    }
    const out: GroupInfo[] = []
    for (const [gid, arr] of byId.entries()) {
      const sorted = [...arr].sort((a, b) => {
        const ra = Number(a.rank_in_group ?? 1)
        const rb = Number(b.rank_in_group ?? 1)
        if (ra !== rb) return ra - rb
        return Number(b.technical_score) - Number(a.technical_score)
      })
      const best = sorted.filter((x) => x.is_group_best).slice(0, 2).map((x) => x.filename)
      out.push({
        group_id: gid,
        group_size: sorted.length,
        best,
        items: sorted.map((x) => ({
          filename: x.filename,
          technical_score: x.technical_score,
          rank_in_group: Number(x.rank_in_group ?? 1),
          is_group_best: Boolean(x.is_group_best),
        })),
      })
    }
    return out.sort((a, b) => b.group_size - a.group_size || a.group_id - b.group_id)
  }, [groups, photos])

  const activeGroupId = selectedGroupId ?? (derivedGroups[0]?.group_id ?? null)

  const activePhotos = useMemo(() => {
    if (activeGroupId == null) return []
    let arr = photos.filter((p) => Number(p.group_id ?? -1) === activeGroupId)
    arr = arr.sort((a, b) => {
      const ra = Number(a.rank_in_group ?? 1)
      const rb = Number(b.rank_in_group ?? 1)
      if (ra !== rb) return ra - rb
      return Number(b.technical_score) - Number(a.technical_score)
    })
    if (showOnlyGroupBest) arr = arr.filter((p) => Boolean(p.is_group_best))
    return arr
  }, [photos, activeGroupId, showOnlyGroupBest])

  const activeGroupInfo = useMemo(() => derivedGroups.find((g) => g.group_id === activeGroupId) ?? null, [
    derivedGroups,
    activeGroupId,
  ])

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

  const handleWriteGroupXmp = () => {
    if (!isElectron || !window.electronAPI) return
    if (!inputDir || activeGroupId == null) return
    const selection = photos.filter((p) => Number(p.group_id ?? -1) === activeGroupId).map((p) => p.filename)
    window.electronAPI.writeXmp({
      inputDir,
      selection,
      config,
      onlySelected: true,
    })
  }

  if (!derivedGroups.length) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        未找到分组结果（请先运行相似分组）
      </div>
    )
  }

  return (
    <div className="h-full grid grid-cols-[300px_1fr]">
      <div className="border-r border-secondary/80 min-h-0">
        <div className="px-3 py-2 border-b border-secondary/80 flex items-center justify-between">
          <Text className="!text-text font-semibold">分组</Text>
          <Text type="secondary" className="text-xs">
            {derivedGroups.length}
          </Text>
        </div>
        <div className="h-[calc(100%-41px)] min-h-0">
          <AutoSizer
            style={{ width: '100%', height: '100%' }}
            renderProp={({ height, width }) => (
              <List<GroupRowData>
                rowCount={derivedGroups.length}
                rowHeight={60}
                rowComponent={GroupRow}
                rowProps={{
                  groups: derivedGroups,
                  selectedGroupId: activeGroupId,
                  onSelect: (gid) => setSelectedGroupId(gid),
                  getThumbSrc,
                  getOriginalSrc: getImgSrc,
                }}
                style={{ height, width }}
              />
            )}
          />
        </div>
      </div>

      <div className="min-h-0 flex flex-col">
        <div className="px-3 py-2 border-b border-secondary/80 flex items-center gap-3">
          <div className="min-w-0">
            <Text className="!text-text font-semibold">
              {activeGroupInfo ? `组 #${activeGroupInfo.group_id}` : '组'}
            </Text>
            {activeGroupInfo && (
              <Text type="secondary" className="text-xs ml-2">
                {activeGroupInfo.group_size} 张
              </Text>
            )}
            <Text className="text-xs text-emerald-300 ml-2">已选 {selectedPhotos.size}</Text>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Text className="text-xs text-secondary">只显示推荐</Text>
            <Switch size="small" checked={showOnlyGroupBest} onChange={toggleShowOnlyGroupBest} />
          </div>
          <Button onClick={clearSelection} disabled={!isElectron || selectedPhotos.size === 0}>
            清空
          </Button>
          <Button type="primary" onClick={handleWriteGroupXmp} disabled={!isElectron || !inputDir}>
            对本组写 XMP
          </Button>
        </div>

        <div className="flex-1 min-h-0">
          <AutoSizer
            style={{ width: '100%', height: '100%' }}
            renderProp={({ height, width }) => (
              <List<PhotoRowData>
                rowCount={activePhotos.length}
                rowHeight={100}
                rowComponent={GroupPhotoRow}
                rowProps={{
                  photos: activePhotos,
                  selectedPhotos,
                  onRowClick,
                  getThumbSrc,
                  getOriginalSrc: getImgSrc,
                }}
                style={{ height, width }}
              />
            )}
          />
        </div>
      </div>
    </div>
  )
}

export default GroupedView
