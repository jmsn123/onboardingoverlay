const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut } = require('electron');
const path = require('path');

// ============================================
// DEBUG VERSION - VERBOSE LOGGING
// ============================================

console.log('======================================');
console.log('🔧 DEBUG MODE - Starting Electron App');
console.log('======================================');
console.log('Node version:', process.version);
console.log('Electron version:', process.versions.electron);
console.log('Chrome version:', process.versions.chrome);
console.log('Platform:', process.platform);
console.log('CWD:', process.cwd());
console.log('__dirname:', __dirname);
console.log('======================================\n');

// Window references
let tray = null;
let overlayWindow = null;

// Simple mock LLM (no dependencies)
async function getLLMResponse(message) {
  console.log('→ Mock LLM received:', message);
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    response: `Echo: ${message}`,
    timestamp: new Date().toISOString()
  };
}

// Create System Tray
function createTray() {
  console.log('📍 Creating system tray...');
  
  try {
    // Use nativeImage for cross-platform icon support
    const { nativeImage } = require('electron');
    const icon = nativeImage.createEmpty();
    
    tray = new Tray(icon);
    console.log('✓ Tray created');
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Assistant', click: () => toggleOverlay() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
    
    tray.setToolTip('Desktop Assistant');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', toggleOverlay);
    
    console.log('✓ Tray configured\n');
  } catch (error) {
    console.error('✗ Tray creation failed:', error);
    console.error('  This is OK - continuing without tray\n');
  }
}

// Create Overlay Window
function createOverlay() {
  console.log('📍 Creating overlay window...');
  
  try {
    overlayWindow = new BrowserWindow({
  
      fullscreen: true,
      frame: false,
      transparent: true,
      simpleFullscreen:true,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      show: false, // Don't show until ready
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });
    console.log('✓ BrowserWindow created');
    
    // Log when page starts loading
    overlayWindow.webContents.on('did-start-loading', () => {
      console.log('📄 Overlay: Loading HTML...');
    });
    
    // Log when page finishes loading
    overlayWindow.webContents.on('did-finish-load', () => {
      console.log('✓ Overlay: HTML loaded');
      console.log('✓ Overlay ready\n');
    });
    
    // Log any errors
    overlayWindow.webContents.on('crashed', () => {
      console.error('✗ Overlay crashed!');
    });
    
    overlayWindow.on('unresponsive', () => {
      console.error('✗ Overlay unresponsive!');
    });
    
    // Check if overlay.html exists
    const overlayPath = path.join(__dirname, 'overlay.html');
    console.log('📄 Loading:', overlayPath);
    
    overlayWindow.loadFile('overlay.html').catch(error => {
      console.error('✗ Failed to load overlay.html:', error);
      console.error('  Make sure overlay.html exists in:', __dirname);
    });
    
    overlayWindow.on('closed', () => {
      console.log('🗑️  Overlay window closed');
      overlayWindow = null;
    });
    
    // Initially hidden
    overlayWindow.hide();
    
  } catch (error) {
    console.error('✗ Overlay creation failed:', error);
  }
}

// Toggle Overlay
function toggleOverlay() {
  console.log('🔄 Toggle overlay requested');
  
  if (!overlayWindow) {
    createOverlay();
  }
  
  if (overlayWindow) {
    if (overlayWindow.isVisible()) {
      console.log('  → Hiding overlay');
      overlayWindow.hide();
    } else {
      console.log('  → Showing overlay');
      overlayWindow.show();
      overlayWindow.focus();
    }
  }
}

// IPC Handlers
console.log('📍 Registering IPC handlers...');

ipcMain.handle('minimize-overlay', () => {
  console.log('🔽 IPC: minimize-overlay');
  if (overlayWindow) overlayWindow.hide();
});

ipcMain.handle('get-state', () => {
  console.log('🔍 IPC: get-state');
  return {
    isVisible: overlayWindow ? overlayWindow.isVisible() : false,
    bounds: overlayWindow ? overlayWindow.getBounds() : null
  };
});

ipcMain.handle('send-message', async (event, message) => {
  console.log('💬 IPC: send-message');
  try {
    const response = await getLLMResponse(message);
    return response;
  } catch (error) {
    console.error('✗ Error in send-message:', error);
    return {
      response: `Error: ${error.message}`,
      timestamp: new Date().toISOString(),
      error: true
    };
  }
});

console.log('✓ IPC handlers registered\n');

// App Lifecycle
console.log('📍 Setting up app lifecycle...\n');

app.on('ready', () => {
  console.log('🚀 App is READY!');
  console.log('======================================\n');
  
  console.log('📍 Initializing components...\n');
  
  createTray();
  createOverlay();
  
  // Register global shortcut
  console.log('📍 Registering hotkey...');
  const hotkey = 'CommandOrControl+Shift+A';
  const success = globalShortcut.register(hotkey, () => {
    console.log('⌨️  Hotkey triggered!');
    toggleOverlay();
  });
  
  if (success) {
    console.log(`✓ Hotkey registered: ${hotkey}\n`);
  } else {
    console.error(`✗ Failed to register hotkey: ${hotkey}\n`);
  }
  
  console.log('======================================');
  console.log('✅ APP STARTUP COMPLETE!');
  console.log('======================================');
  console.log('Press Ctrl+Shift+A to toggle overlay');
  console.log('Or double-click the system tray icon');
  console.log('======================================\n');
});

app.on('window-all-closed', (e) => {
  console.log('🪟 All windows closed (staying in background)');
  e.preventDefault();
});

app.on('will-quit', () => {
  console.log('👋 App quitting...');
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  console.log('🔄 App activated');
  if (!overlayWindow) {
    createOverlay();
  }
});

// Error Handlers
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (error) => {
  console.error('💥 UNHANDLED REJECTION:', error);
});

console.log('✓ App lifecycle configured');
console.log('⏳ Waiting for Electron to be ready...\n');