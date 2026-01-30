import { app, BrowserWindow, ipcMain, dialog, protocol, nativeImage, shell, nativeTheme } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import type { ChildProcess } from 'child_process'
import fs from 'fs'
import log from 'electron-log/main'
import crypto from 'crypto'

// Initialize logger
log.initialize()
log.errorHandler.startCatching()
log.info('Application starting...')

app.setName('Prime Pick')

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

let win: BrowserWindow | null
let prefWin: BrowserWindow | null = null
let pythonProcess: ChildProcess | null = null
let modelsProcess: ChildProcess | null = null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

const windowBgForTheme = (theme: 'dark' | 'light') => (theme === 'dark' ? '#020617' : '#ECFEFF')

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
  {
    scheme: 'thumb',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

function splitDelimited(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter((v) => v.trim().length > 0)
  if (typeof value === 'string') return value.split(';').map((v) => v.trim()).filter((v) => v.length > 0)
  return []
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (v === 'true') return true
    if (v === 'false') return false
  }
  if (typeof value === 'number') return value !== 0
  return fallback
}

function normalizeMetricsRecord(record: any) {
  const sharpnessScore = toNumber(record?.sharpness?.score ?? record?.sharpness_score, 0)
  const isBlurry = toBool(record?.sharpness?.is_blurry ?? record?.is_blurry, false)
  const exposureScore = toNumber(record?.exposure?.score ?? record?.exposure_score, 0)
  const exposureFlags = Array.isArray(record?.exposure?.flags)
    ? record.exposure.flags.map((v: any) => String(v))
    : splitDelimited(record?.exposure_flags)
  const reasons = Array.isArray(record?.reasons) ? record.reasons.map((v: any) => String(v)) : splitDelimited(record?.reasons)
  const emotion = typeof record?.emotion === 'string' ? record.emotion : ''
  const emotionScoreRaw = record?.emotion_score ?? record?.emotionScore
  const emotion_score = emotionScoreRaw === '' || emotionScoreRaw == null ? undefined : toNumber(emotionScoreRaw, 0)

  return {
    filename: String(record?.filename ?? ''),
    sharpness: { score: sharpnessScore, is_blurry: isBlurry },
    exposure: { score: exposureScore, flags: exposureFlags },
    technical_score: toNumber(record?.technical_score, 0),
    is_unusable: toBool(record?.is_unusable, false),
    reasons,
    capture_ts: toNumber(record?.capture_ts, 0),
    group_id: toNumber(record?.group_id, -1),
    group_size: toNumber(record?.group_size, 1),
    rank_in_group: toNumber(record?.rank_in_group, 1),
    is_group_best: toBool(record?.is_group_best, false),
    emotion: emotion || undefined,
    emotion_score,
  }
}

function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []

  const parseLine = (line: string) => {
    const out: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        const next = line[i + 1]
        if (inQuotes && next === '"') {
          cur += '"'
          i += 1
        } else {
          inQuotes = !inQuotes
        }
        continue
      }
      if (ch === ',' && !inQuotes) {
        out.push(cur)
        cur = ''
        continue
      }
      cur += ch
    }
    out.push(cur)
    return out
  }

  const headers = parseLine(lines[0]).map((h) => h.trim())
  const rows: Array<Record<string, string>> = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) row[headers[j]] = values[j] ?? ''
    rows.push(row)
  }
  return rows
}

function createWindow() {
  const distDir = app.isPackaged ? path.join(app.getAppPath(), 'dist') : path.join(__dirname, '../dist')
  const publicDir = app.isPackaged ? distDir : path.join(__dirname, '../public')
  const initialTheme: 'dark' | 'light' = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    icon: path.join(publicDir, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    backgroundColor: windowBgForTheme(initialTheme),
  })

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log.error('did-fail-load', { errorCode, errorDescription, validatedURL })
    dialog.showErrorBox('页面加载失败', `${errorDescription} (${errorCode})\n${validatedURL}`)
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    log.error('render-process-gone', details)
    dialog.showErrorBox('渲染进程崩溃', `${details.reason} (exitCode=${details.exitCode})`)
  })

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) log.error('renderer-console', { level, message, line, sourceId })
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(distDir, 'index.html'))
  }
}

