const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();

// Window references
let tray = null;
let overlayWindow = null;

// Shell: System Tray Management
function createTray() {
  // Using a simple data URL for demo (in production, use actual icon file)
  const icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  tray = new Tray(path.join(__dirname, 'icon.png')); // Will fallback gracefully
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show Assistant', 
      click: () => toggleOverlay()
    },
    { 
      label: 'Settings', 
      click: () => console.log('Settings clicked')
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => app.quit()
    }
  ]);
  
  tray.setToolTip('Desktop Assistant');
  tray.setContextMenu(contextMenu);
  
  // Double-click to toggle overlay
  tray.on('double-click', toggleOverlay);
}

// Overlay: Floating Assistant Window
function createOverlay() {
  overlayWindow = new BrowserWindow({
    width: 400,
    height: 600,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  overlayWindow.loadFile('overlay.html');
  
  // Remember position
  const bounds = store.get('overlayBounds');
  if (bounds) {
    overlayWindow.setBounds(bounds);
  }
  
  // Save position on move
  overlayWindow.on('moved', () => {
    store.set('overlayBounds', overlayWindow.getBounds());
  });
  
  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
  
  // Initially hidden
  overlayWindow.hide();
}

// Toggle overlay visibility
function toggleOverlay() {
  if (!overlayWindow) {
    createOverlay();
  }
  
  if (overlayWindow.isVisible()) {
    overlayWindow.hide();
  } else {
    overlayWindow.show();
    overlayWindow.focus();
  }
}

// IPC Handlers
ipcMain.handle('minimize-overlay', () => {
  if (overlayWindow) overlayWindow.hide();
});

ipcMain.handle('get-state', () => {
  return {
    isVisible: overlayWindow ? overlayWindow.isVisible() : false,
    bounds: overlayWindow ? overlayWindow.getBounds() : null
  };
});

ipcMain.handle('send-message', async (event, message) => {
  // Simulate assistant response
  return {
    response: `Echo: ${message}`,
    timestamp: new Date().toISOString()
  };
});

// App Lifecycle
app.whenReady().then(() => {
  createTray();
  createOverlay();
  
  // Global hotkey: Ctrl+Shift+A
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    toggleOverlay();
  });
});

app.on('window-all-closed', (e) => {
  // Keep running in background (system tray)
  e.preventDefault();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (!overlayWindow) {
    createOverlay();
  }
});