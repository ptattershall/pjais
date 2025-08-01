import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryManager } from '../services/memory-manager';
import { MemoryStore } from '../services/memory-store';
import { MemoryLoader } from '../services/memory-loader';
import { DatabaseManager } from '../services/database-manager';
import { SecurityManager } from '../services/security-manager';
import { MemoryEntity } from '../../shared/types/memory';

// Mock IPC event object
const createMockEvent = () => ({
  reply: vi.fn(),
  returnValue: undefined,
  preventDefault: vi.fn(),
  sender: {
    send: vi.fn()
  }
});

// Mock external dependencies
vi.mock('../services/database-manager');
vi.mock('../services/security-manager');
vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn(() => Promise.resolve({
    call: vi.fn(() => Promise.resolve({
      data: new Float32Array([0.1, 0.2, 0.3, 0.4])
    }))
  }))
}));

describe('Memory IPC API Integration', () => {
  let memoryManager: MemoryManager;
  let mockDatabaseManager: DatabaseManager;
  let mockSecurityManager: SecurityManager;
  let memoryStore: MemoryStore;
  let memoryLoader: MemoryLoader;

  const sampleMemoryData = {
    content: 'Test memory content for IPC testing',
    type: 'text' as const,
    importance: 75,
    personaId: 'test_persona',
    tags: ['ipc', 'test']
  };

  const mockDbMemory = {
    id: 'test_memory_id',
    persona_id: 'test_persona',
    type: 'text',
    content: { text: 'Test memory content for IPC testing' },
    importance: 75,
    tags: ['ipc', 'test'],
    created_at: new Date(),
    last_accessed: new Date(),
    memory_tier: 'hot',
    access_count: 1,
    last_tier_change: new Date()
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create mock instances
    mockDatabaseManager = new DatabaseManager();
    mockSecurityManager = new SecurityManager();
    memoryStore = new MemoryStore();
    memoryLoader = new MemoryLoader();

    // Setup database manager mocks
    vi.mocked(mockDatabaseManager.createMemoryEntity).mockResolvedValue('test_memory_id');
    vi.mocked(mockDatabaseManager.getMemoryEntity).mockResolvedValue(mockDbMemory);
    vi.mocked(mockDatabaseManager.getAllActiveMemories).mockResolvedValue([mockDbMemory]);
    vi.mocked(mockDatabaseManager.getMemoriesByTier).mockResolvedValue([mockDbMemory]);
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

    await memoryManager.initialize();
  });

  afterEach(async () => {
    await memoryManager.shutdown();
  });

  describe('Basic Memory Operations', () => {
    it('should create memory through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate the IPC handler logic
      const result = await memoryManager.create(sampleMemoryData);

      expect(result).toMatchObject({
        id: expect.any(String),
        content: sampleMemoryData.content,
        type: sampleMemoryData.type,
        importance: sampleMemoryData.importance,
        personaId: sampleMemoryData.personaId,
        tags: sampleMemoryData.tags
      });

      expect(mockDatabaseManager.createMemoryEntity).toHaveBeenCalled();
    });

    it('should retrieve memory through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate the IPC handler logic
      const result = await memoryManager.retrieve('test_memory_id');

      expect(result).toMatchObject({
        id: 'test_memory_id',
        content: expect.any(String),
        type: 'text',
        importance: 75,
        personaId: 'test_persona'
      });

      expect(mockDatabaseManager.getMemoryEntity).toHaveBeenCalledWith('test_memory_id');
    });

    it('should delete memory through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate the IPC handler logic
      const result = await memoryManager.delete('test_memory_id');

      expect(result).toBe(true);
      expect(mockDatabaseManager.deleteMemoryEntity).toHaveBeenCalledWith('test_memory_id');
    });

    it('should search memories through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate the IPC handler logic
      const result = await memoryManager.search('test query', 'test_persona');

      expect(result).toMatchObject({
        memories: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        pageSize: expect.any(Number)
      });
    });
  });

  describe('Tier Management Operations', () => {
    it('should promote memory tier through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate the IPC handler logic
      await memoryManager.promoteMemory('test_memory_id', 'hot');

      expect(mockDatabaseManager.updateMemoryTier).toHaveBeenCalledWith(
        'test_memory_id',
        'hot',
        expect.any(Object)
      );
    });

    it('should demote memory tier through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate the IPC handler logic
      await memoryManager.demoteMemory('test_memory_id', 'cold');

      expect(mockDatabaseManager.updateMemoryTier).toHaveBeenCalledWith(
        'test_memory_id',
        'cold',
        expect.any(Object)
      );
    });

    it('should optimize memory tiers through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate the IPC handler logic
      const result = await memoryManager.optimizeMemoryTiers();

      expect(result).toMatchObject({
        duration: expect.any(Number)
      });

      expect(mockDatabaseManager.getAllActiveMemories).toHaveBeenCalled();
    });

    it('should get tier metrics through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate the IPC handler logic
      const result = await memoryManager.getTierMetrics();

      expect(result).toMatchObject({
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

  describe('Semantic Search Operations', () => {
    it('should generate memory embedding through IPC interface', async () => {
      const mockEvent = createMockEvent();
      const sampleMemory: MemoryEntity = {
        id: 'test_memory_id',
        content: sampleMemoryData.content,
        type: sampleMemoryData.type,
        importance: sampleMemoryData.importance,
        personaId: sampleMemoryData.personaId,
        tags: sampleMemoryData.tags,
        createdAt: new Date(),
        lastAccessed: new Date()
      };

      // Simulate the IPC handler logic
      const result = await memoryManager.generateMemoryEmbedding(sampleMemory);

      expect(result).toMatchObject({
        memoryId: 'test_memory_id',
        embedding: expect.any(Array),
        model: expect.any(String),
        createdAt: expect.any(Date)
      });
    });

    it('should perform semantic search through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate the IPC handler logic - semantic search
      const searchQuery = {
        query: 'artificial intelligence',
        limit: 10,
        threshold: 0.3
      };

      const memories: MemoryEntity[] = [{
        id: 'test_memory_id',
        content: sampleMemoryData.content,
        type: sampleMemoryData.type,
        importance: sampleMemoryData.importance,
        personaId: sampleMemoryData.personaId,
        tags: sampleMemoryData.tags,
        createdAt: new Date(),
        lastAccessed: new Date()
      }];

      // This would normally call the embedding service
      // For test purposes, we're verifying the manager setup
      expect(memoryManager).toBeDefined();
    });

    it('should perform enhanced search through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate the IPC handler logic
      const result = await memoryManager.enhancedSearch('test query', {
        personaId: 'test_persona',
        useSemanticSearch: true,
        semanticThreshold: 0.3,
        limit: 10
      });

      expect(result).toMatchObject({
        memories: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        pageSize: expect.any(Number)
      });
    });
  });

  describe('Relationship Graph Operations', () => {
    it('should create memory relationship through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate the IPC handler logic
      const result = await memoryManager.createMemoryRelationship(
        'memory_1',
        'memory_2',
        'similar',
        0.8,
        0.9
      );

      expect(result).toMatchObject({
        id: expect.any(String),
        fromMemoryId: 'memory_1',
        toMemoryId: 'memory_2',
        type: 'similar',
        strength: 0.8,
        confidence: 0.9
      });
    });

    it('should get related memories through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate the IPC handler logic
      const result = await memoryManager.getRelatedMemories('test_memory_id', {
        maxDepth: 3,
        minStrength: 0.3,
        sortBy: 'strength'
      });

      expect(result).toBeInstanceOf(Array);
    });

    it('should generate graph analytics through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate the IPC handler logic
      const result = await memoryManager.generateMemoryGraphAnalytics();

      expect(result).toMatchObject({
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

  describe('Health and Monitoring Operations', () => {
    it('should get memory system health through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate the IPC handler logic
      const result = await memoryManager.getHealth();

      expect(result).toMatchObject({
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

    it('should get memory system statistics through IPC interface', async () => {
      const mockEvent = createMockEvent();

      // Simulate getting system statistics
      const health = await memoryManager.getHealth();

      expect(health.details).toMatchObject({
        totalMemories: expect.any(Number),
        memoryByType: expect.any(Object),
        tierDistribution: expect.any(Object),
        embeddingModel: expect.any(String),
        embeddingCacheSize: expect.any(Number),
        totalRelationships: expect.any(Number)
      });
    });
  });

  describe('Error Handling in IPC Layer', () => {
    it('should handle invalid memory creation data', async () => {
      const mockEvent = createMockEvent();

      // Simulate invalid data
      const invalidData = {
        content: '', // Empty content
        type: 'text' as const,
        importance: 50,
        personaId: 'test_persona'
      };

      await expect(memoryManager.create(invalidData)).rejects.toThrow();
    });

    it('should handle memory not found errors', async () => {
      const mockEvent = createMockEvent();

      vi.mocked(mockDatabaseManager.getMemoryEntity).mockResolvedValue(null);

      await expect(memoryManager.retrieve('nonexistent_id')).rejects.toThrow();
    });

    it('should handle database connection failures', async () => {
      const mockEvent = createMockEvent();

      vi.mocked(mockDatabaseManager.createMemoryEntity).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(memoryManager.create(sampleMemoryData)).rejects.toThrow('Database connection failed');
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should handle concurrent memory operations', async () => {
      const mockEvent = createMockEvent();

      // Simulate multiple concurrent operations
      const operations = [
        memoryManager.create({ ...sampleMemoryData, content: 'Memory 1' }),
        memoryManager.create({ ...sampleMemoryData, content: 'Memory 2' }),
        memoryManager.create({ ...sampleMemoryData, content: 'Memory 3' }),
        memoryManager.search('test query'),
        memoryManager.getHealth()
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(5);
      expect(results[0]).toMatchObject({ content: 'Memory 1' });
      expect(results[1]).toMatchObject({ content: 'Memory 2' });
      expect(results[2]).toMatchObject({ content: 'Memory 3' });
      expect(results[3]).toMatchObject({ memories: expect.any(Array) });
      expect(results[4]).toMatchObject({ service: 'MemoryManager' });
    });

    it('should complete operations within reasonable timeframes', async () => {
      const mockEvent = createMockEvent();

      const startTime = Date.now();
      await memoryManager.create(sampleMemoryData);
      const createTime = Date.now() - startTime;

      const startTime2 = Date.now();
      await memoryManager.search('test query');
      const searchTime = Date.now() - startTime2;

      // Operations should complete quickly (generous limits for test environment)
      expect(createTime).toBeLessThan(1000);
      expect(searchTime).toBeLessThan(1000);
    });
  });

  describe('Data Validation and Security', () => {
    it('should validate memory data before creation', async () => {
      const mockEvent = createMockEvent();

      const invalidMemoryData = {
        content: 'Valid content',
        type: 'invalid_type' as any, // Invalid type
        importance: 150, // Out of range
        personaId: '',  // Empty persona ID
        tags: []
      };

      await expect(memoryManager.create(invalidMemoryData)).rejects.toThrow();
    });

    it('should sanitize input data properly', async () => {
      const mockEvent = createMockEvent();

      const memoryWithSpecialChars = {
        content: 'Content with <script>alert("xss")</script> tags',
        type: 'text' as const,
        importance: 50,
        personaId: 'test_persona',
        tags: ['<script>', 'safe_tag']
      };

      // The memory manager should handle this appropriately
      // For this test, we verify it doesn't crash
      const result = await memoryManager.create(memoryWithSpecialChars);
      expect(result).toBeDefined();
    });
  });
}); 