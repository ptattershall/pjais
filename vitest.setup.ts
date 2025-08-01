import { vi } from 'vitest';

// Mock Electron's app module
vi.mock('electron', () => {
  return {
    app: {
      getPath: vi.fn((name: string) => {
        if (name === 'userData') {
          return '/mock/app-data';
        }
        return `/mock/path/${name}`;
      }),
      getVersion: vi.fn(() => '1.0.0'),
      isReady: vi.fn(() => Promise.resolve()),
      whenReady: vi.fn(() => Promise.resolve()),
      on: vi.fn(),
      requestSingleInstanceLock: vi.fn(() => true),
      // Add other app properties/methods if needed by tests
    },
    ipcMain: {
      handle: vi.fn(),
      on: vi.fn(),
    },
    BrowserWindow: vi.fn(() => ({
      on: vi.fn(),
      webContents: {
        send: vi.fn(),
        on: vi.fn(),
      },
      // Add other BrowserWindow properties/methods if needed
    })),
    shell: {
      openExternal: vi.fn(),
      showItemInFolder: vi.fn(),
    },
    Menu: {
        buildFromTemplate: vi.fn(() => ({
            popup: vi.fn(),
        })),
        setApplicationMenu: vi.fn(),
    },
    crashReporter: {
        start: vi.fn(),
    }
  };
}); 