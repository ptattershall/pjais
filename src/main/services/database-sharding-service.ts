import { ShardedDatabaseManager, ShardedDatabaseManagerConfig } from '../database/sharded-database-manager';
import { ShardInfo, ShardMetrics } from '../database/shard-manager';
import { PersonaData } from '../../shared/types/persona';
import { MemoryEntity } from '../../shared/types/memory';
import { EncryptionService } from './encryption-service';
import { SecurityEventLogger } from './security-event-logger';
import { HealthMonitor } from './health-monitor';

import { EventEmitter } from 'events';
import { loggers } from '../utils/logger';

export interface DatabaseShardingConfig {
  enabled: boolean;
  shardCount: number;
  strategy: 'hash' | 'range' | 'directory';
  autoRebalance: boolean;
  rebalanceInterval: number;
  migrationBatchSize: number;
  healthCheckInterval: number;
  metrics: {
    enabled: boolean;
    reportInterval: number;
    thresholds: {
      maxRecordsPerShard: number;
      maxDiskUsagePerShard: number;
      maxConnectionsPerShard: number;
    };
  };
}

export interface ShardingStatistics {
  totalShards: number;
  activeShards: number;
  totalRecords: number;
  distribution: {
    personas: Record<string, number>;
    memories: Record<string, number>;
    conversations: Record<string, number>;
  };
  performance: {
    avgQueryTime: number;
    avgMigrationTime: number;
    rebalanceFrequency: number;
  };
  health: {
    healthyShards: number;
    errorShards: number;
    lastHealthCheck: Date;
  };
}

export interface ShardingEvents {
  'shard-created': (shardInfo: ShardInfo) => void;
  'shard-removed': (shardId: string) => void;
  'rebalance-started': (shardCount: number) => void;
  'rebalance-completed': (migratedRecords: number) => void;
  'shard-health-changed': (shardId: string, healthy: boolean) => void;
  'migration-started': (sourceShardId: string, targetShardId: string) => void;
  'migration-completed': (sourceShardId: string, targetShardId: string, recordCount: number) => void;
  'metrics-updated': (statistics: ShardingStatistics) => void;
  'error': (error: Error) => void;
}

export class DatabaseShardingService extends EventEmitter {
  private shardedDatabaseManager: ShardedDatabaseManager;
  private config: DatabaseShardingConfig;
  private rebalanceInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  private readonly defaultConfig: DatabaseShardingConfig = {
    enabled: true,
    shardCount: 4,
    strategy: 'hash',
    autoRebalance: true,
    rebalanceInterval: 3600000, // 1 hour
    migrationBatchSize: 1000,
    healthCheckInterval: 300000, // 5 minutes
    metrics: {
      enabled: true,
      reportInterval: 60000, // 1 minute
      thresholds: {
        maxRecordsPerShard: 100000,
        maxDiskUsagePerShard: 1073741824, // 1GB
        maxConnectionsPerShard: 100
      }
    }
  };

  constructor(
    config: Partial<DatabaseShardingConfig> = {},
    private encryptionService?: EncryptionService,
    private securityEventLogger?: SecurityEventLogger,
    private healthMonitor?: HealthMonitor
  ) {
    super();
    
    this.config = { ...this.defaultConfig, ...config };
    
    // Initialize sharded database manager
    const shardedConfig: ShardedDatabaseManagerConfig = {
      shardCount: this.config.shardCount,
      autoRebalance: this.config.autoRebalance,
      shardStrategy: this.config.strategy,
      enableEncryption: this.encryptionService !== undefined
    };
    
    this.shardedDatabaseManager = new ShardedDatabaseManager(shardedConfig);
    
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      loggers.database.info('Database Sharding Service already initialized');
      return;
    }

