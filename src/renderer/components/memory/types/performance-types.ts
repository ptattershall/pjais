import { MemoryEntity } from '@shared/types/memory';

// Performance metrics
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

// Performance alerts
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

// System health
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

// Component props
export interface MemoryPerformanceMonitorProps {
  memories: MemoryEntity[];
  refreshInterval?: number;
  onPerformanceAlert?: (alert: PerformanceAlert) => void;
  onOptimizationRecommended?: (recommendation: OptimizationRecommendation) => void;
}

export interface PerformanceMetricsCalculatorProps {
  memories: MemoryEntity[];
  onMetricsCalculated?: (metrics: PerformanceMetrics) => void;
}

export interface SystemHealthCalculatorProps {
  metrics: PerformanceMetrics;
  history: PerformanceMetrics[];
  onHealthCalculated?: (health: SystemHealth) => void;
} 