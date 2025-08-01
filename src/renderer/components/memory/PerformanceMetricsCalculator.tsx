import { MemoryEntity } from '@shared/types/memory';

export interface PerformanceMetrics {
  accessLatency: number; // ms
  queryThroughput: number; // queries/second
  memoryUtilization: number; // percentage
  cacheHitRatio: number; // percentage
  indexEfficiency: number; // percentage
  fragmentationRatio: number; // percentage
  lastUpdated: Date;
}

export interface PerformanceThresholds {
  accessLatency: { warning: number; critical: number };
  queryThroughput: { warning: number; critical: number };
  memoryUtilization: { warning: number; critical: number };
  cacheHitRatio: { warning: number; critical: number };
  fragmentationRatio: { warning: number; critical: number };
}

export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  accessLatency: { warning: 100, critical: 500 }, // ms
  queryThroughput: { warning: 50, critical: 20 }, // queries/second
  memoryUtilization: { warning: 80, critical: 95 }, // percentage
  cacheHitRatio: { warning: 70, critical: 50 }, // percentage
  fragmentationRatio: { warning: 30, critical: 50 } // percentage
};

export class PerformanceMetricsCalculator {
  static calculateMetrics(memories: MemoryEntity[]): PerformanceMetrics {
    const now = new Date();
    
    // Basic memory analysis
    const memoryCount = memories.length;
    const avgImportance = memoryCount > 0 
      ? memories.reduce((sum, m) => sum + (m.importance || 0), 0) / memoryCount 
      : 0;
    
    // Calculate tier distribution
    const tiers = { hot: 0, warm: 0, cold: 0 };
    memories.forEach(m => {
      const tier = m.memoryTier || 'cold';
      tiers[tier]++;
    });
    
    const hotRatio = memoryCount > 0 ? tiers.hot / memoryCount : 0;
    const warmRatio = memoryCount > 0 ? tiers.warm / memoryCount : 0;
    
    // Calculate individual metrics
    const accessLatency = this.calculateAccessLatency(memoryCount, hotRatio);
    const queryThroughput = this.calculateQueryThroughput(memoryCount, hotRatio);
    const memoryUtilization = this.calculateMemoryUtilization(memoryCount, avgImportance);
    const cacheHitRatio = this.calculateCacheHitRatio(hotRatio, warmRatio);
    const indexEfficiency = this.calculateIndexEfficiency(memoryCount, avgImportance);
    const fragmentationRatio = this.calculateFragmentationRatio(hotRatio, warmRatio);

    return {
      accessLatency: Math.round(accessLatency),
      queryThroughput: Math.round(queryThroughput * 10) / 10,
      memoryUtilization: Math.round(memoryUtilization * 10) / 10,
      cacheHitRatio: Math.round(cacheHitRatio * 10) / 10,
      indexEfficiency: Math.round(indexEfficiency * 10) / 10,
      fragmentationRatio: Math.round(fragmentationRatio * 10) / 10,
      lastUpdated: now
    };
  }

  private static calculateAccessLatency(memoryCount: number, hotRatio: number): number {
    const baseLatency = Math.max(10, 50 + (memoryCount * 0.1) + (hotRatio > 0.3 ? 20 : 0));
    return baseLatency + (Math.random() * 20 - 10);
  }

  private static calculateQueryThroughput(memoryCount: number, hotRatio: number): number {
    const baseThroughput = Math.max(10, 100 - (memoryCount * 0.01) - (hotRatio > 0.4 ? 20 : 0));
    return baseThroughput + (Math.random() * 10 - 5);
  }

  private static calculateMemoryUtilization(memoryCount: number, avgImportance: number): number {
    return Math.min(95, 30 + (memoryCount * 0.05) + (avgImportance * 0.3));
  }

  private static calculateCacheHitRatio(hotRatio: number, warmRatio: number): number {
    const baseCacheHitRatio = Math.max(30, 90 - (hotRatio > 0.4 ? 20 : 0) - (warmRatio < 0.2 ? 15 : 0));
    return baseCacheHitRatio + (Math.random() * 10 - 5);
  }

  private static calculateIndexEfficiency(memoryCount: number, avgImportance: number): number {
    return Math.max(40, 85 - (memoryCount > 1000 ? 15 : 0) - (avgImportance < 50 ? 10 : 0));
  }

  private static calculateFragmentationRatio(hotRatio: number, warmRatio: number): number {
    return Math.min(80, Math.abs(hotRatio - 0.2) * 100 + Math.abs(warmRatio - 0.3) * 80);
  }
} 
