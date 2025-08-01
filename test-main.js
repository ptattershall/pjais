const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('🤖 PJAIS Test Application Starting...');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  console.log('🔄 Creating main window...');
  
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'test-preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Optional icon
    show: false, // Don't show until ready
    titleBarStyle: 'default',
    title: 'PJAIS - AI Hub (Test Mode)'
  });

  // Load the test HTML file
  const testPath = path.join(__dirname, 'test-app.html');
  console.log('📂 Loading test application from:', testPath);
  
  mainWindow.loadFile(testPath);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    console.log('✅ Test application window ready');
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    console.log('🔄 Main window closed');
  });

  return mainWindow;
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  console.log('🚀 Electron app ready, creating window...');
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  console.log('🔄 All windows closed');
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  console.log('🔄 Application shutting down...');
});

// Handle app errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('📋 PJAIS Test Configuration:');
console.log('   • Electron version:', process.versions.electron);
console.log('   • Node version:', process.versions.node);
console.log('   • Chrome version:', process.versions.chrome);
console.log('   • Platform:', process.platform);
console.log('   • Architecture:', process.arch);
console.log('   • Test mode: Enabled');
console.log('   • Environment:', process.env.NODE_ENV || 'production');