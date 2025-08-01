import { contextBridge, ipcRenderer } from 'electron';
import { SystemHealthReport } from '../shared/types/system';

// System Information Interface
interface SystemInfo {
  app: string;
  electron: string;
  node: string;
  chrome: string;
  platform: string;
}

// Memory Entity Interface
interface MemoryEntity {
  id?: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file';
  importance: number;
  personaId: string;
  tags?: string[];
  createdAt?: Date;
  lastAccessed?: Date;
}

// Persona Data Interface
interface PersonaData {
  id?: string;
  name: string;
  description?: string;
  personality?: Record<string, any>;
  memories?: string[];
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Plugin Data Interface
interface PluginData {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: string[];
  enabled: boolean;
}

// Define the API that will be exposed to the renderer process
const electronAPI = {
  // System APIs
  system: {
    getVersion: (): Promise<SystemInfo> => ipcRenderer.invoke('system:version'),
    openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('system:open-external', url),
    showInFolder: (path: string): Promise<boolean> => ipcRenderer.invoke('system:show-in-folder', path),
    getAppDataPath: (): Promise<string> => ipcRenderer.invoke('system:app-data-path'),
    getHealth: (): Promise<SystemHealthReport> => ipcRenderer.invoke('system:get-health'),
    showContextMenu: (template: any[], options?: { x: number; y: number }) => ipcRenderer.invoke('system:show-context-menu', template, options),
    crash: () => ipcRenderer.invoke('system:crash'),
  },

  // Memory APIs
  memory: {
    // Basic operations
    create: (entity: MemoryEntity): Promise<MemoryEntity> => ipcRenderer.invoke('memory:create', entity),
    retrieve: (id: string): Promise<MemoryEntity | null> => ipcRenderer.invoke('memory:retrieve', id),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('memory:delete', id),
    search: (query: string, personaId?: string, tierFilter?: string) => ipcRenderer.invoke('memory:search', query, personaId, tierFilter),
    
    // Tier management
    promote: (memoryId: string, targetTier: string): Promise<void> => ipcRenderer.invoke('memory:promote', memoryId, targetTier),
    demote: (memoryId: string, targetTier: string): Promise<void> => ipcRenderer.invoke('memory:demote', memoryId, targetTier),
    optimizeTiers: (): Promise<any> => ipcRenderer.invoke('memory:optimize-tiers'),
    getScore: (memoryId: string): Promise<any> => ipcRenderer.invoke('memory:get-score', memoryId),
    getTierMetrics: (): Promise<any> => ipcRenderer.invoke('memory:get-tier-metrics'),
    
    // Health and monitoring
    getHealth: (): Promise<any> => ipcRenderer.invoke('memory:get-health'),
    
    // Batch operations
    batchCreate: (entities: MemoryEntity[]): Promise<MemoryEntity[]> => ipcRenderer.invoke('memory:batch-create', entities),
    batchRetrieve: (ids: string[]): Promise<(MemoryEntity | null)[]> => ipcRenderer.invoke('memory:batch-retrieve', ids),
    batchDelete: (ids: string[]): Promise<boolean[]> => ipcRenderer.invoke('memory:batch-delete', ids)
  },

  // Persona APIs
  persona: {
    create: (data: PersonaData): Promise<PersonaData> => ipcRenderer.invoke('persona:create', data),
    update: (id: string, updates: Partial<PersonaData>): Promise<PersonaData> => 
      ipcRenderer.invoke('persona:update', id, updates),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('persona:delete', id),
    get: (id: string): Promise<PersonaData | null> => ipcRenderer.invoke('persona:get', id),
    list: (): Promise<PersonaData[]> => ipcRenderer.invoke('persona:list')
  },

  // Plugin APIs
  plugin: {
    install: (pluginPath?: string): Promise<PluginData> => ipcRenderer.invoke('plugin:install', pluginPath),
    uninstall: (pluginId: string): Promise<boolean> => ipcRenderer.invoke('plugin:uninstall', pluginId),
    enable: (pluginId: string): Promise<boolean> => ipcRenderer.invoke('plugin:enable', pluginId),
    disable: (pluginId: string): Promise<boolean> => ipcRenderer.invoke('plugin:disable', pluginId),
    list: (): Promise<PluginData[]> => ipcRenderer.invoke('plugin:list'),
    getDetails: (pluginId: string): Promise<PluginData | null> => ipcRenderer.invoke('plugin:details', pluginId)
  },

  // Performance APIs
  performance: {
    getMetrics: (): Promise<Record<string, number>> => ipcRenderer.invoke('performance:get-metrics'),
  },

  // Menu event listeners
  menu: {
    onNewPersona: (callback: () => void) => {
      const wrappedCallback = () => callback();
      ipcRenderer.on('menu:new-persona', wrappedCallback);
      return () => ipcRenderer.removeListener('menu:new-persona', wrappedCallback);
    },
    onImportPersona: (callback: () => void) => {
      const wrappedCallback = () => callback();
      ipcRenderer.on('menu:import-persona', wrappedCallback);
      return () => ipcRenderer.removeListener('menu:import-persona', wrappedCallback);
    },
    onOpenSettings: (callback: () => void) => {
      const wrappedCallback = () => callback();
      ipcRenderer.on('menu:open-settings', wrappedCallback);
      return () => ipcRenderer.removeListener('menu:open-settings', wrappedCallback);
    },
    onOpenPlugins: (callback: () => void) => {
      const wrappedCallback = () => callback();
      ipcRenderer.on('menu:open-plugins', wrappedCallback);
      return () => ipcRenderer.removeListener('menu:open-plugins', wrappedCallback);
    },
    onOpenMemory: (callback: () => void) => {
      const wrappedCallback = () => callback();
      ipcRenderer.on('menu:open-memory', wrappedCallback);
      return () => ipcRenderer.removeListener('menu:open-memory', wrappedCallback);
    },
    onOptimizeMemory: (callback: () => void) => {
      const wrappedCallback = () => callback();
      ipcRenderer.invoke('menu:optimize-memory', wrappedCallback);
      return () => ipcRenderer.removeListener('menu:optimize-memory', wrappedCallback);
    },
    onShowAbout: (callback: () => void) => {
      const wrappedCallback = () => callback();
      ipcRenderer.on('menu:show-about', wrappedCallback);
      return () => ipcRenderer.removeListener('menu:show-about', wrappedCallback);
    }
  }
};

// Security validation
function validateAPI() {
  console.log('Validating preload API security...');
  
  // Ensure we're not exposing any Node.js APIs directly
  if (typeof process !== 'undefined') {
    console.warn('Process object detected in renderer context');
  }
  
  // Validate that we're running in a secure context
  if (typeof window !== 'undefined' && typeof window.require !== 'undefined') {
    console.error('SECURITY WARNING: require() is available in renderer context - this should not happen in sandbox mode');
  }
  
  // Validate context isolation
  if (typeof window !== 'undefined' && typeof (window as any).electronAPI !== 'undefined') {
    console.error('SECURITY WARNING: electronAPI already exists on window - context isolation may be compromised');
  }
  
  console.log('Preload API validation completed');
}

// Expose the API to the renderer process
try {
  validateAPI();
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  console.log('PJai\'s API successfully exposed to renderer');
} catch (error) {
  console.error('Failed to expose API to renderer:', error);
} 