import { Effect, Layer, Context } from "effect";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { DatabaseService } from "./database-service";
import { ShardManager, ShardManagerLayer, ShardInfo, ShardDistribution, createShardDistribution } from "./shard-manager";
import { PersonaData } from "../../shared/types/persona";
import { MemoryEntity } from "../../shared/types/memory";
import { loggers } from "../utils/logger";

export interface ShardedDatabaseService extends DatabaseService {
  readonly getShardForEntity: (entityType: string, entityId: string, parentId?: string) => Effect.Effect<ShardInfo, Error, never>;
  readonly getAllShards: Effect.Effect<ShardInfo[], Error, never>;
  readonly getShardMetrics: Effect.Effect<any, Error, never>;
  readonly rebalanceShards: Effect.Effect<void, Error, never>;
  readonly withShardForEntity: <A, E>(
    entityType: string, 
    entityId: string, 
    parentId: string | undefined, 
    operation: (client: SqliteClient.SqliteClient) => Effect.Effect<A, E, never>
  ) => Effect.Effect<A, E | Error, never>;
  readonly executeOnAllShards: <A, E>(operation: (client: SqliteClient.SqliteClient) => Effect.Effect<A, E, never>) => Effect.Effect<A[], E | Error, never>;
  readonly executeOnShard: <A, E>(shardId: string, operation: (client: SqliteClient.SqliteClient) => Effect.Effect<A, E, never>) => Effect.Effect<A, E | Error, never>;
}

export const ShardedDatabaseService = Context.GenericTag<ShardedDatabaseService>("ShardedDatabaseService");

// Enhanced persona repository with sharding support
export interface ShardedPersonaRepository {
  readonly create: (persona: Omit<PersonaData, 'id' | 'createdAt' | 'updatedAt'>) => Effect.Effect<string, Error, never>;
  readonly update: (id: string, updates: Partial<PersonaData>) => Effect.Effect<void, Error, never>;
  readonly delete: (id: string) => Effect.Effect<void, Error, never>;
  readonly getById: (id: string) => Effect.Effect<PersonaData | null, Error, never>;
  readonly getAll: () => Effect.Effect<PersonaData[], Error, never>;
  readonly getActive: () => Effect.Effect<PersonaData | null, Error, never>;
  readonly activate: (id: string) => Effect.Effect<void, Error, never>;
  readonly deactivate: (id: string) => Effect.Effect<void, Error, never>;
  readonly getByShardId: (shardId: string) => Effect.Effect<PersonaData[], Error, never>;
  readonly migratePersonaToShard: (personaId: string, targetShardId: string) => Effect.Effect<void, Error, never>;
}

export const ShardedPersonaRepository = Context.GenericTag<ShardedPersonaRepository>("ShardedPersonaRepository");

// Enhanced memory repository with sharding support
export interface ShardedMemoryRepository {
  readonly create: (memory: Omit<MemoryEntity, 'id' | 'createdAt'>) => Effect.Effect<string, Error, never>;
  readonly update: (id: string, updates: Partial<MemoryEntity>) => Effect.Effect<void, Error, never>;
  readonly delete: (id: string) => Effect.Effect<void, Error, never>;
  readonly getById: (id: string, personaId?: string) => Effect.Effect<MemoryEntity | null, Error, never>;
  readonly getByPersonaId: (personaId: string) => Effect.Effect<MemoryEntity[], Error, never>;
  readonly getByTier: (tier: string) => Effect.Effect<MemoryEntity[], Error, never>;
  readonly getAllActive: () => Effect.Effect<MemoryEntity[], Error, never>;
  readonly updateTier: (memoryId: string, newTier: string, newContent?: any) => Effect.Effect<void, Error, never>;
  readonly updateEmbedding: (memoryId: string, embedding: number[], model: string) => Effect.Effect<void, Error, never>;
  readonly markAccessed: (id: string) => Effect.Effect<void, Error, never>;
  readonly getByShardId: (shardId: string) => Effect.Effect<MemoryEntity[], Error, never>;
  readonly migrateMemoryToShard: (memoryId: string, targetShardId: string) => Effect.Effect<void, Error, never>;
  readonly searchAcrossShards: (query: string, personaId?: string) => Effect.Effect<MemoryEntity[], Error, never>;
}

