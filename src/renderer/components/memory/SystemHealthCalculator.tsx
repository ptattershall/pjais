import { PerformanceMetrics } from './PerformanceMetricsCalculator';

export interface SystemHealth {
  overall: number; // 0-100
  components: {
    database: number;
    memory: number;
    indexing: number;
    caching: number;
  };
  trends: {
    improving: boolean;
    stable: boolean;
    degrading: boolean;
  };
}

export class SystemHealthCalculator {
  static calculateSystemHealth(
    metrics: PerformanceMetrics, 
    history: PerformanceMetrics[]
  ): SystemHealth {
    // Component health scores
    const database = Math.max(0, 100 - (metrics.accessLatency - 50) / 5);
    const memory = Math.max(0, 100 - metrics.memoryUtilization);
    const indexing = metrics.indexEfficiency;
    const caching = metrics.cacheHitRatio;
    
    const overall = (database + memory + indexing + caching) / 4;
    
    // Trend analysis
    const trends = this.calculateTrends(metrics, history);
    
    return {
      overall: Math.round(overall),
      components: {
        database: Math.round(database),
        memory: Math.round(memory),
        indexing: Math.round(indexing),
        caching: Math.round(caching)
      },
      trends
    };
  }

  private static calculateTrends(
    metrics: PerformanceMetrics, 
    history: PerformanceMetrics[]
  ) {
    let improving = false;
    let stable = true;
    let degrading = false;
    
    if (history.length >= 3) {
      const recent = history.slice(-3);
      const oldOverall = (recent[0].queryThroughput + recent[0].cacheHitRatio) / 2;
      const currentOverall = (metrics.queryThroughput + metrics.cacheHitRatio) / 2;
      
      const trend = currentOverall - oldOverall;
      if (trend > 2) improving = true;
      else if (trend < -2) degrading = true;
      
      stable = Math.abs(trend) < 2;
    }
    
    return { improving, stable, degrading };
  }
} 