    try {
      loggers.database.info('Initializing Database Sharding Service');

      // Initialize sharded database manager
      await this.shardedDatabaseManager.initialize(
        this.securityEventLogger,
        this.encryptionService
      );

      // Start monitoring intervals
      this.startRebalanceInterval();
      this.startHealthCheckInterval();
      this.startMetricsInterval();

      // Service factory registration removed - not available

      // Update health monitor with sharding metrics
      if (this.healthMonitor) {
        this.updateHealthMonitorMetrics();
      }

      this.initialized = true;
      
      loggers.database.info('Database Sharding Service initialized successfully');

    } catch (error) {
      loggers.database.error('Failed to initialize Database Sharding Service', {}, error as Error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    this.on('shard-created', (shardInfo) => {
      loggers.database.info(`Shard created: ${shardInfo.id}`);
      
      if (this.securityEventLogger) {
        this.securityEventLogger.log({
          type: 'security',
          severity: 'low',
          description: `Database shard created: ${shardInfo.id}`,
          timestamp: new Date(),
          details: { shardId: shardInfo.id, shardPath: shardInfo.path }
        });
      }
    });

    this.on('shard-removed', (shardId) => {
      loggers.database.info(`Shard removed: ${shardId}`);
      
      if (this.securityEventLogger) {
        this.securityEventLogger.log({
          type: 'security',
          severity: 'medium',
          description: `Database shard removed: ${shardId}`,
          timestamp: new Date(),
          details: { shardId }
        });
      }
    });

    this.on('rebalance-started', (shardCount) => {
      loggers.database.info(`Shard rebalancing started for ${shardCount} shards`);
    });

    this.on('rebalance-completed', (migratedRecords) => {
      loggers.database.info(`Shard rebalancing completed: ${migratedRecords} records migrated`);
    });

    this.on('error', (error) => {
      loggers.database.error('Database Sharding Service error', {}, error);
      
      if (this.securityEventLogger) {
        this.securityEventLogger.log({
          type: 'data_access',
          severity: 'high',
          description: `Database sharding error: ${error.message}`,
          timestamp: new Date(),
          details: { error: error.message, stack: error.stack }
        });
      }
    });
  }

  private startRebalanceInterval(): void {
    if (!this.config.autoRebalance) return;

    this.rebalanceInterval = setInterval(async () => {
      try {
        await this.performRebalance();
      } catch (error) {
        this.emit('error', error as Error);
      }
    }, this.config.rebalanceInterval);
  }

  private startHealthCheckInterval(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.emit('error', error as Error);
      }
    }, this.config.healthCheckInterval);
  }

  private startMetricsInterval(): void {
    if (!this.config.metrics.enabled) return;

    this.metricsInterval = setInterval(async () => {
      try {
        const statistics = await this.getShardingStatistics();
        this.emit('metrics-updated', statistics);
        
        if (this.healthMonitor) {
          this.updateHealthMonitorMetrics();
        }
      } catch (error) {
        this.emit('error', error as Error);
      }
    }, this.config.metrics.reportInterval);
  }

  private async updateHealthMonitorMetrics(): Promise<void> {
    if (!this.healthMonitor) return;

    try {
      const metrics = await this.shardedDatabaseManager.getShardMetrics();
      const shards = await this.shardedDatabaseManager.getAllShards();
      
      this.healthMonitor.updateMetric('database_shards_total', metrics.totalShards);
      this.healthMonitor.updateMetric('database_shards_active', metrics.activeShards);
      this.healthMonitor.updateMetric('database_total_records', metrics.totalRecords);
      this.healthMonitor.updateMetric('database_avg_records_per_shard', metrics.averageRecordsPerShard);
      
      // Update per-shard metrics
      for (const shard of shards) {
        const utilization = metrics.shardUtilization[shard.id];
        if (utilization) {
          this.healthMonitor.updateMetric(`database_shard_${shard.id}_records`, utilization.recordCount);
          this.healthMonitor.updateMetric(`database_shard_${shard.id}_disk_usage`, utilization.diskUsage);
          this.healthMonitor.updateMetric(`database_shard_${shard.id}_connections`, utilization.connectionCount);
        }
      }
    } catch (error) {
      loggers.database.error('Failed to update health monitor metrics', {}, error as Error);
    }
  }

  // Public API methods

  async createShard(shardId: string): Promise<ShardInfo> {
    this.ensureInitialized();
    
    try {
      const shardInfo = await this.shardedDatabaseManager.createShard(shardId);
      this.emit('shard-created', shardInfo);
      return shardInfo;
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async removeShard(shardId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.shardedDatabaseManager.removeShard(shardId);
      this.emit('shard-removed', shardId);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async getAllShards(): Promise<ShardInfo[]> {
    this.ensureInitialized();
    return await this.shardedDatabaseManager.getAllShards();
  }

  async getShardMetrics(): Promise<ShardMetrics> {
    this.ensureInitialized();
    return await this.shardedDatabaseManager.getShardMetrics();
  }

  async getShardForEntity(entityType: string, entityId: string, parentId?: string): Promise<ShardInfo> {
    this.ensureInitialized();
    return await this.shardedDatabaseManager.getShardForEntity(entityType, entityId, parentId);
  }

  async performRebalance(): Promise<void> {
    this.ensureInitialized();
    
    try {
      const metrics = await this.shardedDatabaseManager.getShardMetrics();
      this.emit('rebalance-started', metrics.totalShards);
      
      await this.shardedDatabaseManager.rebalanceShards();
      
      // Calculate migrated records (simplified)
      const migratedRecords = Math.floor(metrics.totalRecords * 0.1); // Estimate
      this.emit('rebalance-completed', migratedRecords);
      
      loggers.database.info('Shard rebalancing completed successfully');
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async performHealthCheck(): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.shardedDatabaseManager.performShardHealthCheck();
      
      // Check shard health and emit events
      const shards = await this.shardedDatabaseManager.getAllShards();
      for (const shard of shards) {
        const healthy = shard.status === 'active';
        this.emit('shard-health-changed', shard.id, healthy);
      }
      
      loggers.database.info('Database shard health check completed');
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async getShardingStatistics(): Promise<ShardingStatistics> {
    this.ensureInitialized();
    
    try {
      const metrics = await this.shardedDatabaseManager.getShardMetrics();
      const shards = await this.shardedDatabaseManager.getAllShards();
      const stats = await this.shardedDatabaseManager.getStats();
      
      const statistics: ShardingStatistics = {
        totalShards: metrics.totalShards,
        activeShards: metrics.activeShards,
        totalRecords: metrics.totalRecords,
        distribution: {
          personas: {},
          memories: {},
          conversations: {}
        },
        performance: {
          avgQueryTime: 0, // Would be calculated from performance metrics
          avgMigrationTime: 0, // Would be calculated from migration history
          rebalanceFrequency: this.config.rebalanceInterval
        },
        health: {
          healthyShards: shards.filter(s => s.status === 'active').length,
          errorShards: shards.filter(s => s.status === 'inactive').length,
          lastHealthCheck: new Date()
        }
      };

      // Calculate distribution
      for (const [shardId, distribution] of Object.entries(stats.shardDistribution)) {
        statistics.distribution.personas[shardId] = distribution.personas;
        statistics.distribution.memories[shardId] = distribution.memories;
        statistics.distribution.conversations[shardId] = distribution.conversations;
      }

      return statistics;
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async migratePersonaToShard(personaId: string, targetShardId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      const sourceShardInfo = await this.shardedDatabaseManager.getShardForEntity('persona', personaId);
      this.emit('migration-started', sourceShardInfo.id, targetShardId);
      
      await this.shardedDatabaseManager.migratePersonaToShard(personaId, targetShardId);
      
      this.emit('migration-completed', sourceShardInfo.id, targetShardId, 1);
      
      loggers.database.info(`Persona ${personaId} migrated from ${sourceShardInfo.id} to ${targetShardId}`);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async migrateMemoryToShard(memoryId: string, targetShardId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      const memory = await this.shardedDatabaseManager.getMemoryEntity(memoryId);
      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`);
      }
      
      const sourceShardInfo = await this.shardedDatabaseManager.getShardForEntity('memory', memoryId, memory.personaId);
      this.emit('migration-started', sourceShardInfo.id, targetShardId);
      
      await this.shardedDatabaseManager.migrateMemoryToShard(memoryId, targetShardId);
      
      this.emit('migration-completed', sourceShardInfo.id, targetShardId, 1);
      
      loggers.database.info(`Memory ${memoryId} migrated from ${sourceShardInfo.id} to ${targetShardId}`);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async searchMemoriesAcrossShards(query: string, personaId?: string): Promise<MemoryEntity[]> {
    this.ensureInitialized();
    return await this.shardedDatabaseManager.searchMemoriesAcrossShards(query, personaId);
  }

  async getPersonasByShardId(shardId: string): Promise<PersonaData[]> {
    this.ensureInitialized();
    return await this.shardedDatabaseManager.getPersonasByShardId(shardId);
  }

  async getMemoriesByShardId(shardId: string): Promise<MemoryEntity[]> {
    this.ensureInitialized();
    return await this.shardedDatabaseManager.getMemoriesByShardId(shardId);
  }

  // Configuration management

  updateConfig(newConfig: Partial<DatabaseShardingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update sharded database manager config
    this.shardedDatabaseManager.updateShardingConfig({
      shardCount: this.config.shardCount,
      autoRebalance: this.config.autoRebalance,
      shardStrategy: this.config.strategy
    });
    
    // Restart intervals if needed
    if (this.rebalanceInterval) {
      clearInterval(this.rebalanceInterval);
      this.startRebalanceInterval();
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.startHealthCheckInterval();
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.startMetricsInterval();
    }
    
    loggers.database.info('Database sharding configuration updated');
  }

  getConfig(): DatabaseShardingConfig {
    return { ...this.config };
  }

  isShardingEnabled(): boolean {
    return this.config.enabled;
  }

  // Utility methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Database Sharding Service not initialized. Call initialize() first.');
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async shutdown(): Promise<void> {
    if (this.rebalanceInterval) {
      clearInterval(this.rebalanceInterval);
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    if (this.initialized) {
      await this.shardedDatabaseManager.shutdown();
      this.initialized = false;
    }
    
    loggers.database.info('Database Sharding Service shutdown completed');
  }

  // Direct database manager access for advanced operations
  getDatabaseManager(): ShardedDatabaseManager {
    this.ensureInitialized();
    return this.shardedDatabaseManager;
  }
}