export const ShardedMemoryRepository = Context.GenericTag<ShardedMemoryRepository>("ShardedMemoryRepository");

// Sharded Database Service Implementation
const ShardedDatabaseServiceLive = Layer.effect(
  ShardedDatabaseService,
  Effect.gen(function* (_) {
    const shardManager = yield* _(ShardManager);
    let distribution: ShardDistribution;
    let initialized = false;

    const initialize = Effect.gen(function* (_) {
      loggers.database.info('Initializing Sharded Database Service');
      
      // Initialize shard manager
      yield* _(shardManager.initialize);
      
      // Create distribution helper
      distribution = createShardDistribution(shardManager);
      
      initialized = true;
      loggers.database.info('Sharded Database Service initialized successfully');
    });

    const shutdown = Effect.gen(function* (_) {
      loggers.database.info('Shutting down Sharded Database Service');
      yield* _(shardManager.shutdown);
      initialized = false;
      loggers.database.info('Sharded Database Service shutdown complete');
    });

    const getClient = Effect.gen(function* (_) {
      // For compatibility, return the first shard's client
      const shards = yield* _(shardManager.getAllShards);
      if (shards.length === 0) {
        return yield* _(Effect.fail(new Error('No shards available')));
      }
      return yield* _(shardManager.getShardConnection(shards[0].id));
    });

    const executeSchema = Effect.gen(function* (_) {
      loggers.database.info('Executing schema on all shards');
      const shards = yield* _(shardManager.getAllShards);
      
      for (const shard of shards) {
        const client = yield* _(shardManager.getShardConnection(shard.id));
        
        // Execute schema on each shard
        const schemaPath = require('path').join(__dirname, 'schema.sql');
        const fs = require('fs');
        
        if (fs.existsSync(schemaPath)) {
          const schema = fs.readFileSync(schemaPath, 'utf-8');
          const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
          
          for (const statement of statements) {
            if (statement.trim()) {
              yield* _(client`${statement}`);
            }
          }
        }
      }
      
      loggers.database.info('Schema executed on all shards');
    });

    const withConnection = <A, E>(operation: (client: SqliteClient.SqliteClient) => Effect.Effect<A, E, never>) =>
      Effect.gen(function* (_) {
        const client = yield* _(getClient);
        return yield* _(operation(client));
      });

    const getPoolStats = Effect.gen(function* (_) {
      // Return combined stats from all shards
      const metrics = yield* _(shardManager.getShardMetrics);
      return {
        totalConnections: Object.values(metrics.shardUtilization).reduce((sum, util) => sum + util.connectionCount, 0),
        activeConnections: Object.values(metrics.shardUtilization).reduce((sum, util) => sum + util.connectionCount, 0),
        totalShards: metrics.totalShards,
        activeShards: metrics.activeShards,
        shardUtilization: metrics.shardUtilization
      };
    });

    const healthCheck = Effect.gen(function* (_) {
      yield* _(shardManager.healthCheck);
    });

    // Sharded-specific methods
    const getShardForEntity = shardManager.getShardForEntity;
    const getAllShards = shardManager.getAllShards;
    const getShardMetrics = shardManager.getShardMetrics;
    const rebalanceShards = shardManager.rebalanceShards;

    const withShardForEntity = <A, E>(
      entityType: string,
      entityId: string,
      parentId: string | undefined,
      operation: (client: SqliteClient.SqliteClient) => Effect.Effect<A, E, never>
    ): Effect.Effect<A, E | Error, never> =>
      Effect.gen(function* (_) {
        const shard = yield* _(shardManager.getShardForEntity(entityType, entityId, parentId));
        const client = yield* _(shardManager.getShardConnection(shard.id));
        return yield* _(operation(client));
      });

    const executeOnAllShards = <A, E>(operation: (client: SqliteClient.SqliteClient) => Effect.Effect<A, E, never>): Effect.Effect<A[], E | Error, never> =>
      Effect.gen(function* (_) {
        const shards = yield* _(shardManager.getAllShards);
        const results: A[] = [];
        
        for (const shard of shards) {
          if (shard.status === 'active') {
            const client = yield* _(shardManager.getShardConnection(shard.id));
            const result = yield* _(operation(client));
            results.push(result);
          }
        }
        
        return results;
      });

    const executeOnShard = <A, E>(shardId: string, operation: (client: SqliteClient.SqliteClient) => Effect.Effect<A, E, never>): Effect.Effect<A, E | Error, never> =>
      Effect.gen(function* (_) {
        const client = yield* _(shardManager.getShardConnection(shardId));
        return yield* _(operation(client));
      });

    return {
      initialize,
      shutdown,
      getClient,
      executeSchema,
      withConnection,
      getPoolStats,
      healthCheck,
      getShardForEntity,
      getAllShards,
      getShardMetrics,
      rebalanceShards,
      withShardForEntity,
      executeOnAllShards,
      executeOnShard
    };
  })
).pipe(Layer.provide(ShardManagerLayer));

