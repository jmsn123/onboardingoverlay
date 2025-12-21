const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut,screen } = require('electron');
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

let clickThroughEnabled = true;

// Get external display (if connected)      

function getExternalDisplay() {
  const displays = screen.getAllDisplays();
  
  // Find external display (not the primary one)
  const externalDisplay = displays.find((display) => {
    return display.bounds.x !== 0 || display.bounds.y !== 0;
  });
  
  // If found, return it. Otherwise return primary display
  return externalDisplay || screen.getPrimaryDisplay();
}




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

  const targetDisplay = getExternalDisplay();
    const { x, y, width, height } = targetDisplay.bounds;
    
    console.log('📺 Creating overlay on display:', {
      x, y, width, height,
      primary: targetDisplay === screen.getPrimaryDisplay()
    });

    overlayWindow = new BrowserWindow({
      x,
      y,
      fullscreen: true,
      frame: false,
      transparent: true,
      simpleFullscreen:true,
      alwaysOnTop: true,
      hasShadow: false,
      backgroundColor:undefined,
      resizable: false,
      skipTaskbar: true,
      show: false, // Don't show until ready
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });
    console.log('✓ BrowserWindow created preload', path.join(__dirname, 'preload.js'));
    
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
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });


    
    overlayWindow.on('closed', () => {
      console.log('🗑️  Overlay window closed');
      overlayWindow = null;
    });
    
    // Initially hidden
    // overlayWindow.hide();
    overlayWindow.maximize(); // ← Use this instead of fullscreen: true

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
function toggleClickThrough() {
  if (overlayWindow) {
    clickThroughEnabled = !clickThroughEnabled;
    overlayWindow.setIgnoreMouseEvents(clickThroughEnabled, { forward: true });
    overlayWindow.webContents.send('click-through-changed', clickThroughEnabled);
  }
}
// IPC Handlers
console.log('📍 Registering IPC handlers...');
ipcMain.handle('set-mouse-passthrough', (event, passthrough) => {
  if (overlayWindow) {
    overlayWindow.setIgnoreMouseEvents(passthrough, { forward: true });
  }
})
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

ipcMain.handle('toggle-click-through', () => {
  toggleClickThrough();
  return clickThroughEnabled;
});


// App Lifecycle
// Move to specific display
ipcMain.handle('move-to-display', async (event, displayId) => {
  try {
    if (!overlayWindow || overlayWindow.isDestroyed()) return false;
    
    const displays = screen.getAllDisplays();
    const targetDisplay = displays.find(d => d.id === displayId);
    
    if (targetDisplay) {
      const { x, y, width, height } = targetDisplay.bounds;
      overlayWindow.setBounds({ x, y, width, height });
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Move to display failed:', error);
    return false;
  }
});
app.on('ready', () => {

  
  createTray();
  createOverlay();
  
  // Register global shortcut
  console.log('📍 Registering hotkey...');
  const hotkey = 'CommandOrControl+Shift+A';
  const hotkey2 = 'F8';
  const success = globalShortcut.register(hotkey, () => {
    console.log('⌨️  Toggle HotKey triggered!');
    toggleOverlay();
  });
  const success2 = globalShortcut.register(hotkey2, () => {
    console.log('⌨️  Hotkey triggered!');
    toggleClickThrough();
  });

  if (success) {
    console.log(`✓ Hotkey registered: ${hotkey}\n`);
  } else {
    console.error(`✗ Failed to register hotkey: ${hotkey}\n`);
  }
    if (success2) {
    console.log(`✓ Hotkey registered: ${hotkey2}\n`);
  } else {
    console.error(`✗ Failed to register hotkey: ${hotkey2}\n`);
  }

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
