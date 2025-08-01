import { MemoryManager } from '../services/memory-manager';
import { 
  MemoryEntity, 
  MemoryTier, 
  SemanticSearchQuery,
  MemoryRelationship
} from '../../shared/types/memory';
import { IpcMainInvokeEvent } from 'electron';

// =============================================================================
// BASIC MEMORY OPERATIONS
// =============================================================================

export const createMemory = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, entity: unknown): Promise<MemoryEntity> => {
    try {
      return await memoryManager.create(entity);
    } catch (error) {
      console.error('IPC createMemory error:', error);
      throw error;
    }
  };
};

export const retrieveMemory = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, id: string): Promise<MemoryEntity | null> => {
    try {
      return await memoryManager.retrieve(id);
    } catch (error) {
      console.error('IPC retrieveMemory error:', error);
      throw error;
    }
  };
};

export const deleteMemory = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, id: string): Promise<boolean> => {
    try {
      return await memoryManager.delete(id);
    } catch (error) {
      console.error('IPC deleteMemory error:', error);
      throw error;
    }
  };
};

export const searchMemories = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, query: string, personaId?: string, tierFilter?: MemoryTier) => {
    try {
      return await memoryManager.search(query, personaId, tierFilter);
    } catch (error) {
      console.error('IPC searchMemories error:', error);
      throw error;
    }
  };
};

// =============================================================================
// TIER MANAGEMENT OPERATIONS
// =============================================================================

export const promoteMemory = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, memoryId: string, targetTier: MemoryTier): Promise<void> => {
    try {
      await memoryManager.promoteMemory(memoryId, targetTier);
    } catch (error) {
      console.error('IPC promoteMemory error:', error);
      throw error;
    }
  };
};

export const demoteMemory = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, memoryId: string, targetTier: MemoryTier): Promise<void> => {
    try {
      await memoryManager.demoteMemory(memoryId, targetTier);
    } catch (error) {
      console.error('IPC demoteMemory error:', error);
      throw error;
    }
  };
};

export const optimizeMemoryTiers = (memoryManager: MemoryManager) => {
  return async (_event: IpcMainInvokeEvent) => {
    try {
      return await memoryManager.optimizeMemoryTiers();
    } catch (error) {
      console.error('IPC optimizeMemoryTiers error:', error);
      throw error;
    }
  };
};

export const getMemoryScore = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, memoryId: string) => {
    try {
      return await memoryManager.getMemoryScore(memoryId);
    } catch (error) {
      console.error('IPC getMemoryScore error:', error);
      throw error;
    }
  };
};

export const getTierMetrics = (memoryManager: MemoryManager) => {
  return async (_event: IpcMainInvokeEvent) => {
    try {
      return await memoryManager.getTierMetrics();
    } catch (error) {
      console.error('IPC getTierMetrics error:', error);
      throw error;
    }
  };
};

// =============================================================================
// SEMANTIC SEARCH OPERATIONS
// =============================================================================

export const performSemanticSearch = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, query: SemanticSearchQuery) => {
    try {
      return await memoryManager.performSemanticSearch(query);
    } catch (error) {
      console.error('IPC performSemanticSearch error:', error);
      throw error;
    }
  };
};

export const findSimilarMemories = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, memory: MemoryEntity, limit: number = 5, threshold: number = 0.5) => {
    try {
      return await memoryManager.findSimilarMemories(memory, limit, threshold);
    } catch (error) {
      console.error('IPC findSimilarMemories error:', error);
      throw error;
    }
  };
};

export const enhancedSearch = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, query: string, options: {
    personaId?: string;
    tierFilter?: MemoryTier;
    useSemanticSearch?: boolean;
    semanticThreshold?: number;
    limit?: number;
  } = {}) => {
    try {
      return await memoryManager.enhancedSearch(query, options);
    } catch (error) {
      console.error('IPC enhancedSearch error:', error);
      throw error;
    }
  };
};

export const generateMemoryEmbedding = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, memory: MemoryEntity) => {
    try {
      return await memoryManager.generateMemoryEmbedding(memory);
    } catch (error) {
      console.error('IPC generateMemoryEmbedding error:', error);
      throw error;
    }
  };
};

// =============================================================================
// MEMORY RELATIONSHIP GRAPH OPERATIONS
// =============================================================================

export const createMemoryRelationship = (memoryManager: MemoryManager) => {
  return async (
    event: IpcMainInvokeEvent, 
    fromMemoryId: string,
    toMemoryId: string,
    type: MemoryRelationship['type'],
    strength: number = 0.5,
    confidence: number = 0.8
  ): Promise<MemoryRelationship> => {
    try {
      return await memoryManager.createMemoryRelationship(fromMemoryId, toMemoryId, type, strength, confidence);
    } catch (error) {
      console.error('IPC createMemoryRelationship error:', error);
      throw error;
    }
  };
};

export const updateRelationshipStrength = (memoryManager: MemoryManager) => {
  return async (
    event: IpcMainInvokeEvent, 
    relationshipId: string, 
    newStrength: number,
    newConfidence?: number
  ): Promise<MemoryRelationship> => {
    try {
      return await memoryManager.updateRelationshipStrength(relationshipId, newStrength, newConfidence);
    } catch (error) {
      console.error('IPC updateRelationshipStrength error:', error);
      throw error;
    }
  };
};

export const deleteMemoryRelationship = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, relationshipId: string): Promise<boolean> => {
    try {
      return await memoryManager.deleteMemoryRelationship(relationshipId);
    } catch (error) {
      console.error('IPC deleteMemoryRelationship error:', error);
      throw error;
    }
  };
};

