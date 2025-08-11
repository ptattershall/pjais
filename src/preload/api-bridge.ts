import { contextBridge, ipcRenderer } from 'electron';
import { 
  IPC_CHANNELS,
  type RendererAPI,
  type PersonaCreateRequest,
  type PersonaUpdateRequest,
  type MemoryCreateRequest,
  type MemoryUpdateRequest,
  type MemoryListRequest,
  type PluginCreateRequest,
  type PluginUpdateRequest,
  type PluginToggleRequest,
} from '../shared/ipc-contracts';

/**
 * Secure API bridge for renderer process
 * This exposes a limited, typed API surface to the renderer
 */
const api: RendererAPI = {
  // Persona operations
  personas: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PERSONAS_LIST),
    
    get: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.PERSONAS_GET, { id }),
    
    create: (data: PersonaCreateRequest) => 
      ipcRenderer.invoke(IPC_CHANNELS.PERSONAS_CREATE, data),
    
    update: (data: PersonaUpdateRequest) => 
      ipcRenderer.invoke(IPC_CHANNELS.PERSONAS_UPDATE, data),
    
    delete: (id: number) => 
      ipcRenderer.invoke(IPC_CHANNELS.PERSONAS_DELETE, { id }),
  },

  // Memory operations
  memories: {
    list: (params?: MemoryListRequest) => 
      ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_LIST, params),
    
    get: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_GET, { id }),
    
    create: (data: MemoryCreateRequest) => 
      ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_CREATE, data),
    
    update: (data: MemoryUpdateRequest) => 
      ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_UPDATE, data),
    
    delete: (id: number) => 
      ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_DELETE, { id }),
    
    updateAccess: (id: number) => 
      ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_UPDATE_ACCESS, { id }),
  },

  // Plugin operations
  plugins: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PLUGINS_LIST),
    
    get: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.PLUGINS_GET, { id }),
    
    create: (data: PluginCreateRequest) => 
      ipcRenderer.invoke(IPC_CHANNELS.PLUGINS_CREATE, data),
    
    update: (data: PluginUpdateRequest) => 
      ipcRenderer.invoke(IPC_CHANNELS.PLUGINS_UPDATE, data),
    
    delete: (id: number) => 
      ipcRenderer.invoke(IPC_CHANNELS.PLUGINS_DELETE, { id }),
    
    toggle: (data: PluginToggleRequest) => 
      ipcRenderer.invoke(IPC_CHANNELS.PLUGINS_TOGGLE, data),
  },

  // Database operations
  database: {
    health: () => ipcRenderer.invoke(IPC_CHANNELS.DATABASE_HEALTH),
    
    stats: () => ipcRenderer.invoke(IPC_CHANNELS.DATABASE_STATS),
    
    backup: (path: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_BACKUP, { path }),
  },

  // Event system operations
  events: {
    subscribe: (eventType: string, options: any) => 
      ipcRenderer.invoke(IPC_CHANNELS.EVENT_SUBSCRIBE, eventType, options),
    
    publish: (eventType: string, payload: any, options?: any) => 
      ipcRenderer.invoke(IPC_CHANNELS.EVENT_PUBLISH, eventType, payload, options),
    
    unsubscribe: (subscriptionId: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.EVENT_UNSUBSCRIBE, subscriptionId),
    
    grantPluginAccess: (request: any) => 
      ipcRenderer.invoke(IPC_CHANNELS.EVENT_GRANT_PLUGIN_ACCESS, request),
    
    revokePluginAccess: (request: any) => 
      ipcRenderer.invoke(IPC_CHANNELS.EVENT_REVOKE_PLUGIN_ACCESS, request),
    
    getPerformanceMetrics: (request?: any) => 
      ipcRenderer.invoke(IPC_CHANNELS.EVENT_GET_PERFORMANCE_METRICS, request),
    
    getSubscriptionStats: () => 
      ipcRenderer.invoke(IPC_CHANNELS.EVENT_GET_SUBSCRIPTION_STATS),
    
    getEventTypes: () => 
      ipcRenderer.invoke(IPC_CHANNELS.EVENT_GET_EVENT_TYPES),
    
    validatePayload: (eventType: string, payload: any) => 
      ipcRenderer.invoke(IPC_CHANNELS.EVENT_VALIDATE_PAYLOAD, eventType, payload),

    // Event listeners
    onEventReceived: (callback: (event: any) => void) => {
      ipcRenderer.on(IPC_CHANNELS.EVENT_RECEIVED, (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.EVENT_RECEIVED);
    },
  },
};

/**
 * Expose the API to the renderer process
 * This uses contextBridge for security
 */
export function exposeAPI(): void {
  try {
    console.log('🔌 Exposing API bridge to renderer...');
    
    contextBridge.exposeInMainWorld('api', api);
    
    console.log('✅ API bridge exposed successfully');
  } catch (error) {
    console.error('❌ Failed to expose API bridge:', error);
    throw error;
  }
}

// Type augmentation for window.api in renderer
declare global {
  interface Window {
    api: RendererAPI;
  }
}
