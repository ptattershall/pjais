# Electron Architecture Plan

## Overview

This plan outlines the Electron desktop application architecture for PajamasWeb AI Hub, focusing on main/renderer process communication, security, and cross-platform compatibility.

## 1. Electron Foundation Setup

### 1.1 Project Structure

/pjais
├── /src
│   ├── /main               # Main Process
│   │   ├── main.ts         # Application entry point
│   │   ├── menu.ts         # Application menu
│   │   ├── /ipc            # IPC handlers
│   │   │   ├── system.ts
│   │   │   ├── personas.ts
│   │   │   ├── plugins.ts
│   │   │   └── memory.ts
│   │   ├── /services       # Main process services
│   │   │   ├── plugin-manager.ts
│   │   │   ├── memory-manager.ts
│   │   │   └── security-manager.ts
│   │   └── /utils          # Main process utilities
│   ├── /renderer           # Renderer Process (React)
│   │   ├── /components     # React components
│   │   ├── /pages          # Page components
│   │   ├── /hooks          # Custom hooks
│   │   ├── /styles         # Styles
│   │   └── ...
│   ├── /preload            # Preload scripts
│   │   └── index.ts
│   └── /shared             # Shared code (types, utils)
│       ├── /types
│       └── /utils
├── /dist                   # Build output
└── package.json

### 1.2 Main Process Architecture

```typescript
// src/main/main.ts - Application entry point
import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import { join } from 'path';
import { setupIPCHandlers } from './main/ipc';
import { initializeServices, Services } from './main/services';
import { createApplicationMenu } from './main/menu';
import { PlatformUtils } from './main/utils/platform';
import { PerformanceMonitor } from './main/utils/performance';

class PajamasWebHub {
  private mainWindow: BrowserWindow | null = null;
  private services: Services | null = null;

  async initialize(): Promise<void> {
    await app.whenReady();
    this.services = await initializeServices();
    setupIPCHandlers(this.services);
    this.createMainWindow();
    Menu.setApplicationMenu(createApplicationMenu());
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false // Required for preload script to have node access
      },
      titleBarStyle: PlatformUtils.isMac ? 'hiddenInset' : 'default',
      frame: !PlatformUtils.isMac,
      show: false,
    });

    if (process.env.NODE_ENV === 'development' || MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL || 'http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }
}

const pajamasHub = new PajamasWebHub();
pajamasHub.initialize();
```

### 1.3 Preload Script Security

```typescript
// src/preload/index.ts - Secure API exposure
import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // System APIs
  system: {
    getVersion: (): Promise<SystemInfo> => ipcRenderer.invoke('system:version'),
    openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('system:open-external', url),
    showInFolder: (path: string): Promise<boolean> => ipcRenderer.invoke('system:show-in-folder', path),
  },

  // Memory APIs
  memory: {
    store: (entity: MemoryEntity): Promise<MemoryEntity> => ipcRenderer.invoke('memory:store', entity),
    // ... other memory methods
  },

  // Persona APIs
  persona: {
    create: (data: PersonaData): Promise<PersonaData> => ipcRenderer.invoke('persona:create', data),
    // ... other persona methods
  },

  // Plugin APIs
  plugin: {
    install: (pluginPath?: string): Promise<PluginData> => ipcRenderer.invoke('plugin:install', pluginPath),
    // ... other plugin methods
  },
  
  // Menu Event Listeners
  menu: {
    onNewPersona: (callback: () => void) => ipcRenderer.on('menu:new-persona', callback),
    // ... other menu listeners
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

## 2. IPC Communication Architecture

### 2.1 IPC Handler Structure

```typescript
// src/main/ipc/index.ts - Main IPC setup
import { setupPersonaHandlers } from './personas';
import { setupPluginHandlers } from './plugins';
import { setupMemoryHandlers } from './memory';
import { setupSystemHandlers } from './system';

export function setupIPCHandlers(services: Services) {
  setupPersonaHandlers(services.personaManager);
  setupPluginHandlers(services.pluginManager);
  setupMemoryHandlers(services.memoryManager);
  setupSystemHandlers();
}

// src/main/ipc/personas.ts - Persona IPC handlers
import { ipcMain } from 'electron';
import { PersonaManager } from '../services';

export function setupPersonaHandlers(personaManager: PersonaManager) {
  ipcMain.handle('persona:create', async (event, data) => {
    return await personaManager.createPersona(data);
  });
  // ... other persona handlers
}
```

### 2.2 Error Handling & Validation

*Note: Centralized IPC validation has not been implemented yet. Validation logic is currently handled within each service.*

## 3. Cross-Platform Considerations

### 3.1 Platform-Specific Features

Platform-specific logic is handled by `src/main/utils/platform.ts`, which provides helpers like `isMac`, `isWindows`, etc. to conditionally apply settings, such as `titleBarStyle` on the `BrowserWindow`.

### 3.2 Application Menu

```typescript
// src/main/menu.ts - Cross-platform menu
import { Menu, shell, BrowserWindow } from 'electron';
import { isMac } from './utils/platform';

export function createApplicationMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    // Menu template structure...
  ];

  if (isMac) {
    // Add macOS specific menu items
  }

  return Menu.buildFromTemplate(template);
}
```

## 4. Security Implementation

### 4.1 Content Security Policy

A Content Security Policy should be implemented to enhance security. This is not yet in place.

```typescript
// Example CSP to be added in main.ts
const CSP_POLICY = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';";

// In main.ts, after creating the window:
mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [CSP_POLICY]
    }
  });
});
```

### 4.2 Secure File Handling

*Note: A centralized secure file handler has not been implemented. File operations are currently performed by individual services.*

## 5. Development & Debugging

### 5.1 Development Configuration

The application uses `vite.renderer.config.ts`, `vite.main.config.ts`, and `vite.preload.config.ts` to manage the development and build process. The main window will automatically open DevTools in a development environment.

### 5.2 Performance Monitoring

The `src/main/utils/performance.ts` utility provides a `PerformanceMonitor` class to measure the timing of critical operations like application startup.

## 6. Implementation Timeline

### Week 1: Foundation

- Electron application setup
- Basic main/renderer process architecture
- IPC communication foundation
- Development environment configuration

### Week 2: Core Services

- Service layer implementation
- Security hardening
- Cross-platform compatibility
- Error handling and logging

### Week 3: Integration

- Connect services to IPC
- Application menu implementation
- Platform-specific features
- Performance optimization

### Week 4: Testing & Polish

- Unit tests for main process
- Integration tests for IPC
- Security audit
- Documentation completion

This architecture provides a secure, scalable foundation for the PajamasWeb AI Hub desktop application while maintaining cross-platform compatibility and development efficiency.
