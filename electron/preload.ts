import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('jarvis', {
  focusWindow: () => ipcRenderer.send('focus-window'),
})
