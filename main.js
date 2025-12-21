const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

let mainWindow;
let assistantWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false
  });

  mainWindow.loadFile('overlay.html');
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle screen capture request
ipcMain.handle('get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen', 'window'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    return sources;
  } catch (error) {
    console.error('Error getting sources:', error);
    return [];
  }
});

// Handle sending captured text to analyze
ipcMain.handle('analyze-text', async (event, text) => {
  // This is where you would send to an AI API
  // For MVP, we'll just return a simple response
  return {
    suggestions: [
      "Take a moment to think before answering",
      "Use the STAR method (Situation, Task, Action, Result)",
      "Be specific with examples"
    ],
    detectedQuestion: text.substring(0, 100) + "..."
  };
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});