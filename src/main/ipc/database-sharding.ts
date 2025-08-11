import { DatabaseShardingService } from '../services/database-sharding-service';
import { ShardInfo, ShardMetrics } from '../database/shard-manager';
import { Services } from '../services';
import { IpcMainEvent } from 'electron';

export const createDatabaseShardingHandlers = (databaseShardingService: DatabaseShardingService, _services: Services) => {
  return {
    // Shard management
    createShard: async (_event: IpcMainEvent, shardId: string): Promise<ShardInfo> => {
      return databaseShardingService.createShard(shardId);
    },

    removeShard: async (_event: IpcMainEvent, shardId: string): Promise<void> => {
      return databaseShardingService.removeShard(shardId);
    },

    getAllShards: async (_event: IpcMainEvent): Promise<ShardInfo[]> => {
      return databaseShardingService.getAllShards();
    },

    getShardMetrics: async (_event: IpcMainEvent): Promise<ShardMetrics> => {
      return databaseShardingService.getShardMetrics();
    },

    getShardForEntity: async (_event: IpcMainEvent, entityType: string, entityId: string, parentId?: string): Promise<ShardInfo> => {
      return databaseShardingService.getShardForEntity(entityType, entityId, parentId);
    },

    // Rebalancing and migration
    performRebalance: async (_event: IpcMainEvent): Promise<void> => {
      return databaseShardingService.performRebalance();
    },

    performHealthCheck: async (_event: IpcMainEvent): Promise<void> => {
      return databaseShardingService.performHealthCheck();
    },

    migratePersonaToShard: async (_event: IpcMainEvent, personaId: string, targetShardId: string): Promise<void> => {
      return databaseShardingService.migratePersonaToShard(personaId, targetShardId);
    },

    migrateMemoryToShard: async (_event: IpcMainEvent, memoryId: string, targetShardId: string): Promise<void> => {
      return databaseShardingService.migrateMemoryToShard(memoryId, targetShardId);
    },

    // Statistics and monitoring
    getShardingStatistics: async (_event: IpcMainEvent) => {
      return databaseShardingService.getShardingStatistics();
    },

    // Configuration
    updateShardingConfig: async (_event: IpcMainEvent, config: Partial<DatabaseShardingService['config']>) => {
      return databaseShardingService.updateConfig(config);
    },

    getShardingConfig: async (_event: IpcMainEvent) => {
      return databaseShardingService.getConfig();
    },

    isShardingEnabled: async (_event: IpcMainEvent): Promise<boolean> => {
      return databaseShardingService.isShardingEnabled();
    },

    // Data queries across shards
    searchMemoriesAcrossShards: async (_event: IpcMainEvent, query: string, personaId?: string) => {
      return databaseShardingService.searchMemoriesAcrossShards(query, personaId);
    },

    getPersonasByShardId: async (_event: IpcMainEvent, shardId: string) => {
      return databaseShardingService.getPersonasByShardId(shardId);
    },

    getMemoriesByShardId: async (_event: IpcMainEvent, shardId: string) => {
      return databaseShardingService.getMemoriesByShardId(shardId);
    }
  };
};