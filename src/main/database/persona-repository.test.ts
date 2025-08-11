import { describe, vi } from 'vitest'
import { it as effectIt, expect } from '@effect/vitest'
import { Effect, Layer, Exit } from 'effect'
import { SqlClient } from '@effect/sql'
import { SqliteClient } from '@effect/sql-sqlite-node'
import { PersonaRepository, PersonaRepositoryLive } from './persona-repository'
import { DatabaseServiceLayer } from './database-service'
import { PersonaData } from '../../shared/types/persona'

// Test database layer with in-memory SQLite
const TestSqliteLive = SqliteClient.layer({
  filename: ':memory:',
  transformQueryNames: (str) => str.toLowerCase()
})

// Combined test layer
const TestLive = Layer.mergeAll(
  TestSqliteLive,
  DatabaseServiceLayer,
  PersonaRepositoryLive
)

// Mock the PersonaRepository implementation
vi.mock('./persona-repository', () => ({
  PersonaRepository: {
    create: vi.fn(),
    update: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    getActive: vi.fn()
  },
  PersonaRepositoryLive: vi.fn()
}))

// Test data factory
const createTestPersonaData = (overrides: Partial<PersonaData> = {}): Omit<PersonaData, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: 'Test Persona',
  description: 'A test persona for unit testing',
  personality: {
    traits: [
      { name: 'helpful', value: 80, category: 'custom' },
      { name: 'analytical', value: 90, category: 'custom' }
    ],
    temperament: 'balanced',
    communicationStyle: 'conversational'
  },
  memoryConfiguration: {
    maxMemories: 1000,
    memoryImportanceThreshold: 50,
    autoOptimize: true,
    retentionPeriod: 30,
    memoryCategories: ['conversation', 'learning', 'preference', 'fact'],
    compressionEnabled: true
  },
  privacySettings: {
    dataCollection: true,
    analyticsEnabled: false,
    shareWithResearchers: false,
    allowPersonalityAnalysis: true,
    memoryRetention: true,
    exportDataAllowed: true
  },
  behaviorSettings: {},
  memories: [],
  isActive: false,
  version: '1.0',
  ...overrides
})

