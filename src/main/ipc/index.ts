import { Services } from '../services';
import { handle } from './wrapper';
import { PrivacyIpcHandlers } from './privacy';
import { ipcMain } from 'electron';

// Import handlers
import * as System from './system';
import * as Memory from './memory';
import * as Personas from './personas';
import * as Plugins from './plugins';
import * as Performance from './performance';

export function setupIPCHandlers(services: Services): void {
  console.log('Setting up all IPC handlers...');

  // Privacy Handlers - Initialize first for comprehensive privacy controls
  const privacyHandlers = new PrivacyIpcHandlers(
    ipcMain,
    services.privacyController,
    services.securityManager.getSecurityEventLogger()
  );
  // Privacy handlers are registered in constructor
  void privacyHandlers;

  // System Handlers
  handle('system:version', System.getSystemVersion, services, { audit: { type: 'ipc_action' } });
  handle('system:open-external', System.openExternalUrl(services), services, { audit: { type: 'ipc_action', severity: 'medium' } });
  handle('system:show-in-folder', System.showInFolder(services), services, { audit: { type: 'ipc_action' } });
  handle('system:app-data-path', System.getAppDataPath, services, { audit: { type: 'ipc_action' } });
  handle('system:get-health', () => System.getSystemHealth(services), services, { audit: { type: 'ipc_action' } });
  handle('system:show-context-menu', (event, template, options) => System.showContextMenu(event, template, options), services);
  handle('system:crash', System.crashMainProcess, services, { audit: { type: 'ipc_action', severity: 'high' } });

  // Persona Handlers
  handle('persona:create', Personas.createPersona(services.personaManager), services, { audit: { type: 'ipc_action', severity: 'medium' } });
  handle('persona:update', Personas.updatePersona(services.personaManager), services, { audit: { type: 'ipc_action', severity: 'medium' } });
  handle('persona:delete', Personas.deletePersona(services.personaManager), services, { 
    audit: { type: 'ipc_action', severity: 'high' },
    rateLimit: { points: 5, duration: 60 } // 5 requests per minute
  });
  handle('persona:get', Personas.getPersona(services.personaManager), services, { audit: { type: 'ipc_action' } });
  handle('persona:list', Personas.listPersonas(services.personaManager), services, { audit: { type: 'ipc_action' } });

  // Memory Handlers - Basic Operations
  handle('memory:create', Memory.createMemory(services.memoryManager), services, { audit: { type: 'ipc_action' } });
  handle('memory:retrieve', Memory.retrieveMemory(services.memoryManager), services, { audit: { type: 'ipc_action' } });
  handle('memory:delete', Memory.deleteMemory(services.memoryManager), services, { audit: { type: 'ipc_action', severity: 'medium' } });
  handle('memory:search', Memory.searchMemories(services.memoryManager), services, { audit: { type: 'ipc_action' } });
  
  // Memory Handlers - Tier Management
  handle('memory:promote', Memory.promoteMemory(services.memoryManager), services, { audit: { type: 'ipc_action', severity: 'medium' } });
  handle('memory:demote', Memory.demoteMemory(services.memoryManager), services, { audit: { type: 'ipc_action', severity: 'medium' } });
  handle('memory:optimize-tiers', Memory.optimizeMemoryTiers(services.memoryManager), services, { 
    audit: { type: 'ipc_action', severity: 'medium' },
    rateLimit: { points: 5, duration: 300 } // 5 requests per 5 minutes
  });
  handle('memory:get-score', Memory.getMemoryScore(services.memoryManager), services, { audit: { type: 'ipc_action' } });
  handle('memory:get-tier-metrics', Memory.getTierMetrics(services.memoryManager), services, { audit: { type: 'ipc_action' } });
  
  // Memory Handlers - Semantic Search
  handle('memory:semantic-search', Memory.performSemanticSearch(services.memoryManager), services, { audit: { type: 'ipc_action' } });
  handle('memory:find-similar', Memory.findSimilarMemories(services.memoryManager), services, { audit: { type: 'ipc_action' } });
  handle('memory:enhanced-search', Memory.enhancedSearch(services.memoryManager), services, { audit: { type: 'ipc_action' } });
  handle('memory:generate-embedding', Memory.generateMemoryEmbedding(services.memoryManager), services, { 
    audit: { type: 'ipc_action' },
    rateLimit: { points: 20, duration: 60 } // 20 embeddings per minute
  });
  
  // Memory Handlers - Relationship Graph
  handle('memory:create-relationship', Memory.createMemoryRelationship(services.memoryManager), services, { audit: { type: 'ipc_action', severity: 'medium' } });
  handle('memory:update-relationship', Memory.updateRelationshipStrength(services.memoryManager), services, { audit: { type: 'ipc_action', severity: 'medium' } });
  handle('memory:delete-relationship', Memory.deleteMemoryRelationship(services.memoryManager), services, { audit: { type: 'ipc_action', severity: 'medium' } });
  handle('memory:discover-relationships', Memory.discoverMemoryRelationships(services.memoryManager), services, { 
    audit: { type: 'ipc_action' },
    rateLimit: { points: 10, duration: 60 } // 10 discoveries per minute
  });
  handle('memory:auto-create-relationships', Memory.autoCreateMemoryRelationships(services.memoryManager), services, { 
    audit: { type: 'ipc_action', severity: 'medium' },
    rateLimit: { points: 5, duration: 60 } // 5 auto-creations per minute
  });
  handle('memory:get-related', Memory.getRelatedMemories(services.memoryManager), services, { audit: { type: 'ipc_action' } });
  handle('memory:find-connection-path', Memory.findMemoryConnectionPath(services.memoryManager), services, { audit: { type: 'ipc_action' } });
  handle('memory:graph-analytics', Memory.generateMemoryGraphAnalytics(services.memoryManager), services, { audit: { type: 'ipc_action' } });
  handle('memory:run-decay', Memory.runRelationshipDecay(services.memoryManager), services, { 
    audit: { type: 'ipc_action', severity: 'medium' },
    rateLimit: { points: 2, duration: 300 } // 2 decay runs per 5 minutes
  });
  
  // Memory Handlers - Health and Monitoring
  handle('memory:get-health', Memory.getMemoryHealth(services.memoryManager), services, { audit: { type: 'ipc_action' } });
  
  // Memory Handlers - Batch Operations
  handle('memory:batch-create', Memory.batchCreateMemories(services.memoryManager), services, { 
    audit: { type: 'ipc_action', severity: 'medium' },
    rateLimit: { points: 5, duration: 60 } // 5 batch operations per minute
  });
  handle('memory:batch-retrieve', Memory.batchRetrieveMemories(services.memoryManager), services, { 
    audit: { type: 'ipc_action' },
    rateLimit: { points: 10, duration: 60 } // 10 batch retrievals per minute
  });
  handle('memory:batch-delete', Memory.batchDeleteMemories(services.memoryManager), services, { 
    audit: { type: 'ipc_action', severity: 'high' },
    rateLimit: { points: 3, duration: 60 } // 3 batch deletions per minute
  });
  
  // Plugin Handlers
  handle('plugin:install', Plugins.installPlugin(services), services, { 
    audit: { type: 'ipc_action', severity: 'high' },
    rateLimit: { points: 3, duration: 60 } // 3 requests per minute
  });
  handle('plugin:uninstall', Plugins.uninstallPlugin(services.pluginManager), services, { 
    audit: { type: 'ipc_action', severity: 'high' },
    rateLimit: { points: 5, duration: 60 } // 5 requests per minute
  });
  handle('plugin:enable', Plugins.enablePlugin(services.pluginManager), services, { audit: { type: 'ipc_action', severity: 'medium' } });
  handle('plugin:disable', Plugins.disablePlugin(services.pluginManager), services, { audit: { type: 'ipc_action', severity: 'medium' } });
  handle('plugin:list', Plugins.listPlugins(services.pluginManager), services, { audit: { type: 'ipc_action' } });
  handle('plugin:details', Plugins.getPluginDetails(services.pluginManager), services, { audit: { type: 'ipc_action' } });

  // Performance Handlers
  handle('performance:get-metrics', Performance.getPerformanceMetrics, services);
  
  // Setup additional performance IPC handlers
  Performance.setupPerformanceIPC();

  console.log('All IPC handlers setup completed with comprehensive privacy controls.');
}