function sendError(title: string, content: string) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('app-error', { title, content })
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    if (pythonProcess) {
        pythonProcess.kill()
    }
    if (modelsProcess) {
        modelsProcess.kill()
    }
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.whenReady().then(() => {
    const decodeLocalPathFromSchemeUrl = (rawUrl: string, scheme: 'media' | 'thumb') => {
      const u = new URL(rawUrl)
      let s = u.toString()
      const prefix = `${scheme}://local/`
      if (s.startsWith(prefix)) {
        s = s.slice(prefix.length)
      } else {
        const fallback = `${scheme}://`
        if (s.startsWith(fallback)) s = s.slice(fallback.length)
      }

      const qIndex = s.indexOf('?')
      if (qIndex >= 0) s = s.slice(0, qIndex)

      const decoded = decodeURIComponent(s)
      let filePath = decoded
      if (process.platform === 'win32') {
        if (filePath.startsWith('/') && !filePath.startsWith('//') && /^\/[a-zA-Z]:/.test(filePath)) {
          filePath = filePath.slice(1)
        }
      }
      return filePath
    }

    protocol.registerFileProtocol('media', (request, callback) => {
      try {
        let url = request.url
        log.info('Media request raw:', url)
        
        // Handle "media://local/" format (preferred) and "media://" (fallback)
        if (url.startsWith('media://local/')) {
            url = url.replace(/^media:\/\/local\//, '')
        } else {
            url = url.replace(/^media:\/\//, '')
        }

        const decoded = decodeURIComponent(url)
        let filePath = decoded

        // Fix Windows paths: 
        // 1. If path starts with slash like "/C:/Users/...", remove leading slash
        // 2. But don't remove if it's a UNC path (starts with //)
        if (process.platform === 'win32') {
            if (filePath.startsWith('/') && !filePath.startsWith('//') && /^\/[a-zA-Z]:/.test(filePath)) {
                filePath = filePath.slice(1)
            }
        }
        
        // log.info('Decoded path:', filePath)
        callback({ path: filePath })
      } catch (e) {
        log.error('Media protocol error:', e)
        callback({ error: -324 })
      }
    })

    const thumbDir = path.join(app.getPath('userData'), 'thumb_cache')
    try {
      fs.mkdirSync(thumbDir, { recursive: true })
    } catch {}

    const inFlightThumbs = new Map<string, Promise<string>>()

    const ensureThumb = async (srcPath: string, width: number, quality: number) => {
      const st = fs.statSync(srcPath)
      const keyRaw = `${srcPath}|${st.size}|${st.mtimeMs}|w=${width}|q=${quality}`
      const key = crypto.createHash('sha1').update(keyRaw).digest('hex')
      const outPath = path.join(thumbDir, `${key}.jpg`)
      if (fs.existsSync(outPath)) return outPath

      const existing = inFlightThumbs.get(outPath)
      if (existing) return existing

      const p = (async () => {
        let image = await nativeImage.createThumbnailFromPath(srcPath, { width, height: width })
        if (image.isEmpty()) {
          image = nativeImage.createFromPath(srcPath).resize({ width, height: width })
        }
        if (image.isEmpty()) {
          throw new Error('Empty thumbnail')
        }
        const buf = image.toJPEG(quality)
        if (!buf || buf.length < 16) {
          throw new Error('Invalid JPEG buffer')
        }
        fs.writeFileSync(outPath, buf)
        return outPath
      })()
        .catch(() => srcPath)
        .finally(() => inFlightThumbs.delete(outPath))

      inFlightThumbs.set(outPath, p)
      return p
    }

    protocol.registerFileProtocol('thumb', (request, callback) => {
      try {
        const u = new URL(request.url)
        const w = Number(u.searchParams.get('w') ?? 160)
        const q = Number(u.searchParams.get('q') ?? 55)
        const width = Number.isFinite(w) ? Math.min(Math.max(Math.floor(w), 64), 512) : 160
        const quality = Number.isFinite(q) ? Math.min(Math.max(Math.floor(q), 30), 85) : 55
        const srcPath = decodeLocalPathFromSchemeUrl(request.url, 'thumb')

        ensureThumb(srcPath, width, quality)
          .then((p) => callback({ path: p }))
          .catch(() => callback({ path: srcPath }))
      } catch (e) {
        log.error('Thumb protocol error:', e)
        callback({ error: -324 })
      }
    })

    createWindow()
    setupIpc()

    // Auto-check models on startup
    setTimeout(() => {
        const params = getSpawnParameters('check-models', [])
        spawnPythonProcess(null, 'check-models', params)
    }, 1500)
})

function getSpawnParameters(command: string, extraArgs: string[]) {
    if (app.isPackaged) {
        // Production: use bundled executable
        // We assume the executable is in 'resources/engine' folder
        // For Windows: photo_selector_engine.exe
        // For Mac: photo_selector_engine
        const exeName = process.platform === 'win32' ? 'photo_selector_engine.exe' : 'photo_selector_engine'
        // Using process.resourcesPath to locate the engine
        // In electron-builder, extraResources puts files in resources/
        const executable = path.join(process.resourcesPath, 'engine', exeName)
        
        return {
            cmd: executable,
            args: [command, ...extraArgs],
            cwd: path.dirname(executable),
            env: { ...process.env } // inherit env but no special python setup
        }
    } else {
        const resolvePythonExecutable = () => {
            const override = process.env.PRIMEPICK_PYTHON
            if (override && fs.existsSync(override)) return override

            const condaPrefix = process.env.CONDA_PREFIX
            if (condaPrefix) {
                const condaPy =
                    process.platform === 'win32'
                        ? path.join(condaPrefix, 'python.exe')
                        : path.join(condaPrefix, 'bin', 'python')
                if (fs.existsSync(condaPy)) return condaPy
            }

            if (process.platform === 'win32') {
                const userProfile = process.env.USERPROFILE
                const candidates = [
                    userProfile ? path.join(userProfile, '.conda', 'envs', 'photo_selector', 'python.exe') : null,
                    userProfile ? path.join(userProfile, 'miniconda3', 'envs', 'photo_selector', 'python.exe') : null,
                    userProfile ? path.join(userProfile, 'anaconda3', 'envs', 'photo_selector', 'python.exe') : null,
                ].filter(Boolean) as string[]
                for (const p of candidates) {
                    if (fs.existsSync(p)) return p
                }
            }

            return 'python'
        }

        // Development: use python script
        const projectRoot = path.resolve(__dirname, '../../') 
        const scriptPath = path.join(projectRoot, 'photo_selector/cli.py')
        
        return {
            cmd: resolvePythonExecutable(),
            args: [scriptPath, command, ...extraArgs],
            cwd: projectRoot,
            env: { ...process.env, PYTHONPATH: projectRoot, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
        }
    }
}

function spawnPythonProcess(
  event: Electron.IpcMainEvent | null,
  eventPrefix: string,
  spawnParams: { cmd: string, args: string[], cwd: string, env: any },
) {
  const isModelCheck = eventPrefix === 'check-models'
  if (isModelCheck) {
    if (modelsProcess) modelsProcess.kill()
  } else {
    if (pythonProcess) pythonProcess.kill()
  }

  const reply = (channel: string, ...args: any[]) => {
    if (event) {
      event.reply(channel, ...args)
      return
    }
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, ...args)
    }
  }

  log.info(`Spawning: ${spawnParams.cmd} ${spawnParams.args.join(' ')}`)

  const setProc = (p: ChildProcess | null) => {
    if (isModelCheck) modelsProcess = p
    else pythonProcess = p
  }
  const getProc = () => (isModelCheck ? modelsProcess : pythonProcess)

  try {
    setProc(spawn(spawnParams.cmd, spawnParams.args, {
      cwd: spawnParams.cwd,
      env: spawnParams.env,
    }))
  } catch (e: any) {
    log.error(`${eventPrefix} spawn failed`, e)
    reply(`${eventPrefix}-done`, 1)
    setProc(null)
    return
  }

  getProc()?.stdout?.on('data', (data) => {
    const lines = data.toString().split('\n')
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const json = JSON.parse(line)
        reply(`${eventPrefix}-progress`, json)
      } catch {
        if (isModelCheck) {
          reply(`${eventPrefix}-progress`, { type: 'log', line })
        } else {
          log.info(`${eventPrefix} stdout:`, line)
        }
      }
    }
  })

  getProc()?.stderr?.on('data', (data) => {
    const msg = data.toString()
    log.error(`${eventPrefix} stderr: ${msg}`)
  })

  getProc()?.on('close', (code) => {
    log.info(`${eventPrefix} finished with code:`, code)
    reply(`${eventPrefix}-done`, code)
    setProc(null)
  })
}

