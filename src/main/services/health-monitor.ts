import { EventEmitter } from 'events';
import { loggers } from '../utils/logger';
import { DatabaseManager } from './database-manager';
import { MemoryTierManager } from './memory-tier-manager';
import { PluginManager } from './plugin-manager';
import { SecurityManager } from './security-manager';

export interface HealthMetrics {
  timestamp: number;
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    arrayBuffers: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  eventLoop: {
    lag: number;
    utilization: number;
  };
  services: {
    database: ServiceHealthStatus;
    memory: ServiceHealthStatus;
    plugins: ServiceHealthStatus;
    security: ServiceHealthStatus;
  };
  performance: {
    responseTimes: Record<string, number>;
    errorRates: Record<string, number>;
    throughput: Record<string, number>;
  };
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: number;
  responseTime: number;
  errorCount: number;
  details?: Record<string, string | number | boolean | null>;
}

export interface ServiceInstance {
  getHealth?(): Promise<ServiceHealthStatus> | ServiceHealthStatus;
  name: string;
  isHealthy?(): boolean;
  getMetrics?(): Record<string, number>;
}

export interface HealthThresholds {
  memory: {
    heapUsagePercent: number;
    externalMemoryMB: number;
  };
  cpu: {
    usagePercent: number;
    loadAverage: number;
  };
  eventLoop: {
    lagMs: number;
    utilizationPercent: number;
  };
  services: {
    responseTimeMs: number;
    errorRatePercent: number;
  };
}

export class HealthMonitor extends EventEmitter {
  private metrics: HealthMetrics;
  private thresholds: HealthThresholds;
  private services: Map<string, ServiceInstance> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private performanceCounters: Map<string, { count: number; totalTime: number; errors: number }> = new Map();
  private lastCpuUsage = process.cpuUsage();
  private lastCpuTime = Date.now();
  private eventLoopLag = 0;
  private eventLoopUtilization = 0;

  constructor() {
    super();
    this.thresholds = this.getDefaultThresholds();
    this.metrics = this.initializeMetrics();
    this.startEventLoopMonitoring();
  }

  private getDefaultThresholds(): HealthThresholds {
    return {
      memory: {
        heapUsagePercent: 85,
        externalMemoryMB: 100,
      },
      cpu: {
        usagePercent: 80,
        loadAverage: 2.0,
      },
      eventLoop: {
        lagMs: 100,
        utilizationPercent: 90,
      },
      services: {
        responseTimeMs: 5000,
        errorRatePercent: 5,
      },
    };
  }

