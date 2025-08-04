// Global type definitions for the renderer process

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

declare global {
  interface Window {
    electronAPI: {
      system: {
        getVersion(): Promise<import('@shared/types/system').SystemInfo>;
        openExternal(url: string): Promise<boolean>;
        showInFolder(path: string): Promise<boolean>;
        getAppDataPath(): Promise<string>;
        getHealth(): Promise<import('@shared/types/system').SystemHealthReport>;
        showContextMenu(template: ContextMenuItem[], options?: { x: number; y: number }): Promise<void>;
        crash(): Promise<void>;
      };
      memory: {
        // Basic operations
        create(entity: import('@shared/types/memory').MemoryEntity): Promise<import('@shared/types/memory').MemoryEntity>;
        retrieve(id: string): Promise<import('@shared/types/memory').MemoryEntity | null>;
        delete(id: string): Promise<boolean>;
        search(query: string, personaId?: string, tierFilter?: string): Promise<import('@shared/types/memory').MemorySearchResult>;
        
        // Tier management
        promote(memoryId: string, targetTier: string): Promise<void>;
        demote(memoryId: string, targetTier: string): Promise<void>;
        optimizeTiers(): Promise<any>;
        getScore(memoryId: string): Promise<any>;
        getTierMetrics(): Promise<any>;
        
        // Health and monitoring
        getHealth(): Promise<any>;
        
        // Batch operations
        batchCreate(entities: import('@shared/types/memory').MemoryEntity[]): Promise<import('@shared/types/memory').MemoryEntity[]>;
        batchRetrieve(ids: string[]): Promise<(import('@shared/types/memory').MemoryEntity | null)[]>;
        batchDelete(ids: string[]): Promise<boolean[]>;
      };
      persona: {
        create(data: import('@shared/types/persona').PersonaData): Promise<import('@shared/types/persona').PersonaData>;
        update(id: string, updates: Partial<import('@shared/types/persona').PersonaData>): Promise<import('@shared/types/persona').PersonaData>;
        delete(id: string): Promise<boolean>;
        get(id: string): Promise<import('@shared/types/persona').PersonaData | null>;
        list(): Promise<import('@shared/types/persona').PersonaData[]>;
      };
      plugin: {
        install(pluginPath?: string): Promise<import('@shared/types/plugin').PluginData>;
        uninstall(pluginId: string): Promise<boolean>;
        enable(pluginId: string): Promise<boolean>;
        disable(pluginId: string): Promise<boolean>;
        list(): Promise<import('@shared/types/plugin').PluginData[]>;
        getDetails(pluginId: string): Promise<import('@shared/types/plugin').PluginData | null>;
      };
      performance: {
        getMetrics(): Promise<Record<string, number>>;
      };
      menu: {
        onNewPersona(callback: () => void): () => void;
        onImportPersona(callback: () => void): () => void;
        onOpenSettings(callback: () => void): () => void;
        onOpenPlugins(callback: () => void): () => void;
        onOpenMemory(callback: () => void): () => void;
        onOptimizeMemory(callback: () => void): () => void;
        onShowAbout(callback: () => void): () => void;
      };
    };
  }
}

// This file must be a module
export {}; 