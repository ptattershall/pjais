import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryManager } from './memory-manager';
import { MemoryStore } from './memory-store';
import { MemoryLoader } from './memory-loader';
import { DatabaseManager } from './database-manager';
import { SecurityManager } from './security-manager';
import { MemoryEntity } from '../../shared/types/memory';

// Mock external dependencies
vi.mock('./database-manager');
vi.mock('./security-manager');
vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn(() => Promise.resolve({
    call: vi.fn(() => Promise.resolve({
      data: new Float32Array(384).fill(0).map(() => Math.random())
    }))
  }))
}));

describe('Memory System Performance Tests', () => {
  let memoryManager: MemoryManager;
  let mockDatabaseManager: DatabaseManager;
  let mockSecurityManager: SecurityManager;
  let memoryStore: MemoryStore;
  let memoryLoader: MemoryLoader;

  const generateMockMemory = (index: number) => ({
    id: `perf_memory_${index}`,
    persona_id: `persona_${index % 10}`, // 10 different personas
    type: 'text',
    content: { text: `Performance test memory content ${index} with various keywords and topics` },
    importance: Math.floor(Math.random() * 100),
    tags: [`tag_${index}`, `category_${index % 5}`, 'performance'],
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
    last_accessed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random access within last week
    memory_tier: ['hot', 'warm', 'cold'][index % 3] as any,
    access_count: Math.floor(Math.random() * 100),
    last_tier_change: new Date()
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create mock instances
    mockDatabaseManager = new DatabaseManager();
    mockSecurityManager = new SecurityManager();
    memoryStore = new MemoryStore();
    memoryLoader = new MemoryLoader();

    // Setup database manager mocks with performance-oriented responses
    vi.mocked(mockDatabaseManager.createMemoryEntity).mockImplementation(async () => {
      // Simulate small delay for database write
      await new Promise(resolve => setTimeout(resolve, 1));
      return `memory_${Date.now()}_${Math.random()}`;
    });

    vi.mocked(mockDatabaseManager.getMemoryEntity).mockImplementation(async (id) => {
      // Simulate small delay for database read
      await new Promise(resolve => setTimeout(resolve, 1));
      return generateMockMemory(parseInt(id.split('_')[2] || '0'));
    });

    vi.mocked(mockDatabaseManager.getAllActiveMemories).mockImplementation(async () => {
      // Generate large dataset for performance testing
      const memories = Array(1000).fill(null).map((_, i) => generateMockMemory(i));
      await new Promise(resolve => setTimeout(resolve, 5)); // Simulate query time
      return memories;
    });

    vi.mocked(mockDatabaseManager.getMemoriesByTier).mockImplementation(async (tier) => {
      const memories = Array(tier === 'hot' ? 100 : tier === 'warm' ? 500 : 1000)
        .fill(null).map((_, i) => generateMockMemory(i));
      await new Promise(resolve => setTimeout(resolve, 2));
      return memories;
    });

    vi.mocked(mockDatabaseManager.updateMemoryTier).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
    });

    vi.mocked(mockDatabaseManager.accessMemoryEntity).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
    });

    vi.mocked(mockDatabaseManager.deleteMemoryEntity).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
    });

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

  describe('Initialization Performance', () => {
    it('should initialize within acceptable time limits', async () => {
      const startTime = Date.now();
      await memoryManager.initialize();
      const initTime = Date.now() - startTime;

      // Should initialize within 2 seconds
      expect(initTime).toBeLessThan(2000);

      const health = await memoryManager.getHealth();
      expect(health.status).toBe('ok');
    });
  });

  describe('Memory Creation Performance', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should create single memory efficiently', async () => {
      const memoryData = {
        content: 'Performance test memory content',
        type: 'text' as const,
        importance: 75,
        personaId: 'perf_persona',
        tags: ['performance', 'test']
      };

      const startTime = Date.now();
      const result = await memoryManager.create(memoryData);
      const createTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(createTime).toBeLessThan(100); // Should create within 100ms
    });

    it('should handle batch memory creation efficiently', async () => {
      const batchSize = 50;
      const memoryBatch = Array(batchSize).fill(null).map((_, i) => ({
        content: `Batch memory content ${i}`,
        type: 'text' as const,
        importance: Math.floor(Math.random() * 100),
        personaId: `batch_persona_${i % 5}`,
        tags: [`batch_${i}`, 'performance']
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        memoryBatch.map(data => memoryManager.create(data))
      );
      const batchTime = Date.now() - startTime;

      expect(results).toHaveLength(batchSize);
      expect(batchTime).toBeLessThan(5000); // Should complete batch within 5 seconds
      expect(batchTime / batchSize).toBeLessThan(100); // Average per memory < 100ms
    });
  });

  describe('Memory Retrieval Performance', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should retrieve single memory efficiently', async () => {
      const startTime = Date.now();
      const result = await memoryManager.retrieve('perf_memory_1');
      const retrieveTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(retrieveTime).toBeLessThan(50); // Should retrieve within 50ms
    });

    it('should handle concurrent memory retrievals efficiently', async () => {
      const concurrentCount = 20;
      const memoryIds = Array(concurrentCount).fill(null).map((_, i) => `perf_memory_${i}`);

      const startTime = Date.now();
      const results = await Promise.all(
        memoryIds.map(id => memoryManager.retrieve(id))
      );
      const concurrentTime = Date.now() - startTime;

      expect(results).toHaveLength(concurrentCount);
      expect(concurrentTime).toBeLessThan(1000); // Should complete concurrent retrieval within 1 second
      expect(concurrentTime / concurrentCount).toBeLessThan(50); // Average per retrieval < 50ms
    });
  });

  describe('Search Performance', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should perform keyword search efficiently', async () => {
      const startTime = Date.now();
      const result = await memoryManager.search('performance test');
      const searchTime = Date.now() - startTime;

      expect(result).toMatchObject({
        memories: expect.any(Array),
        total: expect.any(Number)
      });
      expect(searchTime).toBeLessThan(200); // Should search within 200ms
    });

    it('should handle multiple concurrent searches efficiently', async () => {
      const searchQueries = [
        'performance test',
        'memory management',
        'artificial intelligence',
        'database operations',
        'system optimization'
      ];

      const startTime = Date.now();
      const results = await Promise.all(
        searchQueries.map(query => memoryManager.search(query))
      );
      const concurrentSearchTime = Date.now() - startTime;

      expect(results).toHaveLength(searchQueries.length);
      expect(concurrentSearchTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should perform enhanced search with semantic features efficiently', async () => {
      const startTime = Date.now();
      const result = await memoryManager.enhancedSearch('artificial intelligence', {
        personaId: 'perf_persona',
        useSemanticSearch: true,
        semanticThreshold: 0.3,
        limit: 10
      });
      const enhancedSearchTime = Date.now() - startTime;

      expect(result).toMatchObject({
        memories: expect.any(Array),
        total: expect.any(Number)
      });
      expect(enhancedSearchTime).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Tier Management Performance', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should optimize memory tiers efficiently', async () => {
      const startTime = Date.now();
      const result = await memoryManager.optimizeMemoryTiers();
      const optimizationTime = Date.now() - startTime;

      expect(result).toMatchObject({
        duration: expect.any(Number)
      });
      expect(optimizationTime).toBeLessThan(2000); // Should optimize within 2 seconds
    });

    it('should collect tier metrics efficiently', async () => {
      const startTime = Date.now();
      const metrics = await memoryManager.getTierMetrics();
      const metricsTime = Date.now() - startTime;

      expect(metrics).toMatchObject({
        hot: expect.any(Object),
        warm: expect.any(Object),
        cold: expect.any(Object)
      });
      expect(metricsTime).toBeLessThan(100); // Should collect metrics within 100ms
    });

    it('should handle tier promotions/demotions efficiently', async () => {
      const memoryIds = Array(20).fill(null).map((_, i) => `perf_memory_${i}`);

      const startTime = Date.now();
      await Promise.all([
        ...memoryIds.slice(0, 10).map(id => memoryManager.promoteMemory(id, 'hot')),
        ...memoryIds.slice(10, 20).map(id => memoryManager.demoteMemory(id, 'cold'))
      ]);
      const tierOperationsTime = Date.now() - startTime;

      expect(tierOperationsTime).toBeLessThan(1000); // Should complete tier operations within 1 second
    });
  });

  describe('Embedding Performance', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should generate embeddings efficiently', async () => {
      const testMemory: MemoryEntity = {
        id: 'embedding_test',
        content: 'Test content for embedding generation performance',
        type: 'text',
        importance: 75,
        personaId: 'test_persona',
        tags: ['embedding', 'performance'],
        createdAt: new Date(),
        lastAccessed: new Date()
      };

      const startTime = Date.now();
      const embedding = await memoryManager.generateMemoryEmbedding(testMemory);
      const embeddingTime = Date.now() - startTime;

      expect(embedding).toMatchObject({
        memoryId: 'embedding_test',
        embedding: expect.any(Array),
        model: expect.any(String)
      });
      expect(embeddingTime).toBeLessThan(300); // Should generate embedding within 300ms
    });

    it('should handle batch embedding generation efficiently', async () => {
      const batchSize = 10;
      const memories: MemoryEntity[] = Array(batchSize).fill(null).map((_, i) => ({
        id: `batch_embedding_${i}`,
        content: `Batch embedding test content ${i}`,
        type: 'text',
        importance: 50,
        personaId: 'test_persona',
        tags: ['batch', 'embedding'],
        createdAt: new Date(),
        lastAccessed: new Date()
      }));

      const startTime = Date.now();
      const embeddings = await Promise.all(
        memories.map(memory => memoryManager.generateMemoryEmbedding(memory))
      );
      const batchEmbeddingTime = Date.now() - startTime;

      expect(embeddings).toHaveLength(batchSize);
      expect(batchEmbeddingTime).toBeLessThan(3000); // Should complete batch within 3 seconds
      expect(batchEmbeddingTime / batchSize).toBeLessThan(300); // Average per embedding < 300ms
    });
  });

  describe('Relationship Graph Performance', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should create relationships efficiently', async () => {
      const startTime = Date.now();
      const relationship = await memoryManager.createMemoryRelationship(
        'memory_1',
        'memory_2',
        'similar',
        0.8,
        0.9
      );
      const relationshipTime = Date.now() - startTime;

      expect(relationship).toMatchObject({
        fromMemoryId: 'memory_1',
        toMemoryId: 'memory_2',
        type: 'similar',
        strength: 0.8,
        confidence: 0.9
      });
      expect(relationshipTime).toBeLessThan(100); // Should create relationship within 100ms
    });

    it('should generate graph analytics efficiently', async () => {
      const startTime = Date.now();
      const analytics = await memoryManager.generateMemoryGraphAnalytics();
      const analyticsTime = Date.now() - startTime;

      expect(analytics).toMatchObject({
        totalRelationships: expect.any(Number),
        averageStrength: expect.any(Number),
        mostConnectedMemory: expect.any(Object),
        relationshipsByType: expect.any(Object),
        graphDensity: expect.any(Number),
        clustersFound: expect.any(Number)
      });
      expect(analyticsTime).toBeLessThan(500); // Should generate analytics within 500ms
    });

    it('should find related memories efficiently', async () => {
      const startTime = Date.now();
      const relatedMemories = await memoryManager.getRelatedMemories('memory_1', {
        maxDepth: 3,
        minStrength: 0.3,
        sortBy: 'strength'
      });
      const relatedTime = Date.now() - startTime;

      expect(relatedMemories).toBeInstanceOf(Array);
      expect(relatedTime).toBeLessThan(200); // Should find related memories within 200ms
    });
  });

  describe('System Health and Monitoring Performance', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should generate health report efficiently', async () => {
      const startTime = Date.now();
      const health = await memoryManager.getHealth();
      const healthTime = Date.now() - startTime;

      expect(health).toMatchObject({
        service: 'MemoryManager',
        status: expect.any(String),
        details: expect.any(Object)
      });
      expect(healthTime).toBeLessThan(100); // Should generate health report within 100ms
    });

    it('should handle concurrent health checks efficiently', async () => {
      const concurrentChecks = 5;

      const startTime = Date.now();
      const healthReports = await Promise.all(
        Array(concurrentChecks).fill(null).map(() => memoryManager.getHealth())
      );
      const concurrentHealthTime = Date.now() - startTime;

      expect(healthReports).toHaveLength(concurrentChecks);
      expect(concurrentHealthTime).toBeLessThan(200); // Should complete concurrent checks within 200ms
    });
  });

  describe('Memory Scaling Performance', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should handle large memory datasets efficiently', async () => {
      // Simulate working with larger dataset
      const largeDatasetSize = 5000;
      vi.mocked(mockDatabaseManager.getAllActiveMemories).mockImplementation(async () => {
        const memories = Array(largeDatasetSize).fill(null).map((_, i) => generateMockMemory(i));
        await new Promise(resolve => setTimeout(resolve, 20)); // Simulate larger query time
        return memories;
      });

      const startTime = Date.now();
      const optimizationResult = await memoryManager.optimizeMemoryTiers();
      const largeDatasetTime = Date.now() - startTime;

      expect(optimizationResult).toBeDefined();
      expect(largeDatasetTime).toBeLessThan(5000); // Should handle large dataset within 5 seconds
    });

    it('should maintain performance under mixed workload', async () => {
      // Simulate mixed operations running concurrently
      const operations = [
        memoryManager.create({
          content: 'Mixed workload memory 1',
          type: 'text',
          importance: 50,
          personaId: 'mixed_persona'
        }),
        memoryManager.search('mixed workload'),
        memoryManager.getTierMetrics(),
        memoryManager.getHealth(),
        memoryManager.retrieve('perf_memory_1'),
        memoryManager.enhancedSearch('performance test', { limit: 5 })
      ];

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const mixedWorkloadTime = Date.now() - startTime;

      expect(results).toHaveLength(6);
      expect(mixedWorkloadTime).toBeLessThan(1500); // Should complete mixed workload within 1.5 seconds
    });
  });

  describe('Resource Usage Performance', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should manage memory usage efficiently during operations', async () => {
      const initialMemoryUsage = process.memoryUsage();

      // Perform memory-intensive operations
      const operations = Array(100).fill(null).map((_, i) => 
        memoryManager.create({
          content: `Memory usage test ${i}`,
          type: 'text',
          importance: 50,
          personaId: 'memory_test_persona'
        })
      );

      await Promise.all(operations);

      const afterOperationsMemoryUsage = process.memoryUsage();
      const memoryIncrease = afterOperationsMemoryUsage.heapUsed - initialMemoryUsage.heapUsed;

      // Memory increase should be reasonable (less than 50MB for 100 operations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should cleanup resources properly after shutdown', async () => {
      const initialMemoryUsage = process.memoryUsage();

      // Perform operations and shutdown
      await memoryManager.create({
        content: 'Cleanup test memory',
        type: 'text',
        importance: 50,
        personaId: 'cleanup_persona'
      });

      await memoryManager.shutdown();

      // Give some time for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      const afterShutdownMemoryUsage = process.memoryUsage();
      const memoryDifference = afterShutdownMemoryUsage.heapUsed - initialMemoryUsage.heapUsed;

      // Memory usage should not increase significantly after shutdown
      expect(memoryDifference).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    });
  });
}); 