import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Electron APIs that are used in renderer components
global.electronAPI = {
  personas: {
    list: vi.fn(),
    getActive: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn()
  },
  memories: {
    search: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
    getTierMetrics: vi.fn(),
    optimizeTiers: vi.fn(),
    semanticSearch: vi.fn()
  },
  system: {
    getVersion: vi.fn(),
    getHealth: vi.fn(),
    showContextMenu: vi.fn()
  },
  plugins: {
    list: vi.fn(),
    install: vi.fn(),
    uninstall: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn()
  },
  privacy: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    exportData: vi.fn(),
    deleteUserData: vi.fn()
  }
}

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver for virtualization tests
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock URL.createObjectURL for file handling tests
global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Mock console methods to reduce noise in tests (optional)
vi.stubGlobal('console', {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
})

// Setup for cleanup after each test
afterEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
  sessionStorageMock.clear()
})