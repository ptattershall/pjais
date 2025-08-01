import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryTierManager } from './memory-tier-manager';
import { DatabaseManager } from './database-manager';
import { SecurityManager } from './security-manager';
import { MemoryTier } from '../../shared/types/memory';

// Mock dependencies
vi.mock('./database-manager');
vi.mock('./security-manager');

describe('MemoryTierManager', () => {
  let tierManager: MemoryTierManager;
  let mockDatabaseManager: DatabaseManager;
  let mockSecurityManager: SecurityManager;

  // Mock memory data
  const mockMemory = {
    id: 'memory_123',
    content: 'Test memory content',
    type: 'text',
    importance: 75,
    personaId: 'persona_1',
    tags: ['test', 'important'],
    createdAt: new Date('2024-01-01'),
    lastAccessed: new Date('2024-01-10'),
    memoryTier: 'hot' as MemoryTier
  };

  const mockDbMemory = {
    id: 'memory_123',
    persona_id: 'persona_1',
    type: 'text',
    content: { text: 'Test memory content' },
    importance: 75,
    tags: ['test', 'important'],
    created_at: new Date('2024-01-01'),
    last_accessed: new Date('2024-01-10'),
    memory_tier: 'hot',
    access_count: 10,
    last_tier_change: new Date('2024-01-01')
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock instances
    mockDatabaseManager = new DatabaseManager();
    mockSecurityManager = new SecurityManager();

    // Setup basic mocks
    vi.mocked(mockDatabaseManager.getMemoryEntity).mockResolvedValue(mockDbMemory);
    vi.mocked(mockDatabaseManager.getAllActiveMemories).mockResolvedValue([mockDbMemory]);
    vi.mocked(mockDatabaseManager.updateMemoryTier).mockResolvedValue(undefined);
    vi.mocked(mockDatabaseManager.getMemoriesByTier).mockResolvedValue([mockDbMemory]);

    // Mock security manager
    Object.defineProperty(mockSecurityManager, 'eventLogger', {
      value: {
        log: vi.fn()
      },
      writable: true
    });

    tierManager = new MemoryTierManager(mockDatabaseManager, mockSecurityManager);
  });

  afterEach(async () => {
    await tierManager.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await tierManager.initialize();
      const health = await tierManager.getHealth();
      
      expect(health.service).toBe('MemoryTierManager');
      expect(health.status).toBe('ok');
    });

    it('should handle initialization errors gracefully', async () => {
      vi.mocked(mockDatabaseManager.getMemoriesByTier).mockRejectedValue(new Error('Database error'));
      
      await expect(tierManager.initialize()).rejects.toThrow('Database error');
    });
  });

  describe('Memory Scoring Algorithm', () => {
    beforeEach(async () => {
      await tierManager.initialize();
    });

    it('should calculate memory score correctly with all factors', async () => {
      const score = await tierManager.calculateMemoryScore('memory_123');
      
      expect(score).toMatchObject({
        memoryId: 'memory_123',
        totalScore: expect.any(Number),
        accessScore: expect.any(Number),
        importanceScore: expect.any(Number),
        ageScore: expect.any(Number),
        connectionScore: expect.any(Number)
      });

      // Score should be between 0 and 100
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
      expect(score.totalScore).toBeLessThanOrEqual(100);
    });

    it('should give higher scores to recently accessed memories', async () => {
      const recentMemory = {
        ...mockDbMemory,
        id: 'recent_memory',
        last_accessed: new Date() // Now
      };

      const oldMemory = {
        ...mockDbMemory,
        id: 'old_memory',
        last_accessed: new Date('2023-01-01') // Old
      };

      vi.mocked(mockDatabaseManager.getMemoryEntity)
        .mockResolvedValueOnce(recentMemory)
        .mockResolvedValueOnce(oldMemory);

      const recentScore = await tierManager.calculateMemoryScore('recent_memory');
      const oldScore = await tierManager.calculateMemoryScore('old_memory');

      expect(recentScore.accessScore).toBeGreaterThan(oldScore.accessScore);
    });

    it('should give higher scores to more important memories', async () => {
      const highImportanceMemory = {
        ...mockDbMemory,
        id: 'high_importance',
        importance: 95
      };

      const lowImportanceMemory = {
        ...mockDbMemory,
        id: 'low_importance',
        importance: 20
      };

      vi.mocked(mockDatabaseManager.getMemoryEntity)
        .mockResolvedValueOnce(highImportanceMemory)
        .mockResolvedValueOnce(lowImportanceMemory);

      const highScore = await tierManager.calculateMemoryScore('high_importance');
      const lowScore = await tierManager.calculateMemoryScore('low_importance');

      expect(highScore.importanceScore).toBeGreaterThan(lowScore.importanceScore);
    });
  });

  describe('Tier Management', () => {
    beforeEach(async () => {
      await tierManager.initialize();
    });

    it('should promote memory to higher tier', async () => {
      await tierManager.promoteMemory('memory_123', 'hot', 'manual');

      expect(mockDatabaseManager.updateMemoryTier).toHaveBeenCalledWith(
        'memory_123',
        'hot',
        expect.any(Object)
      );
    });

    it('should demote memory to lower tier', async () => {
      await tierManager.demoteMemory('memory_123', 'cold', 'manual');

      expect(mockDatabaseManager.updateMemoryTier).toHaveBeenCalledWith(
        'memory_123',
        'cold',
        expect.any(Object)
      );
    });

    it('should prevent promotion if tier limits are exceeded', async () => {
      // Mock tier being at capacity
      const manyMemories = Array(105).fill(mockDbMemory); // Over hot tier limit of 100
      vi.mocked(mockDatabaseManager.getMemoriesByTier).mockResolvedValue(manyMemories);

      await expect(
        tierManager.promoteMemory('memory_123', 'hot', 'manual')
      ).rejects.toThrow(/tier is at capacity/);
    });

    it('should allow demotion even when tier is at capacity', async () => {
      await tierManager.demoteMemory('memory_123', 'cold', 'manual');

      expect(mockDatabaseManager.updateMemoryTier).toHaveBeenCalled();
    });
  });

  describe('Tier Optimization', () => {
    beforeEach(async () => {
      await tierManager.initialize();
    });

    it('should optimize memory tiers based on scores', async () => {
      // Mock memories with different scores
      const hotMemory = { ...mockDbMemory, id: 'hot_memory', memory_tier: 'hot', importance: 95 };
      const warmMemory = { ...mockDbMemory, id: 'warm_memory', memory_tier: 'warm', importance: 60 };
      const coldMemory = { ...mockDbMemory, id: 'cold_memory', memory_tier: 'cold', importance: 20 };

      vi.mocked(mockDatabaseManager.getAllActiveMemories).mockResolvedValue([
        hotMemory, warmMemory, coldMemory
      ]);

      const result = await tierManager.optimizeMemoryTiers();

      expect(result).toMatchObject({
        totalMemories: 3,
        promotions: expect.any(Number),
        demotions: expect.any(Number),
        unchanged: expect.any(Number),
        duration: expect.any(Number)
      });

      expect(result.promotions + result.demotions + result.unchanged).toBe(3);
    });

    it('should not optimize if no memories exist', async () => {
      vi.mocked(mockDatabaseManager.getAllActiveMemories).mockResolvedValue([]);

      const result = await tierManager.optimizeMemoryTiers();

      expect(result.totalMemories).toBe(0);
      expect(result.promotions).toBe(0);
      expect(result.demotions).toBe(0);
      expect(result.unchanged).toBe(0);
    });

    it('should respect tier capacity limits during optimization', async () => {
      // Create many high-scoring memories that would exceed hot tier capacity
      const manyHighScoreMemories = Array(150).fill(null).map((_, i) => ({
        ...mockDbMemory,
        id: `high_score_${i}`,
        memory_tier: 'warm',
        importance: 95,
        access_count: 100
      }));

      vi.mocked(mockDatabaseManager.getAllActiveMemories).mockResolvedValue(manyHighScoreMemories);

      const result = await tierManager.optimizeMemoryTiers();

      // Should not promote more than hot tier capacity (100)
      expect(result.promotions).toBeLessThanOrEqual(100);
    });
  });

  describe('Tier Metrics Collection', () => {
    beforeEach(async () => {
      await tierManager.initialize();
    });

    it('should collect metrics for all tiers', async () => {
      const hotMemories = Array(50).fill(mockDbMemory);
      const warmMemories = Array(200).fill(mockDbMemory);
      const coldMemories = Array(1000).fill(mockDbMemory);

      vi.mocked(mockDatabaseManager.getMemoriesByTier)
        .mockResolvedValueOnce(hotMemories)   // hot
        .mockResolvedValueOnce(warmMemories)  // warm
        .mockResolvedValueOnce(coldMemories); // cold

      const metrics = await tierManager.collectTierMetrics();

      expect(metrics).toMatchObject({
        hot: {
          count: 50,
          capacity: 100,
          utilizationRate: 0.5,
          averageImportance: expect.any(Number),
          averageAccessCount: expect.any(Number),
          oldestMemory: expect.any(Date),
          newestMemory: expect.any(Date)
        },
        warm: {
          count: 200,
          capacity: 500,
          utilizationRate: 0.4,
          averageImportance: expect.any(Number),
          averageAccessCount: expect.any(Number),
          oldestMemory: expect.any(Date),
          newestMemory: expect.any(Date)
        },
        cold: {
          count: 1000,
          capacity: -1, // Unlimited
          utilizationRate: expect.any(Number),
          averageImportance: expect.any(Number),
          averageAccessCount: expect.any(Number),
          oldestMemory: expect.any(Date),
          newestMemory: expect.any(Date)
        }
      });
    });

    it('should handle empty tiers gracefully', async () => {
      vi.mocked(mockDatabaseManager.getMemoriesByTier).mockResolvedValue([]);

      const metrics = await tierManager.collectTierMetrics();

      expect(metrics.hot.count).toBe(0);
      expect(metrics.hot.averageImportance).toBe(0);
      expect(metrics.hot.averageAccessCount).toBe(0);
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await tierManager.initialize();
    });

    it('should report healthy status when operating normally', async () => {
      const health = await tierManager.getHealth();

      expect(health.status).toBe('ok');
      expect(health.service).toBe('MemoryTierManager');
      expect(health.details).toMatchObject({
        isInitialized: true,
        totalMemories: expect.any(Number),
        tierDistribution: expect.any(Object),
        lastOptimization: expect.any(Date)
      });
    });

    it('should report error status when not initialized', async () => {
      const uninitializedManager = new MemoryTierManager(mockDatabaseManager, mockSecurityManager);
      const health = await uninitializedManager.getHealth();

      expect(health.status).toBe('initializing');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await tierManager.initialize();
    });

    it('should handle database errors gracefully during scoring', async () => {
      vi.mocked(mockDatabaseManager.getMemoryEntity).mockRejectedValue(new Error('Database error'));

      await expect(tierManager.calculateMemoryScore('invalid_id')).rejects.toThrow('Database error');
    });

    it('should handle database errors gracefully during tier updates', async () => {
      vi.mocked(mockDatabaseManager.updateMemoryTier).mockRejectedValue(new Error('Update failed'));

      await expect(
        tierManager.promoteMemory('memory_123', 'hot', 'manual')
      ).rejects.toThrow('Update failed');
    });

    it('should handle memory not found errors', async () => {
      vi.mocked(mockDatabaseManager.getMemoryEntity).mockResolvedValue(null);

      await expect(tierManager.calculateMemoryScore('nonexistent')).rejects.toThrow(/not found/);
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await tierManager.initialize();
    });

    it('should complete optimization within reasonable time', async () => {
      const manyMemories = Array(1000).fill(mockDbMemory).map((memory, i) => ({
        ...memory,
        id: `memory_${i}`
      }));

      vi.mocked(mockDatabaseManager.getAllActiveMemories).mockResolvedValue(manyMemories);

      const startTime = Date.now();
      await tierManager.optimizeMemoryTiers();
      const duration = Date.now() - startTime;

      // Should complete within 10 seconds for 1000 memories
      expect(duration).toBeLessThan(10000);
    });

    it('should handle batch operations efficiently', async () => {
      const batchSize = 100;
      const memories = Array(batchSize).fill(mockDbMemory).map((memory, i) => ({
        ...memory,
        id: `batch_memory_${i}`
      }));

      vi.mocked(mockDatabaseManager.getAllActiveMemories).mockResolvedValue(memories);

      const startTime = Date.now();
      const metrics = await tierManager.collectTierMetrics();
      const duration = Date.now() - startTime;

      expect(metrics).toBeDefined();
      // Should complete batch operations quickly
      expect(duration).toBeLessThan(1000);
    });
  });
}); 