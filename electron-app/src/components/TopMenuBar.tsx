import React, { useMemo } from 'react'
import { Button, Dropdown, Modal, Segmented, Tag, Typography } from 'antd'
import type { MenuProps } from 'antd'
import {
  ApartmentOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  LayoutOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { shallow } from 'zustand/shallow'
import { useStore } from '../store/useStore'

const { Text } = Typography

interface Props {
  isElectron: boolean
  onSelectDir: () => void
  onReloadResults: () => void
}

const TopMenuBar: React.FC<Props> = ({ isElectron, onSelectDir, onReloadResults }) => {
  const {
    inputDir,
    photos,
    selectedPhotos,
    viewMode,
    setViewMode,
    computing,
    progress,
    setComputing,
    setProgress,
    grouping,
    groupProgress,
    setGrouping,
    setGroupProgress,
    config,
    profile,
    rebuildCache,
    groupingParams,
    sidebarVisible,
    rightPanelVisible,
    toggleSidebarVisible,
    toggleRightPanelVisible,
  } = useStore(
    (s) => ({
      inputDir: s.inputDir,
      photos: s.photos,
      selectedPhotos: s.selectedPhotos,
      viewMode: s.viewMode,
      setViewMode: s.setViewMode,
      computing: s.computing,
      progress: s.progress,
      setComputing: s.setComputing,
      setProgress: s.setProgress,
      grouping: s.grouping,
      groupProgress: s.groupProgress,
      setGrouping: s.setGrouping,
      setGroupProgress: s.setGroupProgress,
      config: s.config,
      profile: s.profile,
      rebuildCache: s.rebuildCache,
      groupingParams: s.groupingParams,
      sidebarVisible: s.sidebarVisible,
      rightPanelVisible: s.rightPanelVisible,
      toggleSidebarVisible: s.toggleSidebarVisible,
      toggleRightPanelVisible: s.toggleRightPanelVisible,
    }),
    shallow,
  )

  const folderLabel = useMemo(() => {
    if (!inputDir) return '未选择文件夹'
    return inputDir.split(/[/\\]/).pop() || inputDir
  }, [inputDir])

  const selectionCount = selectedPhotos.size
  const totalCount = photos.length

  const canRun = isElectron && !!inputDir && !!window.electronAPI

  const handleStartCompute = () => {
    if (!canRun) return
    window.electronAPI.startCompute({ inputDir, profile, config, rebuildCache })
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
      onlySelected,
    })
  }

  const handleAbout = () => {
    Modal.info({
      title: '关于 Prime Pick',
      content: (
        <div className="text-slate-200">
          <div>一键筛选照片清晰度/曝光质量，并支持相似分组与 XMP 写入。</div>
          <div className="mt-2 text-xs text-slate-400">
            快捷键：Ctrl+O 打开 · Ctrl+R 重载 · Ctrl+1/2 切换视图 · Ctrl+B/I 切换面板
          </div>
        </div>
      ),
    })
  }

  const fileMenu: MenuProps['items'] = [
    { key: 'open', label: '打开文件夹 (Ctrl+O)', icon: <FolderOpenOutlined /> },
    { key: 'reload', label: '重新加载结果 (Ctrl+R)', icon: <ReloadOutlined />, disabled: !inputDir },
    { type: 'divider' },
    { key: 'close', label: '退出', danger: true },
  ]

  const viewMenu: MenuProps['items'] = [
    { key: 'all', label: '全部照片 (Ctrl+1)' },
    { key: 'grouped', label: '相似分组 (Ctrl+2)' },
    { type: 'divider' },
    { key: 'toggleSidebar', label: `${sidebarVisible ? '隐藏' : '显示'}左侧面板 (Ctrl+B)`, icon: <LayoutOutlined /> },
    { key: 'toggleRightPanel', label: `${rightPanelVisible ? '隐藏' : '显示'}右侧面板 (Ctrl+I)`, icon: <LayoutOutlined /> },
  ]

  const actionMenu: MenuProps['items'] = [
    {
      key: 'compute',
      label: computing ? '停止计算' : '应用并重算全部',
      icon: computing ? <StopOutlined /> : <PlayCircleOutlined />,
      disabled: !canRun,
    },
    {
      key: 'group',
      label: grouping ? '停止相似分组' : '运行相似分组',
      icon: grouping ? <StopOutlined /> : <ApartmentOutlined />,
      disabled: !canRun,
    },
    { type: 'divider' },
    { key: 'xmpSelected', label: '写入 XMP（选中）', icon: <FileTextOutlined />, disabled: !canRun || selectionCount === 0 },
    { key: 'xmpAll', label: '写入 XMP（全部）', icon: <FileTextOutlined />, disabled: !canRun },
  ]

  const helpMenu: MenuProps['items'] = [{ key: 'about', label: '关于', icon: <InfoCircleOutlined /> }]

  const onFileClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'open') onSelectDir()
    if (key === 'reload') onReloadResults()
    if (key === 'close') window.electronAPI?.close?.()
  }

  const onViewClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'all' || key === 'grouped') setViewMode(key as any)
    if (key === 'toggleSidebar') toggleSidebarVisible()
    if (key === 'toggleRightPanel') toggleRightPanelVisible()
  }

  const onActionClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'compute') (computing ? handleCancelCompute() : handleStartCompute())
    if (key === 'group') (grouping ? handleCancelGroup() : handleStartGroup())
    if (key === 'xmpSelected') handleWriteXmp(true)
    if (key === 'xmpAll') handleWriteXmp(false)
  }

  const onHelpClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'about') handleAbout()
  }

  return (
    <div
      className="h-11 shrink-0 flex items-center justify-between px-3 bg-slate-900/70 backdrop-blur-md border-b border-slate-800"
      style={{ WebkitAppRegion: 'no-drag' } as any}
    >
      <div className="flex items-center gap-2">
        <Dropdown menu={{ items: fileMenu, onClick: onFileClick }} trigger={['click']}>
          <Button size="small" type="text" className="!text-slate-200 hover:!bg-slate-800/60">
            文件
          </Button>
        </Dropdown>
        <Dropdown menu={{ items: viewMenu, onClick: onViewClick }} trigger={['click']}>
          <Button size="small" type="text" className="!text-slate-200 hover:!bg-slate-800/60">
            视图
          </Button>
        </Dropdown>
        <Dropdown menu={{ items: actionMenu, onClick: onActionClick }} trigger={['click']}>
          <Button size="small" type="text" className="!text-slate-200 hover:!bg-slate-800/60">
            操作
          </Button>
        </Dropdown>
        <Dropdown menu={{ items: helpMenu, onClick: onHelpClick }} trigger={['click']}>
          <Button size="small" type="text" className="!text-slate-200 hover:!bg-slate-800/60">
            帮助
          </Button>
        </Dropdown>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <Tag color="blue" className="m-0 max-w-[280px] truncate" title={inputDir ?? undefined}>
          {folderLabel}
        </Tag>
        <Text className="text-xs text-slate-300 whitespace-nowrap">
          已加载 {totalCount} · 选中 {selectionCount}
        </Text>
        {progress && computing && (
          <Text className="text-xs text-slate-400 whitespace-nowrap">
            计算 {Math.round((progress.done / Math.max(1, progress.total)) * 100)}%
          </Text>
        )}
        {groupProgress && grouping && (
          <Text className="text-xs text-slate-400 whitespace-nowrap">
            分组 {groupProgress.stage} {groupProgress.done}/{groupProgress.total}
          </Text>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="small"
          icon={<FolderOpenOutlined />}
          onClick={onSelectDir}
          disabled={!isElectron}
        >
          打开
        </Button>
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={onReloadResults}
          disabled={!isElectron || !inputDir}
        />
        <Segmented
          size="small"
          value={viewMode}
          onChange={(v) => setViewMode(v as any)}
          options={[
            { label: '全部', value: 'all' },
            { label: '分组', value: 'grouped' },
          ]}
        />
        <Button
          size="small"
          icon={<LayoutOutlined />}
          onClick={toggleSidebarVisible}
          title="切换左侧面板 (Ctrl+B)"
        />
        <Button
          size="small"
          icon={<LayoutOutlined />}
          onClick={toggleRightPanelVisible}
          title="切换右侧面板 (Ctrl+I)"
        />
      </div>
    </div>
  )
}

export default TopMenuBar
