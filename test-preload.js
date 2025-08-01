const { contextBridge, ipcRenderer } = require('electron');

console.log('🔗 PJAIS Test Preload Script Loading...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Test API endpoints
  test: {
    log: (message) => {
      console.log('📝 Renderer Log:', message);
    },
    
    getSystemInfo: () => {
      return {
        platform: process.platform,
        arch: process.arch,
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        chromeVersion: process.versions.chrome
      };
    }
  },
  
  // Simulated persona API (matches the real IPC structure)
  personas: {
    list: async () => {
      console.log('📋 Test: personas.list called');
      return {
        success: true,
        data: [
          { id: 'persona-1', name: 'Creative Assistant', isActive: true },
          { id: 'persona-2', name: 'Technical Analyst', isActive: false }
        ]
      };
    },
    
    create: async (personaData) => {
      console.log('➕ Test: personas.create called with:', personaData.name);
      return {
        success: true,
        data: `persona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    },
    
    update: async (id, updates) => {
      console.log('📝 Test: personas.update called:', id, updates);
      return { success: true, data: true };
    },
    
    delete: async (id) => {
      console.log('🗑️ Test: personas.delete called:', id);
      return { success: true, data: true };
    }
  },
  
  // Simulated memory API
  memories: {
    list: async (options) => {
      console.log('📋 Test: memories.list called with options:', options);
      return {
        success: true,
        data: [
          { id: 'mem-1', type: 'conversation', content: 'User discussed AI ethics', tier: 'active' },
          { id: 'mem-2', type: 'learning', content: 'Learned about user preferences', tier: 'active' },
          { id: 'mem-3', type: 'fact', content: 'User prefers dark mode UI', tier: 'archived' }
        ]
      };
    },
    
    search: async (query, options) => {
      console.log('🔍 Test: memories.search called:', query, options);
      return {
        success: true,
        data: [
          { id: 'mem-1', relevance: 0.95, content: 'Matching memory content', type: 'conversation' }
        ]
      };
    },
    
    add: async (memoryData) => {
      console.log('➕ Test: memories.add called:', memoryData.type);
      return {
        success: true,
        data: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    }
  },
  
  // Simulated system API
  system: {
    getInfo: async () => {
      console.log('📊 Test: system.getInfo called');
      return {
        success: true,
        data: {
          platform: process.platform,
          version: '1.0.0-test',
          memory: { used: 156, total: 1024 },
          database: { status: 'healthy', connections: 1 },
          services: {
            persona: 'running',
            memory: 'running',
            security: 'running',
            plugin: 'running'
          }
        }
      };
    },
    
    getHealth: async () => {
      console.log('❤️ Test: system.getHealth called');
      return {
        success: true,
        data: {
          overall: 'healthy',
          database: 'connected',
          services: 'all_running',
          memory_usage: '15%',
          disk_usage: '42%'
        }
      };
    }
  }
});

console.log('✅ PJAIS Test Preload Script Loaded');
console.log('🔗 Test APIs exposed to renderer process:');
console.log('   • electronAPI.test - Testing utilities');
console.log('   • electronAPI.personas - Persona management');
console.log('   • electronAPI.memories - Memory operations');
console.log('   • electronAPI.system - System information');
console.log('📝 All APIs are mock implementations for testing purposes');