export const discoverMemoryRelationships = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, memoryId: string) => {
    try {
      return await memoryManager.discoverMemoryRelationships(memoryId);
    } catch (error) {
      console.error('IPC discoverMemoryRelationships error:', error);
      throw error;
    }
  };
};

export const autoCreateMemoryRelationships = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, memoryId: string): Promise<MemoryRelationship[]> => {
    try {
      return await memoryManager.autoCreateMemoryRelationships(memoryId);
    } catch (error) {
      console.error('IPC autoCreateMemoryRelationships error:', error);
      throw error;
    }
  };
};

export const getRelatedMemories = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, memoryId: string, options: {
    maxDepth?: number;
    minStrength?: number;
    relationshipTypes?: MemoryRelationship['type'][];
    includeDecayed?: boolean;
    sortBy?: 'strength' | 'confidence' | 'recency';
  } = {}) => {
    try {
      return await memoryManager.getRelatedMemories(memoryId, options);
    } catch (error) {
      console.error('IPC getRelatedMemories error:', error);
      throw error;
    }
  };
};

export const findMemoryConnectionPath = (memoryManager: MemoryManager) => {
  return async (
    event: IpcMainInvokeEvent, 
    fromMemoryId: string, 
    toMemoryId: string
  ): Promise<MemoryRelationship[] | null> => {
    try {
      return await memoryManager.findMemoryConnectionPath(fromMemoryId, toMemoryId);
    } catch (error) {
      console.error('IPC findMemoryConnectionPath error:', error);
      throw error;
    }
  };
};

export const generateMemoryGraphAnalytics = (memoryManager: MemoryManager) => {
  return async (_event: IpcMainInvokeEvent) => {
    try {
      return await memoryManager.generateMemoryGraphAnalytics();
    } catch (error) {
      console.error('IPC generateMemoryGraphAnalytics error:', error);
      throw error;
    }
  };
};

export const runRelationshipDecay = (memoryManager: MemoryManager) => {
  return async (_event: IpcMainInvokeEvent): Promise<void> => {
    try {
      await memoryManager.runRelationshipDecay();
    } catch (error) {
      console.error('IPC runRelationshipDecay error:', error);
      throw error;
    }
  };
};

// =============================================================================
// HEALTH AND MONITORING
// =============================================================================

export const getMemoryHealth = (memoryManager: MemoryManager) => {
  return async (_event: IpcMainInvokeEvent) => {
    try {
      return await memoryManager.getHealth();
    } catch (error) {
      console.error('IPC getMemoryHealth error:', error);
      throw error;
    }
  };
};

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

export const batchCreateMemories = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, entities: unknown[]): Promise<MemoryEntity[]> => {
    try {
      const results: MemoryEntity[] = [];
      for (const entity of entities) {
        const memory = await memoryManager.create(entity);
        results.push(memory);
      }
      return results;
    } catch (error) {
      console.error('IPC batchCreateMemories error:', error);
      throw error;
    }
  };
};

export const batchRetrieveMemories = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, ids: string[]): Promise<(MemoryEntity | null)[]> => {
    try {
      const results: (MemoryEntity | null)[] = [];
      for (const id of ids) {
        const memory = await memoryManager.retrieve(id);
        results.push(memory);
      }
      return results;
    } catch (error) {
      console.error('IPC batchRetrieveMemories error:', error);
      throw error;
    }
  };
};

export const batchDeleteMemories = (memoryManager: MemoryManager) => {
  return async (event: IpcMainInvokeEvent, ids: string[]): Promise<boolean[]> => {
    try {
      const results: boolean[] = [];
      for (const id of ids) {
        const success = await memoryManager.delete(id);
        results.push(success);
      }
      return results;
    } catch (error) {
      console.error('IPC batchDeleteMemories error:', error);
      throw error;
    }
  };
};

// =============================================================================
// EXPORT ALL MEMORY IPC HANDLERS
// =============================================================================

export const memoryIpcHandlers = {
  // Basic operations
  'memory:create': createMemory,
  'memory:retrieve': retrieveMemory,
  'memory:delete': deleteMemory,
  'memory:search': searchMemories,
  
  // Tier management
  'memory:promote': promoteMemory,
  'memory:demote': demoteMemory,
  'memory:optimize-tiers': optimizeMemoryTiers,
  'memory:get-score': getMemoryScore,
  'memory:get-tier-metrics': getTierMetrics,
  
  // Semantic search
  'memory:semantic-search': performSemanticSearch,
  'memory:find-similar': findSimilarMemories,
  'memory:enhanced-search': enhancedSearch,
  'memory:generate-embedding': generateMemoryEmbedding,
  
  // Relationship graph
  'memory:create-relationship': createMemoryRelationship,
  'memory:update-relationship': updateRelationshipStrength,
  'memory:delete-relationship': deleteMemoryRelationship,
  'memory:discover-relationships': discoverMemoryRelationships,
  'memory:auto-create-relationships': autoCreateMemoryRelationships,
  'memory:get-related': getRelatedMemories,
  'memory:find-connection-path': findMemoryConnectionPath,
  'memory:graph-analytics': generateMemoryGraphAnalytics,
  'memory:run-decay': runRelationshipDecay,
  
  // Health and monitoring
  'memory:get-health': getMemoryHealth,
  
  // Batch operations
  'memory:batch-create': batchCreateMemories,
  'memory:batch-retrieve': batchRetrieveMemories,
  'memory:batch-delete': batchDeleteMemories
}; 
