import { Menu, shell, BrowserWindow, MenuItemConstructorOptions, app } from 'electron';
import { PlatformUtils } from './utils/platform';

const sendMenuEvent = (channel: string) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.webContents.send(channel);
  }
};

export function createApplicationMenu(): Menu {
  console.log('Creating application menu...');

  const template: MenuItemConstructorOptions[] = [];

  // macOS specific menu structure
  if (PlatformUtils.isMac) {
    template.push({
      label: 'PJai\'s',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  // File menu
  template.push({
    label: 'File',
    submenu: [
      {
        label: 'New Persona',
        accelerator: 'CmdOrCtrl+N',
        click: () => sendMenuEvent('menu:new-persona')
      },
      {
        label: 'Import Persona',
        accelerator: 'CmdOrCtrl+I',
        click: () => sendMenuEvent('menu:import-persona')
      },
      { type: 'separator' },
      {
        label: 'Settings',
        accelerator: 'CmdOrCtrl+,',
        click: () => sendMenuEvent('menu:open-settings')
      },
      { type: 'separator' },
      PlatformUtils.isMac ? { role: 'close' } : { role: 'quit' }
    ]
  });

  // Edit menu
  template.push({
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' }
    ]
  });

  // Window menu (macOS only)
  if (PlatformUtils.isMac) {
    template.push({
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    });
  }

  // View menu
  template.push({
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  });

  // Tools menu
  template.push({
    label: 'Tools',
    submenu: [
      {
        label: 'Plugin Manager',
        accelerator: 'CmdOrCtrl+P',
        click: () => sendMenuEvent('menu:open-plugins')
      },
      {
        label: 'Memory Explorer',
        accelerator: 'CmdOrCtrl+M',
        click: () => sendMenuEvent('menu:open-memory')
      },
      { type: 'separator' },
      {
        label: 'Optimize Memory',
        click: () => sendMenuEvent('menu:optimize-memory')
      }
    ]
  });

  // Help menu
  template.push({
    label: 'Help',
    submenu: [
      {
        label: 'Documentation',
        click: () => {
          shell.openExternal('https://docs.pjais.ai');
        }
      },
      {
        label: 'Report Issue',
        click: () => {
          shell.openExternal('https://github.com/pjais/ai-hub/issues');
        }
      },
      { type: 'separator' },
      { role: 'about' }
    ]
  });

  console.log('Application menu created successfully');
  return Menu.buildFromTemplate(template);
} 