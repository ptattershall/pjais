import { DatabaseManager } from './database-manager';
import { SecurityManager } from './security-manager';
import { 
  MemoryTier, 
  MemoryTierConfig, 
  MemoryTierMetrics, 
  TierTransition, 
  MemoryScore,
  TierOptimizationResult 
} from '../../shared/types/memory';
import { events, tables } from '../../livestore/schema';
import { ServiceHealth } from '../../shared/types/system';
import { WorkerPool, createMemoryOptimizationWorkerPool, WorkerTask, WorkerResult } from '../utils/worker-pool';
import { v4 as uuidv4 } from 'uuid';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { loggers } from '../utils/logger';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class MemoryTierManager {
  private databaseManager: DatabaseManager;
  private securityManager: SecurityManager;
  private config: MemoryTierConfig;
  private workerPool: WorkerPool;
  private isInitialized = false;
  private optimizationRunning = false;
  private lastOptimization: Date | null = null;

  constructor(databaseManager: DatabaseManager, securityManager: SecurityManager) {
    this.databaseManager = databaseManager;
    this.securityManager = securityManager;
    this.config = this.getDefaultConfig();
    
    // Initialize worker pool for memory optimization
    this.workerPool = createMemoryOptimizationWorkerPool({
      workerData: { config: this.config }
    });
  }

  async initialize(): Promise<void> {
    loggers.memory.serviceLifecycle('MemoryTierManager', 'initializing');
    
    try {
      // Ensure database is initialized
      if (!this.databaseManager.isInitialized()) {
        throw new Error('DatabaseManager must be initialized first');
      }

      // Run initial optimization to organize existing memories
      await this.optimizeMemoryTiers();
      
      this.isInitialized = true;
      loggers.memory.serviceLifecycle('MemoryTierManager', 'initialized');
    } catch (error) {
      loggers.memory.serviceLifecycle('MemoryTierManager', 'error', { error: error.message });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    loggers.memory.serviceLifecycle('MemoryTierManager', 'stopping');
    
    // Shutdown worker pool
    await this.workerPool.shutdown();
    
    this.isInitialized = false;
    loggers.memory.serviceLifecycle('MemoryTierManager', 'stopped');
  }

  // =============================================================================
  // TIER MANAGEMENT OPERATIONS
  // =============================================================================

  async promoteMemory(memoryId: string, targetTier: MemoryTier, reason: string = 'manual'): Promise<TierTransition> {
    this.ensureInitialized();
    
    const currentMemory = await this.databaseManager.getMemoryEntity(memoryId);

    if (!currentMemory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    const currentTier = currentMemory.memoryTier as MemoryTier;
    if (currentTier === targetTier) {
      throw new Error(`Memory is already in ${targetTier} tier`);
    }

    // Calculate memory score to validate promotion
    const score = await this.calculateMemoryScore(memoryId);
    
    const transition: TierTransition = {
      memoryId,
      fromTier: currentTier,
      toTier: targetTier,
      reason: reason as any,
      score: score.totalScore,
      timestamp: new Date()
    };

    // Apply tier change
    await this.applyTierTransition(transition);
    
    loggers.memory.info('Memory promoted', { memoryId, fromTier: currentTier, toTier: targetTier, score: score.totalScore });
    return transition;
  }

  async demoteMemory(memoryId: string, targetTier: MemoryTier, reason: string = 'manual'): Promise<TierTransition> {
    this.ensureInitialized();
    
    const currentMemory = await this.databaseManager.getMemoryEntity(memoryId);

    if (!currentMemory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    const currentTier = currentMemory.memoryTier as MemoryTier;
    if (currentTier === targetTier) {
      throw new Error(`Memory is already in ${targetTier} tier`);
    }

    const score = await this.calculateMemoryScore(memoryId);
    
    const transition: TierTransition = {
      memoryId,
      fromTier: currentTier,
      toTier: targetTier,
      reason: reason as any,
      score: score.totalScore,
      timestamp: new Date()
    };

    // Apply tier change with compression if moving to cold
    await this.applyTierTransition(transition);
    
    loggers.memory.info('Memory demoted', { memoryId, fromTier: currentTier, toTier: targetTier, score: score.totalScore });
    return transition;
  }

  async optimizeMemoryTiers(): Promise<TierOptimizationResult> {
    this.ensureInitialized();
    
    if (this.optimizationRunning) {
      throw new Error('Memory tier optimization is already running');
    }

    this.optimizationRunning = true;
    const startTime = Date.now();
    const transitions: TierTransition[] = [];

    try {
      loggers.memory.info('Starting memory tier optimization using worker threads');
      
      const allMemories = await this.databaseManager.getAllActiveMemories();

      // Prepare memory data for worker thread processing
      const memoryData = allMemories.map((memory: any) => ({
        memoryId: memory.id,
        createdAt: memory.createdAt,
        lastAccessed: memory.lastAccessed || memory.createdAt,
        importance: memory.importance || 50,
        accessCount: memory.accessCount || 0,
        connectionCount: memory.connectionCount || 0
      }));

      // Calculate scores using worker thread
      const scoreTask: WorkerTask = {
        id: uuidv4(),
        type: 'batchCalculateScores',
        payload: memoryData
      };

      loggers.memory.info('Calculating scores in worker thread', { memoryCount: memoryData.length });
      const scoreResult = await this.workerPool.executeTask(scoreTask);
      
      if (!scoreResult.success) {
        throw new Error(`Score calculation failed: ${scoreResult.error}`);
      }

      const memoryScores = scoreResult.result as MemoryScore[];
      loggers.memory.info('Score calculation completed', { processingTime: scoreResult.metrics?.processingTime });

      // Run optimization using worker thread
      const optimizationTask: WorkerTask = {
        id: uuidv4(),
        type: 'optimize',
        payload: {
          memories: allMemories,
          scores: memoryScores
        }
      };

      loggers.memory.info('Running tier optimization in worker thread');
      const optimizationResult = await this.workerPool.executeTask(optimizationTask);
      
      if (!optimizationResult.success) {
        throw new Error(`Optimization failed: ${optimizationResult.error}`);
      }

      const workerTransitions = optimizationResult.result as TierTransition[];
      transitions.push(...workerTransitions);
      
      loggers.memory.info('Optimization completed', { processingTime: optimizationResult.metrics?.processingTime, transitionCount: transitions.length });

      // Apply all transitions (this must be done in main thread to access database)
      for (const transition of transitions) {
        await this.applyTierTransition(transition);
      }

      // Collect post-optimization metrics
      const metrics = await this.collectTierMetrics();
      
      const endTime = Date.now();
      this.lastOptimization = new Date();

      const result: TierOptimizationResult = {
        processed: allMemories.length,
        transitions,
        hotTier: metrics.hot,
        warmTier: metrics.warm,
        coldTier: metrics.cold,
        performance: {
          durationMs: endTime - startTime,
          memoryFreed: 0, // Calculate based on compression
          compressionRatio: 0, // Calculate based on cold tier compression
          workerStats: this.workerPool.getStats()
        }
      };

      loggers.memory.info('Memory tier optimization completed', { transitionCount: transitions.length, durationMs: result.performance.durationMs });
      return result;

    } finally {
      this.optimizationRunning = false;
    }
  }

  // =============================================================================
  // SCORING AND ANALYSIS
  // =============================================================================

  async calculateMemoryScore(memoryId: string): Promise<MemoryScore> {
    // Get memory from database directly since we need tier-specific fields
    const store = this.databaseManager.getStore();
    const memory = await store.query(
      tables.memoryEntities.select().where({ id: memoryId }).first()
    );

    if (!memory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    // Use worker thread for score calculation
    const scoreTask: WorkerTask = {
      id: uuidv4(),
      type: 'calculateScore',
      payload: {
        memoryId: memory.id,
        createdAt: memory.createdAt,
        lastAccessed: memory.lastAccessed || memory.createdAt,
        importance: memory.importance || 50,
        accessCount: memory.accessCount || 0,
        connectionCount: memory.connectionCount || 0
      }
    };

    const result = await this.workerPool.executeTask(scoreTask);
    
    if (!result.success) {
      throw new Error(`Score calculation failed: ${result.error}`);
    }

    return result.result as MemoryScore;
  }

  // =============================================================================
  // TIER-SPECIFIC OPTIMIZATION
  // =============================================================================

  private async optimizeHotTier(hotMemories: any[], allScores: MemoryScore[]): Promise<TierTransition[]> {
    const transitions: TierTransition[] = [];
    const hotScores = allScores.filter(score => 
      hotMemories.some(memory => memory.id === score.memoryId)
    );

    // Sort by score descending
    hotScores.sort((a, b) => b.totalScore - a.totalScore);

    const maxHotSize = this.config.hot.maxSize;
    
    // Keep top scoring memories in hot tier
    const toKeepInHot = hotScores.slice(0, maxHotSize);
    const toDemoteFromHot = hotScores.slice(maxHotSize);

    // Demote excess memories from hot tier
    for (const score of toDemoteFromHot) {
      if (score.totalScore >= 40) {
        // Move to warm if still valuable
        transitions.push({
          memoryId: score.memoryId,
          fromTier: 'hot',
          toTier: 'warm',
          reason: 'optimization',
          score: score.totalScore,
          timestamp: new Date()
        });
      } else {
        // Move to cold if low value
        transitions.push({
          memoryId: score.memoryId,
          fromTier: 'hot',
          toTier: 'cold',
          reason: 'age_decay',
          score: score.totalScore,
          timestamp: new Date()
        });
      }
    }

    // Check if any warm/cold memories should be promoted to hot
    const promotionCandidates = allScores.filter(score => 
      score.recommendedTier === 'hot' && 
      !toKeepInHot.some(kept => kept.memoryId === score.memoryId)
    );

    const availableHotSlots = maxHotSize - toKeepInHot.length;
    const toPromoteToHot = promotionCandidates
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, availableHotSlots);

    for (const score of toPromoteToHot) {
      const store = this.databaseManager.getStore();
      const currentMemory = await store.query(
        tables.memoryEntities.select('memoryTier').where({ id: score.memoryId }).first()
      );
      
      if (currentMemory && currentMemory.memoryTier !== 'hot') {
        transitions.push({
          memoryId: score.memoryId,
          fromTier: currentMemory.memoryTier as MemoryTier,
          toTier: 'hot',
          reason: 'access_pattern',
          score: score.totalScore,
          timestamp: new Date()
        });
      }
    }

    return transitions;
  }

  private async optimizeWarmTier(warmMemories: any[], allScores: MemoryScore[]): Promise<TierTransition[]> {
    const transitions: TierTransition[] = [];
    const warmScores = allScores.filter(score => 
      warmMemories.some(memory => memory.id === score.memoryId)
    );

    const maxWarmSize = this.config.warm.maxSize;

    // Sort by score descending
    warmScores.sort((a, b) => b.totalScore - a.totalScore);

    // Demote excess or low-scoring memories from warm tier
    const toDemoteFromWarm = warmScores.filter((score, index) => 
      index >= maxWarmSize || score.totalScore < 25
    );

    for (const score of toDemoteFromWarm) {
      transitions.push({
        memoryId: score.memoryId,
        fromTier: 'warm',
        toTier: 'cold',
        reason: score.totalScore < 25 ? 'age_decay' : 'optimization',
        score: score.totalScore,
        timestamp: new Date()
      });
    }

    return transitions;
  }

  private async optimizeColdTier(coldMemories: any[], allScores: MemoryScore[]): Promise<TierTransition[]> {
    const transitions: TierTransition[] = [];
    
    // Check if any cold memories should be promoted
    const coldScores = allScores.filter(score => 
      coldMemories.some(memory => memory.id === score.memoryId)
    );

    const toPromoteFromCold = coldScores.filter(score => 
      score.recommendedTier !== 'cold' && score.totalScore > 40
    );

    for (const score of toPromoteFromCold) {
      transitions.push({
        memoryId: score.memoryId,
        fromTier: 'cold',
        toTier: score.recommendedTier,
        reason: 'access_pattern',
        score: score.totalScore,
        timestamp: new Date()
      });
    }

    return transitions;
  }

  // =============================================================================
  // COMPRESSION AND ENCRYPTION
  // =============================================================================

  private async compressMemoryContent(content: any): Promise<string> {
    if (!this.config.cold.compressionEnabled) {
      return JSON.stringify(content);
    }

    try {
      const compressTask: WorkerTask = {
        id: uuidv4(),
        type: 'compress',
        payload: content
      };

      const result = await this.workerPool.executeTask(compressTask);
      
      if (!result.success) {
        loggers.memory.warn('Failed to compress memory content using worker, storing uncompressed', { error: result.error });
        return JSON.stringify(content);
      }

      return result.result as string;
    } catch (error) {
      loggers.memory.warn('Failed to compress memory content, storing uncompressed', {}, error as Error);
      return JSON.stringify(content);
    }
  }

  private async decompressMemoryContent(compressedContent: string): Promise<any> {
    try {
      const decompressTask: WorkerTask = {
        id: uuidv4(),
        type: 'decompress',
        payload: compressedContent
      };

      const result = await this.workerPool.executeTask(decompressTask);
      
      if (!result.success) {
        throw new Error(`Failed to decompress memory content: ${result.error}`);
      }

      return result.result;
    } catch (error) {
      loggers.memory.error('Failed to decompress memory content', {}, error as Error);
      throw new Error('Unable to decompress memory content');
    }
  }

  // =============================================================================
  // TIER TRANSITION OPERATIONS
  // =============================================================================

  private async applyTierTransition(transition: TierTransition): Promise<void> {
    const store = this.databaseManager.getStore();
    const memory = await store.query(
      tables.memoryEntities.select().where({ id: transition.memoryId }).first()
    );

    if (!memory) {
      throw new Error(`Memory not found: ${transition.memoryId}`);
    }

    let updatedContent = memory.content;

    // Handle compression for cold tier
    if (transition.toTier === 'cold') {
      updatedContent = await this.compressMemoryContent(memory.content);
    } else if (transition.fromTier === 'cold') {
      // Decompress when moving out of cold tier
      updatedContent = await this.decompressMemoryContent(memory.content as string);
    }

    // Handle encryption for cold tier
    if (transition.toTier === 'cold' && this.config.cold.encryptionEnabled) {
      updatedContent = await this.securityManager.encryptData(updatedContent, 'internal');
    } else if (transition.fromTier === 'cold' && this.config.cold.encryptionEnabled) {
      // Decrypt when moving out of cold tier
      updatedContent = await this.securityManager.decryptData(updatedContent);
    }

    // Update memory tier in database using DatabaseManager method
    await this.databaseManager.updateMemoryTier(transition.memoryId, transition.toTier, updatedContent);
  }

  // =============================================================================
  // METRICS AND HEALTH
  // =============================================================================

  async collectTierMetrics(): Promise<{ hot: MemoryTierMetrics; warm: MemoryTierMetrics; cold: MemoryTierMetrics }> {
    const metrics = {
      hot: await this.calculateTierMetrics('hot'),
      warm: await this.calculateTierMetrics('warm'),
      cold: await this.calculateTierMetrics('cold')
    };

    return metrics;
  }

  private async calculateTierMetrics(tier: MemoryTier): Promise<MemoryTierMetrics> {
    const memories = await this.databaseManager.getMemoriesByTier(tier);

    const count = memories.length;
    const averageImportance = count > 0 
      ? memories.reduce((sum: number, m: { importance: number; }) => sum + (m.importance || 50), 0) / count 
      : 0;
    const averageAccessCount = count > 0 
      ? memories.reduce((sum: number, m: { connectionCount: number; }) => sum + (m.connectionCount || 0), 0) / count 
      : 0;
    
    const now = Date.now();
    const averageAge = count > 0 
      ? memories.reduce((sum: number, m: { createdAt: number; }) => sum + ((now - m.createdAt) / (1000 * 60 * 60 * 24)), 0) / count 
      : 0;

    // Estimate storage size (simplified)
    const storageSize = memories.reduce((sum: number, m: { content: any; }) => {
      const contentSize = JSON.stringify(m.content).length;
      return sum + contentSize;
    }, 0);

    return {
      tier,
      count,
      averageImportance,
      averageAccessCount,
      averageAge,
      storageSize,
      lastOptimized: this.lastOptimization || new Date()
    };
  }

  async getHealth(): Promise<ServiceHealth> {
    this.ensureInitialized();
    
    const metrics = await this.collectTierMetrics();
    const totalMemories = metrics.hot.count + metrics.warm.count + metrics.cold.count;

    return {
      service: 'MemoryTierManager',
      status: this.isInitialized ? 'ok' : 'initializing',
      details: {
        totalMemories,
        tierDistribution: {
          hot: metrics.hot.count,
          warm: metrics.warm.count,
          cold: metrics.cold.count
        },
        lastOptimization: this.lastOptimization,
        optimizationRunning: this.optimizationRunning,
        configuration: this.config
      }
    };
  }

  // =============================================================================
  // CONFIGURATION
  // =============================================================================

  updateConfig(config: Partial<MemoryTierConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MemoryTierConfig {
    return { ...this.config };
  }

  private getDefaultConfig(): MemoryTierConfig {
    return {
      hot: {
        maxSize: 100,           // 100 hot memories max
        accessThreshold: 5,     // 5+ accesses to stay hot
        ageThreshold: 7,        // 7 days max age for hot
        importanceWeight: 0.3   // 30% weight for importance
      },
      warm: {
        maxSize: 500,           // 500 warm memories max
        accessThreshold: 2,     // 2+ accesses to stay warm
        ageThreshold: 30,       // 30 days max age for warm
        importanceWeight: 0.4   // 40% weight for importance
      },
      cold: {
        compressionEnabled: true,  // Enable compression
        compressionLevel: 6,       // Medium compression
        encryptionEnabled: true    // Enable encryption
      }
    };
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('MemoryTierManager not initialized');
    }
  }
} 