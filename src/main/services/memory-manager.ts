import { MemoryStore } from './memory-store';
import { MemoryLoader } from './memory-loader';
import { MemoryTierManager } from './memory-tier-manager';
import { EmbeddingService } from './embedding-service';
import { MemoryGraphService } from './memory-graph-service';
import { DatabaseManager } from './database-manager';
import { SecurityManager } from './security-manager';
import {
  MemoryEntity,
  MemorySearchResult,
  MemoryEntitySchema,
  MemoryTier,
  MemoryScore,
  TierOptimizationResult,
  MemoryTierMetrics,
  SemanticSearchQuery,
  SemanticSearchResult,
  MemoryEmbedding,
  MemoryRelationship
} from '../../shared/types/memory';
import { ServiceHealth } from '../../shared/types/system';

export class MemoryManager {
  private store: MemoryStore;
  private loader: MemoryLoader;
  private tierManager: MemoryTierManager;
  private embeddingService: EmbeddingService;
  private graphService: MemoryGraphService;
  private databaseManager: DatabaseManager;
  private securityManager: SecurityManager;
  private isInitialized = false;

  constructor(
    store: MemoryStore, 
    loader: MemoryLoader,
    databaseManager: DatabaseManager,
    securityManager: SecurityManager
  ) {
    this.store = store;
    this.loader = loader;
    this.databaseManager = databaseManager;
    this.securityManager = securityManager;
    this.tierManager = new MemoryTierManager(databaseManager, securityManager);
    this.embeddingService = new EmbeddingService(securityManager['eventLogger']);
    this.graphService = new MemoryGraphService(
      databaseManager, 
      this.embeddingService, 
      securityManager['eventLogger']
    );
  }

