import React from 'react'
import { MinusOutlined, BorderOutlined, CloseOutlined } from '@ant-design/icons'


interface TitleBarProps {
  title?: string
}

const TitleBar: React.FC<TitleBarProps> = ({ title = "Prime Pick" }) => {
  const handleMinimize = () => {
    try {
      window.electronAPI?.minimize?.()
    } catch (e) {
      console.error('Minimize failed:', e)
    }
  }

  const handleMaximize = () => {
    try {
      window.electronAPI?.maximize?.()
    } catch (e) {
      console.error('Maximize failed:', e)
    }
  }

  const handleClose = () => {
    try {
      window.electronAPI?.close?.()
    } catch (e) {
      console.error('Close failed:', e)
    }
  }

  return (
    <div className="h-10 shrink-0 flex items-center justify-between px-3 select-none text-slate-200 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-50"
         style={{ WebkitAppRegion: 'drag' } as any}>
      
      <div className="flex items-center gap-2 text-sm font-medium opacity-80">
        <img src="PrimePick_pure.svg" className="w-5 h-5 object-contain" draggable={false} />
        <span>{title}</span>
      </div>

      <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button 
          onClick={handleMinimize}
          className="h-10 w-12 flex items-center justify-center hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white outline-none cursor-pointer"
        >
          <MinusOutlined className="text-xs" />
        </button>
        <button 
          onClick={handleMaximize}
          className="h-10 w-12 flex items-center justify-center hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white outline-none cursor-pointer"
        >
          <BorderOutlined className="text-xs" />
        </button>
        <button 
          onClick={handleClose}
          className="h-10 w-12 flex items-center justify-center hover:bg-red-500/80 hover:text-white transition-colors text-slate-400 outline-none cursor-pointer"
        >
          <CloseOutlined className="text-xs" />
        </button>
      </div>
    </div>
  )
}

export default TitleBar
