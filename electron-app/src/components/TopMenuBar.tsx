import React, { useMemo } from 'react'
import { Button, Dropdown, Modal, Segmented, Tag, Typography } from 'antd'
import type { MenuProps } from 'antd'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BorderOutlined,
  CloseOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  LayoutOutlined,
  MinusOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  StopOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { shallow } from 'zustand/shallow'
import { useStore } from '../store/useStore'

interface Props {
  isElectron: boolean
  onSelectDir: () => void
  onReloadResults: () => void
}

const TopMenuBar: React.FC<Props> = ({ isElectron, onSelectDir, onReloadResults }) => {
  const {
    inputDir,
    viewMode,
    setViewMode,
    rightPanelVisible,
    toggleRightPanelVisible,
    photoLayout,
    setPhotoLayout,
    selectedPhotos,
    photos,
    selectAll,
    clearSelection,
    computing,
    setComputing,
    setProgress,
    grouping,
    setGrouping,
    setGroupProgress,
    profile,
    config,
    rebuildCache,
    computeWorkers,
    groupingParams,
    setWritingXmp,
  } = useStore(
    (s) => ({
      inputDir: s.inputDir,
      viewMode: s.viewMode,
      setViewMode: s.setViewMode,
      rightPanelVisible: s.rightPanelVisible,
      toggleRightPanelVisible: s.toggleRightPanelVisible,
      photoLayout: s.photoLayout,
      setPhotoLayout: s.setPhotoLayout,
      selectedPhotos: s.selectedPhotos,
      photos: s.photos,
      selectAll: s.selectAll,
      clearSelection: s.clearSelection,
      computing: s.computing,
      setComputing: s.setComputing,
      setProgress: s.setProgress,
      grouping: s.grouping,
      setGrouping: s.setGrouping,
      setGroupProgress: s.setGroupProgress,
      profile: s.profile,
      config: s.config,
      rebuildCache: s.rebuildCache,
      computeWorkers: s.computeWorkers,
      groupingParams: s.groupingParams,
      setWritingXmp: s.setWritingXmp,
    }),
    shallow,
  )

  const folderLabel = useMemo(() => {
    if (!inputDir) return '未选择文件夹'
    return inputDir.split(/[/\\]/).pop() || inputDir
  }, [inputDir])

  const handleAbout = () => {
    const repoUrl = 'https://github.com/yc004/Prime-Pick'
    const licenseUrl = `${repoUrl}/blob/main/LICENSE`
    const open = (url: string) => {
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(url)
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    }

    Modal.info({
      title: <div className="text-text font-semibold">关于 Prime Pick</div>,
      icon: null,
      centered: true,
      maskClosable: true,
      okText: '关闭',
      width: 560,
      styles: {
        container: {
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 14,
          boxShadow: '0 18px 60px rgba(0,0,0,0.35)',
        },
        header: {
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          borderRadius: '14px 14px 0 0',
          paddingTop: 14,
          paddingBottom: 12,
        },
        body: {
          background: 'var(--color-surface)',
          paddingTop: 12,
        },
        footer: {
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          borderRadius: '0 0 14px 14px',
        },
      },
      content: (
        <div className="text-text">
          <div className="text-sm leading-relaxed text-text">
            批量评估照片技术质量（清晰度/曝光等），支持相似分组与 XMP sidecar 写入（Lightroom 工作流）。
          </div>
          <div className="mt-3 app-panel p-3">
            <div className="grid grid-cols-[84px_1fr] gap-y-2 gap-x-3 text-sm">
              <div className="text-muted">仓库</div>
              <div className="truncate">
                <Typography.Link onClick={() => open(repoUrl)} className="!text-text">
                  {repoUrl}
                </Typography.Link>
              </div>
              <div className="text-muted">协议</div>
              <div className="truncate">
                <Typography.Link onClick={() => open(licenseUrl)} className="!text-text">
                  GNU GPLv3
                </Typography.Link>
              </div>
              <div className="text-muted">技术栈</div>
              <div className="text-text">Electron + React（桌面端）· Python（计算/写入）</div>
            </div>
          </div>
        </div>
      ),
    })
  }

  const helpMenu: MenuProps['items'] = [
    {
      key: 'help.shortcuts',
      label: '快捷键',
      children: [
        { key: 'help.shortcuts.open', label: '打开文件夹：Ctrl+O', disabled: true },
        { key: 'help.shortcuts.reload', label: '重载结果：Ctrl+R', disabled: true },
        { key: 'help.shortcuts.viewAll', label: '全部照片：Ctrl+1', disabled: true },
        { key: 'help.shortcuts.viewGrouped', label: '相似分组：Ctrl+2', disabled: true },
        { key: 'help.shortcuts.togglePreview', label: '切换右侧预览：Ctrl+I', disabled: true },
        { key: 'help.shortcuts.preferences', label: '偏好设置：Ctrl+,', disabled: true },
        { key: 'help.shortcuts.selection', label: '选择：Ctrl 多选 · Shift 连选', disabled: true },
      ],
    },
    { key: 'help.about', label: '关于 Prime Pick', icon: <InfoCircleOutlined /> },
  ]

  const canRun = Boolean(isElectron && inputDir && window.electronAPI)
  const canWriteSelected = Boolean(canRun && selectedPhotos.size > 0)
  const canWriteAll = Boolean(canRun && photos.length > 0)

  const handleStartCompute = () => {
    if (!canRun) return
    window.electronAPI.startCompute({ inputDir, profile, config, rebuildCache, workers: computeWorkers })
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
    setWritingXmp(true)
  }

  const fileMenu: MenuProps['items'] = [
    { key: 'file.open', label: '打开文件夹… (Ctrl+O)', icon: <FolderOpenOutlined /> },
    { key: 'file.reload', label: '重新加载结果 (Ctrl+R)', icon: <ReloadOutlined />, disabled: !inputDir },
    { type: 'divider' },
    {
      key: 'file.export',
      label: '导出',
      children: [
        { key: 'file.export.xmpSelected', label: '写入 XMP（选中）', icon: <FileTextOutlined />, disabled: !canWriteSelected },
        { key: 'file.export.xmpAll', label: '写入 XMP（全部）', icon: <FileTextOutlined />, disabled: !canWriteAll },
      ],
    },
    { type: 'divider' },
    { key: 'file.quit', label: '退出', danger: true, disabled: !isElectron },
  ]

  const editMenu: MenuProps['items'] = [
    { key: 'edit.selectAll', label: '全选', disabled: !isElectron || photos.length === 0 },
    { key: 'edit.clearSelection', label: '取消选择', disabled: !isElectron || selectedPhotos.size === 0 },
  ]

  const viewMenu: MenuProps['items'] = [
    {
      key: 'view.mode',
      label: '模式',
      children: [
        { key: 'view.mode.all', label: '全部照片 (Ctrl+1)' },
        { key: 'view.mode.grouped', label: '相似分组 (Ctrl+2)' },
      ],
    },
    {
      key: 'view.layout',
      label: '布局',
      children: [
        { key: 'view.layout.list', label: '列表', icon: <UnorderedListOutlined /> },
        { key: 'view.layout.grid', label: '宫格', icon: <AppstoreOutlined /> },
      ],
    },
    { type: 'divider' },
    {
      key: 'view.panels',
      label: '面板',
      children: [
        {
          key: 'view.panels.right',
          label: `${rightPanelVisible ? '隐藏' : '显示'}右侧面板 (Ctrl+I)`,
          icon: <LayoutOutlined />,
        },
      ],
    },
  ]

  const toolsMenu: MenuProps['items'] = [
    {
      key: 'tools.compute',
      label: '计算',
      children: [
        {
          key: 'tools.compute.toggle',
          label: computing ? '停止计算' : '开始计算',
          icon: computing ? <StopOutlined /> : <PlayCircleOutlined />,
          disabled: !canRun,
        },
      ],
    },
    {
      key: 'tools.group',
      label: '相似分组',
      children: [
        {
          key: 'tools.group.toggle',
          label: grouping ? '停止分组' : '开始分组',
          icon: grouping ? <StopOutlined /> : <ApartmentOutlined />,
          disabled: !canRun,
        },
      ],
    },
    { type: 'divider' },
    { key: 'tools.preferences', label: '偏好设置 (Ctrl+,)', icon: <SettingOutlined /> },
  ]

  const onMenuClick: MenuProps['onClick'] = ({ key }) => {
    const k = String(key)

    if (k === 'file.open') onSelectDir()
    if (k === 'file.reload') onReloadResults()
    if (k === 'file.export.xmpSelected') handleWriteXmp(true)
    if (k === 'file.export.xmpAll') handleWriteXmp(false)
    if (k === 'file.quit') window.electronAPI?.close?.()

    if (k === 'edit.selectAll') selectAll()
    if (k === 'edit.clearSelection') clearSelection()

    if (k === 'view.mode.all') setViewMode('all')
    if (k === 'view.mode.grouped') setViewMode('grouped')
    if (k === 'view.layout.list') setPhotoLayout('list')
    if (k === 'view.layout.grid') setPhotoLayout('grid')
    if (k === 'view.panels.right') toggleRightPanelVisible()

    if (k === 'tools.compute.toggle') (computing ? handleCancelCompute() : handleStartCompute())
    if (k === 'tools.group.toggle') (grouping ? handleCancelGroup() : handleStartGroup())
    if (k === 'tools.preferences') window.electronAPI?.openPreferencesWindow?.()

    if (k === 'help.about') handleAbout()
  }

  const handleMinimize = () => {
    try {
      window.electronAPI?.minimize?.()
    } catch {}
  }

  const handleMaximize = () => {
    try {
      window.electronAPI?.maximize?.()
    } catch {}
  }

  const handleClose = () => {
    try {
      window.electronAPI?.close?.()
    } catch {}
  }

  return (
    <div
      className="h-11 shrink-0 flex items-center gap-2 px-3 bg-surface/90 backdrop-blur-md border-b border-border select-none"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center gap-2 min-w-0">
        <img src="PrimePick_pure.svg" className="w-5 h-5 object-contain" draggable={false} />
        <span className="text-sm font-medium text-text/80">Prime Pick</span>
      </div>

      <div className="flex items-center gap-2 min-w-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <Dropdown menu={{ items: fileMenu, onClick: onMenuClick }} trigger={['click']}>
          <Button size="small" type="text" className="!text-text hover:!bg-secondary/60">
            文件
          </Button>
        </Dropdown>
        <Dropdown menu={{ items: editMenu, onClick: onMenuClick }} trigger={['click']}>
          <Button size="small" type="text" className="!text-text hover:!bg-secondary/60">
            编辑
          </Button>
        </Dropdown>
        <Dropdown
          menu={{
            items: viewMenu,
            onClick: onMenuClick,
            selectable: true,
            multiple: true,
            selectedKeys: [`view.mode.${viewMode}`, `view.layout.${photoLayout}`],
          }}
          trigger={['click']}
        >
          <Button size="small" type="text" className="!text-text hover:!bg-secondary/60">
            视图
          </Button>
        </Dropdown>
        <Dropdown menu={{ items: toolsMenu, onClick: onMenuClick }} trigger={['click']}>
          <Button size="small" type="text" className="!text-text hover:!bg-secondary/60">
            工具
          </Button>
        </Dropdown>
        <Dropdown menu={{ items: helpMenu, onClick: onMenuClick }} trigger={['click']}>
          <Button size="small" type="text" className="!text-text hover:!bg-secondary/60">
            帮助
          </Button>
        </Dropdown>

        <div className="h-4 w-[1px] bg-border mx-1" />

        <Tag color="blue" className="m-0 max-w-[220px] truncate" title={inputDir ?? undefined}>
          {folderLabel}
        </Tag>
      </div>

      <div className="flex-1 min-w-0" />

      <div className="flex items-center gap-2 justify-end" style={{ WebkitAppRegion: 'no-drag' } as any}>
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
          onClick={toggleRightPanelVisible}
          title="切换右侧面板 (Ctrl+I)"
        />
        <Button size="small" icon={<SettingOutlined />} onClick={() => window.electronAPI?.openPreferencesWindow?.()} title="偏好设置 (Ctrl+,)" />

        <div className="h-5 w-[1px] bg-border mx-1" />

        <button
          onClick={handleMinimize}
          className="h-10 w-10 flex items-center justify-center hover:bg-secondary/60 transition-colors text-muted hover:text-text outline-none cursor-pointer rounded-md"
          disabled={!isElectron}
        >
          <MinusOutlined className="text-xs" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-10 w-10 flex items-center justify-center hover:bg-secondary/60 transition-colors text-muted hover:text-text outline-none cursor-pointer rounded-md"
          disabled={!isElectron}
        >
          <BorderOutlined className="text-xs" />
        </button>
        <button
          onClick={handleClose}
          className="h-10 w-10 flex items-center justify-center hover:bg-red-500/80 hover:text-white transition-colors text-muted outline-none cursor-pointer rounded-md"
          disabled={!isElectron}
        >
          <CloseOutlined className="text-xs" />
        </button>
      </div>
    </div>
  )
}

export default TopMenuBar
