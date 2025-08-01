import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryManager } from './memory-manager';
import { MemoryStore } from './memory-store';
import { MemoryLoader } from './memory-loader';
import { DatabaseManager } from './database-manager';
import { SecurityManager } from './security-manager';
import { MemoryEntity, MemoryTier } from '../../shared/types/memory';

// Mock external dependencies
vi.mock('./database-manager');
vi.mock('./security-manager');
vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn(() => Promise.resolve({
    call: vi.fn(() => Promise.resolve({
      data: new Float32Array([0.1, 0.2, 0.3, 0.4])
    }))
  }))
}));

describe('Memory System Integration', () => {
  let memoryManager: MemoryManager;
  let mockDatabaseManager: DatabaseManager;
  let mockSecurityManager: SecurityManager;
  let memoryStore: MemoryStore;
  let memoryLoader: MemoryLoader;

  const sampleMemory: MemoryEntity = {
    id: 'integration_test_memory',
    content: 'This is a test memory for integration testing of the memory system.',
    type: 'text',
    importance: 75,
    personaId: 'test_persona',
    tags: ['integration', 'test', 'memory'],
    createdAt: new Date('2024-01-01'),
    lastAccessed: new Date('2024-01-10')
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create mock instances
    mockDatabaseManager = new DatabaseManager();
    mockSecurityManager = new SecurityManager();
    memoryStore = new MemoryStore();
    memoryLoader = new MemoryLoader();

    // Setup database manager mocks
    vi.mocked(mockDatabaseManager.createMemoryEntity).mockResolvedValue('integration_test_memory');
    vi.mocked(mockDatabaseManager.getMemoryEntity).mockResolvedValue({
      id: 'integration_test_memory',
      persona_id: 'test_persona',
      type: 'text',
      content: { text: 'This is a test memory for integration testing of the memory system.' },
      importance: 75,
      tags: ['integration', 'test', 'memory'],
      created_at: new Date('2024-01-01'),
      last_accessed: new Date('2024-01-10'),
      memory_tier: 'hot',
      access_count: 5,
      last_tier_change: new Date('2024-01-01')
    });
    vi.mocked(mockDatabaseManager.getAllActiveMemories).mockResolvedValue([]);
    vi.mocked(mockDatabaseManager.getMemoriesByTier).mockResolvedValue([]);
    vi.mocked(mockDatabaseManager.updateMemoryTier).mockResolvedValue(undefined);
    vi.mocked(mockDatabaseManager.accessMemoryEntity).mockResolvedValue(undefined);
    vi.mocked(mockDatabaseManager.deleteMemoryEntity).mockResolvedValue(undefined);

    // Setup security manager mocks
    Object.defineProperty(mockSecurityManager, 'eventLogger', {
      value: {
        log: vi.fn()
      },
      writable: true
    });

    // Setup memory loader mock
    vi.spyOn(memoryLoader, 'loadMemories').mockResolvedValue([]);

    // Create memory manager
    memoryManager = new MemoryManager(
      memoryStore,
      memoryLoader,
      mockDatabaseManager,
      mockSecurityManager
    );
  });

  afterEach(async () => {
    await memoryManager.shutdown();
  });

  describe('End-to-End Memory Operations', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should create, retrieve, and delete memories through the complete system', async () => {
      // Create a memory
      const createdMemory = await memoryManager.create({
        content: sampleMemory.content,
        type: sampleMemory.type,
        importance: sampleMemory.importance,
        personaId: sampleMemory.personaId,
        tags: sampleMemory.tags
      });

      expect(createdMemory).toMatchObject({
        id: expect.any(String),
        content: sampleMemory.content,
        type: sampleMemory.type,
        importance: sampleMemory.importance,
        personaId: sampleMemory.personaId,
        tags: sampleMemory.tags
      });

      // Retrieve the memory
      const retrievedMemory = await memoryManager.retrieve(createdMemory.id);
      expect(retrievedMemory).toMatchObject({
        id: createdMemory.id,
        content: sampleMemory.content
      });

      // Delete the memory
      const deleteResult = await memoryManager.delete(createdMemory.id);
      expect(deleteResult).toBe(true);

      // Verify database operations were called
      expect(mockDatabaseManager.createMemoryEntity).toHaveBeenCalled();
      expect(mockDatabaseManager.getMemoryEntity).toHaveBeenCalled();
      expect(mockDatabaseManager.deleteMemoryEntity).toHaveBeenCalled();
    });

    it('should handle memory search operations', async () => {
      // Mock search results
      const searchResults = await memoryManager.search('integration test', 'test_persona');

      expect(searchResults).toMatchObject({
        memories: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        pageSize: expect.any(Number)
      });
    });
  });

  describe('Three-Tier Memory Management Integration', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should promote and demote memories between tiers', async () => {
      const memoryId = 'tier_test_memory';

      // Promote memory to hot tier
      await memoryManager.promoteMemory(memoryId, 'hot');
      expect(mockDatabaseManager.updateMemoryTier).toHaveBeenCalledWith(
        memoryId,
        'hot',
        expect.any(Object)
      );

      // Demote memory to cold tier
      await memoryManager.demoteMemory(memoryId, 'cold');
      expect(mockDatabaseManager.updateMemoryTier).toHaveBeenCalledWith(
        memoryId,
        'cold',
        expect.any(Object)
      );
    });

    it('should optimize memory tiers across the system', async () => {
      const optimizationResult = await memoryManager.optimizeMemoryTiers();

      expect(optimizationResult).toMatchObject({
        duration: expect.any(Number)
      });

      expect(mockDatabaseManager.getAllActiveMemories).toHaveBeenCalled();
    });

    it('should collect tier metrics for system monitoring', async () => {
      const tierMetrics = await memoryManager.getTierMetrics();

      expect(tierMetrics).toMatchObject({
        hot: expect.objectContaining({
          count: expect.any(Number),
          capacity: expect.any(Number),
          utilizationRate: expect.any(Number)
        }),
        warm: expect.objectContaining({
          count: expect.any(Number),
          capacity: expect.any(Number),
          utilizationRate: expect.any(Number)
        }),
        cold: expect.objectContaining({
          count: expect.any(Number),
          capacity: expect.any(Number),
          utilizationRate: expect.any(Number)
        })
      });
    });
  });

  describe('Semantic Search Integration', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should generate embeddings for memories', async () => {
      const embedding = await memoryManager.generateMemoryEmbedding(sampleMemory);

      expect(embedding).toMatchObject({
        memoryId: sampleMemory.id,
        embedding: expect.any(Array),
        model: expect.any(String),
        createdAt: expect.any(Date)
      });
    });

    it('should perform enhanced search combining keyword and semantic search', async () => {
      const enhancedResults = await memoryManager.enhancedSearch('artificial intelligence', {
        personaId: 'test_persona',
        useSemanticSearch: true,
        semanticThreshold: 0.3,
        limit: 10
      });

      expect(enhancedResults).toMatchObject({
        memories: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        pageSize: expect.any(Number)
      });
    });

    it('should find similar memories based on content', async () => {
      const similarMemories = await memoryManager.findSimilarMemories(
        sampleMemory,
        5,
        0.5
      );

      expect(similarMemories).toBeInstanceOf(Array);
    });
  });

  describe('Memory Relationship Graph Integration', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should create and manage memory relationships', async () => {
      const relationship = await memoryManager.createMemoryRelationship(
        'memory_1',
        'memory_2',
        'similar',
        0.8,
        0.9
      );

      expect(relationship).toMatchObject({
        id: expect.any(String),
        fromMemoryId: 'memory_1',
        toMemoryId: 'memory_2',
        type: 'similar',
        strength: 0.8,
        confidence: 0.9
      });
    });

    it('should discover potential relationships automatically', async () => {
      const candidates = await memoryManager.discoverMemoryRelationships('memory_1');

      expect(candidates).toBeInstanceOf(Array);
    });

    it('should find related memories through graph traversal', async () => {
      const relatedMemories = await memoryManager.getRelatedMemories('memory_1', {
        maxDepth: 3,
        minStrength: 0.3,
        sortBy: 'strength'
      });

      expect(relatedMemories).toBeInstanceOf(Array);
    });

    it('should generate graph analytics', async () => {
      const analytics = await memoryManager.generateMemoryGraphAnalytics();

      expect(analytics).toMatchObject({
        totalRelationships: expect.any(Number),
        averageStrength: expect.any(Number),
        mostConnectedMemory: expect.objectContaining({
          memoryId: expect.any(String),
          connectionCount: expect.any(Number)
        }),
        relationshipsByType: expect.any(Object),
        graphDensity: expect.any(Number),
        clustersFound: expect.any(Number)
      });
    });
  });

  describe('System Health and Monitoring Integration', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should provide comprehensive system health information', async () => {
      const health = await memoryManager.getHealth();

      expect(health).toMatchObject({
        service: 'MemoryManager',
        status: expect.any(String),
        details: expect.objectContaining({
          totalMemories: expect.any(Number),
          memoryByType: expect.any(Object),
          tierDistribution: expect.objectContaining({
            hot: expect.any(Number),
            warm: expect.any(Number),
            cold: expect.any(Number)
          }),
          cacheSize: expect.any(Number),
          tierManagerStatus: expect.any(String),
          embeddingServiceStatus: expect.any(String),
          graphServiceStatus: expect.any(String)
        })
      });
    });

    it('should track performance metrics across all components', async () => {
      const health = await memoryManager.getHealth();

      expect(health.details).toMatchObject({
        embeddingModel: expect.any(String),
        embeddingCacheSize: expect.any(Number),
        totalRelationships: expect.any(Number)
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should handle database connection failures gracefully', async () => {
      vi.mocked(mockDatabaseManager.getMemoryEntity).mockRejectedValue(new Error('Database connection failed'));

      await expect(memoryManager.retrieve('nonexistent_id')).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid memory data gracefully', async () => {
      await expect(memoryManager.create({
        content: '', // Empty content
        type: 'text',
        importance: 50,
        personaId: 'test_persona'
      })).rejects.toThrow();
    });

    it('should handle tier management failures gracefully', async () => {
      vi.mocked(mockDatabaseManager.updateMemoryTier).mockRejectedValue(new Error('Tier update failed'));

      await expect(memoryManager.promoteMemory('test_memory', 'hot')).rejects.toThrow('Tier update failed');
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should handle batch operations efficiently', async () => {
      const batchSize = 10;
      const batchData = Array(batchSize).fill(null).map((_, i) => ({
        content: `Batch memory content ${i}`,
        type: 'text' as const,
        importance: 50,
        personaId: 'test_persona',
        tags: [`batch_${i}`]
      }));

      const startTime = Date.now();
      
      // Create memories in batch
      const createdMemories = await Promise.all(
        batchData.map(data => memoryManager.create(data))
      );
      
      const duration = Date.now() - startTime;

      expect(createdMemories.length).toBe(batchSize);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();

      // Perform multiple operations concurrently
      await Promise.all([
        memoryManager.search('test query'),
        memoryManager.getTierMetrics(),
        memoryManager.getHealth(),
        memoryManager.generateMemoryGraphAnalytics()
      ]);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });

  describe('Data Consistency and Integrity', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should maintain consistency between tier manager and database', async () => {
      const memoryId = 'consistency_test_memory';
      
      // Promote memory
      await memoryManager.promoteMemory(memoryId, 'hot');
      
      // Verify tier update was called with correct parameters
      expect(mockDatabaseManager.updateMemoryTier).toHaveBeenCalledWith(
        memoryId,
        'hot',
        expect.objectContaining({
          reason: 'manual',
          timestamp: expect.any(Date)
        })
      );
    });

    it('should maintain relationship consistency in graph operations', async () => {
      const fromMemoryId = 'memory_a';
      const toMemoryId = 'memory_b';
      
      // Create relationship
      await memoryManager.createMemoryRelationship(fromMemoryId, toMemoryId, 'similar', 0.8, 0.9);
      
      // The relationship should be stored and accessible
      const relatedMemories = await memoryManager.getRelatedMemories(fromMemoryId);
      expect(relatedMemories).toBeInstanceOf(Array);
    });
  });

  describe('Service Lifecycle Management', () => {
    it('should initialize all components in correct order', async () => {
      await memoryManager.initialize();
      
      const health = await memoryManager.getHealth();
      expect(health.status).toBe('ok');
      expect(health.details?.tierManagerStatus).toBe('ok');
      expect(health.details?.embeddingServiceStatus).toBe('ok');
      expect(health.details?.graphServiceStatus).toBe('ok');
    });

    it('should shutdown all components gracefully', async () => {
      await memoryManager.initialize();
      await memoryManager.shutdown();
      
      // After shutdown, operations should fail gracefully
      await expect(memoryManager.search('test')).rejects.toThrow();
    });

    it('should handle partial initialization failures', async () => {
      // Mock embedding service failure
      const failingManager = new MemoryManager(
        memoryStore,
        memoryLoader,
        mockDatabaseManager,
        mockSecurityManager
      );

      // Should still attempt initialization even if some components fail
      await expect(failingManager.initialize()).rejects.toThrow();
      
      await failingManager.shutdown();
    });
  });
}); 