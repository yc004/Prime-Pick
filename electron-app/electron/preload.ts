import { contextBridge, ipcRenderer } from 'electron'

console.log('Preload script loaded')

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readResults: (dir: string) => ipcRenderer.invoke('read-results', dir),
  readGroups: (dir: string) => ipcRenderer.invoke('read-groups', dir),
  startCompute: (args: any) => ipcRenderer.send('start-compute', args),
  cancelCompute: () => ipcRenderer.send('cancel-compute'),
  startGroup: (args: any) => ipcRenderer.send('start-group', args),
  cancelGroup: () => ipcRenderer.send('cancel-group'),
  writeXmp: (args: any) => ipcRenderer.send('write-xmp', args),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  openPreferencesWindow: () => ipcRenderer.send('open-preferences-window'),
  
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

  onGroupProgress: (callback: (data: any) => void) => {
      const handler = (_: any, data: any) => callback(data)
      ipcRenderer.on('group-progress', handler)
      return () => ipcRenderer.off('group-progress', handler)
  },
  onGroupDone: (callback: (code: number) => void) => {
      const handler = (_: any, code: number) => callback(code)
      ipcRenderer.on('group-done', handler)
      return () => ipcRenderer.off('group-done', handler)
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
