import { app, BrowserWindow, ipcMain, Menu, shell, crashReporter } from 'electron';
import { join } from 'path';
import { setupIPCHandlers } from './ipc';
import { initializeServices, Services } from './services';
import { createApplicationMenu } from './menu';
import { PlatformUtils } from './utils/platform';
import { PerformanceMonitor } from './utils/performance';
import log from 'electron-log';
import { configManager } from './services/config-manager';
import { updateElectronApp } from 'update-electron-app';
import IPCHandlers from './ipc/ipc-handlers';

// These are injected by the build process and need to be declared
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// --- Crash Reporter Setup ---
// It's important to start the crash reporter as early as possible.
// Replace 'YOUR_SUBMIT_URL' with your actual crash report server URL.
crashReporter.start({
  productName: 'PJAIS',
  companyName: 'YourCompanyName',
  submitURL: 'https://your-submit-url.com/report',
  uploadToServer: true
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Set up logging
log.transports.file.resolvePath = () => join(app.getPath('userData'), 'logs/main.log');
log.transports.file.level = configManager.config.LOG_LEVEL;

// Catch and log uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  // Potentially quit the app or show a dialog to the user
});

class PJAISHub {
  private mainWindow: BrowserWindow | null = null;
  private services: Services | null = null;
  private ipcHandlers: IPCHandlers | null = null;

  constructor() {
    // Call the auto-updater
    updateElectronApp({
      logger: log,
      updateInterval: '5 minutes',
      notifyUser: true
    });
    
    // Setup app event handlers
    this.setupAppEventHandlers();
  }

  async initialize(): Promise<void> {
    try {
      // Config manager is a singleton and initializes on first import.
      // Log to confirm it's ready before anything else.
      log.info(`PJAIS Hub starting in ${configManager.config.NODE_ENV} mode.`);

      // Start performance monitoring
      PerformanceMonitor.startTiming('app-startup');

      // Wait for app to be ready
      await app.whenReady();

      // Ensure directories exist
      await PlatformUtils.ensureDirectoriesExist();

      // Initialize SQLite database
      log.info('Initializing SQLite database...');
      
      // Run data migration first
      const { DataMigrationManager } = await import('./database/data-migration');
      const migrationManager = new DataMigrationManager();
      const migrationResult = await migrationManager.migrate();
      
      if (migrationResult.success) {
        if (migrationResult.migratedPersonas > 0 || migrationResult.migratedMemories > 0) {
          log.info(`✅ Migration completed: ${migrationResult.migratedPersonas} personas, ${migrationResult.migratedMemories} memories migrated`);
        } else {
          log.info('📋 Migration check completed - no data to migrate or already completed');
        }
      } else {
        log.error('❌ Migration failed:', migrationResult.errors);
        // Continue anyway - better to have a working app with new DB than to fail entirely
      }
      
      // Create database manager and initialize it
      const { SqliteDatabaseManager } = await import('./database/sqlite-database-manager');
      const databaseManager = new SqliteDatabaseManager();
      await databaseManager.initialize();
      
      // Initialize new IPC handlers for SQLite
      this.ipcHandlers = new IPCHandlers(databaseManager);
      this.ipcHandlers.registerHandlers();

      // Initialize core services
      this.services = await initializeServices(ipcMain);

      // Setup IPC communication
      setupIPCHandlers(this.services);

      // Initialize event system IPC handlers
      const { initializeEventIpcHandlers } = await import('./ipc/event-ipc-handlers');
      const serviceFactory = this.services.serviceFactory;
      if (serviceFactory) {
        initializeEventIpcHandlers(serviceFactory);
        log.info('✅ Event IPC handlers initialized');
      }

      // Create main application window
      this.createMainWindow();

      // Setup application menu
      Menu.setApplicationMenu(createApplicationMenu());

      // Setup platform-specific features
      if (this.mainWindow) {
        PlatformUtils.setupPlatformSpecificFeatures(this.mainWindow);
      }

      // End startup timing
      PerformanceMonitor.endTiming('app-startup');

      log.info('PJAIS initialized successfully');
    } catch (error) {
      log.error('Failed to initialize PJAIS:', error);
      app.quit();
    }
  }

  private createMainWindow(): void {
    // Get the correct preload path based on environment
    const preloadPath = configManager.config.IS_DEV 
      ? join(__dirname, '../preload/index.js')
      : join(__dirname, 'preload.js');

    log.info('Preload path:', preloadPath);
    log.info('Is Dev:', configManager.config.IS_DEV);

    // Create the browser window with security settings
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 600,
      titleBarStyle: PlatformUtils.isMac ? 'hiddenInset' : 'default',
      frame: !PlatformUtils.isMac,
      show: true, // Show immediately for testing
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        webSecurity: true,
        allowRunningInsecureContent: false,
        sandbox: true,
        // Additional security settings
        experimentalFeatures: false
      }
    });

    // Add error handling for page load
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      log.error('Failed to load page:', errorCode, errorDescription, validatedURL);
    });

    this.mainWindow.webContents.on('render-process-gone', (event, details) => {
      log.error('Renderer process gone:', details);
    });

    // Load the application
    if (configManager.config.IS_DEV && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      log.info('Loading dev server URL:', MAIN_WINDOW_VITE_DEV_SERVER_URL);
      this.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
      this.mainWindow.webContents.openDevTools();
    } else {
      const rendererPath = join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
      log.info('Loading file:', rendererPath);
      this.mainWindow.loadFile(rendererPath).catch(error => {
        log.error('Failed to load renderer file:', error);
        // Try alternative path
        const altPath = join(__dirname, '../dist-renderer/index.html');
        log.info('Trying alternative path:', altPath);
        this.mainWindow?.loadFile(altPath).catch(err => {
          log.error('Failed to load alternative path:', err);
        });
      });
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      log.info('Window ready to show');
      this.mainWindow?.show();
      this.mainWindow?.focus();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Security: Prevent navigation to external URLs
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      if (url !== this.mainWindow?.webContents.getURL()) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    log.info('Main window created');
  }

  private setupAppEventHandlers(): void {
    // macOS specific behavior
    app.on('window-all-closed', () => {
      if (!PlatformUtils.isMac) {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    // Security: Prevent new window creation is handled by setWindowOpenHandler above
  }
}

// Handle app lifecycle
const pjaisHub = new PJAISHub();

// Initialize the application
pjaisHub.initialize().catch((error) => {
  log.error('Fatal error during initialization:', error);
  app.quit();
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (pjaisHub['mainWindow']) {
      if (pjaisHub['mainWindow'].isMinimized()) {
        pjaisHub['mainWindow'].restore();
      }
      pjaisHub['mainWindow'].focus();
    }
  });
}