function setupIpc() {
    ipcMain.on('window-minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize())
    ipcMain.on('window-maximize', (event) => {
        const w = BrowserWindow.fromWebContents(event.sender)
        if (!w) return
        if (w.isMaximized()) w.unmaximize()
        else w.maximize()
    })
    ipcMain.on('window-close', (event) => BrowserWindow.fromWebContents(event.sender)?.close())
    ipcMain.on('set-window-theme', (event, theme: unknown) => {
        const t: 'dark' | 'light' = theme === 'light' ? 'light' : 'dark'
        const w = BrowserWindow.fromWebContents(event.sender)
        if (w && !w.isDestroyed()) w.setBackgroundColor(windowBgForTheme(t))
    })

    ipcMain.handle('open-external', async (_event, url: unknown) => {
        const u = typeof url === 'string' ? url.trim() : ''
        if (!u) return false
        if (!/^https?:\/\//i.test(u)) return false
        await shell.openExternal(u)
        return true
    })

    ipcMain.on('open-preferences-window', () => {
        if (!win || win.isDestroyed()) return
        if (prefWin && !prefWin.isDestroyed()) {
            prefWin.focus()
            return
        }

        const distDir = app.isPackaged ? path.join(app.getAppPath(), 'dist') : path.join(__dirname, '../dist')
        const publicDir = app.isPackaged ? distDir : path.join(__dirname, '../public')
        const initialTheme: 'dark' | 'light' = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'

        prefWin = new BrowserWindow({
            width: 980,
            height: 900,
            minWidth: 840,
            minHeight: 700,
            parent: win,
            modal: false,
            show: true,
            icon: path.join(publicDir, 'icon.png'),
            webPreferences: {
                preload: path.join(__dirname, 'preload.cjs'),
                sandbox: false,
                contextIsolation: true,
                nodeIntegration: false,
            },
            titleBarStyle: 'hidden',
            autoHideMenuBar: true,
            backgroundColor: windowBgForTheme(initialTheme),
        })

        prefWin.on('closed', () => {
            prefWin = null
        })

        if (VITE_DEV_SERVER_URL) {
            prefWin.loadURL(`${VITE_DEV_SERVER_URL}#/preferences`)
        } else {
            prefWin.loadFile(path.join(distDir, 'index.html'), { hash: '/preferences' })
        }
    })

    ipcMain.handle('select-directory', async () => {
        const result = await dialog.showOpenDialog(win!, {
            properties: ['openDirectory']
        })
        if (result.canceled) return null
        return result.filePaths[0]
    })

    ipcMain.handle('read-results', async (_, dirPath) => {
        const jsonPath = path.join(dirPath, 'results.json')
        if (fs.existsSync(jsonPath)) {
            try {
                const data = fs.readFileSync(jsonPath, 'utf-8')
                const parsed = JSON.parse(data)
                if (Array.isArray(parsed)) return parsed.map(normalizeMetricsRecord)
                return parsed
            } catch (e) {
                log.error("Failed to read results.json", e)
                return null
            }
        }
        const csvPath = path.join(dirPath, 'results.csv')
        if (fs.existsSync(csvPath)) {
          try {
            const data = fs.readFileSync(csvPath, 'utf-8')
            const parsed = parseCsv(data)
            return parsed.map(normalizeMetricsRecord)
          } catch (e) {
            log.error("Failed to read results.csv", e)
            return null
          }
        }
        return null
    })

    ipcMain.handle('read-groups', async (_, dirPath) => {
        const groupsPath = path.join(dirPath, 'groups.json')
        if (!fs.existsSync(groupsPath)) return null
        try {
            const data = fs.readFileSync(groupsPath, 'utf-8')
            return JSON.parse(data)
        } catch (e) {
            log.error("Failed to read groups.json", e)
            return null
        }
    })

    ipcMain.on('start-compute', (event, args) => {
        const { inputDir, profile, config, rebuildCache, workers } = args
        const configPath = path.join(app.getPath('userData'), 'temp_config.json')
        fs.writeFileSync(configPath, JSON.stringify(config))

        const cliArgs = [
            '--input-dir', inputDir,
            '--profile', profile,
            '--config-json', configPath
        ]

        if (rebuildCache) cliArgs.push('--rebuild-cache')
        if (typeof workers === 'number') cliArgs.push('--workers', String(workers))

        const params = getSpawnParameters('compute', cliArgs)
        spawnPythonProcess(event, 'compute', params)
    })

    ipcMain.on('start-group', (event, args) => {
        const { inputDir, params } = args

        const p = params ?? {}
        const cliArgs = [
            '--input-dir', inputDir,
            '--output-dir', inputDir,
            '--embed-model', String(p.embedModel ?? 'mobilenet_v3_small'),
            '--thumb-long-edge', String(p.thumbLongEdge ?? 256),
            '--eps', String(p.eps ?? 0.12),
            '--min-samples', String(p.minSamples ?? 2),
            '--neighbor-window', String(p.neighborWindow ?? 80),
            '--time-window-secs', String(p.timeWindowSecs ?? 6),
            '--time-source', String(p.timeSource ?? 'auto'),
            '--topk', String(p.topk ?? 2),
            '--workers', String(p.workers ?? 4),
            '--batch-size', String(p.batchSize ?? 32),
        ]
        const spawnParams = getSpawnParameters('group', cliArgs)
        spawnPythonProcess(event, 'group', spawnParams)
    })

    ipcMain.on('check-models', (event, args) => {
        const force = Boolean(args?.force)
        const cliArgs = force ? ['--force'] : []
        const params = getSpawnParameters('check-models', cliArgs)
        spawnPythonProcess(event, 'check-models', params)
    })

    ipcMain.on('cancel-compute', () => {
        if (pythonProcess) {
            pythonProcess.kill()
            pythonProcess = null
        }
    })

    ipcMain.on('cancel-group', () => {
        if (pythonProcess) {
            pythonProcess.kill()
            pythonProcess = null
        }
    })
    
    ipcMain.on('write-xmp', (event, args) => {
        const { inputDir, selection, config, onlySelected } = args
        const selectionPath = path.join(app.getPath('userData'), 'temp_selection.json')
        fs.writeFileSync(selectionPath, JSON.stringify(selection))
        
        const configPath = path.join(app.getPath('userData'), 'temp_config.json')
        fs.writeFileSync(configPath, JSON.stringify(config))
        
        const cliArgs = [
            '--input-dir', inputDir,
            '--selection-file', selectionPath,
            '--config-json', configPath
        ]
        if (onlySelected) cliArgs.push('--only-selected')
        
        const params = getSpawnParameters('write-xmp', cliArgs)
        spawnPythonProcess(event, 'write-xmp', params)
    })

    // Logging IPC
    ipcMain.on('log-info', (_, message) => log.info(message))
    ipcMain.on('log-error', (_, message) => log.error(message))
}
