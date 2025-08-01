import { PerformanceMetrics, PerformanceThresholds, DEFAULT_THRESHOLDS } from './PerformanceMetricsCalculator';

export interface PerformanceAlert {
  id: string;
  type: 'latency' | 'throughput' | 'memory' | 'fragmentation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  recommendation: string;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'tier_rebalance' | 'cache_optimization' | 'index_rebuild' | 'cleanup';
  priority: 'low' | 'medium' | 'high';
  description: string;
  estimatedImpact: string;
  estimatedDuration: string;
  autoExecutable: boolean;
}

export class PerformanceAlertManager {
  private thresholds: PerformanceThresholds;

  constructor(thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  checkAlerts(metrics: PerformanceMetrics): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    
    // Access latency check
    this.checkAccessLatency(metrics, alerts);
    
    // Memory utilization check
    this.checkMemoryUtilization(metrics, alerts);
    
    // Cache hit ratio check
    this.checkCacheHitRatio(metrics, alerts);
    
    // Fragmentation check
    this.checkFragmentation(metrics, alerts);
    
    return alerts;
  }

  generateRecommendations(metrics: PerformanceMetrics): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    if (metrics.fragmentationRatio > 25) {
      recommendations.push({
        id: 'tier-rebalance',
        type: 'tier_rebalance',
        priority: metrics.fragmentationRatio > 40 ? 'high' : 'medium',
        description: 'Rebalance memory tiers to reduce fragmentation',
        estimatedImpact: `${Math.round(metrics.fragmentationRatio * 0.6)}% reduction in fragmentation`,
        estimatedDuration: '2-5 minutes',
        autoExecutable: true
      });
    }
    
    if (metrics.cacheHitRatio < 75) {
      recommendations.push({
        id: 'cache-optimization',
        type: 'cache_optimization',
        priority: metrics.cacheHitRatio < 60 ? 'high' : 'medium',
        description: 'Optimize memory caching strategies',
        estimatedImpact: `${Math.round((75 - metrics.cacheHitRatio) * 0.8)}% improvement in cache hits`,
        estimatedDuration: '1-3 minutes',
        autoExecutable: true
      });
    }
    
    if (metrics.indexEfficiency < 80) {
      recommendations.push({
        id: 'index-rebuild',
        type: 'index_rebuild',
        priority: 'medium',
        description: 'Rebuild memory indexes for better performance',
        estimatedImpact: `${Math.round((80 - metrics.indexEfficiency) * 0.7)}% improvement in query speed`,
        estimatedDuration: '5-10 minutes',
        autoExecutable: false
      });
    }
    
    if (metrics.memoryUtilization > 75) {
      recommendations.push({
        id: 'cleanup',
        type: 'cleanup',
        priority: metrics.memoryUtilization > 85 ? 'high' : 'medium',
        description: 'Clean up unused and low-importance memories',
        estimatedImpact: `${Math.round((metrics.memoryUtilization - 60) * 0.5)}% reduction in memory usage`,
        estimatedDuration: '3-7 minutes',
        autoExecutable: false
      });
    }
    
    return recommendations;
  }

  private checkAccessLatency(metrics: PerformanceMetrics, alerts: PerformanceAlert[]): void {
    if (metrics.accessLatency > this.thresholds.accessLatency.critical) {
      alerts.push({
        id: `latency-${Date.now()}`,
        type: 'latency',
        severity: 'critical',
        message: 'Critical access latency detected',
        value: metrics.accessLatency,
        threshold: this.thresholds.accessLatency.critical,
        timestamp: new Date(),
        recommendation: 'Immediate tier optimization required'
      });
    } else if (metrics.accessLatency > this.thresholds.accessLatency.warning) {
      alerts.push({
        id: `latency-${Date.now()}`,
        type: 'latency',
        severity: 'medium',
        message: 'High access latency detected',
        value: metrics.accessLatency,
        threshold: this.thresholds.accessLatency.warning,
        timestamp: new Date(),
        recommendation: 'Consider memory tier rebalancing'
      });
    }
  }

  private checkMemoryUtilization(metrics: PerformanceMetrics, alerts: PerformanceAlert[]): void {
    if (metrics.memoryUtilization > this.thresholds.memoryUtilization.critical) {
      alerts.push({
        id: `memory-${Date.now()}`,
        type: 'memory',
        severity: 'critical',
        message: 'Critical memory utilization',
        value: metrics.memoryUtilization,
        threshold: this.thresholds.memoryUtilization.critical,
        timestamp: new Date(),
        recommendation: 'Immediate cleanup required'
      });
    }
  }

  private checkCacheHitRatio(metrics: PerformanceMetrics, alerts: PerformanceAlert[]): void {
    if (metrics.cacheHitRatio < this.thresholds.cacheHitRatio.critical) {
      alerts.push({
        id: `cache-${Date.now()}`,
        type: 'throughput',
        severity: 'high',
        message: 'Poor cache performance',
        value: metrics.cacheHitRatio,
        threshold: this.thresholds.cacheHitRatio.critical,
        timestamp: new Date(),
        recommendation: 'Cache optimization needed'
      });
    }
  }

  private checkFragmentation(metrics: PerformanceMetrics, alerts: PerformanceAlert[]): void {
    if (metrics.fragmentationRatio > this.thresholds.fragmentationRatio.critical) {
      alerts.push({
        id: `frag-${Date.now()}`,
        type: 'fragmentation',
        severity: 'high',
        message: 'High memory fragmentation',
        value: metrics.fragmentationRatio,
        threshold: this.thresholds.fragmentationRatio.critical,
        timestamp: new Date(),
        recommendation: 'Memory defragmentation recommended'
      });
    }
  }
} 