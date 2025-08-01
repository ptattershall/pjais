import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { it as effectIt, expect } from '@effect/vitest'
import { Effect, Layer, Context, Exit } from 'effect'
import { SqlClient } from '@effect/sql'
import { SqliteClient } from '@effect/sql-sqlite-node'
import { MemoryRepository, MemoryRepositoryLive } from './memory-repository'
import { DatabaseService, DatabaseServiceLive } from './database-service'
import { MemoryEntity, MemoryTier } from '../../shared/types/memory'

// Test database layer with in-memory SQLite
const TestSqliteLive = SqliteClient.layer({
  filename: ':memory:',
  transformQueryNames: (str) => str.toLowerCase()
})

// Combined test layer
const TestLive = Layer.mergeAll(
  TestSqliteLive,
  DatabaseServiceLive,
  MemoryRepositoryLive
)

// Test data factory
const createTestMemoryEntity = (overrides: Partial<MemoryEntity> = {}): Omit<MemoryEntity, 'id' | 'createdAt'> => ({
  personaId: 'test-persona-id',
  type: 'text',
  content: 'This is a test memory about artificial intelligence and machine learning.',
  importance: 75,
  tags: ['ai', 'ml', 'technology'],
  memoryTier: 'hot',
  ...overrides
})

describe('MemoryRepository', () => {
  // Setup database schema before all tests
  effectIt('should set up database schema', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      
      // Create memory_entities table
      yield* sql`
        CREATE TABLE IF NOT EXISTS memory_entities (
          id TEXT PRIMARY KEY,
          persona_id TEXT NOT NULL,
          type TEXT NOT NULL,
          name TEXT DEFAULT '',
          content TEXT NOT NULL,
          summary TEXT DEFAULT '',
          tags TEXT DEFAULT '[]',
          importance INTEGER DEFAULT 50,
          memory_tier TEXT DEFAULT 'active',
          embedding TEXT DEFAULT NULL,
          embedding_model TEXT DEFAULT NULL,
          access_count INTEGER DEFAULT 0,
          last_accessed DATETIME DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME DEFAULT NULL
        )
      `
      
      // Create updated_at trigger
      yield* sql`
        CREATE TRIGGER IF NOT EXISTS trigger_memory_entities_updated_at
          AFTER UPDATE ON memory_entities
          FOR EACH ROW
        BEGIN
          UPDATE memory_entities SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `
    })
    .pipe(Effect.provide(TestLive))
  )

  // Clean up data before each test
  effectIt('should clean up test data', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      yield* sql`DELETE FROM memory_entities`
    })
    .pipe(Effect.provide(TestLive))
  )

  describe('create', () => {
    effectIt('should create a new memory entity with all fields', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const testData = createTestMemoryEntity({
          content: 'Learning about quantum computing and its applications',
          type: 'text',
          importance: 85,
          tags: ['quantum', 'computing', 'physics'],
          memoryTier: 'hot'
        })

        const memoryId = yield* repo.create(testData)
        
        expect(memoryId).toMatch(/^memory_\d+_[a-z0-9]+$/)

        // Verify the memory was created correctly
        const created = yield* repo.getById(memoryId)
        expect(created).not.toBeNull()
        expect(created?.content).toBe('Learning about quantum computing and its applications')
        expect(created?.type).toBe('text')
        expect(created?.importance).toBe(85)
        expect(created?.tags).toEqual(['quantum', 'computing', 'physics'])
        expect(created?.memoryTier).toBe('hot')
        expect(created?.personaId).toBe('test-persona-id')
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should create memory with default values for optional fields', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const minimalData = {
          personaId: 'test-persona',
          type: 'text' as const,
          content: 'Minimal memory content',
          importance: 50
        }

        const memoryId = yield* repo.create(minimalData)
        const created = yield* repo.getById(memoryId)
        
        expect(created).not.toBeNull()
        expect(created?.tags).toEqual([])
        expect(created?.memoryTier).toBe('hot') // Default value from implementation
        expect(created?.importance).toBe(50)
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should handle different memory types', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        
        const textMemory = yield* repo.create({
          ...createTestMemoryEntity(),
          type: 'text',
          content: 'Text-based memory content'
        })
        
        const imageMemory = yield* repo.create({
          ...createTestMemoryEntity(),
          type: 'image',
          content: 'base64-encoded-image-data',
          tags: ['visual', 'image']
        })
        
        const fileMemory = yield* repo.create({
          ...createTestMemoryEntity(),
          type: 'file',
          content: '/path/to/file.pdf',
          tags: ['document', 'pdf']
        })

        const textCreated = yield* repo.getById(textMemory)
        const imageCreated = yield* repo.getById(imageMemory)
        const fileCreated = yield* repo.getById(fileMemory)
        
        expect(textCreated?.type).toBe('text')
        expect(imageCreated?.type).toBe('image')
        expect(fileCreated?.type).toBe('file')
        expect(imageCreated?.tags).toContain('visual')
        expect(fileCreated?.tags).toContain('document')
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('getById', () => {
    effectIt('should retrieve memory by id', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const testData = createTestMemoryEntity({ content: 'Unique test content for retrieval' })
        
        const memoryId = yield* repo.create(testData)
        const retrieved = yield* repo.getById(memoryId)
        
        expect(retrieved).not.toBeNull()
        expect(retrieved?.id).toBe(memoryId)
        expect(retrieved?.content).toBe('Unique test content for retrieval')
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should return null for non-existent id', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const retrieved = yield* repo.getById('non-existent-memory-id')
        expect(retrieved).toBeNull()
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should not return soft-deleted memories', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const testData = createTestMemoryEntity({ content: 'Memory to be deleted' })
        
        const memoryId = yield* repo.create(testData)
        
        // Verify memory exists
        let retrieved = yield* repo.getById(memoryId)
        expect(retrieved).not.toBeNull()
        
        // Soft delete the memory
        yield* repo.delete(memoryId)
        
        // Should return null after deletion
        retrieved = yield* repo.getById(memoryId)
        expect(retrieved).toBeNull()
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('getByPersonaId', () => {
    effectIt('should retrieve all memories for a specific persona', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        
        // Create memories for different personas
        const persona1Id = 'persona-1'
        const persona2Id = 'persona-2'
        
        yield* repo.create(createTestMemoryEntity({ personaId: persona1Id, content: 'Memory 1 for persona 1' }))
        yield* repo.create(createTestMemoryEntity({ personaId: persona1Id, content: 'Memory 2 for persona 1' }))
        yield* repo.create(createTestMemoryEntity({ personaId: persona2Id, content: 'Memory 1 for persona 2' }))
        
        const persona1Memories = yield* repo.getByPersonaId(persona1Id)
        const persona2Memories = yield* repo.getByPersonaId(persona2Id)
        
        expect(persona1Memories).toHaveLength(2)
        expect(persona2Memories).toHaveLength(1)
        
        // Should be ordered by created_at DESC (newest first)
        expect(persona1Memories[0].content).toBe('Memory 2 for persona 1')
        expect(persona1Memories[1].content).toBe('Memory 1 for persona 1')
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should return empty array for persona with no memories', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const memories = yield* repo.getByPersonaId('persona-with-no-memories')
        expect(memories).toHaveLength(0)
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('getByTier', () => {
    effectIt('should retrieve memories by memory tier', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        
        // Create memories with different tiers
        yield* repo.create(createTestMemoryEntity({ memoryTier: 'hot', content: 'Hot memory 1' }))
        yield* repo.create(createTestMemoryEntity({ memoryTier: 'hot', content: 'Hot memory 2' }))
        yield* repo.create(createTestMemoryEntity({ memoryTier: 'warm', content: 'Warm memory 1' }))
        yield* repo.create(createTestMemoryEntity({ memoryTier: 'cold', content: 'Cold memory 1' }))
        
        const hotMemories = yield* repo.getByTier('hot')
        const warmMemories = yield* repo.getByTier('warm')
        const coldMemories = yield* repo.getByTier('cold')
        
        expect(hotMemories).toHaveLength(2)
        expect(warmMemories).toHaveLength(1)
        expect(coldMemories).toHaveLength(1)
        
        expect(hotMemories[0].memoryTier).toBe('hot')
        expect(warmMemories[0].memoryTier).toBe('warm')
        expect(coldMemories[0].memoryTier).toBe('cold')
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should return empty array for tier with no memories', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const memories = yield* repo.getByTier('nonexistent')
        expect(memories).toHaveLength(0)
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('getAllActive', () => {
    effectIt('should retrieve all non-deleted memories', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        
        // Create multiple memories
        const id1 = yield* repo.create(createTestMemoryEntity({ content: 'Active memory 1' }))
        const id2 = yield* repo.create(createTestMemoryEntity({ content: 'Active memory 2' }))
        const id3 = yield* repo.create(createTestMemoryEntity({ content: 'Memory to delete' }))
        
        // Delete one memory
        yield* repo.delete(id3)
        
        const allActive = yield* repo.getAllActive()
        
        expect(allActive).toHaveLength(2)
        expect(allActive.map(m => m.content)).not.toContain('Memory to delete')
        
        // Should be ordered by created_at DESC
        expect(allActive[0].content).toBe('Active memory 2')
        expect(allActive[1].content).toBe('Active memory 1')
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('update', () => {
    effectIt('should update memory content and properties', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const testData = createTestMemoryEntity({
          content: 'Original content',
          importance: 50,
          tags: ['original']
        })
        
        const memoryId = yield* repo.create(testData)
        yield* repo.update(memoryId, {
          content: 'Updated content',
          importance: 90,
          tags: ['updated', 'modified']
        })
        
        const updated = yield* repo.getById(memoryId)
        expect(updated?.content).toBe('Updated content')
        expect(updated?.importance).toBe(90)
        expect(updated?.tags).toEqual(['updated', 'modified'])
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should handle partial updates', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const testData = createTestMemoryEntity({
          content: 'Original content',
          importance: 50,
          type: 'text'
        })
        
        const memoryId = yield* repo.create(testData)
        yield* repo.update(memoryId, {
          importance: 80
        })
        
        const updated = yield* repo.getById(memoryId)
        expect(updated?.content).toBe('Original content') // Unchanged
        expect(updated?.importance).toBe(80) // Updated
        expect(updated?.type).toBe('text') // Unchanged
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should not update when no changes provided', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const testData = createTestMemoryEntity({ content: 'Unchanged content' })
        
        const memoryId = yield* repo.create(testData)
        const before = yield* repo.getById(memoryId)
        
        yield* repo.update(memoryId, {})
        
        const after = yield* repo.getById(memoryId)
        expect(after?.content).toBe('Unchanged content')
        // Note: updated_at might still change due to SQL trigger
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('updateTier', () => {
    effectIt('should update memory tier only', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const testData = createTestMemoryEntity({ memoryTier: 'hot' })
        
        const memoryId = yield* repo.create(testData)
        yield* repo.updateTier(memoryId, 'cold')
        
        const updated = yield* repo.getById(memoryId)
        expect(updated?.memoryTier).toBe('cold')
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should update memory tier and content', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const testData = createTestMemoryEntity({
          memoryTier: 'hot',
          content: 'Original content'
        })
        
        const memoryId = yield* repo.create(testData)
        const compressedContent = { summary: 'Compressed version', original_length: 100 }
        yield* repo.updateTier(memoryId, 'cold', compressedContent)
        
        const updated = yield* repo.getById(memoryId)
        expect(updated?.memoryTier).toBe('cold')
        expect(updated?.content).toBe(JSON.stringify(compressedContent))
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('updateEmbedding', () => {
    effectIt('should update memory embedding and model', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const testData = createTestMemoryEntity()
        
        const memoryId = yield* repo.create(testData)
        const embedding = [0.1, 0.2, 0.3, 0.4, 0.5]
        const model = 'text-embedding-ada-002'
        
        yield* repo.updateEmbedding(memoryId, embedding, model)
        
        // Verify embedding was stored (would need to check database directly)
        const sql = yield* SqlClient.SqlClient
        const rows = yield* sql`SELECT embedding, embedding_model FROM memory_entities WHERE id = ${memoryId}`
        
        expect(rows).toHaveLength(1)
        expect(JSON.parse(rows[0].embedding)).toEqual(embedding)
        expect(rows[0].embedding_model).toBe(model)
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('markAccessed', () => {
    effectIt('should increment access count and update last accessed time', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const testData = createTestMemoryEntity()
        
        const memoryId = yield* repo.create(testData)
        
        // Access the memory multiple times
        yield* repo.markAccessed(memoryId)
        yield* repo.markAccessed(memoryId)
        yield* repo.markAccessed(memoryId)
        
        // Check access count directly in database
        const sql = yield* SqlClient.SqlClient
        const rows = yield* sql`SELECT access_count, last_accessed FROM memory_entities WHERE id = ${memoryId}`
        
        expect(rows).toHaveLength(1)
        expect(rows[0].access_count).toBe(3)
        expect(rows[0].last_accessed).not.toBeNull()
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('delete (soft delete)', () => {
    effectIt('should mark memory as deleted without removing from database', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const testData = createTestMemoryEntity({ content: 'Memory to be deleted' })
        
        const memoryId = yield* repo.create(testData)
        
        // Verify memory exists
        let memory = yield* repo.getById(memoryId)
        expect(memory).not.toBeNull()
        
        // Delete the memory
        yield* repo.delete(memoryId)
        
        // Should not be retrievable via normal methods
        memory = yield* repo.getById(memoryId)
        expect(memory).toBeNull()
        
        // But should still exist in database with deleted_at timestamp
        const sql = yield* SqlClient.SqlClient
        const rows = yield* sql`SELECT id, deleted_at FROM memory_entities WHERE id = ${memoryId}`
        
        expect(rows).toHaveLength(1)
        expect(rows[0].deleted_at).not.toBeNull()
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should not affect other memories when deleting one', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        
        const id1 = yield* repo.create(createTestMemoryEntity({ content: 'Keep this memory' }))
        const id2 = yield* repo.create(createTestMemoryEntity({ content: 'Delete this memory' }))
        
        yield* repo.delete(id2)
        
        const memory1 = yield* repo.getById(id1)
        const memory2 = yield* repo.getById(id2)
        
        expect(memory1).not.toBeNull()
        expect(memory1?.content).toBe('Keep this memory')
        expect(memory2).toBeNull()
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('error handling', () => {
    effectIt('should handle database connection errors gracefully', () =>
      Effect.gen(function* () {
        // Create a mock repository that fails
        const FailingRepo = MemoryRepository.of({
          create: () => Effect.fail(new Error('Database connection failed')),
          update: () => Effect.fail(new Error('Database connection failed')),
          getById: () => Effect.fail(new Error('Database connection failed')),
          getByPersonaId: () => Effect.fail(new Error('Database connection failed')),
          getByTier: () => Effect.fail(new Error('Database connection failed')),
          getAllActive: () => Effect.fail(new Error('Database connection failed')),
          updateTier: () => Effect.fail(new Error('Database connection failed')),
          updateEmbedding: () => Effect.fail(new Error('Database connection failed')),
          markAccessed: () => Effect.fail(new Error('Database connection failed')),
          delete: () => Effect.fail(new Error('Database connection failed'))
        })

        const TestLayerWithFailure = Layer.succeed(MemoryRepository, FailingRepo)
        
        const repo = yield* MemoryRepository
        const result = yield* Effect.exit(repo.create(createTestMemoryEntity()))
        
        expect(Exit.isFailure(result)).toBe(true)
        if (Exit.isFailure(result)) {
          expect(result.cause._tag).toBe('Die')
        }
      })
      .pipe(Effect.provide(TestLayerWithFailure))
    )
  })

  describe('data integrity', () => {
    effectIt('should handle JSON serialization for tags correctly', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const complexTags = ['tag with spaces', 'tag-with-dashes', 'tag_with_underscores', '标签中文']
        
        const testData = createTestMemoryEntity({ tags: complexTags })
        const memoryId = yield* repo.create(testData)
        
        const retrieved = yield* repo.getById(memoryId)
        expect(retrieved?.tags).toEqual(complexTags)
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should handle empty tags array', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const testData = createTestMemoryEntity({ tags: [] })
        
        const memoryId = yield* repo.create(testData)
        const retrieved = yield* repo.getById(memoryId)
        
        expect(retrieved?.tags).toEqual([])
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should handle large content strings', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const largeContent = 'A'.repeat(10000) // 10KB of content
        
        const testData = createTestMemoryEntity({ content: largeContent })
        const memoryId = yield* repo.create(testData)
        
        const retrieved = yield* repo.getById(memoryId)
        expect(retrieved?.content).toBe(largeContent)
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should handle timestamp parsing correctly', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const testData = createTestMemoryEntity({ content: 'Timestamp test' })
        
        const memoryId = yield* repo.create(testData)
        const memory = yield* repo.getById(memoryId)
        
        expect(memory?.createdAt).toBeInstanceOf(Date)
        expect(memory?.createdAt.getTime()).toBeLessThanOrEqual(Date.now())
        
        // Test last accessed timestamp
        yield* repo.markAccessed(memoryId)
        const accessed = yield* repo.getById(memoryId)
        expect(accessed?.lastAccessed).toBeInstanceOf(Date)
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('performance considerations', () => {
    effectIt('should handle batch operations efficiently', () =>
      Effect.gen(function* () {
        const repo = yield* MemoryRepository
        const startTime = Date.now()
        
        // Create multiple memories
        const createPromises = Array.from({ length: 50 }, (_, i) =>
          repo.create(createTestMemoryEntity({ content: `Batch memory ${i + 1}` }))
        )
        
        yield* Effect.all(createPromises, { concurrency: 10 })
        
        const endTime = Date.now()
        const duration = endTime - startTime
        
        // Should complete within reasonable time (adjust threshold as needed)
        expect(duration).toBeLessThan(5000) // 5 seconds
        
        // Verify all memories were created
        const allMemories = yield* repo.getAllActive()
        expect(allMemories).toHaveLength(50)
      })
      .pipe(Effect.provide(TestLive))
    )
  })
})