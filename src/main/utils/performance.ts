// Type definitions for our custom performance tracking
interface CustomPerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

interface PerformanceSummary {
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  uptime: number;
  performanceEntries: CustomPerformanceEntry[];
  activeTiming: number;
}

// Import enhanced types
import { 
  PerformanceMetrics, 
  SystemMetrics, 
  MemorySystemMetrics, 
  DatabaseMetrics,
  PerformanceAlert,
  PerformanceThresholds,
  DEFAULT_THRESHOLDS 
} from '../../shared/types/performance';

export class PerformanceMonitor {
  private static metrics: Map<string, number> = new Map();
  private static performanceEntries: CustomPerformanceEntry[] = [];
  private static memoryProvider?: () => Promise<MemorySystemMetrics>;
  private static databaseProvider?: () => Promise<DatabaseMetrics>;
  private static alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];

  /**
   * Enhanced getMetrics method - this fixes the original error
   */
  static async getMetrics(): Promise<PerformanceMetrics> {
    const systemMetrics = this.getSystemMetrics();
    const memoryMetrics = this.memoryProvider ? await this.memoryProvider() : undefined;
    const databaseMetrics = this.databaseProvider ? await this.databaseProvider() : undefined;
    
    const healthScore = this.calculateHealthScore(systemMetrics, memoryMetrics, databaseMetrics);
    
    return {
      system: systemMetrics,
      memory: memoryMetrics,
      database: databaseMetrics,
      timestamp: new Date().toISOString(),
      overall: {
        healthScore,
        status: this.getHealthStatus(healthScore)
      }
    };
  }

  /**
   * Register providers for advanced metrics
   */
  static registerMemoryProvider(provider: () => Promise<MemorySystemMetrics>): void {
    this.memoryProvider = provider;
  }

  static registerDatabaseProvider(provider: () => Promise<DatabaseMetrics>): void {
    this.databaseProvider = provider;
  }

  static onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Get system-level metrics
   */
  private static getSystemMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();
    
    return {
      memoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      uptime: Math.round(process.uptime()),
      activeTiming: this.metrics.size,
      cpuUsage: process.cpuUsage ? {
        user: process.cpuUsage().user / 1000000, // Convert to ms
        system: process.cpuUsage().system / 1000000
      } : undefined
    };
  }

  /**
   * Calculate overall health score
   */
  private static calculateHealthScore(
    system: SystemMetrics, 
    memory?: MemorySystemMetrics, 
    database?: DatabaseMetrics
  ): number {
    let score = 100;

    // System health
    const heapUsageRatio = system.memoryUsage.heapUsed / system.memoryUsage.heapTotal;
    score -= Math.max(0, (heapUsageRatio - 0.7) * 100); // Penalize >70% heap usage

    // Memory system health
    if (memory) {
      if (memory.accessLatency > DEFAULT_THRESHOLDS.memory.accessLatency.warning) {
        score -= 20;
      }
      if (memory.fragmentationRatio > DEFAULT_THRESHOLDS.memory.fragmentationRatio.warning) {
        score -= 15;
      }
      if (memory.cacheHitRatio < 70) {
        score -= 10;
      }
    }

    // Database health
    if (database) {
      if (database.averageQueryTime > DEFAULT_THRESHOLDS.database.queryTime.warning) {
        score -= 15;
      }
      if (database.errorRate > DEFAULT_THRESHOLDS.database.errorRate.warning) {
        score -= 20;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private static getHealthStatus(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  /**
   * Check for performance alerts
   */
  static async checkAlerts(thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS): Promise<PerformanceAlert[]> {
    const metrics = await this.getMetrics();
    const alerts: PerformanceAlert[] = [];

    // Check system alerts
    const heapUsageMB = metrics.system.memoryUsage.heapUsed;
    if (heapUsageMB > thresholds.memory.heapUsage.critical) {
      alerts.push(this.createAlert('memory', 'critical', 'Critical heap memory usage', 
        'heapUsage', heapUsageMB, thresholds.memory.heapUsage.critical));
    } else if (heapUsageMB > thresholds.memory.heapUsage.warning) {
      alerts.push(this.createAlert('memory', 'high', 'High heap memory usage', 
        'heapUsage', heapUsageMB, thresholds.memory.heapUsage.warning));
    }

    // Check memory system alerts
    if (metrics.memory) {
      if (metrics.memory.accessLatency > thresholds.memory.accessLatency.critical) {
        alerts.push(this.createAlert('performance', 'critical', 'Critical memory access latency', 
          'accessLatency', metrics.memory.accessLatency, thresholds.memory.accessLatency.critical));
      }
    }

    // Trigger alert callbacks
    alerts.forEach(alert => {
      this.alertCallbacks.forEach(callback => callback(alert));
    });

    return alerts;
  }

  private static createAlert(
    type: PerformanceAlert['type'], 
    severity: PerformanceAlert['severity'], 
    message: string,
    metric: string, 
    value: number, 
    threshold: number
  ): PerformanceAlert {
    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      timestamp: new Date().toISOString(),
      metric,
      value,
      threshold
    };
  }

  /**
   * Start timing a specific operation
   */
  static startTiming(label: string): void {
    this.metrics.set(label, Date.now());
  }

  /**
   * End timing and return duration in milliseconds
   */
  static endTiming(label: string): number {
    const start = this.metrics.get(label);
    if (!start) {
      console.warn(`No timing started for label: ${label}`);
      return 0;
    }
    
    const duration = Date.now() - start;
    this.metrics.delete(label);
    
    // Store performance entry
    this.performanceEntries.push({
      name: label,
      entryType: 'measure',
      startTime: start,
      duration: duration
    });
    
    console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * Measure an async operation
   */
  static async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.startTiming(label);
    try {
      const result = await fn();
      this.endTiming(label);
      return result;
    } catch (error) {
      this.endTiming(label);
      throw error;
    }
  }

  /**
   * Measure a synchronous operation
   */
  static measureSync<T>(label: string, fn: () => T): T {
    this.startTiming(label);
    try {
      const result = fn();
      this.endTiming(label);
      return result;
    } catch (error) {
      this.endTiming(label);
      throw error;
    }
  }

  /**
   * Get memory usage information
   */
  static getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Get performance summary (legacy method - keeping for compatibility)
   */
  static getPerformanceSummary(): PerformanceSummary {
    const memoryUsage = this.getMemoryUsage();
    
    return {
      memoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
      },
      uptime: Math.round(process.uptime()),
      performanceEntries: [...this.performanceEntries],
      activeTiming: this.metrics.size
    };
  }

  /**
   * Clear all performance data
   */
  static clear(): void {
    this.metrics.clear();
    this.performanceEntries = [];
  }

  /**
   * Start continuous monitoring
   */
  static startContinuousMonitoring(intervalMs: number = 30000): NodeJS.Timeout {
    return setInterval(async () => {
      const metrics = await this.getMetrics();
      
      // Log warnings for high memory usage
      if (metrics.system.memoryUsage.heapUsed > 200) { // 200MB
        console.warn(`High memory usage detected: ${metrics.system.memoryUsage.heapUsed}MB`);
      }
      
      // Check for alerts
      await this.checkAlerts();
      
      // Log performance metrics
      console.log(`[PERF MONITOR] Memory: ${metrics.system.memoryUsage.heapUsed}MB, Health: ${metrics.overall.healthScore}%, Status: ${metrics.overall.status}`);
    }, intervalMs);
  }
}

// Performance monitoring instance for main process
export class MainProcessPerformanceMonitor extends PerformanceMonitor {
  private monitoringInterval?: NodeJS.Timeout;

  start(): void {
    console.log('Starting main process performance monitoring...');
    
    // Start continuous monitoring
    this.monitoringInterval = PerformanceMonitor.startContinuousMonitoring(30000);
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    console.log('Main process performance monitoring stopped');
  }
} 