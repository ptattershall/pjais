import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import * as fs from 'fs/promises';

export class PlatformUtils {
  static get isMac(): boolean {
    return process.platform === 'darwin';
  }

  static get isWindows(): boolean {
    return process.platform === 'win32';
  }

  static get isLinux(): boolean {
    return process.platform === 'linux';
  }

  static getAppDataPath(): string {
    return app.getPath('userData');
  }

  static getPluginsPath(): string {
    return join(this.getAppDataPath(), 'plugins');
  }

  static getMemoryPath(): string {
    return join(this.getAppDataPath(), 'memory');
  }

  static getPersonasPath(): string {
    return join(this.getAppDataPath(), 'personas');
  }

  static getLogsPath(): string {
    return join(this.getAppDataPath(), 'logs');
  }

  static setupPlatformSpecificFeatures(mainWindow: BrowserWindow): void {
    if (this.isMac) {
      this.setupMacOSFeatures(mainWindow);
    } else if (this.isWindows) {
      this.setupWindowsFeatures(mainWindow);
    } else if (this.isLinux) {
      this.setupLinuxFeatures(mainWindow);
    }
  }

  private static setupMacOSFeatures(mainWindow: BrowserWindow): void {
    try {
      // macOS specific features
      // Touch Bar support could be added here
      // Dock integration
      if (app.dock) {
        // Use app.getAppPath() for a more reliable path in production
        const iconPath = join(app.getAppPath(), 'assets', 'icon.png');
        app.dock.setIcon(iconPath);
      }

      // macOS native behavior
      let isQuittingApp = false;
      app.on('before-quit', () => {
        isQuittingApp = true;
      });
      
      mainWindow.on('close', (event) => {
        if (!isQuittingApp) {
          event.preventDefault();
          mainWindow.hide();
        }
      });
    } catch (error) {
      console.error('Failed to set up macOS features:', error);
    }
  }

  private static setupWindowsFeatures(mainWindow: BrowserWindow): void {
    try {
      // Windows specific features
      // Jump lists could be added here
      // Windows notifications
      
      // Windows taskbar integration
      if (process.platform === 'win32') {
        app.setAppUserModelId('ai.pjais.app');
      }
    } catch (error) {
      console.error('Failed to set up Windows features:', error);
    }
  }

  private static setupLinuxFeatures(mainWindow: BrowserWindow): void {
    try {
      // Linux desktop integration
      // System tray setup could be added here
      
      // Linux-specific window behavior
      mainWindow.setMenuBarVisibility(true);

      // Set window icon for Linux
      const iconPath = join(app.getAppPath(), 'assets', 'icon.png');
      mainWindow.setIcon(iconPath);
    } catch (error) {
      console.error('Failed to set up Linux features:', error);
    }
  }
  static async ensureDirectoriesExist(): Promise<void> {
    const directories = [
      this.getPluginsPath(),
      this.getMemoryPath(),
      this.getPersonasPath(),
      this.getLogsPath()
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error);
      }
    }
  }

  static getSystemInfo(): Record<string, any> {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node
    };
  }
} 