const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  minimizeOverlay: () => ipcRenderer.invoke('minimize-overlay'),
  getState: () => ipcRenderer.invoke('get-state'),
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen')  // ADD THIS

});