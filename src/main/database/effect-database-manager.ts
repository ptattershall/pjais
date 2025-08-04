import { Effect, Layer } from "effect"
import { DatabaseService, DatabaseServiceLayer } from "./database-service"
import { PersonaRepository, PersonaRepositoryLive } from "./persona-repository"
import { MemoryRepository, MemoryRepositoryLive } from "./memory-repository"
import { PersonaData } from "../../shared/types/persona"
import { MemoryEntity } from "../../shared/types/memory"
import { EncryptedDataManager } from "../services/encrypted-storage-adapter"
import { EncryptionService } from "../services/encryption-service"
import { SecurityEventLogger } from "../services/security-event-logger"
import { ConnectionPoolStats } from "./connection-pool"
import { loggers } from "../utils/logger"

// Type definitions for database manager
interface DatabaseStore {
  effectSql: boolean;
  initialized: boolean;
  config: DatabaseConfig;
}

interface EncryptionStatusDetails {
  enabled: boolean;
  fieldsEncrypted: Record<string, string[]>;
}

interface DatabaseStats {
  personaCount: number;
  memoryCount: number;
  conversationCount: number;
  encryptionEnabled: boolean;
  connectionPool: ConnectionPoolStats;
}

// Type for memory content - can be string, object, or JSON
type MemoryContent = string | Record<string, unknown> | null;

export interface DatabaseConfig {
  dataPath?: string
  encryptionKey?: string
  enableEncryption?: boolean
}

export class EffectDatabaseManager {
  private initialized = false
  private config: DatabaseConfig
  private encryptedDataManager?: EncryptedDataManager
  private encryptionService?: EncryptionService
  private securityEventLogger?: SecurityEventLogger
  private appLayer: Layer.Layer<DatabaseService | PersonaRepository | MemoryRepository>

  constructor(config: DatabaseConfig = {}) {
    this.config = config
    // Initialize Effect layer with the application services
    this.appLayer = Layer.mergeAll(
      DatabaseServiceLayer,
      PersonaRepositoryLive,
      MemoryRepositoryLive
    ) as Layer.Layer<DatabaseService | PersonaRepository | MemoryRepository>
  }

  // Helper to run effects with our services
  private runWithServices<A, E>(effect: Effect.Effect<A, E, DatabaseService | PersonaRepository | MemoryRepository>) {
    return Effect.runPromise(Effect.provide(effect, this.appLayer))
  }

  async initialize(securityEventLogger?: SecurityEventLogger, encryptionService?: EncryptionService): Promise<void> {
    if (this.initialized) {
      loggers.database.info('Database already initialized')
      return
    }

    const dbOp = loggers.database.dbOperation('initialize', 'database')
    
    try {
      loggers.database.serviceLifecycle('EffectDatabaseManager', 'initializing')
      
      // Set up encryption if services are provided and encryption is enabled
      if (this.config.enableEncryption && securityEventLogger && encryptionService) {
        this.securityEventLogger = securityEventLogger
        this.encryptionService = encryptionService
        
        this.encryptedDataManager = new EncryptedDataManager({
          encryptionService,
          eventLogger: securityEventLogger
        })
        await this.encryptedDataManager.initialize()
        
        loggers.database.info('Database encryption enabled')
      }

      // Initialize database and execute schema
      const initEffect = Effect.gen(function* (_) {
        const db = yield* _(DatabaseService)
        yield* _(Effect.scoped(db.initialize))
        yield* _(Effect.scoped(db.executeSchema))
      })

      await this.runWithServices(initEffect)

      this.initialized = true
      loggers.database.serviceLifecycle('EffectDatabaseManager', 'initialized')
      dbOp.success()
      
    } catch (error) {
      loggers.database.error('Failed to initialize database', {}, error as Error)
      dbOp.error(error as Error)
      throw new Error(`Database initialization failed: ${error}`)
    }
  }

  async shutdown(): Promise<void> {
    if (this.initialized) {
      const shutdownEffect = Effect.gen(function* (_) {
        const db = yield* _(DatabaseService)
        yield* _(db.shutdown)
      })

      await this.runWithServices(shutdownEffect)
      
      // Note: Runtime disposal is handled automatically by Effect
      this.initialized = false
      loggers.database.serviceLifecycle('EffectDatabaseManager', 'stopped')
    }
  }

  // =============================================================================
  // PERSONA OPERATIONS
  // =============================================================================

