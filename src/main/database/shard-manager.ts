import { Effect, Layer, Context } from "effect";
import { SqliteClient } from "@effect/sql-sqlite-node";
import * as crypto from "crypto";
import * as path from "path";
import { PlatformUtils } from "../utils/platform";
import { loggers } from "../utils/logger";
import { ConnectionPool, ConnectionPoolLayerDefault } from "./connection-pool";
import { DatabaseService } from "./database-service";

export interface ShardConfig {
  shardCount: number;
  strategy: 'hash' | 'range' | 'directory';
  consistentHashing: boolean;
  replicationFactor: number;
  autoRebalance: boolean;
  dataDirectory: string;
}

export interface ShardInfo {
  id: string;
  name: string;
  path: string;
  range?: {
    start: string;
    end: string;
  };
  status: 'active' | 'inactive' | 'migrating' | 'readonly';
  nodeId: string;
  createdAt: Date;
  lastAccessed: Date;
  connectionPool?: ConnectionPool;
}

export interface ShardDistribution {
  persona: (personaId: string) => string;
  memory: (memoryId: string, personaId: string) => string;
  conversation: (conversationId: string, personaId: string) => string;
}

export interface ShardMetrics {
  totalShards: number;
  activeShards: number;
  totalRecords: number;
  averageRecordsPerShard: number;
  shardUtilization: Record<string, {
    recordCount: number;
    diskUsage: number;
    connectionCount: number;
    queryPerformance: number;
  }>;
  rebalanceStatus: {
    inProgress: boolean;
    lastRebalance: Date;
    nextRebalance: Date;
  };
}

export interface ShardMigrationPlan {
  sourceShardId: string;
  targetShardId: string;
  recordCount: number;
  estimatedDuration: number;
  strategy: 'copy' | 'move' | 'replicate';
  entityTypes: string[];
}

export interface ShardManager {
  readonly initialize: Effect.Effect<void, Error, never>;
  readonly shutdown: Effect.Effect<void, Error, never>;
  readonly getShardForEntity: (entityType: string, entityId: string, parentId?: string) => Effect.Effect<ShardInfo, Error, never>;
  readonly getAllShards: Effect.Effect<ShardInfo[], Error, never>;
  readonly getShardMetrics: Effect.Effect<ShardMetrics, Error, never>;
  readonly createShard: (shardId: string) => Effect.Effect<ShardInfo, Error, never>;
  readonly removeShard: (shardId: string) => Effect.Effect<void, Error, never>;
  readonly rebalanceShards: Effect.Effect<void, Error, never>;
  readonly migrateData: (plan: ShardMigrationPlan) => Effect.Effect<void, Error, never>;
  readonly healthCheck: Effect.Effect<void, Error, never>;
  readonly getShardConnection: (shardId: string) => Effect.Effect<SqliteClient.SqliteClient, Error, never>;
  readonly withShardConnection: <A, E>(shardId: string, operation: (client: SqliteClient.SqliteClient) => Effect.Effect<A, E, never>) => Effect.Effect<A, E | Error, never>;
}

export const ShardManager = Context.GenericTag<ShardManager>("ShardManager");

// Consistent hashing implementation
class ConsistentHashRing {
  private ring: Map<string, string> = new Map();
  private sortedKeys: string[] = [];
  private virtualNodes: number = 150;

  constructor(private shards: ShardInfo[]) {
    this.buildRing();
  }

  private buildRing(): void {
    this.ring.clear();
    this.sortedKeys = [];

    for (const shard of this.shards) {
      if (shard.status === 'active') {
        for (let i = 0; i < this.virtualNodes; i++) {
          const virtualKey = this.hash(`${shard.id}:${i}`);
          this.ring.set(virtualKey, shard.id);
          this.sortedKeys.push(virtualKey);
        }
      }
    }

    this.sortedKeys.sort();
  }

