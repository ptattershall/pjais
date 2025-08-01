import { 
  MemoryEntity, 
  MemoryTier, 
  MemorySearchResult,
  MemoryScore,
  TierOptimizationResult,
  MemoryTierMetrics,
  SemanticSearchQuery,
  SemanticSearchResult,
  MemoryEmbedding,
  MemoryRelationship 
} from './memory';
import { ServiceHealth } from './system';

/**
 * Memory API Interface for IPC Communication
 * This interface defines all memory operations available to the renderer process
 */
export interface MemoryAPI {
  // =============================================================================
  // BASIC MEMORY OPERATIONS
  // =============================================================================
  
  /**
   * Create a new memory entity
   */
  createMemory(entity: unknown): Promise<MemoryEntity>;
  
  /**
   * Retrieve a memory by ID
   */
  retrieveMemory(id: string): Promise<MemoryEntity | null>;
  
  /**
   * Delete a memory by ID
   */
  deleteMemory(id: string): Promise<boolean>;
  
  /**
   * Search memories with optional persona and tier filtering
   */
  searchMemories(query: string, personaId?: string, tierFilter?: MemoryTier): Promise<MemorySearchResult>;

  // =============================================================================
  // TIER MANAGEMENT OPERATIONS  
  // =============================================================================
  
  /**
   * Promote a memory to a higher tier
   */
  promoteMemory(memoryId: string, targetTier: MemoryTier): Promise<void>;
  
  /**
   * Demote a memory to a lower tier
   */
  demoteMemory(memoryId: string, targetTier: MemoryTier): Promise<void>;
  
  /**
   * Optimize memory tier assignments based on usage patterns
   */
  optimizeMemoryTiers(): Promise<TierOptimizationResult>;
  
  /**
   * Get the computed score for a specific memory
   */
  getMemoryScore(memoryId: string): Promise<MemoryScore>;
  
  /**
   * Get metrics for all memory tiers
   */
  getTierMetrics(): Promise<{
    hot: MemoryTierMetrics;
    warm: MemoryTierMetrics;
    cold: MemoryTierMetrics;
  }>;

  // =============================================================================
  // SEMANTIC SEARCH OPERATIONS
  // =============================================================================
  
  /**
   * Perform semantic search using vector embeddings
   */
  performSemanticSearch(query: SemanticSearchQuery): Promise<SemanticSearchResult>;
  
  /**
   * Find memories similar to the provided memory
   */
  findSimilarMemories(
    memory: MemoryEntity, 
    limit?: number, 
    threshold?: number
  ): Promise<Array<MemoryEntity & { similarity: number; explanation: string }>>;
  
  /**
   * Enhanced search combining keyword and semantic search
   */
  enhancedSearch(query: string, options?: {
    personaId?: string;
    tierFilter?: MemoryTier;
    useSemanticSearch?: boolean;
    semanticThreshold?: number;
    limit?: number;
  }): Promise<MemorySearchResult & { semanticResults?: SemanticSearchResult }>;
  
  /**
   * Generate embedding for a memory
   */
  generateMemoryEmbedding(memory: MemoryEntity): Promise<MemoryEmbedding>;

  // =============================================================================
  // MEMORY RELATIONSHIP GRAPH OPERATIONS
  // =============================================================================
  
  /**
   * Create a relationship between two memories
   */
  createMemoryRelationship(
    fromMemoryId: string,
    toMemoryId: string,
    type: MemoryRelationship['type'],
    strength?: number,
    confidence?: number
  ): Promise<MemoryRelationship>;
  
  /**
   * Update the strength and confidence of a relationship
   */
  updateRelationshipStrength(
    relationshipId: string, 
    newStrength: number,
    newConfidence?: number
  ): Promise<MemoryRelationship>;
  
  /**
   * Delete a memory relationship
   */
  deleteMemoryRelationship(relationshipId: string): Promise<boolean>;
  
  /**
   * Discover potential relationships for a memory using AI
   */
  discoverMemoryRelationships(memoryId: string): Promise<Array<{
    fromMemoryId: string;
    toMemoryId: string;
    type: MemoryRelationship['type'];
    strength: number;
    confidence: number;
    reason: string;
  }>>;
  
  /**
   * Automatically create relationships based on discovered patterns
   */
  autoCreateMemoryRelationships(memoryId: string): Promise<MemoryRelationship[]>;
  
  /**
   * Get memories related to a specific memory through graph traversal
   */
  getRelatedMemories(memoryId: string, options?: {
    maxDepth?: number;
    minStrength?: number;
    relationshipTypes?: MemoryRelationship['type'][];
    includeDecayed?: boolean;
    sortBy?: 'strength' | 'confidence' | 'recency';
  }): Promise<Array<{ 
    memory: MemoryEntity; 
    relationship: MemoryRelationship; 
    distance: number 
  }>>;
  
  /**
   * Find the shortest connection path between two memories
   */
  findMemoryConnectionPath(
    fromMemoryId: string, 
    toMemoryId: string
  ): Promise<MemoryRelationship[] | null>;
  
  /**
   * Generate analytics about the memory relationship graph
   */
  generateMemoryGraphAnalytics(): Promise<{
    totalRelationships: number;
    averageStrength: number;
    mostConnectedMemory: { memoryId: string; connectionCount: number };
    relationshipsByType: Record<string, number>;
    graphDensity: number;
    clustersFound: number;
  }>;
  
