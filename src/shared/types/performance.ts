// Performance monitoring type definitions
export interface SystemMetrics {
  memoryUsage: {
    heapUsed: number;    // MB
    heapTotal: number;   // MB
    external: number;    // MB
    rss: number;         // MB
  };
  uptime: number;        // seconds
  activeTiming: number;  // active timing operations
  cpuUsage?: {
    user: number;
    system: number;
  };
}

export interface MemorySystemMetrics {
  accessLatency: number;      // ms
  queryThroughput: number;    // queries/second
  memoryUtilization: number;  // percentage
  cacheHitRatio: number;      // percentage
  indexEfficiency: number;    // percentage
  fragmentationRatio: number; // percentage
  tierDistribution: {
    hot: number;
    warm: number;
    cold: number;
  };
}

export interface DatabaseMetrics {
  connectionCount: number;
  averageQueryTime: number;   // ms
  storageUsage: number;       // MB
  indexUsage: number;         // percentage
  errorRate: number;          // percentage
}

export interface PerformanceMetrics {
  system: SystemMetrics;
  memory?: MemorySystemMetrics;
  database?: DatabaseMetrics;
  timestamp: string;
  overall: {
    healthScore: number;      // 0-100
    status: 'excellent' | 'good' | 'warning' | 'critical';
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'memory' | 'performance' | 'database';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  metric: string;
  value: number;
  threshold: number;
}

export interface PerformanceThresholds {
  memory: {
    heapUsage: { warning: number; critical: number };
    accessLatency: { warning: number; critical: number };
    fragmentationRatio: { warning: number; critical: number };
  };
  database: {
    queryTime: { warning: number; critical: number };
    errorRate: { warning: number; critical: number };
  };
  system: {
    cpuUsage: { warning: number; critical: number };
  };
}

export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  memory: {
    heapUsage: { warning: 200, critical: 500 },        // MB
    accessLatency: { warning: 100, critical: 500 },    // ms  
    fragmentationRatio: { warning: 30, critical: 50 }  // percentage
  },
  database: {
    queryTime: { warning: 100, critical: 1000 },       // ms
    errorRate: { warning: 5, critical: 15 }            // percentage
  },
  system: {
    cpuUsage: { warning: 70, critical: 90 }            // percentage
  }
}; 