describe('PersonaRepository', () => {
  // Setup database schema before all tests
  effectIt('should set up database schema', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      
      // Create personas table
      yield* sql`
        CREATE TABLE IF NOT EXISTS personas (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          personality_traits TEXT DEFAULT '[]',
          personality_temperament TEXT DEFAULT 'balanced',
          personality_communication_style TEXT DEFAULT 'conversational',
          memory_max_memories INTEGER DEFAULT 1000,
          memory_importance_threshold INTEGER DEFAULT 50,
          memory_auto_optimize BOOLEAN DEFAULT TRUE,
          memory_retention_period INTEGER DEFAULT 30,
          memory_categories TEXT DEFAULT '["conversation","learning","preference","fact"]',
          memory_compression_enabled BOOLEAN DEFAULT TRUE,
          privacy_data_collection BOOLEAN DEFAULT TRUE,
          privacy_analytics_enabled BOOLEAN DEFAULT FALSE,
          privacy_share_with_researchers BOOLEAN DEFAULT FALSE,
          privacy_allow_personality_analysis BOOLEAN DEFAULT TRUE,
          privacy_memory_retention BOOLEAN DEFAULT TRUE,
          privacy_export_data_allowed BOOLEAN DEFAULT TRUE,
          is_active BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
      
      // Create updated_at trigger
      yield* sql`
        CREATE TRIGGER IF NOT EXISTS trigger_personas_updated_at
          AFTER UPDATE ON personas
          FOR EACH ROW
        BEGIN
          UPDATE personas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `
    })
    .pipe(Effect.provide(TestLive))
  )

  // Clean up data before each test
  effectIt('should clean up test data', () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      yield* sql`DELETE FROM personas`
    })
    .pipe(Effect.provide(TestLive))
  )

  describe('create', () => {
    effectIt('should create a new persona with all fields', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        const testData = createTestPersonaData({
          name: 'Creative Assistant',
          description: 'A creative and helpful AI assistant',
          personality: {
            traits: [
              { name: 'creative', value: 95, category: 'custom' },
              { name: 'empathetic', value: 85, category: 'custom' }
            ],
            temperament: 'optimistic',
            communicationStyle: 'friendly'
          }
        })

        const personaId = yield* repo.create(testData)
        
        expect(personaId).toMatch(/^persona_\d+_[a-z0-9]+$/)

        // Verify the persona was created correctly
        const created = yield* repo.getById(personaId)
        expect(created).not.toBeNull()
        expect(created?.name).toBe('Creative Assistant')
        expect(created?.description).toBe('A creative and helpful AI assistant')
        expect(created?.personality?.temperament).toBe('optimistic')
        expect(created?.personality?.communicationStyle).toBe('friendly')
        expect(created?.personality?.traits).toHaveLength(2)
        expect(created?.isActive).toBe(false)
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should create persona with default values for optional fields', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        const minimalData = {
          name: 'Minimal Persona',
          description: '',
          personality: {
            traits: [],
            temperament: 'balanced' as const,
            communicationStyle: 'conversational' as const
          },
          memoryConfiguration: {
            maxMemories: 1000,
            memoryImportanceThreshold: 50,
            autoOptimize: true,
            retentionPeriod: 30,
            memoryCategories: ['conversation', 'learning', 'preference', 'fact'],
            compressionEnabled: true
          },
          privacySettings: {
            dataCollection: true,
            analyticsEnabled: false,
            shareWithResearchers: false,
            allowPersonalityAnalysis: true,
            memoryRetention: true,
            exportDataAllowed: true
          },
          behaviorSettings: {},
          memories: [],
          isActive: false,
          version: '1.0' as const
        }

        const personaId = yield* repo.create(minimalData)
        const created = yield* repo.getById(personaId)
        
        expect(created).not.toBeNull()
        expect(created?.memoryConfiguration.maxMemories).toBe(1000)
        expect(created?.memoryConfiguration.memoryImportanceThreshold).toBe(50)
        expect(created?.privacySettings.dataCollection).toBe(true)
        expect(created?.privacySettings.analyticsEnabled).toBe(false)
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should handle JSON serialization for complex fields', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        const testData = createTestPersonaData({
          personality: {
            traits: [
              { name: 'analytical', value: 90, category: 'custom', description: 'Loves to analyze problems' },
              { name: 'creative', value: 75, category: 'custom', description: 'Creative problem solver' }
            ],
            temperament: 'analytical',
            communicationStyle: 'precise'
          },
          memoryConfiguration: {
            maxMemories: 2000,
            memoryCategories: ['technical', 'research', 'analysis', 'solutions'],
            retentionPeriod: 60,
            memoryImportanceThreshold: 75,
            autoOptimize: false,
            compressionEnabled: false
          }
        })

        const personaId = yield* repo.create(testData)
        const created = yield* repo.getById(personaId)
        
        expect(created?.personality?.traits).toHaveLength(2)
        expect(created?.personality?.traits[0].description).toBe('Loves to analyze problems')
        expect(created?.memoryConfiguration.memoryCategories).toEqual(['technical', 'research', 'analysis', 'solutions'])
        expect(created?.memoryConfiguration.maxMemories).toBe(2000)
        expect(created?.memoryConfiguration.autoOptimize).toBe(false)
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('getById', () => {
    effectIt('should retrieve persona by id', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        const testData = createTestPersonaData({ name: 'Test Retrieval' })
        
        const personaId = yield* repo.create(testData)
        const retrieved = yield* repo.getById(personaId)
        
        expect(retrieved).not.toBeNull()
        expect(retrieved?.id).toBe(personaId)
        expect(retrieved?.name).toBe('Test Retrieval')
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should return null for non-existent id', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        const retrieved = yield* repo.getById('non-existent-id')
        expect(retrieved).toBeNull()
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('getAll', () => {
    effectIt('should return all personas ordered by creation date', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        // Create multiple personas
        yield* repo.create(createTestPersonaData({ name: 'Persona 1' }))
        yield* repo.create(createTestPersonaData({ name: 'Persona 2' }))
        yield* repo.create(createTestPersonaData({ name: 'Persona 3' }))
        
        const allPersonas = yield* repo.getAll()
        
        expect(allPersonas).toHaveLength(3)
        // Should be ordered by created_at DESC (newest first)
        expect(allPersonas[0].name).toBe('Persona 3')
        expect(allPersonas[1].name).toBe('Persona 2')
        expect(allPersonas[2].name).toBe('Persona 1')
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should return empty array when no personas exist', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        const allPersonas = yield* repo.getAll()
        expect(allPersonas).toHaveLength(0)
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('update', () => {
    effectIt('should update persona name and description', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        const testData = createTestPersonaData({ name: 'Original Name', description: 'Original Description' })
        
        const personaId = yield* repo.create(testData)
        yield* repo.update(personaId, {
          name: 'Updated Name',
          description: 'Updated Description'
        })
        
        const updated = yield* repo.getById(personaId)
        expect(updated?.name).toBe('Updated Name')
        expect(updated?.description).toBe('Updated Description')
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should update personality traits', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        const testData = createTestPersonaData()
        
        const personaId = yield* repo.create(testData)
        yield* repo.update(personaId, {
          personality: {
            traits: [{ name: 'updated', value: 100, category: 'custom' }],
            temperament: 'energetic',
            communicationStyle: 'enthusiastic'
          }
        })
        
        const updated = yield* repo.getById(personaId)
        expect(updated?.personality?.traits).toHaveLength(1)
        expect(updated?.personality?.traits[0].name).toBe('updated')
        expect(updated?.personality?.temperament).toBe('energetic')
        expect(updated?.personality?.communicationStyle).toBe('enthusiastic')
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should handle partial personality updates', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        const testData = createTestPersonaData({
          personality: {
            traits: [{ name: 'original', value: 50, category: 'custom' }],
            temperament: 'balanced',
            communicationStyle: 'conversational'
          }
        })
        
        const personaId = yield* repo.create(testData)
        yield* repo.update(personaId, {
          personality: {
            temperament: 'optimistic'
          }
        })
        
        const updated = yield* repo.getById(personaId)
        expect(updated?.personality?.temperament).toBe('optimistic')
        // Other personality fields should remain unchanged
        expect(updated?.personality?.communicationStyle).toBe('conversational')
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should not update when no changes provided', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        const testData = createTestPersonaData({ name: 'Unchanged' })
        
        const personaId = yield* repo.create(testData)
        const before = yield* repo.getById(personaId)
        
        yield* repo.update(personaId, {})
        
        const after = yield* repo.getById(personaId)
        expect(after?.name).toBe('Unchanged')
        expect(after?.updatedAt?.getTime()).toBe(before?.updatedAt?.getTime())
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('activate and deactivate', () => {
    effectIt('should activate a persona and deactivate others', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        
        // Create multiple personas
        const id1 = yield* repo.create(createTestPersonaData({ name: 'Persona 1' }))
        const id2 = yield* repo.create(createTestPersonaData({ name: 'Persona 2' }))
        
        // Activate first persona
        yield* repo.activate(id1)
        
        const persona1 = yield* repo.getById(id1)
        const persona2 = yield* repo.getById(id2)
        
        expect(persona1?.isActive).toBe(true)
        expect(persona2?.isActive).toBe(false)
        
        // Activate second persona (should deactivate first)
        yield* repo.activate(id2)
        
        const persona1After = yield* repo.getById(id1)
        const persona2After = yield* repo.getById(id2)
        
        expect(persona1After?.isActive).toBe(false)
        expect(persona2After?.isActive).toBe(true)
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should deactivate a specific persona', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        const testData = createTestPersonaData({ name: 'Active Persona' })
        
        const personaId = yield* repo.create(testData)
        yield* repo.activate(personaId)
        
        let persona = yield* repo.getById(personaId)
        expect(persona?.isActive).toBe(true)
        
        yield* repo.deactivate(personaId)
        
        persona = yield* repo.getById(personaId)
        expect(persona?.isActive).toBe(false)
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('getActive', () => {
    effectIt('should return the active persona', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        
        // Create multiple personas
        yield* repo.create(createTestPersonaData({ name: 'Inactive' }))
        const id2 = yield* repo.create(createTestPersonaData({ name: 'Active' }))
        
        yield* repo.activate(id2)
        
        const activePersona = yield* repo.getActive()
        expect(activePersona).not.toBeNull()
        expect(activePersona?.name).toBe('Active')
        expect(activePersona?.id).toBe(id2)
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should return null when no persona is active', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        yield* repo.create(createTestPersonaData({ name: 'Inactive' }))
        
        const activePersona = yield* repo.getActive()
        expect(activePersona).toBeNull()
      })
      .pipe(Effect.provide(TestLive))
    )
  })

  describe('error handling', () => {
    effectIt('should handle database connection errors gracefully', () =>
      Effect.gen(function* () {
        // Create a mock repository that fails
        const repo = yield* PersonaRepository
        const result = yield* Effect.exit(repo.create(createTestPersonaData()))
        
        expect(Exit.isFailure(result)).toBe(true)
        if (Exit.isFailure(result)) {
          expect(result.cause._tag).toBe('Die')
        }
      })
      .pipe(Effect.provide(Layer.succeed(PersonaRepository, PersonaRepository.of({
        create: () => Effect.fail(new Error('Database connection failed')),
        update: () => Effect.fail(new Error('Database connection failed')),
        activate: () => Effect.fail(new Error('Database connection failed')),
        deactivate: () => Effect.fail(new Error('Database connection failed')),
        getById: () => Effect.fail(new Error('Database connection failed')),
        getAll: () => Effect.fail(new Error('Database connection failed')),
        getActive: () => Effect.fail(new Error('Database connection failed'))
      }))))
    )
  })

  describe('database schema compatibility', () => {
    effectIt('should handle missing optional fields in database', () =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        
        // Insert a minimal persona directly to database
        const id = 'test_minimal_persona'
        yield* sql`
          INSERT INTO personas (id, name) 
          VALUES (${id}, ${'Minimal Persona'})
        `
        
        const repo = yield* PersonaRepository
        const persona = yield* repo.getById(id)
        
        expect(persona).not.toBeNull()
        expect(persona?.name).toBe('Minimal Persona')
        expect(persona?.description).toBe('')
        expect(persona?.personality?.traits).toEqual([])
        expect(persona?.memoryConfiguration.maxMemories).toBe(1000)
      })
      .pipe(Effect.provide(TestLive))
    )

    effectIt('should handle timestamp parsing correctly', () =>
      Effect.gen(function* () {
        const repo = yield* PersonaRepository
        const testData = createTestPersonaData({ name: 'Timestamp Test' })
        
        const personaId = yield* repo.create(testData)
        const persona = yield* repo.getById(personaId)
        
        expect(persona?.createdAt).toBeInstanceOf(Date)
        expect(persona?.updatedAt).toBeInstanceOf(Date)
        expect(persona?.createdAt?.getTime()).toBeLessThanOrEqual(Date.now())
        expect(persona?.updatedAt?.getTime()).toBeLessThanOrEqual(Date.now())
      })
      .pipe(Effect.provide(TestLive))
    )
  })
})