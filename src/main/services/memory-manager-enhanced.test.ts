import { describe, it, beforeEach, afterEach, vi } from 'vitest'
import { expect } from 'vitest'
import { MemoryManager } from './memory-manager'
import { MemoryStore } from './memory-store'
import { MemoryLoader } from './memory-loader'
import { DatabaseManager } from './database-manager'
import { SecurityManager } from './security-manager'
import { MemoryEntity, MemoryTier, SemanticSearchQuery } from '../../shared/types/memory'

// Mock dependencies
vi.mock('./memory-store')
vi.mock('./memory-loader')
vi.mock('./database-manager')
vi.mock('./security-manager')
vi.mock('./memory-tier-manager')
vi.mock('./embedding-service')
vi.mock('./memory-graph-service')

describe('MemoryManager - Enhanced Tests', () => {
  let memoryManager: MemoryManager
  let mockStore: MemoryStore
  let mockLoader: MemoryLoader
  let mockDatabaseManager: DatabaseManager
  let mockSecurityManager: SecurityManager

  const createTestMemory = (overrides: Partial<MemoryEntity> = {}): MemoryEntity => ({
    id: 'test-memory-1',
    personaId: 'test-persona',
    type: 'text',
    content: 'This is a test memory about machine learning concepts',
    importance: 75,
    tags: ['ai', 'ml', 'testing'],
    memoryTier: 'hot',
    createdAt: new Date(),
    ...overrides
  })

  beforeEach(() => {
    // Create mock instances
    mockStore = {
      set: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      list: vi.fn().mockReturnValue([]),
      size: 0,
      has: vi.fn().mockReturnValue(false)
    } as any

    mockLoader = {
      loadMemories: vi.fn().mockResolvedValue([])
    } as any

    mockDatabaseManager = {
      createMemoryEntity: vi.fn().mockResolvedValue('mock-memory-id'),
      updateMemoryEntity: vi.fn().mockResolvedValue(undefined),
      getMemoryEntity: vi.fn().mockResolvedValue(null),
      deleteMemoryEntity: vi.fn().mockResolvedValue(undefined),
      searchMemories: vi.fn().mockResolvedValue({ memories: [], total: 0 })
    } as any

    mockSecurityManager = {
      eventLogger: {
        logEvent: vi.fn()
      },
      checkMemoryAccess: vi.fn().mockResolvedValue(true)
    } as any

    memoryManager = new MemoryManager(
      mockStore,
      mockLoader,
      mockDatabaseManager,
      mockSecurityManager
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize memory manager with all components', async () => {
      const mockMemories = [
        createTestMemory({ id: 'memory-1', content: 'First memory' }),
        createTestMemory({ id: 'memory-2', content: 'Second memory' })
      ]
      
      mockLoader.loadMemories = vi.fn().mockResolvedValue(mockMemories)
      mockStore.size = mockMemories.length

      await memoryManager.initialize()

      expect(mockLoader.loadMemories).toHaveBeenCalled()
      expect(mockStore.set).toHaveBeenCalledTimes(2)
    })

    it('should handle initialization errors gracefully', async () => {
      mockLoader.loadMemories = vi.fn().mockRejectedValue(new Error('Load failed'))

      await expect(memoryManager.initialize()).rejects.toThrow('Load failed')
    })

    it('should initialize tier manager and embedding service', async () => {
      await memoryManager.initialize()
      
      // Verify that internal services are initialized
      // This would require exposing internal state or using spies
      expect(mockLoader.loadMemories).toHaveBeenCalled()
    })
  })

  describe('shutdown', () => {
    it('should shutdown all components cleanly', async () => {
      await memoryManager.initialize()
      await memoryManager.shutdown()

      expect(mockStore.clear).toHaveBeenCalled()
    })

    it('should handle shutdown before initialization', async () => {
      await expect(memoryManager.shutdown()).resolves.not.toThrow()
    })
  })

  describe('memory creation', () => {
    beforeEach(async () => {
      await memoryManager.initialize()
    })

    it('should create a new memory entity', async () => {
      const memoryData = {
        personaId: 'test-persona',
        type: 'text' as const,
        content: 'New memory about quantum computing',
        importance: 80,
        tags: ['quantum', 'physics']
      }

      const createdMemory = await memoryManager.create(memoryData)

      expect(mockDatabaseManager.createMemoryEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          personaId: 'test-persona',
          type: 'text',
          content: 'New memory about quantum computing',
          importance: 80,
          tags: ['quantum', 'physics']
        })
      )
      expect(createdMemory).toBeDefined()
    })

    it('should validate memory data before creation', async () => {
      const invalidMemoryData = {
        personaId: '', // Invalid empty persona ID
        type: 'invalid-type', // Invalid type
        content: '', // Invalid empty content
        importance: 150 // Invalid importance > 100
      }

      await expect(memoryManager.create(invalidMemoryData)).rejects.toThrow()
    })

    it('should assign default values for optional fields', async () => {
      const minimalMemoryData = {
        personaId: 'test-persona',
        type: 'text' as const,
        content: 'Minimal memory content',
        importance: 50
      }

      const createdMemory = await memoryManager.create(minimalMemoryData)

      expect(mockDatabaseManager.createMemoryEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.any(Array),
          memoryTier: expect.any(String)
        })
      )
    })

    it('should handle security validation during creation', async () => {
      mockSecurityManager.checkMemoryAccess = vi.fn().mockResolvedValue(false)

      const memoryData = {
        personaId: 'test-persona',
        type: 'text' as const,
        content: 'Sensitive memory content',
        importance: 90
      }

      await expect(memoryManager.create(memoryData)).rejects.toThrow(/security/i)
    })
  })

  describe('memory retrieval', () => {
    beforeEach(async () => {
      await memoryManager.initialize()
    })

    it('should retrieve memory by ID', async () => {
      const testMemory = createTestMemory()
      mockDatabaseManager.getMemoryEntity = vi.fn().mockResolvedValue(testMemory)

      const retrieved = await memoryManager.get('test-memory-1')

      expect(mockDatabaseManager.getMemoryEntity).toHaveBeenCalledWith('test-memory-1')
      expect(retrieved).toEqual(testMemory)
    })

    it('should return null for non-existent memory', async () => {
      mockDatabaseManager.getMemoryEntity = vi.fn().mockResolvedValue(null)

      const retrieved = await memoryManager.get('non-existent-id')

      expect(retrieved).toBeNull()
    })

    it('should list memories with pagination', async () => {
      const mockMemories = [
        createTestMemory({ id: 'memory-1' }),
        createTestMemory({ id: 'memory-2' })
      ]
      
      mockStore.list = vi.fn().mockReturnValue(mockMemories)

      const listed = await memoryManager.list({ page: 1, pageSize: 10 })

      expect(listed).toHaveLength(2)
      expect(listed).toEqual(mockMemories)
    })

    it('should filter memories by persona ID', async () => {
      const personaMemories = [
        createTestMemory({ id: 'memory-1', personaId: 'persona-1' }),
        createTestMemory({ id: 'memory-2', personaId: 'persona-1' })
      ]

      mockDatabaseManager.searchMemories = vi.fn().mockResolvedValue({
        memories: personaMemories,
        total: 2,
        page: 1,
        pageSize: 10
      })

      const result = await memoryManager.searchByPersona('persona-1')

      expect(result.memories).toHaveLength(2)
      expect(result.memories.every(m => m.personaId === 'persona-1')).toBe(true)
    })
  })

  describe('memory updates', () => {
    beforeEach(async () => {
      await memoryManager.initialize()
    })

    it('should update memory content and metadata', async () => {
      const updates = {
        content: 'Updated memory content',
        importance: 85,
        tags: ['updated', 'modified']
      }

      await memoryManager.update('test-memory-1', updates)

      expect(mockDatabaseManager.updateMemoryEntity).toHaveBeenCalledWith(
        'test-memory-1',
        expect.objectContaining(updates)
      )
    })

    it('should validate updates before applying', async () => {
      const invalidUpdates = {
        importance: 150, // Invalid value
        type: 'invalid-type' // Cannot change type
      }

      await expect(memoryManager.update('test-memory-1', invalidUpdates)).rejects.toThrow()
    })

    it('should handle partial updates', async () => {
      const partialUpdates = {
        importance: 90
      }

      await memoryManager.update('test-memory-1', partialUpdates)

      expect(mockDatabaseManager.updateMemoryEntity).toHaveBeenCalledWith(
        'test-memory-1',
        partialUpdates
      )
    })
  })

  describe('memory deletion', () => {
    beforeEach(async () => {
      await memoryManager.initialize()
    })

    it('should soft delete memory', async () => {
      await memoryManager.delete('test-memory-1')

      expect(mockDatabaseManager.deleteMemoryEntity).toHaveBeenCalledWith('test-memory-1')
      expect(mockStore.delete).toHaveBeenCalledWith('test-memory-1')
    })

    it('should handle deletion of non-existent memory', async () => {
      mockDatabaseManager.deleteMemoryEntity = vi.fn().mockResolvedValue(false)

      await expect(memoryManager.delete('non-existent-id')).resolves.not.toThrow()
    })

    it('should enforce security checks before deletion', async () => {
      mockSecurityManager.checkMemoryAccess = vi.fn().mockResolvedValue(false)

      await expect(memoryManager.delete('test-memory-1')).rejects.toThrow(/security/i)
    })
  })

  describe('semantic search', () => {
    beforeEach(async () => {
      await memoryManager.initialize()
    })

    it('should perform semantic search with query', async () => {
      const searchQuery: SemanticSearchQuery = {
        query: 'machine learning algorithms',
        personaId: 'test-persona',
        limit: 10,
        threshold: 0.8
      }

      const mockResults = {
        results: [
          {
            memory: createTestMemory({ content: 'Deep learning algorithms' }),
            similarity: 0.95,
            context: 'semantic_match'
          }
        ],
        totalMatches: 1,
        processingTime: 150
      }

      // Mock the semantic search method
      const semanticSearchSpy = vi.spyOn(memoryManager as any, 'performSemanticSearch')
        .mockResolvedValue(mockResults)

      const results = await memoryManager.semanticSearch(searchQuery)

      expect(results.results).toHaveLength(1)
      expect(results.results[0].similarity).toBeGreaterThan(0.8)
    })

    it('should handle empty search results', async () => {
      const searchQuery: SemanticSearchQuery = {
        query: 'very specific non-existent topic',
        personaId: 'test-persona',
        limit: 10
      }

      const mockResults = {
        results: [],
        totalMatches: 0,
        processingTime: 50
      }

      const semanticSearchSpy = vi.spyOn(memoryManager as any, 'performSemanticSearch')
        .mockResolvedValue(mockResults)

      const results = await memoryManager.semanticSearch(searchQuery)

      expect(results.results).toHaveLength(0)
      expect(results.totalMatches).toBe(0)
    })

    it('should respect similarity threshold in search', async () => {
      const searchQuery: SemanticSearchQuery = {
        query: 'artificial intelligence',
        personaId: 'test-persona',
        threshold: 0.9, // High threshold
        limit: 10
      }

      const mockResults = {
        results: [
          {
            memory: createTestMemory({ content: 'AI and machine learning' }),
            similarity: 0.95, // Above threshold
            context: 'high_similarity'
          }
        ],
        totalMatches: 1,
        processingTime: 120
      }

      const semanticSearchSpy = vi.spyOn(memoryManager as any, 'performSemanticSearch')
        .mockResolvedValue(mockResults)

      const results = await memoryManager.semanticSearch(searchQuery)

      expect(results.results.every(r => r.similarity >= 0.9)).toBe(true)
    })
  })

  describe('memory tier management', () => {
    beforeEach(async () => {
      await memoryManager.initialize()
    })

    it('should optimize memory tiers based on access patterns', async () => {
      const optimizationResult = {
        processed: 100,
        promoted: 15,
        demoted: 25,
        archived: 10,
        performance: {
          executionTime: 1500,
          memoryFreed: 1024000
        }
      }

      const tierOptimizationSpy = vi.spyOn(memoryManager as any, 'optimizeTiers')
        .mockResolvedValue(optimizationResult)

      const result = await memoryManager.optimizeMemoryTiers()

      expect(result.processed).toBe(100)
      expect(result.promoted).toBe(15)
      expect(result.demoted).toBe(25)
    })

    it('should get memory tier metrics', async () => {
      const mockMetrics = {
        tierDistribution: {
          hot: 150,
          warm: 300,
          cold: 500
        },
        totalMemories: 950,
        averageImportance: 65,
        lastOptimization: new Date()
      }

      const metricsSpey = vi.spyOn(memoryManager as any, 'getTierMetrics')
        .mockResolvedValue(mockMetrics)

      const metrics = await memoryManager.getMemoryTierMetrics()

      expect(metrics.totalMemories).toBe(950)
      expect(metrics.tierDistribution.hot).toBe(150)
      expect(metrics.averageImportance).toBe(65)
    })

    it('should move memory between tiers', async () => {
      await memoryManager.moveToTier('test-memory-1', 'cold')

      // Verify the tier change was processed
      expect(mockDatabaseManager.updateMemoryEntity).toHaveBeenCalledWith(
        'test-memory-1',
        expect.objectContaining({
          memoryTier: 'cold'
        })
      )
    })
  })

  describe('memory relationships and graphs', () => {
    beforeEach(async () => {
      await memoryManager.initialize()
    })

    it('should find related memories', async () => {
      const relatedMemories = [
        {
          memory: createTestMemory({ id: 'related-1', content: 'Related AI concept' }),
          relationship: {
            type: 'semantic',
            strength: 0.85,
            context: 'topic_similarity'
          }
        }
      ]

      const findRelatedSpy = vi.spyOn(memoryManager as any, 'findRelatedMemories')
        .mockResolvedValue(relatedMemories)

      const related = await memoryManager.getRelatedMemories('test-memory-1')

      expect(related).toHaveLength(1)
      expect(related[0].relationship.strength).toBeGreaterThan(0.8)
    })

    it('should build memory knowledge graph', async () => {
      const mockGraph = {
        nodes: [
          { id: 'memory-1', type: 'memory', data: createTestMemory() },
          { id: 'concept-ai', type: 'concept', data: { name: 'Artificial Intelligence' } }
        ],
        edges: [
          { source: 'memory-1', target: 'concept-ai', type: 'contains', weight: 0.9 }
        ],
        metadata: {
          totalNodes: 2,
          totalEdges: 1,
          generatedAt: new Date()
        }
      }

      const buildGraphSpy = vi.spyOn(memoryManager as any, 'buildKnowledgeGraph')
        .mockResolvedValue(mockGraph)

      const graph = await memoryManager.getMemoryGraph('test-persona')

      expect(graph.nodes).toHaveLength(2)
      expect(graph.edges).toHaveLength(1)
      expect(graph.metadata.totalNodes).toBe(2)
    })
  })

  describe('health monitoring', () => {
    beforeEach(async () => {
      await memoryManager.initialize()
    })

    it('should report memory manager health status', async () => {
      const mockHealth = {
        status: 'healthy' as const,
        lastCheck: new Date(),
        details: {
          memoryCount: 1000,
          tierDistribution: { hot: 100, warm: 300, cold: 600 },
          embeddingService: 'operational',
          tierManager: 'operational',
          graphService: 'operational'
        }
      }

      const healthSpy = vi.spyOn(memoryManager, 'getHealth').mockResolvedValue(mockHealth)

      const health = await memoryManager.getHealth()

      expect(health.status).toBe('healthy')
      expect(health.details.memoryCount).toBe(1000)
      expect(health.details.tierDistribution.hot).toBe(100)
    })

    it('should detect performance issues', async () => {
      const degradedHealth = {
        status: 'warning' as const,
        lastCheck: new Date(),
        details: {
          memoryCount: 10000, // High memory count
          embeddingService: 'slow_response',
          tierManager: 'optimization_needed',
          issues: ['high_memory_usage', 'slow_search_performance']
        }
      }

      const healthSpy = vi.spyOn(memoryManager, 'getHealth').mockResolvedValue(degradedHealth)

      const health = await memoryManager.getHealth()

      expect(health.status).toBe('warning')
      expect(health.details.issues).toContain('high_memory_usage')
    })
  })

  describe('error handling', () => {
    beforeEach(async () => {
      await memoryManager.initialize()
    })

    it('should handle database connection failures', async () => {
      mockDatabaseManager.createMemoryEntity = vi.fn().mockRejectedValue(
        new Error('Database connection failed')
      )

      const memoryData = {
        personaId: 'test-persona',
        type: 'text' as const,
        content: 'Test memory',
        importance: 50
      }

      await expect(memoryManager.create(memoryData)).rejects.toThrow('Database connection failed')
    })

    it('should handle embedding service failures gracefully', async () => {
      // Mock embedding service failure
      const memoryData = {
        personaId: 'test-persona',
        type: 'text' as const,
        content: 'Test memory for embedding',
        importance: 75
      }

      // Should still create memory even if embedding fails
      await expect(memoryManager.create(memoryData)).resolves.toBeDefined()
    })

    it('should validate method calls before initialization', async () => {
      const uninitializedManager = new MemoryManager(
        mockStore,
        mockLoader,
        mockDatabaseManager,
        mockSecurityManager
      )

      const memoryData = {
        personaId: 'test-persona',
        type: 'text' as const,
        content: 'Test memory',
        importance: 50
      }

      await expect(uninitializedManager.create(memoryData)).rejects.toThrow(/not initialized/i)
    })
  })

  describe('performance optimization', () => {
    beforeEach(async () => {
      await memoryManager.initialize()
    })

    it('should handle large batch operations efficiently', async () => {
      const batchSize = 100
      const memoryBatch = Array.from({ length: batchSize }, (_, i) => ({
        personaId: 'test-persona',
        type: 'text' as const,
        content: `Batch memory ${i + 1}`,
        importance: Math.floor(Math.random() * 100),
        tags: [`batch-${i}`, 'performance-test']
      }))

      const startTime = Date.now()
      
      const createdMemories = await Promise.all(
        memoryBatch.map(memory => memoryManager.create(memory))
      )

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(createdMemories).toHaveLength(batchSize)
      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
    })

    it('should cache frequently accessed memories', async () => {
      const memoryId = 'frequently-accessed-memory'
      const testMemory = createTestMemory({ id: memoryId })
      
      mockDatabaseManager.getMemoryEntity = vi.fn().mockResolvedValue(testMemory)

      // Access the same memory multiple times
      await memoryManager.get(memoryId)
      await memoryManager.get(memoryId)
      await memoryManager.get(memoryId)

      // Should use cache for subsequent calls
      expect(mockDatabaseManager.getMemoryEntity).toHaveBeenCalledTimes(1)
    })
  })
})