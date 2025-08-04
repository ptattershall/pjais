import { contextBridge, ipcRenderer } from 'electron';

// Import types using relative paths since path aliases don't work in preload
interface SystemInfo {
  app: string;
  electron: string;
  node: string;
  chrome: string;
  platform: string;
}

interface SystemHealthReport {
  status: 'healthy' | 'warning' | 'error';
  timestamp: Date;
  metrics: Record<string, number>;
  issues: string[];
}

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

interface PersonaData {
  id?: string;
  name: string;
  description?: string;
  personality?: Record<string, unknown>;
  memories?: string[];
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PluginData {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: string[];
  enabled: boolean;
}

// Context menu types
interface ContextMenuItem {
  label: string;
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  enabled?: boolean;
  visible?: boolean;
  checked?: boolean;
  accelerator?: string;
  click?: () => void;
  submenu?: ContextMenuItem[];
}

// Memory optimization result types
interface MemoryOptimizationResult {
  processed: number;
  transitions: Array<{
    memoryId: string;
    fromTier: string;
    toTier: string;
    reason: string;
    score: number;
    timestamp: Date;
  }>;
  performance: {
    durationMs: number;
    memoryFreed: number;
    compressionRatio: number;
  };
}

interface MemoryScore {
  memoryId: string;
  accessScore: number;
  importanceScore: number;
  ageScore: number;
  connectionScore: number;
  totalScore: number;
  recommendedTier: string;
}

interface MemoryTierMetrics {
  tier: string;
  count: number;
  averageImportance: number;
  averageAccessCount: number;
  averageAge: number;
  storageSize: number;
  lastOptimized: Date;
}

interface MemoryHealthReport {
  totalMemories: number;
  memoryByType: Record<string, number>;
  storageSize: number;
  lastOptimization: Date | null;
}

// Type for the electronAPI structure
type ElectronAPIType = {
  system: {
    getVersion: () => Promise<SystemInfo>;
    openExternal: (url: string) => Promise<boolean>;
    showInFolder: (path: string) => Promise<boolean>;
    getAppDataPath: () => Promise<string>;
    getHealth: () => Promise<SystemHealthReport>;
    showContextMenu: (template: ContextMenuItem[], options?: { x: number; y: number }) => Promise<void>;
    crash: () => Promise<void>;
  };
  memory: {
    create: (entity: MemoryEntity) => Promise<MemoryEntity>;
    retrieve: (id: string) => Promise<MemoryEntity | null>;
    delete: (id: string) => Promise<boolean>;
    search: (query: string, personaId?: string, tierFilter?: string) => Promise<MemoryEntity[]>;
    promote: (memoryId: string, targetTier: string) => Promise<void>;
    demote: (memoryId: string, targetTier: string) => Promise<void>;
    optimizeTiers: () => Promise<MemoryOptimizationResult>;
    getScore: (memoryId: string) => Promise<MemoryScore>;
    getTierMetrics: () => Promise<MemoryTierMetrics[]>;
    getHealth: () => Promise<MemoryHealthReport>;
    batchCreate: (entities: MemoryEntity[]) => Promise<MemoryEntity[]>;
    batchRetrieve: (ids: string[]) => Promise<(MemoryEntity | null)[]>;
    batchDelete: (ids: string[]) => Promise<boolean[]>;
  };
  persona: {
    create: (data: PersonaData) => Promise<PersonaData>;
    update: (id: string, updates: Partial<PersonaData>) => Promise<PersonaData>;
    delete: (id: string) => Promise<boolean>;
    get: (id: string) => Promise<PersonaData | null>;
    list: () => Promise<PersonaData[]>;
  };
  plugin: {
    install: (pluginPath?: string) => Promise<PluginData>;
    uninstall: (pluginId: string) => Promise<boolean>;
    enable: (pluginId: string) => Promise<boolean>;
    disable: (pluginId: string) => Promise<boolean>;
    list: () => Promise<PluginData[]>;
    getDetails: (pluginId: string) => Promise<PluginData | null>;
  };
  performance: {
    getMetrics: () => Promise<Record<string, number>>;
  };
  menu: {
    onNewPersona: (callback: () => void) => () => void;
    onImportPersona: (callback: () => void) => () => void;
    onOpenSettings: (callback: () => void) => () => void;
    onOpenPlugins: (callback: () => void) => () => void;
    onOpenMemory: (callback: () => void) => () => void;
    onOptimizeMemory: (callback: () => void) => () => void;
    onShowAbout: (callback: () => void) => () => void;
  };
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPIType = {
  // System APIs
  system: {
    getVersion: (): Promise<SystemInfo> => ipcRenderer.invoke('system:version'),
    openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('system:open-external', url),
    showInFolder: (path: string): Promise<boolean> => ipcRenderer.invoke('system:show-in-folder', path),
    getAppDataPath: (): Promise<string> => ipcRenderer.invoke('system:app-data-path'),
    getHealth: (): Promise<SystemHealthReport> => ipcRenderer.invoke('system:get-health'),
    showContextMenu: (template: ContextMenuItem[], options?: { x: number; y: number }) => ipcRenderer.invoke('system:show-context-menu', template, options),
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
    optimizeTiers: (): Promise<MemoryOptimizationResult> => ipcRenderer.invoke('memory:optimize-tiers'),
    getScore: (memoryId: string): Promise<MemoryScore> => ipcRenderer.invoke('memory:get-score', memoryId),
    getTierMetrics: (): Promise<MemoryTierMetrics[]> => ipcRenderer.invoke('memory:get-tier-metrics'),
    
    // Health and monitoring
    getHealth: (): Promise<MemoryHealthReport> => ipcRenderer.invoke('memory:get-health'),
    
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

// Validate API structure
function validateAPI() {
  const requiredMethods = [
    'system.getVersion',
    'system.openExternal',
    'system.showInFolder',
    'system.getAppDataPath',
    'system.getHealth',
    'system.showContextMenu',
    'memory.create',
    'memory.retrieve',
    'memory.delete',
    'memory.search',
    'persona.create',
    'persona.update',
    'persona.delete',
    'persona.get',
    'persona.list',
    'plugin.install',
    'plugin.uninstall',
    'plugin.enable',
    'plugin.disable',
    'plugin.list',
    'plugin.getDetails',
    'performance.getMetrics'
  ];

  for (const method of requiredMethods) {
    const parts = method.split('.');
    let current: ElectronAPIType | ElectronAPIType[keyof ElectronAPIType] | any = electronAPI;
    
    for (const part of parts) {
      if (!current[part]) {
        throw new Error(`Missing required API method: ${method}`);
      }
      current = current[part];
    }
    
    if (typeof current !== 'function') {
      throw new Error(`API method ${method} is not a function`);
    }
  }
}

// Expose API to renderer process
try {
  validateAPI();
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  console.log('PJai\'s API successfully exposed to renderer');
} catch (error) {
  console.error('Failed to expose API to renderer:', error);
  throw error;
} 