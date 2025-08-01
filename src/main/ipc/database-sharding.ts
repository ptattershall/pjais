import { DatabaseShardingService } from '../services/database-sharding-service';
import { ShardInfo, ShardMetrics } from '../database/shard-manager';
import { Services } from '../services';

export const createDatabaseShardingHandlers = (databaseShardingService: DatabaseShardingService, services: Services) => {
  return {
    // Shard management
    createShard: async (event: any, shardId: string): Promise<ShardInfo> => {
      return databaseShardingService.createShard(shardId);
    },

    removeShard: async (event: any, shardId: string): Promise<void> => {
      return databaseShardingService.removeShard(shardId);
    },

    getAllShards: async (event: any): Promise<ShardInfo[]> => {
      return databaseShardingService.getAllShards();
    },

    getShardMetrics: async (event: any): Promise<ShardMetrics> => {
      return databaseShardingService.getShardMetrics();
    },

    getShardForEntity: async (event: any, entityType: string, entityId: string, parentId?: string): Promise<ShardInfo> => {
      return databaseShardingService.getShardForEntity(entityType, entityId, parentId);
    },

    // Rebalancing and migration
    performRebalance: async (event: any): Promise<void> => {
      return databaseShardingService.performRebalance();
    },

    performHealthCheck: async (event: any): Promise<void> => {
      return databaseShardingService.performHealthCheck();
    },

    migratePersonaToShard: async (event: any, personaId: string, targetShardId: string): Promise<void> => {
      return databaseShardingService.migratePersonaToShard(personaId, targetShardId);
    },

    migrateMemoryToShard: async (event: any, memoryId: string, targetShardId: string): Promise<void> => {
      return databaseShardingService.migrateMemoryToShard(memoryId, targetShardId);
    },

    // Statistics and monitoring
    getShardingStatistics: async (event: any) => {
      return databaseShardingService.getShardingStatistics();
    },

    // Configuration
    updateShardingConfig: async (event: any, config: any) => {
      return databaseShardingService.updateConfig(config);
    },

    getShardingConfig: async (event: any) => {
      return databaseShardingService.getConfig();
    },

    isShardingEnabled: async (event: any): Promise<boolean> => {
      return databaseShardingService.isShardingEnabled();
    },

    // Data queries across shards
    searchMemoriesAcrossShards: async (event: any, query: string, personaId?: string) => {
      return databaseShardingService.searchMemoriesAcrossShards(query, personaId);
    },

    getPersonasByShardId: async (event: any, shardId: string) => {
      return databaseShardingService.getPersonasByShardId(shardId);
    },

    getMemoriesByShardId: async (event: any, shardId: string) => {
      return databaseShardingService.getMemoriesByShardId(shardId);
    }
  };
};