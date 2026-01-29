/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    selectDirectory: () => Promise<string | null>
    readResults: (dir: string) => Promise<any>
    readGroups: (dir: string) => Promise<any>
    startCompute: (args: any) => void
    cancelCompute: () => void
    startGroup: (args: any) => void
    cancelGroup: () => void
    writeXmp: (args: any) => void
    openExternal: (url: string) => Promise<boolean>
    minimize: () => void
    maximize: () => void
    close: () => void
    openPreferencesWindow: () => void
    onComputeProgress: (callback: (data: any) => void) => () => void
    onComputeDone: (callback: (code: number) => void) => () => void
    onGroupProgress: (callback: (data: any) => void) => () => void
    onGroupDone: (callback: (code: number) => void) => () => void
    onWriteXmpProgress: (callback: (data: any) => void) => () => void
    onWriteXmpDone: (callback: (code: number) => void) => () => void
    onError: (callback: (error: { title: string; content: string }) => void) => () => void
    logInfo: (message: string) => void
    logError: (message: string) => void
  }
}