  private hash(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  getShardForKey(key: string): string | null {
    if (this.sortedKeys.length === 0) {
      return null;
    }

    const hash = this.hash(key);
    
    // Find the first shard with hash >= key hash
    let index = this.sortedKeys.findIndex(k => k >= hash);
    
    // If not found, wrap around to the first shard
    if (index === -1) {
      index = 0;
    }
    
    const shardKey = this.sortedKeys[index];
    return this.ring.get(shardKey) || null;
  }

  updateShards(shards: ShardInfo[]): void {
    this.shards = shards;
    this.buildRing();
  }
}

// Shard manager implementation
const ShardManagerLive = Layer.effect(
  ShardManager,
  Effect.gen(function* (_) {
    const config: ShardConfig = {
      shardCount: 4,
      strategy: 'hash',
      consistentHashing: true,
      replicationFactor: 1,
      autoRebalance: true,
      dataDirectory: path.join(PlatformUtils.getAppDataPath(), 'shards')
    };

    const shards = new Map<string, ShardInfo>();
    const connectionPools = new Map<string, ConnectionPool>();
    let hashRing: ConsistentHashRing;
    let initialized = false;

    loggers.database.info('Initializing Shard Manager', { config });

    const initialize = Effect.gen(function* (_) {
      loggers.database.info('Initializing database sharding system');
      
      // Create shards directory
      const fs = require('fs-extra');
      yield* Effect.promise(() => fs.ensureDir(config.dataDirectory));

      // Initialize default shards
      for (let i = 0; i < config.shardCount; i++) {
        const shardId = `shard_${i.toString().padStart(2, '0')}`;
        const shard = yield* _(createShardInternal(shardId));
        shards.set(shardId, shard);
      }

      // Initialize consistent hash ring
      hashRing = new ConsistentHashRing(Array.from(shards.values()));

      // Initialize connection pools for each shard
      for (const [shardId, shard] of shards) {
        // Create connection pool for this shard
        const poolLayer = ConnectionPoolLayerDefault.pipe(
          Layer.provide(Layer.succeed(SqliteClient.SqliteClient, SqliteClient.make({
            filename: shard.path,
            transformResultNames: (str) => str,
            transformQueryNames: (str) => str
          })))
        );
        
        // This would need to be properly implemented with Effect's DI system
        // For now, we'll use a simplified approach
        connectionPools.set(shardId, {} as ConnectionPool);
      }

      initialized = true;
      loggers.database.info(`Shard Manager initialized with ${shards.size} shards`);
    });

    const shutdown = Effect.gen(function* (_) {
      loggers.database.info('Shutting down Shard Manager');
      
      // Close all connection pools
      for (const [shardId, pool] of connectionPools) {
        try {
          // yield* _(pool.shutdown); // Would be implemented with proper connection pool
          loggers.database.info(`Closed connection pool for shard ${shardId}`);
        } catch (error) {
          loggers.database.error(`Error closing connection pool for shard ${shardId}:`, {}, error as Error);
        }
      }

      connectionPools.clear();
      shards.clear();
      initialized = false;
      
      loggers.database.info('Shard Manager shutdown complete');
    });

    const createShardInternal = (shardId: string): Effect.Effect<ShardInfo, Error, never> =>
      Effect.gen(function* (_) {
        const shardPath = path.join(config.dataDirectory, `${shardId}.db`);
        const fs = require('fs-extra');
        
        // Ensure the shard database file exists
        yield* Effect.promise(() => fs.ensureFile(shardPath));

        const shard: ShardInfo = {
          id: shardId,
          name: `Shard ${shardId}`,
          path: shardPath,
          status: 'active',
          nodeId: crypto.randomUUID(),
          createdAt: new Date(),
          lastAccessed: new Date()
        };

        // Initialize shard database schema
        yield* _(initializeShardSchema(shard));

        loggers.database.info(`Created shard ${shardId} at ${shardPath}`);
        return shard;
      });

    const initializeShardSchema = (shard: ShardInfo): Effect.Effect<void, Error, never> =>
      Effect.gen(function* (_) {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const fs = require('fs');
        
        if (fs.existsSync(schemaPath)) {
          const schema = fs.readFileSync(schemaPath, 'utf-8');
          const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
          
          // Create SQLite client for this shard
          const client = SqliteClient.make({
            filename: shard.path,
            transformResultNames: (str) => str,
            transformQueryNames: (str) => str
          });

          // Execute schema statements
          for (const statement of statements) {
            if (statement.trim()) {
              yield* _(client`${statement}`);
            }
          }
          
          loggers.database.info(`Initialized schema for shard ${shard.id}`);
        }
      });

    const getShardForEntity = (entityType: string, entityId: string, parentId?: string): Effect.Effect<ShardInfo, Error, never> =>
      Effect.gen(function* (_) {
        if (!initialized) {
          return yield* _(Effect.fail(new Error('Shard Manager not initialized')));
        }

        let shardId: string;

        switch (config.strategy) {
          case 'hash':
            if (config.consistentHashing) {
              const key = parentId ? `${parentId}:${entityId}` : entityId;
              shardId = hashRing.getShardForKey(key) || 'shard_00';
            } else {
              // Simple hash-based sharding
              const hash = crypto.createHash('md5').update(entityId).digest('hex');
              const shardIndex = parseInt(hash.substring(0, 8), 16) % config.shardCount;
              shardId = `shard_${shardIndex.toString().padStart(2, '0')}`;
            }
            break;

          case 'range':
            // Range-based sharding (would need range configuration)
            shardId = 'shard_00'; // Default fallback
            break;

          case 'directory':
            // Directory-based sharding (for persona-based isolation)
            if (parentId) {
              const hash = crypto.createHash('md5').update(parentId).digest('hex');
              const shardIndex = parseInt(hash.substring(0, 8), 16) % config.shardCount;
              shardId = `shard_${shardIndex.toString().padStart(2, '0')}`;
            } else {
              shardId = 'shard_00';
            }
            break;

          default:
            shardId = 'shard_00';
        }

        const shard = shards.get(shardId);
        if (!shard) {
          return yield* _(Effect.fail(new Error(`Shard ${shardId} not found`)));
        }

        // Update last accessed timestamp
        shard.lastAccessed = new Date();
        
        return shard;
      });

    const getAllShards = Effect.succeed(Array.from(shards.values()));

    const getShardMetrics = Effect.gen(function* (_) {
      const metrics: ShardMetrics = {
        totalShards: shards.size,
        activeShards: Array.from(shards.values()).filter(s => s.status === 'active').length,
        totalRecords: 0,
        averageRecordsPerShard: 0,
        shardUtilization: {},
        rebalanceStatus: {
          inProgress: false,
          lastRebalance: new Date(),
          nextRebalance: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        }
      };

      // Calculate metrics for each shard
      for (const [shardId, shard] of shards) {
        try {
          const client = SqliteClient.make({
            filename: shard.path,
            transformResultNames: (str) => str,
            transformQueryNames: (str) => str
          });

          // Get record counts
          const personaCount = yield* _(client`SELECT COUNT(*) as count FROM personas`);
          const memoryCount = yield* _(client`SELECT COUNT(*) as count FROM memory_entities WHERE deleted_at IS NULL`);
          const conversationCount = yield* _(client`SELECT COUNT(*) as count FROM conversations`);

          const totalRecords = (personaCount[0] as any).count + (memoryCount[0] as any).count + (conversationCount[0] as any).count;
          metrics.totalRecords += totalRecords;

          // Get file size
          const fs = require('fs');
          const stats = fs.statSync(shard.path);
          const diskUsage = stats.size;

          metrics.shardUtilization[shardId] = {
            recordCount: totalRecords,
            diskUsage,
            connectionCount: 0, // Would be from connection pool
            queryPerformance: 0 // Would be from performance monitoring
          };
        } catch (error) {
          loggers.database.error(`Error getting metrics for shard ${shardId}:`, {}, error as Error);
        }
      }

      metrics.averageRecordsPerShard = metrics.totalRecords / metrics.totalShards;
      
      return metrics;
    });

    const createShard = (shardId: string): Effect.Effect<ShardInfo, Error, never> =>
      Effect.gen(function* (_) {
        if (shards.has(shardId)) {
          return yield* _(Effect.fail(new Error(`Shard ${shardId} already exists`)));
        }

        const shard = yield* _(createShardInternal(shardId));
        shards.set(shardId, shard);
        
        // Update hash ring
        hashRing.updateShards(Array.from(shards.values()));
        
        loggers.database.info(`Created new shard ${shardId}`);
        return shard;
      });

    const removeShard = (shardId: string): Effect.Effect<void, Error, never> =>
      Effect.gen(function* (_) {
        const shard = shards.get(shardId);
        if (!shard) {
          return yield* _(Effect.fail(new Error(`Shard ${shardId} not found`)));
        }

        // Check if shard is empty before removing
        const metrics = yield* _(getShardMetrics);
        const utilization = metrics.shardUtilization[shardId];
        
        if (utilization && utilization.recordCount > 0) {
          return yield* _(Effect.fail(new Error(`Cannot remove shard ${shardId}: contains ${utilization.recordCount} records`)));
        }

        // Close connection pool
        const pool = connectionPools.get(shardId);
        if (pool) {
          // yield* _(pool.shutdown);
          connectionPools.delete(shardId);
        }

        // Remove shard file
        const fs = require('fs-extra');
        yield* Effect.promise(() => fs.remove(shard.path));

        shards.delete(shardId);
        
        // Update hash ring
        hashRing.updateShards(Array.from(shards.values()));
        
        loggers.database.info(`Removed shard ${shardId}`);
      });

    const rebalanceShards = Effect.gen(function* (_) {
      loggers.database.info('Starting shard rebalancing');
      
      const metrics = yield* _(getShardMetrics);
      const threshold = metrics.averageRecordsPerShard * 1.5; // 50% above average

      // Find overloaded shards
      const overloadedShards = Object.entries(metrics.shardUtilization)
        .filter(([_, util]) => util.recordCount > threshold)
        .map(([shardId, _]) => shardId);

      // Find underloaded shards
      const underloadedShards = Object.entries(metrics.shardUtilization)
        .filter(([_, util]) => util.recordCount < metrics.averageRecordsPerShard * 0.5)
        .map(([shardId, _]) => shardId);

      if (overloadedShards.length > 0 && underloadedShards.length > 0) {
        // Create migration plans
        for (let i = 0; i < Math.min(overloadedShards.length, underloadedShards.length); i++) {
          const plan: ShardMigrationPlan = {
            sourceShardId: overloadedShards[i],
            targetShardId: underloadedShards[i],
            recordCount: Math.floor(metrics.shardUtilization[overloadedShards[i]].recordCount * 0.25), // Move 25%
            estimatedDuration: 60000, // 1 minute
            strategy: 'move',
            entityTypes: ['memory_entities'] // Move less critical memories first
          };
          
          yield* _(migrateData(plan));
        }
      }

      loggers.database.info('Shard rebalancing completed');
    });

    const migrateData = (plan: ShardMigrationPlan): Effect.Effect<void, Error, never> =>
      Effect.gen(function* (_) {
        loggers.database.info(`Starting data migration from ${plan.sourceShardId} to ${plan.targetShardId}`);
        
        const sourceShard = shards.get(plan.sourceShardId);
        const targetShard = shards.get(plan.targetShardId);
        
        if (!sourceShard || !targetShard) {
          return yield* _(Effect.fail(new Error('Source or target shard not found')));
        }

        // Create clients for both shards
        const sourceClient = SqliteClient.make({
          filename: sourceShard.path,
          transformResultNames: (str) => str,
          transformQueryNames: (str) => str
        });

        const targetClient = SqliteClient.make({
          filename: targetShard.path,
          transformResultNames: (str) => str,
          transformQueryNames: (str) => str
        });

        // Migrate data based on entity types
        for (const entityType of plan.entityTypes) {
          if (entityType === 'memory_entities') {
            // Move oldest memories first
            const memories = yield* _(sourceClient`
              SELECT * FROM memory_entities 
              WHERE deleted_at IS NULL 
              ORDER BY last_accessed ASC, created_at ASC 
              LIMIT ${plan.recordCount}
            `);

            for (const memory of memories) {
              // Insert into target shard
              yield* _(targetClient`
                INSERT INTO memory_entities (
                  id, persona_id, type, name, content, summary, tags, importance,
                  memory_tier, embedding, embedding_model, access_count, last_accessed,
                  created_at, updated_at, deleted_at
                ) VALUES (
                  ${(memory as any).id}, ${(memory as any).persona_id}, ${(memory as any).type}, 
                  ${(memory as any).name}, ${(memory as any).content}, ${(memory as any).summary}, 
                  ${(memory as any).tags}, ${(memory as any).importance}, ${(memory as any).memory_tier},
                  ${(memory as any).embedding}, ${(memory as any).embedding_model}, ${(memory as any).access_count},
                  ${(memory as any).last_accessed}, ${(memory as any).created_at}, ${(memory as any).updated_at},
                  ${(memory as any).deleted_at}
                )
              `);

              // Delete from source shard
              yield* _(sourceClient`DELETE FROM memory_entities WHERE id = ${(memory as any).id}`);
            }
          }
        }

        loggers.database.info(`Data migration completed: ${plan.recordCount} records moved`);
      });

    const healthCheck = Effect.gen(function* (_) {
      for (const [shardId, shard] of shards) {
        if (shard.status === 'active') {
          try {
            const client = SqliteClient.make({
              filename: shard.path,
              transformResultNames: (str) => str,
              transformQueryNames: (str) => str
            });
            
            // Simple health check query
            yield* _(client`SELECT 1 as health_check`);
          } catch (error) {
            loggers.database.error(`Health check failed for shard ${shardId}:`, {}, error as Error);
            shard.status = 'inactive';
          }
        }
      }
    });

    const getShardConnection = (shardId: string): Effect.Effect<SqliteClient.SqliteClient, Error, never> =>
      Effect.gen(function* (_) {
        const shard = shards.get(shardId);
        if (!shard) {
          return yield* _(Effect.fail(new Error(`Shard ${shardId} not found`)));
        }

        const client = SqliteClient.make({
          filename: shard.path,
          transformResultNames: (str) => str,
          transformQueryNames: (str) => str
        });

        return client;
      });

    const withShardConnection = <A, E>(
      shardId: string,
      operation: (client: SqliteClient.SqliteClient) => Effect.Effect<A, E, never>
    ): Effect.Effect<A, E | Error, never> =>
      Effect.gen(function* (_) {
        const client = yield* _(getShardConnection(shardId));
        return yield* _(operation(client));
      });

    return {
      initialize,
      shutdown,
      getShardForEntity,
      getAllShards,
      getShardMetrics,
      createShard,
      removeShard,
      rebalanceShards,
      migrateData,
      healthCheck,
      getShardConnection,
      withShardConnection
    };
  })
);

export const ShardManagerLayer = ShardManagerLive;

// Distribution helper
export const createShardDistribution = (shardManager: ShardManager): ShardDistribution => ({
  persona: (personaId: string) => {
    // Personas are distributed by their own ID
    return Effect.runSync(shardManager.getShardForEntity('persona', personaId)).id;
  },
  
  memory: (memoryId: string, personaId: string) => {
    // Memories are distributed by persona ID to keep related data together
    return Effect.runSync(shardManager.getShardForEntity('memory', memoryId, personaId)).id;
  },
  
  conversation: (conversationId: string, personaId: string) => {
    // Conversations are distributed by persona ID
    return Effect.runSync(shardManager.getShardForEntity('conversation', conversationId, personaId)).id;
  }
});