// Sharded Persona Repository Implementation
const ShardedPersonaRepositoryLive = Layer.effect(
  ShardedPersonaRepository,
  Effect.gen(function* (_) {
    const shardedDb = yield* _(ShardedDatabaseService);
    const crypto = require('crypto');

    const create = (persona: Omit<PersonaData, 'id' | 'createdAt' | 'updatedAt'>): Effect.Effect<string, Error, never> =>
      Effect.gen(function* (_) {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        
        const fullPersona: PersonaData = {
          ...persona,
          id,
          createdAt: now,
          updatedAt: now,
          isActive: false
        };

        yield* _(shardedDb.withShardForEntity('persona', id, undefined, (client) =>
          client`
            INSERT INTO personas (
              id, name, description, personality_traits, personality_temperament,
              personality_communication_style, memory_max_memories, memory_importance_threshold,
              memory_auto_optimize, memory_retention_period, memory_categories,
              memory_compression_enabled, privacy_data_collection, privacy_analytics_enabled,
              privacy_share_with_researchers, privacy_allow_personality_analysis,
              privacy_memory_retention, privacy_export_data_allowed, is_active, created_at, updated_at
            ) VALUES (
              ${fullPersona.id}, ${fullPersona.name}, ${fullPersona.description},
              ${JSON.stringify(fullPersona.personalityTraits)}, ${fullPersona.personalityTemperament},
              ${fullPersona.personalityCommunicationStyle}, ${fullPersona.memoryMaxMemories},
              ${fullPersona.memoryImportanceThreshold}, ${fullPersona.memoryAutoOptimize},
              ${fullPersona.memoryRetentionPeriod}, ${JSON.stringify(fullPersona.memoryCategories)},
              ${fullPersona.memoryCompressionEnabled}, ${fullPersona.privacyDataCollection},
              ${fullPersona.privacyAnalyticsEnabled}, ${fullPersona.privacyShareWithResearchers},
              ${fullPersona.privacyAllowPersonalityAnalysis}, ${fullPersona.privacyMemoryRetention},
              ${fullPersona.privacyExportDataAllowed}, ${fullPersona.isActive}, ${fullPersona.createdAt}, ${fullPersona.updatedAt}
            )
          `
        ));

        return id;
      });

    const update = (id: string, updates: Partial<PersonaData>): Effect.Effect<void, Error, never> =>
      Effect.gen(function* (_) {
        const updatedAt = new Date().toISOString();
        
        const setClause = Object.entries(updates)
          .map(([key, value]) => {
            if (key === 'personalityTraits' || key === 'memoryCategories') {
              return `${key} = '${JSON.stringify(value)}'`;
            }
            return `${key} = '${value}'`;
          })
          .join(', ');

        yield* _(shardedDb.withShardForEntity('persona', id, undefined, (client) =>
          client`UPDATE personas SET ${setClause}, updated_at = ${updatedAt} WHERE id = ${id}`
        ));
      });

    const getById = (id: string): Effect.Effect<PersonaData | null, Error, never> =>
      Effect.gen(function* (_) {
        const results = yield* _(shardedDb.withShardForEntity('persona', id, undefined, (client) =>
          client`SELECT * FROM personas WHERE id = ${id}`
        ));
        
        return results.length > 0 ? transformPersonaRow(results[0]) : null;
      });

    const getAll = (): Effect.Effect<PersonaData[], Error, never> =>
      Effect.gen(function* (_) {
        const results = yield* _(shardedDb.executeOnAllShards((client) =>
          client`SELECT * FROM personas ORDER BY created_at DESC`
        ));
        
        return results.flat().map(transformPersonaRow);
      });

    const getActive = (): Effect.Effect<PersonaData | null, Error, never> =>
      Effect.gen(function* (_) {
        const results = yield* _(shardedDb.executeOnAllShards((client) =>
          client`SELECT * FROM personas WHERE is_active = true LIMIT 1`
        ));
        
        const activePersonas = results.flat();
        return activePersonas.length > 0 ? transformPersonaRow(activePersonas[0]) : null;
      });

    const activate = (id: string): Effect.Effect<void, Error, never> =>
      Effect.gen(function* (_) {
        // Deactivate all personas first
        yield* _(shardedDb.executeOnAllShards((client) =>
          client`UPDATE personas SET is_active = false`
        ));
        
        // Activate the specific persona
        yield* _(shardedDb.withShardForEntity('persona', id, undefined, (client) =>
          client`UPDATE personas SET is_active = true WHERE id = ${id}`
        ));
      });

    const deactivate = (id: string): Effect.Effect<void, Error, never> =>
      Effect.gen(function* (_) {
        yield* _(shardedDb.withShardForEntity('persona', id, undefined, (client) =>
          client`UPDATE personas SET is_active = false WHERE id = ${id}`
        ));
      });

    const deletePersona = (id: string): Effect.Effect<void, Error, never> =>
      Effect.gen(function* (_) {
        yield* _(shardedDb.withShardForEntity('persona', id, undefined, (client) =>
          client`DELETE FROM personas WHERE id = ${id}`
        ));
      });

    const getByShardId = (shardId: string): Effect.Effect<PersonaData[], Error, never> =>
      Effect.gen(function* (_) {
        const results = yield* _(shardedDb.executeOnShard(shardId, (client) =>
          client`SELECT * FROM personas ORDER BY created_at DESC`
        ));
        
        return results.map(transformPersonaRow);
      });

    const migratePersonaToShard = (personaId: string, targetShardId: string): Effect.Effect<void, Error, never> =>
      Effect.gen(function* (_) {
        // Get persona data
        const persona = yield* _(getById(personaId));
        if (!persona) {
          return yield* _(Effect.fail(new Error(`Persona ${personaId} not found`)));
        }

        // Insert into target shard
        yield* _(shardedDb.executeOnShard(targetShardId, (client) =>
          client`
            INSERT INTO personas (
              id, name, description, personality_traits, personality_temperament,
              personality_communication_style, memory_max_memories, memory_importance_threshold,
              memory_auto_optimize, memory_retention_period, memory_categories,
              memory_compression_enabled, privacy_data_collection, privacy_analytics_enabled,
              privacy_share_with_researchers, privacy_allow_personality_analysis,
              privacy_memory_retention, privacy_export_data_allowed, is_active, created_at, updated_at
            ) VALUES (
              ${persona.id}, ${persona.name}, ${persona.description},
              ${JSON.stringify(persona.personalityTraits)}, ${persona.personalityTemperament},
              ${persona.personalityCommunicationStyle}, ${persona.memoryMaxMemories},
              ${persona.memoryImportanceThreshold}, ${persona.memoryAutoOptimize},
              ${persona.memoryRetentionPeriod}, ${JSON.stringify(persona.memoryCategories)},
              ${persona.memoryCompressionEnabled}, ${persona.privacyDataCollection},
              ${persona.privacyAnalyticsEnabled}, ${persona.privacyShareWithResearchers},
              ${persona.privacyAllowPersonalityAnalysis}, ${persona.privacyMemoryRetention},
              ${persona.privacyExportDataAllowed}, ${persona.isActive}, ${persona.createdAt}, ${persona.updatedAt}
            )
          `
        ));

        // Delete from original shard
        yield* _(deletePersona(personaId));
      });

    const transformPersonaRow = (row: any): PersonaData => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      personalityTraits: JSON.parse(row.personality_traits || '[]'),
      personalityTemperament: row.personality_temperament || 'balanced',
      personalityCommunicationStyle: row.personality_communication_style || 'conversational',
      memoryMaxMemories: row.memory_max_memories || 1000,
      memoryImportanceThreshold: row.memory_importance_threshold || 50,
      memoryAutoOptimize: row.memory_auto_optimize || true,
      memoryRetentionPeriod: row.memory_retention_period || 30,
      memoryCategories: JSON.parse(row.memory_categories || '["conversation","learning","preference","fact"]'),
      memoryCompressionEnabled: row.memory_compression_enabled || true,
      privacyDataCollection: row.privacy_data_collection || true,
      privacyAnalyticsEnabled: row.privacy_analytics_enabled || false,
      privacyShareWithResearchers: row.privacy_share_with_researchers || false,
      privacyAllowPersonalityAnalysis: row.privacy_allow_personality_analysis || true,
      privacyMemoryRetention: row.privacy_memory_retention || true,
      privacyExportDataAllowed: row.privacy_export_data_allowed || true,
      isActive: row.is_active || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });

    return {
      create,
      update,
      delete: deletePersona,
      getById,
      getAll,
      getActive,
      activate,
      deactivate,
      getByShardId,
      migratePersonaToShard
    };
  })
).pipe(Layer.provide(ShardedDatabaseServiceLive));