  async createPersona(persona: Omit<PersonaData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(PersonaRepository)
      return yield* _(repo.create(persona))
    })

    return await this.runWithServices(effect)
  }

  async updatePersona(id: string, updates: Partial<PersonaData>): Promise<void> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(PersonaRepository)
      yield* _(repo.update(id, updates))
    })

    await this.runWithServices(effect)
  }

  async activatePersona(id: string): Promise<void> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(PersonaRepository)
      yield* _(repo.activate(id))
    })

    await this.runWithServices(effect)
  }

  async deactivatePersona(id: string): Promise<void> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(PersonaRepository)
      yield* _(repo.deactivate(id))
    })

    await this.runWithServices(effect)
  }

  async getPersona(id: string): Promise<PersonaData | null> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(PersonaRepository)
      return yield* _(repo.getById(id))
    })

    return await this.runWithServices(effect)
  }

  async getAllPersonas(): Promise<PersonaData[]> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(PersonaRepository)
      return yield* _(repo.getAll())
    })

    return await this.runWithServices(effect)
  }

  async getActivePersona(): Promise<PersonaData | null> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(PersonaRepository)
      return yield* _(repo.getActive())
    })

    return await this.runWithServices(effect)
  }

  // =============================================================================
  // MEMORY OPERATIONS
  // =============================================================================

  async createMemoryEntity(memory: Omit<MemoryEntity, 'id' | 'createdAt'>): Promise<string> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(MemoryRepository)
      return yield* _(repo.create(memory))
    })

    return await this.runWithServices(effect)
  }

  async updateMemoryEntity(id: string, updates: Partial<MemoryEntity>): Promise<void> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(MemoryRepository)
      yield* _(repo.update(id, updates))
    })

    await this.runWithServices(effect)
  }

  async accessMemoryEntity(id: string): Promise<void> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(MemoryRepository)
      yield* _(repo.markAccessed(id))
    })

    await this.runWithServices(effect)
  }

  async deleteMemoryEntity(id: string): Promise<void> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(MemoryRepository)
      yield* _(repo.delete(id))
    })

    await this.runWithServices(effect)
  }

  async getMemoryEntity(id: string): Promise<MemoryEntity | null> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(MemoryRepository)
      return yield* _(repo.getById(id))
    })

    return await this.runWithServices(effect)
  }

  async getPersonaMemories(personaId: string): Promise<MemoryEntity[]> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(MemoryRepository)
      return yield* _(repo.getByPersonaId(personaId))
    })

    return await this.runWithServices(effect)
  }

  async getMemoriesByTier(tier: string): Promise<MemoryEntity[]> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(MemoryRepository)
      return yield* _(repo.getByTier(tier))
    })

    return await this.runWithServices(effect)
  }

  async getAllActiveMemories(): Promise<MemoryEntity[]> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(MemoryRepository)
      return yield* _(repo.getAllActive())
    })

    return await this.runWithServices(effect)
  }

  async updateMemoryTier(memoryId: string, newTier: string, newContent?: MemoryContent): Promise<void> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(MemoryRepository)
      yield* _(repo.updateTier(memoryId, newTier, newContent))
    })

    await this.runWithServices(effect)
  }

  async updateMemoryEmbedding(memoryId: string, embedding: number[], model: string): Promise<void> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(MemoryRepository)
      yield* _(repo.updateEmbedding(memoryId, embedding, model))
    })

    await this.runWithServices(effect)
  }

  // =============================================================================
  // REACTIVE QUERIES (Mock implementations for now)
  // =============================================================================

  subscribeToActivePersona(callback: (persona: PersonaData | null) => void): () => void {
    this.ensureInitialized()
    
    // NOTE: Reactive subscriptions not yet implemented
    // Future enhancement: Use Effect Streams for real-time updates
    this.getActivePersona().then(callback).catch(console.error)
    
    return () => {}
  }

  subscribeToPersonaMemories(personaId: string, callback: (memories: MemoryEntity[]) => void): () => void {
    this.ensureInitialized()
    
    // NOTE: Reactive subscriptions not yet implemented
    // Future enhancement: Use Effect Streams for real-time updates
    this.getPersonaMemories(personaId).then(callback).catch(console.error)
    
    return () => {}
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  getStore(): DatabaseStore {
    this.ensureInitialized()
    return { 
      effectSql: true,
      initialized: this.initialized,
      config: this.config
    }
  }

  // Get encryption status
  getEncryptionStatus(): { enabled: boolean; details?: EncryptionStatusDetails } {
    if (!this.encryptedDataManager) {
      return { enabled: false }
    }
    
    return {
      enabled: true,
      details: this.encryptedDataManager.getEncryptionStatus()
    }
  }

  // Development/debugging helper
  async getStats(): Promise<DatabaseStats> {
    this.ensureInitialized()
    
    const encryptionEnabled = this.config.enableEncryption || false
    
    const effect = Effect.gen(function* (_) {
      const personaRepo = yield* _(PersonaRepository)
      const memoryRepo = yield* _(MemoryRepository)
      const db = yield* _(DatabaseService)
      
      const personas = yield* _(personaRepo.getAll())
      const memories = yield* _(memoryRepo.getAllActive())
      const poolStats = yield* _(db.getPoolStats)
      
      return {
        personaCount: personas.length,
        memoryCount: memories.length,
        conversationCount: 0, // NOTE: Conversation repository not yet implemented
        encryptionEnabled,
        connectionPool: poolStats
      }
    })
    
    return await this.runWithServices(effect)
  }

  // Connection pool health check
  async performHealthCheck(): Promise<void> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const db = yield* _(DatabaseService)
      yield* _(db.healthCheck)
    })
    
    await this.runWithServices(effect)
  }

  // Get connection pool statistics
  async getConnectionPoolStats(): Promise<ConnectionPoolStats> {
    this.ensureInitialized()
    
    const effect = Effect.gen(function* (_) {
      const db = yield* _(DatabaseService)
      return yield* _(db.getPoolStats)
    })
    
    return await this.runWithServices(effect)
  }
} 