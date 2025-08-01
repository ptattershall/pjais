import { parentPort, workerData } from 'worker_threads';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface MemoryOptimizationTask {
  type: 'optimize' | 'compress' | 'decompress' | 'calculateScore' | 'batchCalculateScores';
  payload: any;
}

export interface MemoryOptimizationResult {
  success: boolean;
  result?: any;
  error?: string;
  metrics?: {
    processingTime: number;
    memoryUsage: number;
    itemsProcessed: number;
  };
}

export interface MemoryScoreCalculation {
  memoryId: string;
  createdAt: number;
  lastAccessed: number;
  importance: number;
  accessCount: number;
  connectionCount: number;
}

export interface MemoryScore {
  memoryId: string;
  accessScore: number;
  importanceScore: number;
  ageScore: number;
  connectionScore: number;
  totalScore: number;
  recommendedTier: 'hot' | 'warm' | 'cold';
}

export interface TierTransition {
  memoryId: string;
  fromTier: 'hot' | 'warm' | 'cold';
  toTier: 'hot' | 'warm' | 'cold';
  reason: string;
  score: number;
  timestamp: Date;
}

export interface MemoryTierConfig {
  hot: {
    maxSize: number;
    accessThreshold: number;
    ageThreshold: number;
    importanceWeight: number;
  };
  warm: {
    maxSize: number;
    accessThreshold: number;
    ageThreshold: number;
    importanceWeight: number;
  };
  cold: {
    compressionEnabled: boolean;
    compressionLevel: number;
    encryptionEnabled: boolean;
  };
}

// Worker thread implementation
class MemoryOptimizationWorker {
  private startTime: number = 0;
  private config: MemoryTierConfig;

  constructor(config: MemoryTierConfig) {
    this.config = config;
  }

  async processTask(task: MemoryOptimizationTask): Promise<MemoryOptimizationResult> {
    this.startTime = Date.now();
    const initialMemory = process.memoryUsage();

    try {
      switch (task.type) {
        case 'calculateScore':
          return await this.calculateMemoryScore(task.payload);
        case 'batchCalculateScores':
          return await this.batchCalculateScores(task.payload);
        case 'optimize':
          return await this.optimizeMemoryTiers(task.payload);
        case 'compress':
          return await this.compressContent(task.payload);
        case 'decompress':
          return await this.decompressContent(task.payload);
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metrics: this.getMetrics(initialMemory, 0)
      };
    }
  }

  private async calculateMemoryScore(memory: MemoryScoreCalculation): Promise<MemoryOptimizationResult> {
    const score = this.calculateScore(memory);
    return {
      success: true,
      result: score,
      metrics: this.getMetrics(process.memoryUsage(), 1)
    };
  }

  private async batchCalculateScores(memories: MemoryScoreCalculation[]): Promise<MemoryOptimizationResult> {
    const scores = memories.map(memory => this.calculateScore(memory));
    
    return {
      success: true,
      result: scores,
      metrics: this.getMetrics(process.memoryUsage(), memories.length)
    };
  }

  private calculateScore(memory: MemoryScoreCalculation): MemoryScore {
    const now = Date.now();
    const ageInDays = (now - memory.createdAt) / (1000 * 60 * 60 * 24);
    const timeSinceAccess = (now - memory.lastAccessed) / (1000 * 60 * 60 * 24);

    // Access Score (0-100): Recent and frequent access = higher score
    const accessFrequency = memory.accessCount || 0;
    const recencyScore = Math.max(0, 100 - (timeSinceAccess * 2)); // Decay 2 points per day
    const frequencyScore = Math.min(100, accessFrequency * 5); // 5 points per access, capped at 100
    const accessScore = (recencyScore * 0.6) + (frequencyScore * 0.4);

    // Importance Score (0-100): Direct from user rating
    const importanceScore = memory.importance || 50;

    // Age Score (0-100): Newer memories score higher, with decay
    const ageScore = Math.max(0, 100 - (ageInDays * 1)); // Lose 1 point per day

    // Connection Score (0-100): Memories with more connections score higher
    const connectionScore = Math.min(100, (memory.connectionCount || 0) * 10);

    // Calculate weighted total score
    const weights = {
      access: 0.35,
      importance: 0.30,
      age: 0.20,
      connection: 0.15
    };

    const totalScore = 
      (accessScore * weights.access) +
      (importanceScore * weights.importance) +
      (ageScore * weights.age) +
      (connectionScore * weights.connection);

    // Determine recommended tier based on score
    let recommendedTier: 'hot' | 'warm' | 'cold';
    if (totalScore >= 75) {
      recommendedTier = 'hot';
    } else if (totalScore >= 40) {
      recommendedTier = 'warm';
    } else {
      recommendedTier = 'cold';
    }

    return {
      memoryId: memory.memoryId,
      accessScore,
      importanceScore,
      ageScore,
      connectionScore,
      totalScore,
      recommendedTier
    };
  }

