/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    selectDirectory: () => Promise<string | null>
    readResults: (dir: string) => Promise<any>
    startCompute: (args: any) => void
    cancelCompute: () => void
    writeXmp: (args: any) => void
    minimize: () => void
    maximize: () => void
    close: () => void
    onComputeProgress: (callback: (data: any) => void) => () => void
    onComputeDone: (callback: (code: number) => void) => () => void
    onWriteXmpProgress: (callback: (data: any) => void) => () => void
    onWriteXmpDone: (callback: (code: number) => void) => () => void
  }
}
