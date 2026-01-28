import { contextBridge, ipcRenderer } from 'electron'

console.log('Preload script loaded')

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readResults: (dir: string) => ipcRenderer.invoke('read-results', dir),
  startCompute: (args: any) => ipcRenderer.send('start-compute', args),
  cancelCompute: () => ipcRenderer.send('cancel-compute'),
  writeXmp: (args: any) => ipcRenderer.send('write-xmp', args),
  
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  onComputeProgress: (callback: (data: any) => void) => {
      const handler = (_: any, data: any) => callback(data)
      ipcRenderer.on('compute-progress', handler)
      return () => ipcRenderer.off('compute-progress', handler)
  },
  onComputeDone: (callback: (code: number) => void) => {
      const handler = (_: any, code: number) => callback(code)
      ipcRenderer.on('compute-done', handler)
      return () => ipcRenderer.off('compute-done', handler)
  },
  
  onWriteXmpProgress: (callback: (data: any) => void) => {
      const handler = (_: any, data: any) => callback(data)
      ipcRenderer.on('write-xmp-progress', handler)
      return () => ipcRenderer.off('write-xmp-progress', handler)
  },
  onWriteXmpDone: (callback: (code: number) => void) => {
      const handler = (_: any, code: number) => callback(code)
      ipcRenderer.on('write-xmp-done', handler)
      return () => ipcRenderer.off('write-xmp-done', handler)
  },

  onError: (callback: (error: { title: string; content: string }) => void) => {
    const handler = (_: any, error: any) => callback(error)
    ipcRenderer.on('app-error', handler)
    return () => ipcRenderer.off('app-error', handler)
  },

  // Logging
  logInfo: (message: string) => ipcRenderer.send('log-info', message),
  logError: (message: string) => ipcRenderer.send('log-error', message)
})