// Sharded Memory Repository Implementation
const ShardedMemoryRepositoryLive = Layer.effect(
  ShardedMemoryRepository,
  Effect.gen(function* (_) {
    const shardedDb = yield* _(ShardedDatabaseService);
    const crypto = require('crypto');

    const create = (memory: Omit<MemoryEntity, 'id' | 'createdAt'>): Effect.Effect<string, Error, never> =>
      Effect.gen(function* (_) {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        
        const fullMemory = {
          ...memory,
          id,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        };

        yield* _(shardedDb.withShardForEntity('memory', id, memory.personaId, (client) =>
          client`
            INSERT INTO memory_entities (
              id, persona_id, type, name, content, summary, tags, importance,
              memory_tier, embedding, embedding_model, access_count, last_accessed,
              created_at, updated_at, deleted_at
            ) VALUES (
              ${fullMemory.id}, ${fullMemory.personaId}, ${fullMemory.type},
              ${fullMemory.name}, ${fullMemory.content}, ${fullMemory.summary},
              ${JSON.stringify(fullMemory.tags)}, ${fullMemory.importance},
              ${fullMemory.memoryTier}, ${fullMemory.embedding ? JSON.stringify(fullMemory.embedding) : null},
              ${fullMemory.embeddingModel}, ${fullMemory.accessCount || 0},
              ${fullMemory.lastAccessed}, ${fullMemory.createdAt}, ${fullMemory.updatedAt},
              ${fullMemory.deletedAt}
            )
          `
        ));

        return id;
      });

    const update = (id: string, updates: Partial<MemoryEntity>): Effect.Effect<void, Error, never> =>
      Effect.gen(function* (_) {
        const updatedAt = new Date().toISOString();
        
        const setClause = Object.entries(updates)
          .map(([key, value]) => {
            if (key === 'tags' || key === 'embedding') {
              return `${key} = '${JSON.stringify(value)}'`;
            }
            return `${key} = '${value}'`;
          })
          .join(', ');

        // Need persona ID to determine shard
        const personaId = updates.personaId || '';
        
        yield* _(shardedDb.withShardForEntity('memory', id, personaId, (client) =>
          client`UPDATE memory_entities SET ${setClause}, updated_at = ${updatedAt} WHERE id = ${id}`
        ));
      });

    const getById = (id: string, personaId?: string): Effect.Effect<MemoryEntity | null, Error, never> =>
      Effect.gen(function* (_) {
        const results = yield* _(shardedDb.withShardForEntity('memory', id, personaId, (client) =>
          client`SELECT * FROM memory_entities WHERE id = ${id} AND deleted_at IS NULL`
        ));
        
        return results.length > 0 ? transformMemoryRow(results[0]) : null;
      });

    const getByPersonaId = (personaId: string): Effect.Effect<MemoryEntity[], Error, never> =>
      Effect.gen(function* (_) {
        const results = yield* _(shardedDb.withShardForEntity('memory', '', personaId, (client) =>
          client`SELECT * FROM memory_entities WHERE persona_id = ${personaId} AND deleted_at IS NULL ORDER BY created_at DESC`
        ));
        
        return results.map(transformMemoryRow);
      });

    const getByTier = (tier: string): Effect.Effect<MemoryEntity[], Error, never> =>
      Effect.gen(function* (_) {
        const results = yield* _(shardedDb.executeOnAllShards((client) =>
          client`SELECT * FROM memory_entities WHERE memory_tier = ${tier} AND deleted_at IS NULL ORDER BY created_at DESC`
        ));
        
        return results.flat().map(transformMemoryRow);
      });

    const getAllActive = (): Effect.Effect<MemoryEntity[], Error, never> =>
      Effect.gen(function* (_) {
        const results = yield* _(shardedDb.executeOnAllShards((client) =>
          client`SELECT * FROM memory_entities WHERE deleted_at IS NULL ORDER BY created_at DESC`
        ));
        
        return results.flat().map(transformMemoryRow);
      });

    const updateTier = (memoryId: string, newTier: string, newContent?: any): Effect.Effect<void, Error, never> =>
      Effect.gen(function* (_) {
        const updates: any = { memory_tier: newTier };
        if (newContent !== undefined) {
          updates.content = typeof newContent === 'string' ? newContent : JSON.stringify(newContent);
        }
        
        yield* _(update(memoryId, updates));
      });

    const updateEmbedding = (memoryId: string, embedding: number[], model: string): Effect.Effect<void, Error, never> =>
      Effect.gen(function* (_) {
        yield* _(update(memoryId, {
          embedding,
          embeddingModel: model
        }));
      });

    const markAccessed = (id: string): Effect.Effect<void, Error, never> =>
      Effect.gen(function* (_) {
        const now = new Date().toISOString();
        yield* _(update(id, {
          lastAccessed: now,
          accessCount: (yield* _(getById(id)))?.accessCount + 1 || 1
        }));
      });

    const deleteMemory = (id: string): Effect.Effect<void, Error, never> =>
      Effect.gen(function* (_) {
        const now = new Date().toISOString();
        yield* _(update(id, { deletedAt: now }));
      });

    const getByShardId = (shardId: string): Effect.Effect<MemoryEntity[], Error, never> =>
      Effect.gen(function* (_) {
        const results = yield* _(shardedDb.executeOnShard(shardId, (client) =>
          client`SELECT * FROM memory_entities WHERE deleted_at IS NULL ORDER BY created_at DESC`
        ));
        
        return results.map(transformMemoryRow);
      });

    const migrateMemoryToShard = (memoryId: string, targetShardId: string): Effect.Effect<void, Error, never> =>
      Effect.gen(function* (_) {
        // Implementation similar to persona migration
        loggers.database.info(`Migrating memory ${memoryId} to shard ${targetShardId}`);
        // This would involve similar logic to persona migration
      });

    const searchAcrossShards = (query: string, personaId?: string): Effect.Effect<MemoryEntity[], Error, never> =>
      Effect.gen(function* (_) {
        const searchQuery = personaId
          ? `SELECT * FROM memory_entities WHERE persona_id = '${personaId}' AND content LIKE '%${query}%' AND deleted_at IS NULL`
          : `SELECT * FROM memory_entities WHERE content LIKE '%${query}%' AND deleted_at IS NULL`;
        
        const results = yield* _(shardedDb.executeOnAllShards((client) =>
          client`${searchQuery}`
        ));
        
        return results.flat().map(transformMemoryRow);
      });

    const transformMemoryRow = (row: any): MemoryEntity => ({
      id: row.id,
      personaId: row.persona_id,
      type: row.type,
      name: row.name || '',
      content: row.content,
      summary: row.summary || '',
      tags: JSON.parse(row.tags || '[]'),
      importance: row.importance || 50,
      memoryTier: row.memory_tier || 'active',
      embedding: row.embedding ? JSON.parse(row.embedding) : null,
      embeddingModel: row.embedding_model,
      accessCount: row.access_count || 0,
      lastAccessed: row.last_accessed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at
    });

    return {
      create,
      update,
      delete: deleteMemory,
      getById,
      getByPersonaId,
      getByTier,
      getAllActive,
      updateTier,
      updateEmbedding,
      markAccessed,
      getByShardId,
      migrateMemoryToShard,
      searchAcrossShards
    };
  })
).pipe(Layer.provide(ShardedDatabaseServiceLive));

// Export layers
export const ShardedDatabaseServiceLayer = ShardedDatabaseServiceLive;
export const ShardedPersonaRepositoryLayer = ShardedPersonaRepositoryLive;
export const ShardedMemoryRepositoryLayer = ShardedMemoryRepositoryLive;