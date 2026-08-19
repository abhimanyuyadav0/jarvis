import { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, ipcMain } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

const BACKEND_DIR = path.join(__dirname, '..', '..', 'backend')
const BACKEND_URL = 'http://localhost:8000'
const HOTKEY = 'CommandOrControl+Shift+J'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let backendProcess: ChildProcess | null = null
let wakeEnabled = false

function pythonPath(): string {
  const venvPython = path.join(BACKEND_DIR, 'venv', 'bin', 'python')
  return fs.existsSync(venvPython) ? venvPython : 'python3'
}

function startBackend(): void {
  if (backendProcess) return
  backendProcess = spawn(pythonPath(), ['run.py'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '' },
  })
  backendProcess.stdout?.on('data', (d) => console.log(`[backend] ${d}`))
  backendProcess.stderr?.on('data', (d) => console.error(`[backend] ${d}`))
  backendProcess.on('exit', (code) => {
    console.log(`[backend] exited with code ${code}`)
    backendProcess = null
  })
}

async function waitForBackend(timeoutMs = 30000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BACKEND_URL}/health`)
      if (res.ok) return true
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }

  mainWindow.on('close', (event) => {
    // Hide instead of quitting, so the app keeps running in the tray.
    if (!(app as unknown as { isQuitting?: boolean }).isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function showWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

async function setWakeEnabled(enabled: boolean): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/wake/${enabled ? 'enable' : 'disable'}`, { method: 'POST' })
    wakeEnabled = enabled
    buildTrayMenu()
  } catch (e) {
    console.error('[wake] toggle failed', e)
  }
}

function buildTrayMenu(): void {
  if (!tray) return
  const menu = Menu.buildFromTemplate([
    { label: 'Show J.A.R.V.I.S.', click: showWindow },
    { type: 'separator' },
    {
      label: 'Wake word listening',
      type: 'checkbox',
      checked: wakeEnabled,
      click: (item) => setWakeEnabled(item.checked),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        ;(app as unknown as { isQuitting: boolean }).isQuitting = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(menu)
}

function createTray(): void {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon.isEmpty() ? nativeImage.createFromNamedImage('NSComputer', []) : icon)
  tray.setToolTip('J.A.R.V.I.S.')
  tray.on('click', showWindow)
  buildTrayMenu()
}

app.on('ready', async () => {
  startBackend()
  createWindow()
  createTray()
  globalShortcut.register(HOTKEY, showWindow)
  ipcMain.on('focus-window', showWindow)

  const up = await waitForBackend()
  if (!up) {
    console.error('[backend] did not become healthy in time')
  }
})

app.on('window-all-closed', () => {
  // Keep running in the tray on all platforms — this is a background assistant.
})

app.on('activate', showWindow)

app.on('before-quit', () => {
  ;(app as unknown as { isQuitting: boolean }).isQuitting = true
  globalShortcut.unregisterAll()
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
})
