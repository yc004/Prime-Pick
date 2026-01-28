import React, { useCallback, useEffect } from 'react'
import { message, Modal } from 'antd'
import SidebarFilters from './components/SidebarFilters'
import PhotoList from './components/PhotoList'
import RightPanel from './components/RightPanel'
import GroupedView from './components/GroupedView'
import ErrorBoundary from './components/ErrorBoundary'
import TitleBar from './components/TitleBar'
import TopMenuBar from './components/TopMenuBar'
import { useStore } from './store/useStore'
import { shallow } from 'zustand/shallow'

const App: React.FC = () => {
  const { 
    setInputDir, setPhotos, setGroups, setComputing, setProgress,
    setGrouping, setGroupProgress,
    inputDir,
    viewMode,
    sidebarVisible,
    rightPanelVisible,
  } = useStore(
    (s) => ({
      setInputDir: s.setInputDir,
      setPhotos: s.setPhotos,
      setGroups: s.setGroups,
      setComputing: s.setComputing,
      setProgress: s.setProgress,
      setGrouping: s.setGrouping,
      setGroupProgress: s.setGroupProgress,
      inputDir: s.inputDir,
      viewMode: s.viewMode,
      sidebarVisible: s.sidebarVisible,
      rightPanelVisible: s.rightPanelVisible,
    }),
    shallow,
  )

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI

  const normalizeResults = (results: any): any[] => {
    if (!Array.isArray(results)) return []
    return results.map((r) => {
      const reasons = Array.isArray(r?.reasons)
        ? r.reasons
        : typeof r?.reasons === 'string'
          ? r.reasons.split(';').map((v: string) => v.trim()).filter((v: string) => v.length > 0)
          : []
      const exposureFlags = Array.isArray(r?.exposure?.flags)
        ? r.exposure.flags
        : typeof r?.exposure_flags === 'string'
          ? r.exposure_flags.split(';').map((v: string) => v.trim()).filter((v: string) => v.length > 0)
          : []
      const sharpness = r?.sharpness?.score != null
        ? r.sharpness
        : { score: Number(r?.sharpness_score ?? 0), is_blurry: Boolean(r?.is_blurry) }
      const exposure = r?.exposure?.score != null
        ? r.exposure
        : { score: Number(r?.exposure_score ?? 0), flags: exposureFlags }
      return {
        filename: String(r?.filename ?? ''),
        technical_score: Number(r?.technical_score ?? 0),
        is_unusable: Boolean(r?.is_unusable),
        reasons,
        sharpness,
        exposure,
        group_id: typeof r?.group_id === 'number' ? r.group_id : Number(r?.group_id ?? -1),
        group_size: typeof r?.group_size === 'number' ? r.group_size : Number(r?.group_size ?? 1),
        rank_in_group: typeof r?.rank_in_group === 'number' ? r.rank_in_group : Number(r?.rank_in_group ?? 1),
        is_group_best: typeof r?.is_group_best === 'boolean' ? r.is_group_best : String(r?.is_group_best).toLowerCase() === 'true',
      }
    })
  }

  const handleSelectDir = useCallback(async () => {
    if (!window.electronAPI) {
        message.warning("Electron API 不可用，请检查环境")
        return
    }
    const dir = await window.electronAPI.selectDirectory()
    if (dir) {
      setInputDir(dir)
      // Try load existing results
      const results = await window.electronAPI.readResults(dir)
      const normalized = normalizeResults(results)
      if (normalized.length > 0) {
        setPhotos(normalized)
        const groups = await window.electronAPI.readGroups(dir)
        setGroups(groups)
        message.success(`已加载 ${normalized.length} 张照片`)
      } else {
        message.info('未找到结果，请开始计算。')
        setGroups(null)
      }
    }
  }, [setInputDir, setPhotos, setGroups])

  const handleReloadResults = useCallback(async () => {
    if (!window.electronAPI) {
      message.warning("Electron API 不可用，请检查环境")
      return
    }
    if (!inputDir) return
    const results = await window.electronAPI.readResults(inputDir)
    const normalized = normalizeResults(results)
    setPhotos(normalized)
    const groups = await window.electronAPI.readGroups(inputDir)
    setGroups(groups)
    message.success(`已重载 ${normalized.length} 张照片`)
  }, [inputDir, setGroups, setPhotos])

  useEffect(() => {
    if (!window.electronAPI) return

    // Global Error Listeners
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        console.error("Unhandled Rejection:", event.reason)
        Modal.error({
            title: '操作失败',
            content: `发生未知错误: ${event.reason?.message || event.reason || 'Unknown error'}`,
        })
    }

    const handleGlobalError = (event: ErrorEvent) => {
        console.error("Global Error:", event.error)
        Modal.error({
            title: '程序错误',
            content: `发生错误: ${event.message}`,
        })
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleGlobalError)

    // Listeners
    const offProgress = window.electronAPI.onComputeProgress((data) => {
       if (data.type === 'progress') {
           setProgress({ done: data.done, total: data.total })
       }
    })
    
    const offDone = window.electronAPI.onComputeDone((code) => {
        setComputing(false)
        setProgress(null)
        if (code === 0 && inputDir) {
            message.success('计算完成')
            window.electronAPI.readResults(inputDir).then(res => {
                if (res) setPhotos(res)
            })
            window.electronAPI.readGroups(inputDir).then((g) => setGroups(g))
        } else if (code !== null) { // code might be null if just initialized? No
             // If cancelled or failed
             if (code !== 0) message.warning('计算已停止')
        }
    })

    const offGroupProgress = window.electronAPI.onGroupProgress((data) => {
        if (data?.type === 'group') {
            if (data?.stage === 'embedding') {
                setGroupProgress({ stage: 'embedding', done: data.done, total: data.total, cache_hit: data.cache_hit })
            } else if (data?.stage === 'clustering') {
                setGroupProgress({ stage: `clustering/${data.phase ?? ''}`, done: data.done, total: data.total })
            } else if (data?.stage === 'write') {
                setGroupProgress({ stage: 'write', done: data.done, total: data.total })
            }
        }
    })

    const offGroupDone = window.electronAPI.onGroupDone((code) => {
        setGrouping(false)
        setGroupProgress(null)
        if (code === 0 && inputDir) {
            message.success('相似分组完成')
            window.electronAPI.readResults(inputDir).then(res => {
                if (res) setPhotos(res)
            })
            window.electronAPI.readGroups(inputDir).then((g) => setGroups(g))
        } else if (code !== null) {
            if (code !== 0) message.error('相似分组失败')
        }
    })

    const offXmpProgress = window.electronAPI.onWriteXmpProgress(() => {
        // Handle xmp progress if we want separate UI
    })
    
    const offXmpDone = window.electronAPI.onWriteXmpDone((code) => {
        if (code === 0) message.success('XMP 写入完成')
        else message.error('XMP 写入失败')
    })
    
    const offError = window.electronAPI.onError((error) => {
        Modal.error({
            title: error.title,
            content: error.content,
        })
    })

    return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection)
        window.removeEventListener('error', handleGlobalError)
        offProgress()
        offDone()
        offGroupProgress()
        offGroupDone()
        offXmpProgress()
        offXmpDone()
        offError()
    }
  }, [inputDir, setPhotos, setGroups, setComputing, setProgress, setGrouping, setGroupProgress])

  useEffect(() => {
    const isEditable = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      if (!el) return false
      const tag = el.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
      return Boolean(el.getAttribute?.('contenteditable') === 'true')
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return

      const cmdOrCtrl = e.ctrlKey || e.metaKey
      if (!cmdOrCtrl) return

      const key = e.key.toLowerCase()
      const state = useStore.getState()

      if (key === 'o') {
        e.preventDefault()
        handleSelectDir()
        return
      }
      if (key === 'r') {
        e.preventDefault()
        handleReloadResults()
        return
      }
      if (key === '1') {
        e.preventDefault()
        state.setViewMode('all')
        return
      }
      if (key === '2') {
        e.preventDefault()
        state.setViewMode('grouped')
        return
      }
      if (key === 'b') {
        e.preventDefault()
        state.toggleSidebarVisible()
        return
      }
      if (key === 'i') {
        e.preventDefault()
        state.toggleRightPanelVisible()
        return
      }
      if (key === 'enter') {
        e.preventDefault()
        if (!state.inputDir || !window.electronAPI) return
        if (state.computing) {
          window.electronAPI.cancelCompute()
          state.setComputing(false)
          state.setProgress(null)
          return
        }
        window.electronAPI.startCompute({
          inputDir: state.inputDir,
          profile: state.profile,
          config: state.config,
          rebuildCache: state.rebuildCache,
        })
        state.setComputing(true)
        return
      }
      if (key === 'g') {
        e.preventDefault()
        if (!state.inputDir || !window.electronAPI) return
        if (state.grouping) {
          window.electronAPI.cancelGroup()
          state.setGrouping(false)
          state.setGroupProgress(null)
          return
        }
        state.setGrouping(true)
        state.setGroupProgress(null)
        window.electronAPI.startGroup({
          inputDir: state.inputDir,
          params: state.groupingParams,
        })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleReloadResults, handleSelectDir])

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-background overflow-hidden" style={{ backgroundColor: '#020617', color: '#fff' }}>
        <TitleBar title={isElectron ? "Prime Pick" : "Prime Pick (Web Mode)"} />
        <TopMenuBar isElectron={isElectron} onSelectDir={handleSelectDir} onReloadResults={handleReloadResults} />
        <div className="flex-1 overflow-hidden p-3">
          {!isElectron && (
             <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-500/20 text-red-200 px-4 py-2 rounded z-50 pointer-events-none">
                Warning: Electron API not detected.
             </div>
          )}
          <div
            className={[
              'h-full grid gap-3',
              sidebarVisible && rightPanelVisible
                ? 'grid-cols-[280px_1fr_380px]'
                : sidebarVisible
                  ? 'grid-cols-[280px_1fr]'
                  : rightPanelVisible
                    ? 'grid-cols-[1fr_380px]'
                    : 'grid-cols-[1fr]',
            ].join(' ')}
          >
            {sidebarVisible && (
              <div className="app-panel overflow-hidden">
                <div className="h-full overflow-y-auto">
                  <SidebarFilters onSelectDir={handleSelectDir} isElectron={isElectron} />
                </div>
              </div>
            )}

            <div className="app-panel overflow-hidden">
              {viewMode === 'grouped' ? <GroupedView isElectron={isElectron} /> : <PhotoList isElectron={isElectron} />}
            </div>

            {rightPanelVisible && (
              <div className="app-panel overflow-hidden">
                <RightPanel isElectron={isElectron} />
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