  private async optimizeMemoryTiers(payload: {
    memories: any[];
    scores: MemoryScore[];
  }): Promise<MemoryOptimizationResult> {
    const { memories, scores } = payload;
    const transitions: TierTransition[] = [];

    // Group memories by current tier
    const memoriesByTier = new Map<string, any[]>();
    memories.forEach(memory => {
      const tier = memory.memoryTier || 'cold';
      if (!memoriesByTier.has(tier)) {
        memoriesByTier.set(tier, []);
      }
      memoriesByTier.get(tier)!.push(memory);
    });

    // Optimize each tier
    const hotTransitions = this.optimizeHotTier(memoriesByTier.get('hot') || [], scores);
    const warmTransitions = this.optimizeWarmTier(memoriesByTier.get('warm') || [], scores);
    const coldTransitions = this.optimizeColdTier(memoriesByTier.get('cold') || [], scores);

    transitions.push(...hotTransitions, ...warmTransitions, ...coldTransitions);

    return {
      success: true,
      result: transitions,
      metrics: this.getMetrics(process.memoryUsage(), memories.length)
    };
  }

  private optimizeHotTier(hotMemories: any[], allScores: MemoryScore[]): TierTransition[] {
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
      const currentMemory = hotMemories.find(m => m.id === score.memoryId);
      if (currentMemory && currentMemory.memoryTier !== 'hot') {
        transitions.push({
          memoryId: score.memoryId,
          fromTier: currentMemory.memoryTier,
          toTier: 'hot',
          reason: 'access_pattern',
          score: score.totalScore,
          timestamp: new Date()
        });
      }
    }

    return transitions;
  }

  private optimizeWarmTier(warmMemories: any[], allScores: MemoryScore[]): TierTransition[] {
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

  private optimizeColdTier(coldMemories: any[], allScores: MemoryScore[]): TierTransition[] {
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

  private async compressContent(content: any): Promise<MemoryOptimizationResult> {
    if (!this.config.cold.compressionEnabled) {
      return {
        success: true,
        result: JSON.stringify(content),
        metrics: this.getMetrics(process.memoryUsage(), 1)
      };
    }

    try {
      const jsonString = JSON.stringify(content);
      const compressed = await gzip(Buffer.from(jsonString, 'utf8'));
      const compressedString = compressed.toString('base64');
      
      return {
        success: true,
        result: compressedString,
        metrics: this.getMetrics(process.memoryUsage(), 1)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        result: JSON.stringify(content), // Fallback to uncompressed
        metrics: this.getMetrics(process.memoryUsage(), 1)
      };
    }
  }

  private async decompressContent(compressedContent: string): Promise<MemoryOptimizationResult> {
    try {
      // Try to parse as regular JSON first
      const result = JSON.parse(compressedContent);
      return {
        success: true,
        result,
        metrics: this.getMetrics(process.memoryUsage(), 1)
      };
    } catch {
      try {
        // Try to decompress if it's base64 compressed data
        const buffer = Buffer.from(compressedContent, 'base64');
        const decompressed = await gunzip(buffer);
        const result = JSON.parse(decompressed.toString('utf8'));
        
        return {
          success: true,
          result,
          metrics: this.getMetrics(process.memoryUsage(), 1)
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          metrics: this.getMetrics(process.memoryUsage(), 1)
        };
      }
    }
  }

  private getMetrics(initialMemory: NodeJS.MemoryUsage, itemsProcessed: number) {
    const currentMemory = process.memoryUsage();
    return {
      processingTime: Date.now() - this.startTime,
      memoryUsage: currentMemory.heapUsed - initialMemory.heapUsed,
      itemsProcessed
    };
  }
}

// Main worker thread execution
if (parentPort) {
  const worker = new MemoryOptimizationWorker(workerData.config);
  
  parentPort.on('message', async (task: MemoryOptimizationTask) => {
    try {
      const result = await worker.processTask(task);
      parentPort!.postMessage(result);
    } catch (error) {
      parentPort!.postMessage({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metrics: {
          processingTime: Date.now() - Date.now(),
          memoryUsage: 0,
          itemsProcessed: 0
        }
      });
    }
  });

  // Signal that worker is ready
  parentPort.postMessage({ type: 'ready' });
}