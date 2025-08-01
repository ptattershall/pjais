import { Effect, Layer, Runtime } from "effect";
import { ShardedDatabaseService, ShardedDatabaseServiceLayer } from "./sharded-database-service";
import { ShardedPersonaRepository, ShardedPersonaRepositoryLayer } from "./sharded-database-service";
import { ShardedMemoryRepository, ShardedMemoryRepositoryLayer } from "./sharded-database-service";
import { ShardManager, ShardManagerLayer, ShardInfo, ShardMetrics } from "./shard-manager";
import { PersonaData } from "../../shared/types/persona";
import { MemoryEntity } from "../../shared/types/memory";
import { EncryptedDataManager } from "../services/encrypted-storage-adapter";
import { EncryptionService } from "../services/encryption-service";
import { SecurityEventLogger } from "../services/security-event-logger";
import { loggers } from "../utils/logger";
import { DatabaseConfig } from "./effect-database-manager";

// Type definitions for sharded database manager
interface ShardedDatabaseStore {
  sharded: boolean;
  initialized: boolean;
  shardCount: number;
  config: DatabaseConfig;
}

interface ShardedDatabaseStats {
  personaCount: number;
  memoryCount: number;
  conversationCount: number;
  encryptionEnabled: boolean;
  shardMetrics: ShardMetrics;
  shardDistribution: Record<string, {
    personas: number;
    memories: number;
    conversations: number;
  }>;
}

export interface ShardedDatabaseManagerConfig extends DatabaseConfig {
  shardCount?: number;
  autoRebalance?: boolean;
  replicationFactor?: number;
  shardStrategy?: 'hash' | 'range' | 'directory';
}

export class ShardedDatabaseManager {
  private initialized = false;
  private config: ShardedDatabaseManagerConfig;
  private encryptedDataManager?: EncryptedDataManager;
  private encryptionService?: EncryptionService;
  private securityEventLogger?: SecurityEventLogger;
  private runtime: Runtime.Runtime<never>;

  constructor(config: ShardedDatabaseManagerConfig = {}) {
    this.config = {
      shardCount: 4,
      autoRebalance: true,
      replicationFactor: 1,
      shardStrategy: 'hash',
      ...config
    };

    // Initialize Effect runtime with sharded services
    const AppLayer = Layer.mergeAll(
      ShardedDatabaseServiceLayer,
      ShardedPersonaRepositoryLayer,
      ShardedMemoryRepositoryLayer,
      ShardManagerLayer
    );
    this.runtime = Runtime.make(AppLayer);
  }

  // Helper to run effects with sharded services
  private runWithServices<A, E>(effect: Effect.Effect<A, E, ShardedDatabaseService | ShardedPersonaRepository | ShardedMemoryRepository | ShardManager>) {
    return Runtime.runPromise(this.runtime)(effect);
  }

  async initialize(securityEventLogger?: SecurityEventLogger, encryptionService?: EncryptionService): Promise<void> {
    if (this.initialized) {
      loggers.database.info('Sharded Database already initialized');
      return;
    }

    const dbOp = loggers.database.dbOperation('initialize', 'sharded_database');
    
    try {
      loggers.database.serviceLifecycle('ShardedDatabaseManager', 'initializing');
      
      // Set up encryption if services are provided and encryption is enabled
      if (this.config.enableEncryption && securityEventLogger && encryptionService) {
        this.securityEventLogger = securityEventLogger;
        this.encryptionService = encryptionService;
        
        this.encryptedDataManager = new EncryptedDataManager({
          encryptionService,
          eventLogger: securityEventLogger
        });
        await this.encryptedDataManager.initialize();
        
        loggers.database.info('Sharded Database encryption enabled');
      }

      // Initialize sharded database system
      const initEffect = Effect.gen(function* (_) {
        const shardedDb = yield* _(ShardedDatabaseService);
        const shardManager = yield* _(ShardManager);
        
        // Initialize shard manager first
        yield* _(shardManager.initialize);
        
        // Initialize sharded database service
        yield* _(shardedDb.initialize);
        
        // Execute schema on all shards
        yield* _(shardedDb.executeSchema);
        
        loggers.database.info('Sharded database system initialized');
      });

      await Runtime.runPromise(this.runtime)(initEffect);

      this.initialized = true;
      loggers.database.serviceLifecycle('ShardedDatabaseManager', 'initialized');
      dbOp.success();
      
    } catch (error) {
      loggers.database.error('Failed to initialize sharded database', {}, error as Error);
      dbOp.error(error as Error);
      throw new Error(`Sharded Database initialization failed: ${error}`);
    }
  }

  async shutdown(): Promise<void> {
    if (this.initialized) {
      const shutdownEffect = Effect.gen(function* (_) {
        const shardedDb = yield* _(ShardedDatabaseService);
        const shardManager = yield* _(ShardManager);
        
        // Shutdown sharded database service
        yield* _(shardedDb.shutdown);
        
        // Shutdown shard manager
        yield* _(shardManager.shutdown);
      });

      await Runtime.runPromise(this.runtime)(shutdownEffect);
      
      // Dispose of the runtime to free resources
      Runtime.dispose(this.runtime);
      
      this.initialized = false;
      loggers.database.serviceLifecycle('ShardedDatabaseManager', 'stopped');
    }
  }

