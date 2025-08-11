import { shell, app, Menu } from 'electron';
import { PlatformUtils } from '../utils/platform';
import { Services } from '../services';

export interface SystemInfo {
  app: string;
  electron: string;
  node: string;
  chrome: string;
  platform: string;
}

export const getSystemVersion = async (): Promise<SystemInfo> => {
  return {
    app: app.getVersion(),
    electron: process.versions.electron || 'unknown',
    node: process.versions.node || 'unknown',
    chrome: process.versions.chrome || 'unknown',
    platform: process.platform,
  };
};

export const showContextMenu = (event: any, template: any[], options?: { x: number; y: number }) => {
  const menu = Menu.buildFromTemplate(template);
  menu.popup({
    x: options?.x,
    y: options?.y,
  });
};

export const openExternalUrl = (services: Services) => {
  return async (event: any, url: string): Promise<void> => {
    const { securityManager } = services;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      securityManager.logEvent({
        type: 'network_access',
        severity: 'high',
        description: `Blocked attempt to open non-http URL: ${url}`,
        timestamp: new Date(),
      });
      throw new Error('For security reasons, only http and https links can be opened.');
    }
    await shell.openExternal(url);
  };
};

export const showInFolder = (services: Services) => {
  return async (event: any, path: string): Promise<void> => {
    const { securityManager } = services;
    if (!(await securityManager.validateFileAccess(path, 'read'))) {
      // The security manager already logs this event
      throw new Error(`Access to path is not allowed: ${path}`);
    }
    shell.showItemInFolder(path);
  };
};

export const getAppDataPath = (): string => {
  return PlatformUtils.getAppDataPath();
};

export const getSystemHealth = async (services: Services) => {
  return services.serviceManager.getSystemHealth();
};

export const crashMainProcess = () => {
  console.log('Intentionally crashing main process for testing...');
  process.crash();
}; 