  async initialize(): Promise<void> {
    console.log('Initializing MemoryManager with three-tier architecture, semantic search, and relationship graphs...');
    try {
      // Initialize embedding service first (needed for tier manager and graph service)
      await this.embeddingService.initialize();
      
      // Initialize tier manager
      await this.tierManager.initialize();
      
      // Initialize graph service (depends on embedding service)
      await this.graphService.initialize();
      
      // Load memories from legacy loader for now
      const loadedMemories = await this.loader.loadMemories();
      loadedMemories.forEach(memory => this.store.set(memory));
      
      this.isInitialized = true;
      console.log(`Loaded ${this.store.size} memories with tier management, semantic search, and relationship graphs`);
    } catch (error) {
      console.error('Failed to initialize MemoryManager:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down MemoryManager...');
    await this.embeddingService.shutdown();
    await this.tierManager.shutdown();
    await this.graphService.shutdown();
    this.store.clear();
    this.isInitialized = false;
  }

  // =============================================================================
  // ENHANCED MEMORY OPERATIONS WITH TIER MANAGEMENT
  // =============================================================================

  async create(entity: unknown): Promise<MemoryEntity> {
    this.ensureInitialized();
    
    const validatedEntity = MemoryEntitySchema.omit({ id: true }).parse(entity);
    
    // Create memory entity in database using DatabaseManager
    const memoryId = await this.databaseManager.createMemoryEntity({
      personaId: validatedEntity.personaId,
      type: validatedEntity.type,
      content: validatedEntity.content,
      tags: validatedEntity.tags || [],
      importance: validatedEntity.importance
    });

    // Retrieve the created memory and convert to MemoryEntity format
    const dbMemory = await this.databaseManager.getMemoryEntity(memoryId);
    if (!dbMemory) {
      throw new Error('Failed to create memory in database');
    }

    const memory: MemoryEntity = {
      id: dbMemory.id,
      content: this.extractContentFromDbMemory(dbMemory),
      type: validatedEntity.type,
      importance: dbMemory.importance || validatedEntity.importance,
      personaId: dbMemory.personaId,
      tags: dbMemory.tags || [],
      createdAt: this.ensureDate(dbMemory.createdAt),
      lastAccessed: this.ensureDate(dbMemory.lastAccessed)
    };

    // Add to local store
    this.store.set(memory);
    
    console.log(`Created memory: ${memory.type} (${memoryId}) in tier: hot`);
    return memory;
  }

  async retrieve(id: string): Promise<MemoryEntity | null> {
    this.ensureInitialized();
    
    // Check local store first
    let memory = this.store.get(id);
    
    if (!memory) {
      // Load from database
      const dbMemory = await this.databaseManager.getMemoryEntity(id);

      if (!dbMemory) {
        return null;
      }

      memory = {
        id: dbMemory.id,
        content: this.extractContentFromDbMemory(dbMemory),
        type: dbMemory.type as any,
        importance: dbMemory.importance || 50,
        personaId: dbMemory.personaId,
        tags: dbMemory.tags || [],
        createdAt: this.ensureDate(dbMemory.createdAt),
        lastAccessed: this.ensureDate(dbMemory.lastAccessed)
      };

      this.store.set(memory);
    }

    // Update access tracking
    await this.databaseManager.accessMemoryEntity(id);
    memory.lastAccessed = new Date();
    this.store.set(memory);

    return memory;
  }

  async delete(id: string): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      // Delete from database (soft delete)
      await this.databaseManager.deleteMemoryEntity(id);
      
      // Remove from local store
      this.store.delete(id);
      
      console.log(`Deleted memory: ${id}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete memory ${id}:`, error);
      return false;
    }
  }

  async search(query: string, personaId?: string, _tierFilter?: MemoryTier): Promise<MemorySearchResult> {
    this.ensureInitialized();
    
    // For now, use the store-based search until we implement database search
    const allMemories = this.store.list();
    let filteredMemories = personaId
      ? allMemories.filter(memory => memory.personaId === personaId)
      : allMemories;

    // Apply tier filter if specified (this will be enhanced once tier data is available)
    // For now, we'll search all memories and note the limitation

    if (query.trim()) {
      const searchTerms = query.toLowerCase().split(' ');
      filteredMemories = filteredMemories.filter(memory => {
        const content = JSON.stringify(memory.content).toLowerCase();
        const tags = memory.tags?.join(' ').toLowerCase() || '';
        const searchText = `${content} ${tags}`;
        return searchTerms.some(term => searchText.includes(term));
      });
    }

    return {
      memories: filteredMemories,
      total: filteredMemories.length,
      page: 1,
      pageSize: 50,
    };
  }

  // =============================================================================
  // TIER MANAGEMENT OPERATIONS
  // =============================================================================

  async promoteMemory(memoryId: string, targetTier: MemoryTier): Promise<void> {
    this.ensureInitialized();
    await this.tierManager.promoteMemory(memoryId, targetTier, 'manual');
    
    // Update local store if memory is cached
    const memory = this.store.get(memoryId);
    if (memory) {
      // Refresh from database to get updated tier
      await this.retrieve(memoryId);
    }
  }

  async demoteMemory(memoryId: string, targetTier: MemoryTier): Promise<void> {
    this.ensureInitialized();
    await this.tierManager.demoteMemory(memoryId, targetTier, 'manual');
    
    // Update local store if memory is cached
    const memory = this.store.get(memoryId);
    if (memory) {
      // Refresh from database to get updated tier
      await this.retrieve(memoryId);
    }
  }

  async optimizeMemoryTiers(): Promise<TierOptimizationResult> {
    this.ensureInitialized();
    const result = await this.tierManager.optimizeMemoryTiers();
    
    // Clear local cache to force reload of updated memories
    this.store.clear();
    
    return result;
  }

  async getMemoryScore(memoryId: string): Promise<MemoryScore> {
    this.ensureInitialized();
    return await this.tierManager.calculateMemoryScore(memoryId);
  }

  async getTierMetrics(): Promise<{ hot: MemoryTierMetrics; warm: MemoryTierMetrics; cold: MemoryTierMetrics }> {
    this.ensureInitialized();
    return await this.tierManager.collectTierMetrics();
  }

  // =============================================================================
  // SEMANTIC SEARCH OPERATIONS
  // =============================================================================

  async generateMemoryEmbedding(memory: MemoryEntity): Promise<MemoryEmbedding> {
    this.ensureInitialized();
    return await this.embeddingService.generateMemoryEmbedding(memory);
  }

  async performSemanticSearch(query: SemanticSearchQuery): Promise<SemanticSearchResult> {
    this.ensureInitialized();
    
    // Get all memories for search
    const allMemories = this.store.list();
    
    // Perform semantic search using embedding service
    return await this.embeddingService.performSemanticSearch(query, allMemories);
  }

  async findSimilarMemories(
    memory: MemoryEntity, 
    limit: number = 5, 
    threshold: number = 0.5
  ): Promise<Array<MemoryEntity & { similarity: number; explanation: string }>> {
    this.ensureInitialized();
    
    // Generate embedding for the input memory
    const memoryEmbedding = await this.embeddingService.generateMemoryEmbedding(memory);
    
    // Get all other memories except the input memory
    const allMemories = this.store.list().filter(m => m.id !== memory.id);
    
    // Find similar memories
    return await this.embeddingService.findSimilarMemories(
      memoryEmbedding.embedding,
      allMemories,
      limit,
      threshold
    );
  }

  async enhancedSearch(
    query: string, 
    options: {
      personaId?: string;
      tierFilter?: MemoryTier;
      useSemanticSearch?: boolean;
      semanticThreshold?: number;
      limit?: number;
    } = {}
  ): Promise<MemorySearchResult & { semanticResults?: SemanticSearchResult }> {
    this.ensureInitialized();
    
    // Perform traditional keyword search
    const keywordResults = await this.search(query, options.personaId, options.tierFilter);
    
    if (!options.useSemanticSearch) {
      return keywordResults;
    }
    
    // Perform semantic search
    const semanticQuery: SemanticSearchQuery = {
      query,
      filters: {
        personaId: options.personaId,
        tier: options.tierFilter
      },
      limit: options.limit || 10,
      threshold: options.semanticThreshold || 0.3
    };
    
    const semanticResults = await this.performSemanticSearch(semanticQuery);
    
    // Combine results (semantic search takes precedence for ranking)
    const combinedMemories = [...semanticResults.memories];
    
    // Add keyword-only results that weren't found semantically
    for (const keywordMemory of keywordResults.memories) {
      const alreadyIncluded = combinedMemories.some(
        semantic => semantic.id === keywordMemory.id
      );
             if (!alreadyIncluded) {
         combinedMemories.push({
           ...keywordMemory,
           similarity: 0.1, // Low similarity for keyword-only matches
           explanation: 'Keyword match only'
         } as MemoryEntity & { similarity: number; explanation: string });
       }
    }
    
    return {
      memories: combinedMemories.slice(0, options.limit || 10),
      total: combinedMemories.length,
      page: 1,
      pageSize: options.limit || 10,
      semanticResults
    };
  }

  // =============================================================================
  // MEMORY RELATIONSHIP GRAPH OPERATIONS
  // =============================================================================

  async createMemoryRelationship(
    fromMemoryId: string,
    toMemoryId: string,
    type: MemoryRelationship['type'],
    strength: number = 0.5,
    confidence: number = 0.8
  ): Promise<MemoryRelationship> {
    this.ensureInitialized();
    return await this.graphService.createRelationship(fromMemoryId, toMemoryId, type, strength, confidence);
  }

  async updateRelationshipStrength(
    relationshipId: string, 
    newStrength: number,
    newConfidence?: number
  ): Promise<MemoryRelationship> {
    this.ensureInitialized();
    return await this.graphService.updateRelationshipStrength(relationshipId, newStrength, newConfidence);
  }

  async deleteMemoryRelationship(relationshipId: string): Promise<boolean> {
    this.ensureInitialized();
    return await this.graphService.deleteRelationship(relationshipId);
  }

  async discoverMemoryRelationships(memoryId: string): Promise<Array<{
    fromMemoryId: string;
    toMemoryId: string;
    type: MemoryRelationship['type'];
    strength: number;
    confidence: number;
    reason: string;
  }>> {
    this.ensureInitialized();
    return await this.graphService.discoverRelationships(memoryId);
  }

  async autoCreateMemoryRelationships(memoryId: string): Promise<MemoryRelationship[]> {
    this.ensureInitialized();
    return await this.graphService.autoCreateRelationships(memoryId);
  }

  async getRelatedMemories(
    memoryId: string, 
    options: {
      maxDepth?: number;
      minStrength?: number;
      relationshipTypes?: MemoryRelationship['type'][];
      includeDecayed?: boolean;
      sortBy?: 'strength' | 'confidence' | 'recency';
    } = {}
  ): Promise<Array<{ memory: MemoryEntity; relationship: MemoryRelationship; distance: number }>> {
    this.ensureInitialized();
    return await this.graphService.getRelatedMemories(memoryId, options);
  }

  async findMemoryConnectionPath(
    fromMemoryId: string, 
    toMemoryId: string
  ): Promise<MemoryRelationship[] | null> {
    this.ensureInitialized();
    return await this.graphService.findShortestPath(fromMemoryId, toMemoryId);
  }

  async generateMemoryGraphAnalytics(): Promise<{
    totalRelationships: number;
    averageStrength: number;
    mostConnectedMemory: { memoryId: string; connectionCount: number };
    relationshipsByType: Record<string, number>;
    graphDensity: number;
    clustersFound: number;
  }> {
    this.ensureInitialized();
    return await this.graphService.generateGraphAnalytics();
  }

  async runRelationshipDecay(): Promise<void> {
    this.ensureInitialized();
    await this.graphService.runRelationshipDecay();
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private extractContentFromDbMemory(dbMemory: any): string {
    if (typeof dbMemory.content === 'string') {
      return dbMemory.content;
    }
    if (typeof dbMemory.content === 'object' && dbMemory.content?.text) {
      return dbMemory.content.text;
    }
    return JSON.stringify(dbMemory.content || '');
  }

  private ensureDate(value: any): Date {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'string') {
      return new Date(value);
    }
    return new Date();
  }

  async getHealth(): Promise<ServiceHealth> {
    this.ensureInitialized();
    
    const tierMetrics = await this.getTierMetrics();
    const totalMemories = tierMetrics.hot.count + tierMetrics.warm.count + tierMetrics.cold.count;
    
    const memoryByType: Record<string, number> = {};
    const allMemories = this.store.list();
    allMemories.forEach(memory => {
      memoryByType[memory.type] = (memoryByType[memory.type] || 0) + 1;
    });

    const tierManagerHealth = await this.tierManager.getHealth();
    const embeddingServiceHealth = await this.embeddingService.getHealth();
    const graphServiceHealth = await this.graphService.getHealth();

    return {
      service: 'MemoryManager',
      status: this.isInitialized ? 'ok' : 'initializing',
      details: {
        totalMemories,
        memoryByType,
        tierDistribution: {
          hot: tierMetrics.hot.count,
          warm: tierMetrics.warm.count,
          cold: tierMetrics.cold.count
        },
        cacheSize: this.store.size,
        tierManagerStatus: tierManagerHealth.status,
        embeddingServiceStatus: embeddingServiceHealth.status,
        graphServiceStatus: graphServiceHealth.status,
        lastOptimization: tierManagerHealth.details?.lastOptimization,
        embeddingModel: embeddingServiceHealth.details?.model,
        embeddingCacheSize: embeddingServiceHealth.details?.cacheSize,
        totalRelationships: graphServiceHealth.details?.totalRelationships,
        lastDecayRun: graphServiceHealth.details?.lastDecayRun
      },
    };
  }

  private generateMemoryId(): string {
    return `memory_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('MemoryManager not initialized');
    }
  }
} 