  /**
   * Run relationship decay to weaken old relationships
   */
  runRelationshipDecay(): Promise<void>;

  // =============================================================================
  // HEALTH AND MONITORING
  // =============================================================================
  
  /**
   * Get comprehensive health information for the memory system
   */
  getMemoryHealth(): Promise<ServiceHealth>;

  // =============================================================================
  // BATCH OPERATIONS
  // =============================================================================
  
  /**
   * Create multiple memories in batch
   */
  batchCreateMemories(entities: unknown[]): Promise<MemoryEntity[]>;
  
  /**
   * Retrieve multiple memories by IDs
   */
  batchRetrieveMemories(ids: string[]): Promise<(MemoryEntity | null)[]>;
  
  /**
   * Delete multiple memories by IDs
   */
  batchDeleteMemories(ids: string[]): Promise<boolean[]>;
}

/**
 * Memory API Channel Names for IPC Communication
 */
export const MEMORY_API_CHANNELS = {
  // Basic operations
  CREATE: 'memory:create' as const,
  RETRIEVE: 'memory:retrieve' as const,
  DELETE: 'memory:delete' as const,
  SEARCH: 'memory:search' as const,
  
  // Tier management
  PROMOTE: 'memory:promote' as const,
  DEMOTE: 'memory:demote' as const,
  OPTIMIZE_TIERS: 'memory:optimize-tiers' as const,
  GET_SCORE: 'memory:get-score' as const,
  GET_TIER_METRICS: 'memory:get-tier-metrics' as const,
  
  // Semantic search
  SEMANTIC_SEARCH: 'memory:semantic-search' as const,
  FIND_SIMILAR: 'memory:find-similar' as const,
  ENHANCED_SEARCH: 'memory:enhanced-search' as const,
  GENERATE_EMBEDDING: 'memory:generate-embedding' as const,
  
  // Relationship graph
  CREATE_RELATIONSHIP: 'memory:create-relationship' as const,
  UPDATE_RELATIONSHIP: 'memory:update-relationship' as const,
  DELETE_RELATIONSHIP: 'memory:delete-relationship' as const,
  DISCOVER_RELATIONSHIPS: 'memory:discover-relationships' as const,
  AUTO_CREATE_RELATIONSHIPS: 'memory:auto-create-relationships' as const,
  GET_RELATED: 'memory:get-related' as const,
  FIND_CONNECTION_PATH: 'memory:find-connection-path' as const,
  GRAPH_ANALYTICS: 'memory:graph-analytics' as const,
  RUN_DECAY: 'memory:run-decay' as const,
  
  // Health and monitoring
  GET_HEALTH: 'memory:get-health' as const,
  
  // Batch operations
  BATCH_CREATE: 'memory:batch-create' as const,
  BATCH_RETRIEVE: 'memory:batch-retrieve' as const,
  BATCH_DELETE: 'memory:batch-delete' as const,
} as const;

/**
 * Helper type to ensure channel names match the API interface
 */
export type MemoryAPIChannels = typeof MEMORY_API_CHANNELS;

/**
 * Memory system events that can be subscribed to
 */
export interface MemorySystemEvents {
  'memory:created': { memory: MemoryEntity };
  'memory:updated': { memory: MemoryEntity };
  'memory:deleted': { memoryId: string };
  'memory:tier-changed': { memoryId: string; oldTier: MemoryTier; newTier: MemoryTier };
  'memory:relationship-created': { relationship: MemoryRelationship };
  'memory:relationship-updated': { relationship: MemoryRelationship };
  'memory:relationship-deleted': { relationshipId: string };
  'memory:tier-optimization-complete': { result: TierOptimizationResult };
  'memory:decay-run-complete': { decayedCount: number; removedCount: number };
}

/**
 * Memory system statistics for dashboard display
 */
export interface MemorySystemStats {
  totalMemories: number;
  memoriesByTier: {
    hot: number;
    warm: number;
    cold: number;
  };
  memoriesByType: Record<string, number>;
  totalRelationships: number;
  relationshipsByType: Record<string, number>;
  averageRelationshipStrength: number;
  mostConnectedMemory?: {
    memoryId: string;
    connectionCount: number;
  };
  systemHealth: {
    status: 'ok' | 'degraded' | 'error';
    tierManagerStatus: string;
    embeddingServiceStatus: string;
    graphServiceStatus: string;
  };
  performance: {
    averageSearchTime: number;
    cacheHitRate: number;
    embeddingCacheSize: number;
  };
}

/**
 * Configuration options for memory system behavior
 */
export interface MemorySystemConfig {
  tierLimits: {
    hot: number;
    warm: number;
    cold: number;
  };
  tierThresholds: {
    hotPromotionScore: number;
    warmPromotionScore: number;
    coldDemotionScore: number;
  };
  relationshipConfig: {
    autoDiscoveryThreshold: number;
    maxRelationshipsPerMemory: number;
    decayRate: number;
    confidenceThreshold: number;
  };
  searchConfig: {
    defaultSemanticThreshold: number;
    maxSearchResults: number;
    enableAutoRelationships: boolean;
  };
} 