  // =============================================================================
  // PERSONA OPERATIONS (Sharded)
  // =============================================================================

  async createPersona(persona: Omit<PersonaData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedPersonaRepository);
      return yield* _(repo.create(persona));
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async updatePersona(id: string, updates: Partial<PersonaData>): Promise<void> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedPersonaRepository);
      yield* _(repo.update(id, updates));
    });

    await Runtime.runPromise(this.runtime)(effect);
  }

  async activatePersona(id: string): Promise<void> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedPersonaRepository);
      yield* _(repo.activate(id));
    });

    await Runtime.runPromise(this.runtime)(effect);
  }

  async deactivatePersona(id: string): Promise<void> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedPersonaRepository);
      yield* _(repo.deactivate(id));
    });

    await Runtime.runPromise(this.runtime)(effect);
  }

  async getPersona(id: string): Promise<PersonaData | null> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedPersonaRepository);
      return yield* _(repo.getById(id));
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async getAllPersonas(): Promise<PersonaData[]> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedPersonaRepository);
      return yield* _(repo.getAll());
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async getActivePersona(): Promise<PersonaData | null> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedPersonaRepository);
      return yield* _(repo.getActive());
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async getPersonasByShardId(shardId: string): Promise<PersonaData[]> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedPersonaRepository);
      return yield* _(repo.getByShardId(shardId));
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async migratePersonaToShard(personaId: string, targetShardId: string): Promise<void> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedPersonaRepository);
      yield* _(repo.migratePersonaToShard(personaId, targetShardId));
    });

    await Runtime.runPromise(this.runtime)(effect);
  }

  // =============================================================================
  // MEMORY OPERATIONS (Sharded)
  // =============================================================================

  async createMemoryEntity(memory: Omit<MemoryEntity, 'id' | 'createdAt'>): Promise<string> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedMemoryRepository);
      return yield* _(repo.create(memory));
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async updateMemoryEntity(id: string, updates: Partial<MemoryEntity>): Promise<void> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedMemoryRepository);
      yield* _(repo.update(id, updates));
    });

    await Runtime.runPromise(this.runtime)(effect);
  }

  async accessMemoryEntity(id: string): Promise<void> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedMemoryRepository);
      yield* _(repo.markAccessed(id));
    });

    await Runtime.runPromise(this.runtime)(effect);
  }

  async deleteMemoryEntity(id: string): Promise<void> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedMemoryRepository);
      yield* _(repo.delete(id));
    });

    await Runtime.runPromise(this.runtime)(effect);
  }

  async getMemoryEntity(id: string, personaId?: string): Promise<MemoryEntity | null> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedMemoryRepository);
      return yield* _(repo.getById(id, personaId));
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async getPersonaMemories(personaId: string): Promise<MemoryEntity[]> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedMemoryRepository);
      return yield* _(repo.getByPersonaId(personaId));
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async getMemoriesByTier(tier: string): Promise<MemoryEntity[]> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedMemoryRepository);
      return yield* _(repo.getByTier(tier));
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async getAllActiveMemories(): Promise<MemoryEntity[]> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedMemoryRepository);
      return yield* _(repo.getAllActive());
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async updateMemoryTier(memoryId: string, newTier: string, newContent?: any): Promise<void> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedMemoryRepository);
      yield* _(repo.updateTier(memoryId, newTier, newContent));
    });

    await Runtime.runPromise(this.runtime)(effect);
  }

  async updateMemoryEmbedding(memoryId: string, embedding: number[], model: string): Promise<void> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedMemoryRepository);
      yield* _(repo.updateEmbedding(memoryId, embedding, model));
    });

    await Runtime.runPromise(this.runtime)(effect);
  }

  async searchMemoriesAcrossShards(query: string, personaId?: string): Promise<MemoryEntity[]> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedMemoryRepository);
      return yield* _(repo.searchAcrossShards(query, personaId));
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async getMemoriesByShardId(shardId: string): Promise<MemoryEntity[]> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedMemoryRepository);
      return yield* _(repo.getByShardId(shardId));
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async migrateMemoryToShard(memoryId: string, targetShardId: string): Promise<void> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const repo = yield* _(ShardedMemoryRepository);
      yield* _(repo.migrateMemoryToShard(memoryId, targetShardId));
    });

    await Runtime.runPromise(this.runtime)(effect);
  }

  // =============================================================================
  // SHARD MANAGEMENT OPERATIONS
  // =============================================================================

  async getShardForEntity(entityType: string, entityId: string, parentId?: string): Promise<ShardInfo> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const shardManager = yield* _(ShardManager);
      return yield* _(shardManager.getShardForEntity(entityType, entityId, parentId));
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async getAllShards(): Promise<ShardInfo[]> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const shardManager = yield* _(ShardManager);
      return yield* _(shardManager.getAllShards);
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async getShardMetrics(): Promise<ShardMetrics> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const shardManager = yield* _(ShardManager);
      return yield* _(shardManager.getShardMetrics);
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async createShard(shardId: string): Promise<ShardInfo> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const shardManager = yield* _(ShardManager);
      return yield* _(shardManager.createShard(shardId));
    });

    return await Runtime.runPromise(this.runtime)(effect);
  }

  async removeShard(shardId: string): Promise<void> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const shardManager = yield* _(ShardManager);
      yield* _(shardManager.removeShard(shardId));
    });

    await Runtime.runPromise(this.runtime)(effect);
  }

  async rebalanceShards(): Promise<void> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const shardManager = yield* _(ShardManager);
      yield* _(shardManager.rebalanceShards);
    });

    await Runtime.runPromise(this.runtime)(effect);
  }

  async performShardHealthCheck(): Promise<void> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const shardManager = yield* _(ShardManager);
      yield* _(shardManager.healthCheck);
    });

    await Runtime.runPromise(this.runtime)(effect);
  }

  // =============================================================================
  // REACTIVE QUERIES (Enhanced with sharding)
  // =============================================================================

  subscribeToActivePersona(callback: (persona: PersonaData | null) => void): () => void {
    this.ensureInitialized();
    
    // NOTE: Reactive subscriptions not yet implemented
    // Future enhancement: Use Effect Streams for real-time updates across shards
    this.getActivePersona().then(callback).catch(console.error);
    
    return () => {};
  }

  subscribeToPersonaMemories(personaId: string, callback: (memories: MemoryEntity[]) => void): () => void {
    this.ensureInitialized();
    
    // NOTE: Reactive subscriptions not yet implemented
    // Future enhancement: Use Effect Streams for real-time updates across shards
    this.getPersonaMemories(personaId).then(callback).catch(console.error);
    
    return () => {};
  }

  subscribeToShardMetrics(callback: (metrics: ShardMetrics) => void): () => void {
    this.ensureInitialized();
    
    // NOTE: Reactive subscriptions for shard metrics not yet implemented
    // For now, provide current state and return empty unsubscribe
    this.getShardMetrics().then(callback).catch(console.error);
    
    return () => {};
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Sharded Database not initialized. Call initialize() first.');
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getStore(): ShardedDatabaseStore {
    this.ensureInitialized();
    return { 
      sharded: true,
      initialized: this.initialized,
      shardCount: this.config.shardCount || 4,
      config: this.config
    };
  }

  // Get encryption status
  getEncryptionStatus(): { enabled: boolean; details?: any } {
    if (!this.encryptedDataManager) {
      return { enabled: false };
    }
    
    return {
      enabled: true,
      details: this.encryptedDataManager.getEncryptionStatus()
    };
  }

  // Enhanced statistics with sharding information
  async getStats(): Promise<ShardedDatabaseStats> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const personaRepo = yield* _(ShardedPersonaRepository);
      const memoryRepo = yield* _(ShardedMemoryRepository);
      const shardManager = yield* _(ShardManager);
      
      const personas = yield* _(personaRepo.getAll());
      const memories = yield* _(memoryRepo.getAllActive());
      const shardMetrics = yield* _(shardManager.getShardMetrics);
      const shards = yield* _(shardManager.getAllShards);
      
      // Calculate distribution per shard
      const shardDistribution: Record<string, { personas: number; memories: number; conversations: number }> = {};
      
      for (const shard of shards) {
        const shardPersonas = yield* _(personaRepo.getByShardId(shard.id));
        const shardMemories = yield* _(memoryRepo.getByShardId(shard.id));
        
        shardDistribution[shard.id] = {
          personas: shardPersonas.length,
          memories: shardMemories.length,
          conversations: 0 // NOTE: Conversation repository not yet implemented
        };
      }
      
      return {
        personaCount: personas.length,
        memoryCount: memories.length,
        conversationCount: 0, // NOTE: Conversation repository not yet implemented
        encryptionEnabled: this.config.enableEncryption || false,
        shardMetrics,
        shardDistribution
      };
    });
    
    return await Runtime.runPromise(this.runtime)(effect);
  }

  // Enhanced health check with sharding
  async performHealthCheck(): Promise<void> {
    this.ensureInitialized();
    
    const effect = Effect.gen(function* (_) {
      const shardedDb = yield* _(ShardedDatabaseService);
      const shardManager = yield* _(ShardManager);
      
      // Check sharded database service health
      yield* _(shardedDb.healthCheck);
      
      // Check shard manager health
      yield* _(shardManager.healthCheck);
    });
    
    await Runtime.runPromise(this.runtime)(effect);
  }

  // Get sharding configuration
  getShardingConfig(): ShardedDatabaseManagerConfig {
    return { ...this.config };
  }

  // Update sharding configuration
  updateShardingConfig(newConfig: Partial<ShardedDatabaseManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    loggers.database.info('Sharding configuration updated', { newConfig });
  }
}