import React, { useEffect } from 'react'
import { message } from 'antd'
import SidebarFilters from './components/SidebarFilters'
import PhotoList from './components/PhotoList'
import RightPanel from './components/RightPanel'
import ErrorBoundary from './components/ErrorBoundary'
import TitleBar from './components/TitleBar'
import { useStore } from './store/useStore'

const App: React.FC = () => {
  const { 
    setInputDir, setPhotos, setComputing, setProgress, 
    computing, inputDir 
  } = useStore()

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
      }
    })
  }

  const handleSelectDir = async () => {
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
        message.success(`已加载 ${normalized.length} 张照片`)
      } else {
        message.info('未找到结果，请开始计算。')
      }
    }
  }

  useEffect(() => {
    if (!window.electronAPI) return

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
        } else if (code !== null) { // code might be null if just initialized? No
             // If cancelled or failed
             if (code !== 0) message.warning('计算已停止')
        }
    })

    const offXmpProgress = window.electronAPI.onWriteXmpProgress((data) => {
        // Handle xmp progress if we want separate UI
    })
    
    const offXmpDone = window.electronAPI.onWriteXmpDone((code) => {
        if (code === 0) message.success('XMP 写入完成')
        else message.error('XMP 写入失败')
    })
    
    return () => {
        offProgress()
        offDone()
        offXmpProgress()
        offXmpDone()
    }
  }, [inputDir, setPhotos, setComputing, setProgress])

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-background overflow-hidden" style={{ backgroundColor: '#020617', color: '#fff' }}>
        <TitleBar title={isElectron ? "AI Photographer" : "AI Photographer (Web Mode)"} />
        <div className="flex-1 overflow-hidden p-3">
          {!isElectron && (
             <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-red-500/20 text-red-200 px-4 py-2 rounded z-50 pointer-events-none">
                Warning: Electron API not detected.
             </div>
          )}
          <div className="h-full grid grid-cols-[280px_1fr_380px] gap-3">
            <div className="app-panel overflow-hidden">
              <div className="h-full overflow-y-auto">
                <SidebarFilters onSelectDir={handleSelectDir} isElectron={isElectron} />
              </div>
            </div>

            <div className="app-panel overflow-hidden">
              <PhotoList isElectron={isElectron} />
            </div>

            <div className="app-panel overflow-hidden">
              <RightPanel isElectron={isElectron} />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