  private initializeMetrics(): HealthMetrics {
    return {
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0,
        arrayBuffers: 0,
      },
      cpu: {
        usage: 0,
        loadAverage: [],
      },
      eventLoop: {
        lag: 0,
        utilization: 0,
      },
      services: {
        database: { status: 'unknown', lastCheck: 0, responseTime: 0, errorCount: 0 },
        memory: { status: 'unknown', lastCheck: 0, responseTime: 0, errorCount: 0 },
        plugins: { status: 'unknown', lastCheck: 0, responseTime: 0, errorCount: 0 },
        security: { status: 'unknown', lastCheck: 0, responseTime: 0, errorCount: 0 },
      },
      performance: {
        responseTimes: {},
        errorRates: {},
        throughput: {},
      },
    };
  }

  private startEventLoopMonitoring(): void {
    // Monitor event loop lag
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delta = process.hrtime.bigint() - start;
      this.eventLoopLag = Number(delta) / 1000000; // Convert to milliseconds
    });

    // Monitor event loop utilization (Node.js 14+)
    if (process.versions.node >= '14.0.0') {
      try {
        const { performance } = require('perf_hooks');
        if (performance.eventLoopUtilization) {
          const elu = performance.eventLoopUtilization();
          this.eventLoopUtilization = elu.utilization * 100;
        }
      } catch (error) {
        loggers.service.warn('Event loop utilization monitoring not available', {}, error as Error);
      }
    }
  }

  public registerService(name: string, service: any): void {
    this.services.set(name, service);
    loggers.service.info('Service registered for health monitoring', { serviceName: name });
  }

  public start(intervalMs: number = 30000): void {
    if (this.intervalId) {
      this.stop();
    }

    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    loggers.service.info('Health monitoring started', { intervalMs });
    this.collectMetrics(); // Initial collection
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      loggers.service.info('Health monitoring stopped');
    }
  }

  private async collectMetrics(): Promise<void> {
    const startTime = Date.now();

    try {
      // System metrics
      this.collectSystemMetrics();

      // Service health checks
      await this.checkServicesHealth();

      // Performance metrics
      this.collectPerformanceMetrics();

      // Update timestamp
      this.metrics.timestamp = Date.now();

      // Emit health update event
      this.emit('health-update', this.metrics);

      // Check for threshold violations
      this.checkThresholds();

      loggers.service.debug('Health metrics collected', {
        duration: Date.now() - startTime,
        servicesChecked: this.services.size,
      });
    } catch (error) {
      loggers.service.error('Failed to collect health metrics', {}, error as Error);
    }
  }

  private collectSystemMetrics(): void {
    // Memory metrics
    const memoryUsage = process.memoryUsage();
    this.metrics.memory = {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      arrayBuffers: memoryUsage.arrayBuffers,
    };

    // CPU metrics
    const currentCpuUsage = process.cpuUsage();
    const currentTime = Date.now();
    const cpuDelta = process.cpuUsage(this.lastCpuUsage);
    const timeDelta = currentTime - this.lastCpuTime;
    
    const cpuPercent = (cpuDelta.user + cpuDelta.system) / (timeDelta * 1000);
    this.metrics.cpu = {
      usage: cpuPercent * 100,
      loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
    };

    this.lastCpuUsage = currentCpuUsage;
    this.lastCpuTime = currentTime;

    // Event loop metrics
    this.metrics.eventLoop = {
      lag: this.eventLoopLag,
      utilization: this.eventLoopUtilization,
    };

    // Uptime
    this.metrics.uptime = process.uptime();
  }

  private async checkServicesHealth(): Promise<void> {
    const serviceChecks = [
      { name: 'database', service: this.services.get('database') },
      { name: 'memory', service: this.services.get('memory') },
      { name: 'plugins', service: this.services.get('plugins') },
      { name: 'security', service: this.services.get('security') },
    ];

    for (const { name, service } of serviceChecks) {
      const status = await this.checkServiceHealth(name, service);
      this.metrics.services[name as keyof typeof this.metrics.services] = status;
    }
  }

  private async checkServiceHealth(serviceName: string, service: any): Promise<ServiceHealthStatus> {
    const startTime = Date.now();
    let status: ServiceHealthStatus = {
      status: 'unknown',
      lastCheck: Date.now(),
      responseTime: 0,
      errorCount: 0,
    };

    try {
      if (!service) {
        status.status = 'unhealthy';
        return status;
      }

      // Check if service has a health check method
      if (typeof service.getHealth === 'function') {
        const healthResult = await service.getHealth();
        status.status = healthResult.status === 'ok' ? 'healthy' : 'degraded';
        status.details = healthResult.details;
      } else if (typeof service.isInitialized === 'function') {
        const isInitialized = service.isInitialized();
        status.status = isInitialized ? 'healthy' : 'unhealthy';
      } else {
        status.status = 'healthy'; // Assume healthy if no health check method
      }

      status.responseTime = Date.now() - startTime;
    } catch (error) {
      status.status = 'unhealthy';
      status.errorCount++;
      status.responseTime = Date.now() - startTime;
      
      loggers.service.error(`Health check failed for ${serviceName}`, 
        { serviceName, responseTime: status.responseTime }, 
        error as Error
      );
    }

    return status;
  }

  private collectPerformanceMetrics(): void {
    // Update performance counters
    this.performanceCounters.forEach((counter, operation) => {
      const avgResponseTime = counter.count > 0 ? counter.totalTime / counter.count : 0;
      const errorRate = counter.count > 0 ? (counter.errors / counter.count) * 100 : 0;
      
      this.metrics.performance.responseTimes[operation] = avgResponseTime;
      this.metrics.performance.errorRates[operation] = errorRate;
      this.metrics.performance.throughput[operation] = counter.count;
    });
  }

  private checkThresholds(): void {
    const violations: string[] = [];

    // Memory threshold checks
    const heapUsagePercent = (this.metrics.memory.heapUsed / this.metrics.memory.heapTotal) * 100;
    if (heapUsagePercent > this.thresholds.memory.heapUsagePercent) {
      violations.push(`High heap usage: ${heapUsagePercent.toFixed(1)}%`);
    }

    const externalMemoryMB = this.metrics.memory.external / (1024 * 1024);
    if (externalMemoryMB > this.thresholds.memory.externalMemoryMB) {
      violations.push(`High external memory: ${externalMemoryMB.toFixed(1)}MB`);
    }

    // CPU threshold checks
    if (this.metrics.cpu.usage > this.thresholds.cpu.usagePercent) {
      violations.push(`High CPU usage: ${this.metrics.cpu.usage.toFixed(1)}%`);
    }

    // Event loop threshold checks
    if (this.metrics.eventLoop.lag > this.thresholds.eventLoop.lagMs) {
      violations.push(`High event loop lag: ${this.metrics.eventLoop.lag.toFixed(1)}ms`);
    }

    // Service threshold checks
    Object.entries(this.metrics.services).forEach(([serviceName, serviceHealth]) => {
      if (serviceHealth.status === 'unhealthy') {
        violations.push(`Service ${serviceName} is unhealthy`);
      }
      if (serviceHealth.responseTime > this.thresholds.services.responseTimeMs) {
        violations.push(`Service ${serviceName} slow response: ${serviceHealth.responseTime}ms`);
      }
    });

    if (violations.length > 0) {
      loggers.service.warn('Health threshold violations detected', { violations });
      this.emit('health-violation', { violations, metrics: this.metrics });
    }
  }

  public recordOperation(operationName: string, duration: number, success: boolean = true): void {
    const counter = this.performanceCounters.get(operationName) || { count: 0, totalTime: 0, errors: 0 };
    
    counter.count++;
    counter.totalTime += duration;
    if (!success) {
      counter.errors++;
    }

    this.performanceCounters.set(operationName, counter);
  }

  public getMetrics(): HealthMetrics {
    return { ...this.metrics };
  }

  public getServiceHealth(serviceName: string): ServiceHealthStatus | null {
    return this.metrics.services[serviceName as keyof typeof this.metrics.services] || null;
  }

  public updateThresholds(newThresholds: Partial<HealthThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    loggers.service.info('Health thresholds updated', { thresholds: this.thresholds });
  }

  public getOverallHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    const serviceStatuses = Object.values(this.metrics.services).map(s => s.status);
    
    if (serviceStatuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    if (serviceStatuses.includes('degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitor();