import { EventEmitter } from 'events';
import { loggers } from '../utils/logger';

export interface MemoryUsageSnapshot {
  timestamp: number;
  heap: {
    used: number;
    total: number;
    limit: number;
    usedPercent: number;
  };
  external: number;
  rss: number;
  arrayBuffers: number;
  process: {
    pid: number;
    ppid: number;
    platform: string;
    arch: string;
    uptime: number;
    cpuUsage: {
      user: number;
      system: number;
    };
  };
  gc?: {
    lastGCTime: number;
    gcCount: number;
    gcDuration: number;
  };
}

export interface MemoryLeak {
  id: string;
  detectedAt: number;
  type: 'heap-growth' | 'external-growth' | 'listener-leak' | 'timer-leak';
  description: string;
  growthRate: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  snapshots: MemoryUsageSnapshot[];
}

export interface MemoryThresholds {
  heapUsedMB: number;
  heapUsedPercent: number;
  externalMB: number;
  rssMB: number;
  arrayBuffersMB: number;
  heapGrowthRateMBPerMin: number;
  externalGrowthRateMBPerMin: number;
}

export interface MemoryAnalysis {
  currentUsage: MemoryUsageSnapshot;
  trends: {
    heapGrowth: number[];
    externalGrowth: number[];
    timeWindow: number;
  };
  leaks: MemoryLeak[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  efficiency: {
    heapEfficiency: number;
    externalEfficiency: number;
    overallScore: number;
  };
}

export class MemoryUsageMonitor extends EventEmitter {
  private snapshots: MemoryUsageSnapshot[] = [];
  private leaks: MemoryLeak[] = [];
  private thresholds: MemoryThresholds;
  private intervalId: NodeJS.Timeout | null = null;
  private maxSnapshots: number = 1000;
  private leakDetectionEnabled: boolean = true;
  private gcObserver: any = null;
  private lastGCTime: number = 0;
  private gcCount: number = 0;
  private gcDuration: number = 0;

  constructor(thresholds?: Partial<MemoryThresholds>) {
    super();
    this.thresholds = {
      heapUsedMB: 100,
      heapUsedPercent: 80,
      externalMB: 50,
      rssMB: 200,
      arrayBuffersMB: 20,
      heapGrowthRateMBPerMin: 5,
      externalGrowthRateMBPerMin: 2,
      ...thresholds,
    };
    
    this.setupGCMonitoring();
  }

  private setupGCMonitoring(): void {
    try {
      // Use performance hooks for GC monitoring if available
      const { performance, PerformanceObserver } = require('perf_hooks');
      
      if (PerformanceObserver) {
        this.gcObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.entryType === 'gc') {
              this.lastGCTime = entry.startTime;
              this.gcCount++;
              this.gcDuration = entry.duration;
            }
          }
        });
        
        this.gcObserver.observe({ entryTypes: ['gc'] });
        loggers.service.debug('GC monitoring enabled');
      }
    } catch (error) {
      loggers.service.warn('GC monitoring not available', {}, error as Error);
    }
  }

  public start(intervalMs: number = 60000): void {
    if (this.intervalId) {
      this.stop();
    }

    this.intervalId = setInterval(() => {
      this.captureSnapshot();
    }, intervalMs);

    // Take initial snapshot
    this.captureSnapshot();
    
    loggers.service.info('Memory usage monitoring started', { 
      intervalMs,
      thresholds: this.thresholds 
    });
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.gcObserver) {
      this.gcObserver.disconnect();
      this.gcObserver = null;
    }

    loggers.service.info('Memory usage monitoring stopped');
  }

  public captureSnapshot(): MemoryUsageSnapshot {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const snapshot: MemoryUsageSnapshot = {
      timestamp: Date.now(),
      heap: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        limit: this.getHeapLimit(),
        usedPercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      arrayBuffers: memoryUsage.arrayBuffers,
      process: {
        pid: process.pid,
        ppid: process.ppid,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        cpuUsage: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      },
      gc: {
        lastGCTime: this.lastGCTime,
        gcCount: this.gcCount,
        gcDuration: this.gcDuration,
      },
    };

    // Store snapshot
    this.snapshots.push(snapshot);
    
    // Limit stored snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    // Check thresholds
    this.checkThresholds(snapshot);

    // Detect leaks
    if (this.leakDetectionEnabled) {
      this.detectLeaks();
    }

    // Emit snapshot event
    this.emit('snapshot', snapshot);

    return snapshot;
  }

  private getHeapLimit(): number {
    try {
      const v8 = require('v8');
      const heapStats = v8.getHeapStatistics();
      return heapStats.heap_size_limit;
    } catch (error) {
      // Fallback to approximate limit
      return 1400 * 1024 * 1024; // ~1.4GB default on 64-bit
    }
  }

  private checkThresholds(snapshot: MemoryUsageSnapshot): void {
    const violations: string[] = [];

    // Check heap usage
    const heapUsedMB = snapshot.heap.used / (1024 * 1024);
    if (heapUsedMB > this.thresholds.heapUsedMB) {
      violations.push(`Heap usage exceeded: ${heapUsedMB.toFixed(1)}MB > ${this.thresholds.heapUsedMB}MB`);
    }

    if (snapshot.heap.usedPercent > this.thresholds.heapUsedPercent) {
      violations.push(`Heap usage percentage exceeded: ${snapshot.heap.usedPercent.toFixed(1)}% > ${this.thresholds.heapUsedPercent}%`);
    }

    // Check external memory
    const externalMB = snapshot.external / (1024 * 1024);
    if (externalMB > this.thresholds.externalMB) {
      violations.push(`External memory exceeded: ${externalMB.toFixed(1)}MB > ${this.thresholds.externalMB}MB`);
    }

    // Check RSS
    const rssMB = snapshot.rss / (1024 * 1024);
    if (rssMB > this.thresholds.rssMB) {
      violations.push(`RSS exceeded: ${rssMB.toFixed(1)}MB > ${this.thresholds.rssMB}MB`);
    }

    // Check array buffers
    const arrayBuffersMB = snapshot.arrayBuffers / (1024 * 1024);
    if (arrayBuffersMB > this.thresholds.arrayBuffersMB) {
      violations.push(`Array buffers exceeded: ${arrayBuffersMB.toFixed(1)}MB > ${this.thresholds.arrayBuffersMB}MB`);
    }

    if (violations.length > 0) {
      loggers.service.warn('Memory threshold violations detected', { violations });
      this.emit('threshold-violation', { snapshot, violations });
    }
  }

  private detectLeaks(): void {
    if (this.snapshots.length < 5) return; // Need at least 5 snapshots

    const recentSnapshots = this.snapshots.slice(-5);
    const timeWindow = recentSnapshots[recentSnapshots.length - 1].timestamp - recentSnapshots[0].timestamp;
    const timeWindowMinutes = timeWindow / (1000 * 60);

    // Detect heap growth leak
    const heapGrowth = this.calculateGrowthRate(recentSnapshots, 'heap');
    if (heapGrowth > this.thresholds.heapGrowthRateMBPerMin) {
      this.reportLeak({
        type: 'heap-growth',
        description: `Heap memory growing at ${heapGrowth.toFixed(2)}MB/min`,
        growthRate: heapGrowth,
        severity: heapGrowth > 10 ? 'critical' : heapGrowth > 5 ? 'high' : 'medium',
        recommendations: [
          'Check for objects not being garbage collected',
          'Review closure usage and variable scoping',
          'Monitor for circular references',
          'Consider using WeakMap/WeakSet for temporary references',
        ],
        snapshots: recentSnapshots,
      });
    }

    // Detect external memory leak
    const externalGrowth = this.calculateGrowthRate(recentSnapshots, 'external');
    if (externalGrowth > this.thresholds.externalGrowthRateMBPerMin) {
      this.reportLeak({
        type: 'external-growth',
        description: `External memory growing at ${externalGrowth.toFixed(2)}MB/min`,
        growthRate: externalGrowth,
        severity: externalGrowth > 5 ? 'critical' : externalGrowth > 2 ? 'high' : 'medium',
        recommendations: [
          'Check for Buffer objects not being released',
          'Review native module usage',
          'Monitor ArrayBuffer allocations',
          'Check for file handles not being closed',
        ],
        snapshots: recentSnapshots,
      });
    }

    // Detect potential listener leaks
    const listenerCount = process.listenerCount('uncaughtException') + 
                         process.listenerCount('unhandledRejection');
    if (listenerCount > 10) {
      this.reportLeak({
        type: 'listener-leak',
        description: `High number of event listeners: ${listenerCount}`,
        growthRate: 0,
        severity: 'medium',
        recommendations: [
          'Review event listener management',
          'Ensure listeners are properly removed',
          'Check for duplicate listener registrations',
        ],
        snapshots: recentSnapshots,
      });
    }
  }

  private calculateGrowthRate(snapshots: MemoryUsageSnapshot[], type: 'heap' | 'external'): number {
    if (snapshots.length < 2) return 0;

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const timeWindow = (last.timestamp - first.timestamp) / (1000 * 60); // minutes

    let firstValue: number;
    let lastValue: number;

    if (type === 'heap') {
      firstValue = first.heap.used;
      lastValue = last.heap.used;
    } else {
      firstValue = first.external;
      lastValue = last.external;
    }

    const growth = (lastValue - firstValue) / (1024 * 1024); // MB
    return growth / timeWindow; // MB per minute
  }

  private reportLeak(leak: Omit<MemoryLeak, 'id' | 'detectedAt'>): void {
    const fullLeak: MemoryLeak = {
      id: `leak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      detectedAt: Date.now(),
      ...leak,
    };

    this.leaks.push(fullLeak);
    
    // Limit stored leaks
    if (this.leaks.length > 100) {
      this.leaks = this.leaks.slice(-100);
    }

    loggers.service.warn('Memory leak detected', {
      type: fullLeak.type,
      severity: fullLeak.severity,
      description: fullLeak.description,
      growthRate: fullLeak.growthRate,
    });

    this.emit('leak-detected', fullLeak);
  }

  public getAnalysis(): MemoryAnalysis {
    const currentUsage = this.getCurrentUsage();
    const trends = this.getTrends();
    const recommendations = this.generateRecommendations();
    const riskLevel = this.calculateRiskLevel();
    const efficiency = this.calculateEfficiency();

    return {
      currentUsage,
      trends,
      leaks: this.leaks,
      recommendations,
      riskLevel,
      efficiency,
    };
  }

  private getCurrentUsage(): MemoryUsageSnapshot {
    return this.snapshots[this.snapshots.length - 1] || this.captureSnapshot();
  }

  private getTrends(): { heapGrowth: number[]; externalGrowth: number[]; timeWindow: number } {
    const windowSize = Math.min(20, this.snapshots.length);
    const recentSnapshots = this.snapshots.slice(-windowSize);
    
    const heapGrowth = recentSnapshots.map(s => s.heap.used / (1024 * 1024));
    const externalGrowth = recentSnapshots.map(s => s.external / (1024 * 1024));
    const timeWindow = recentSnapshots.length > 1 
      ? recentSnapshots[recentSnapshots.length - 1].timestamp - recentSnapshots[0].timestamp
      : 0;

    return { heapGrowth, externalGrowth, timeWindow };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const current = this.getCurrentUsage();

    if (current.heap.usedPercent > 70) {
      recommendations.push('Heap usage is high. Consider running garbage collection or reducing memory usage.');
    }

    if (current.external / (1024 * 1024) > 30) {
      recommendations.push('External memory usage is high. Review Buffer and ArrayBuffer usage.');
    }

    if (this.leaks.length > 0) {
      recommendations.push(`${this.leaks.length} memory leaks detected. Review and fix leak sources.`);
    }

    const recentLeaks = this.leaks.filter(l => Date.now() - l.detectedAt < 30 * 60 * 1000);
    if (recentLeaks.length > 0) {
      recommendations.push('Recent memory leaks detected. Immediate attention required.');
    }

    return recommendations;
  }

  private calculateRiskLevel(): 'low' | 'medium' | 'high' | 'critical' {
    const current = this.getCurrentUsage();
    const criticalLeaks = this.leaks.filter(l => l.severity === 'critical').length;
    const highLeaks = this.leaks.filter(l => l.severity === 'high').length;

    if (criticalLeaks > 0 || current.heap.usedPercent > 90) {
      return 'critical';
    }

    if (highLeaks > 0 || current.heap.usedPercent > 80) {
      return 'high';
    }

    if (this.leaks.length > 0 || current.heap.usedPercent > 60) {
      return 'medium';
    }

    return 'low';
  }

  private calculateEfficiency(): { heapEfficiency: number; externalEfficiency: number; overallScore: number } {
    const current = this.getCurrentUsage();
    
    // Calculate heap efficiency (lower usage = higher efficiency)
    const heapEfficiency = Math.max(0, 100 - current.heap.usedPercent);
    
    // Calculate external efficiency
    const externalMB = current.external / (1024 * 1024);
    const externalEfficiency = Math.max(0, 100 - (externalMB / this.thresholds.externalMB) * 100);
    
    // Overall score considers both efficiency and leak count
    const leakPenalty = this.leaks.length * 5;
    const overallScore = Math.max(0, (heapEfficiency + externalEfficiency) / 2 - leakPenalty);

    return {
      heapEfficiency,
      externalEfficiency,
      overallScore,
    };
  }

  public forceGC(): void {
    try {
      if (global.gc) {
        global.gc();
        loggers.service.info('Forced garbage collection executed');
      } else {
        loggers.service.warn('Garbage collection not available. Run node with --expose-gc flag.');
      }
    } catch (error) {
      loggers.service.error('Failed to force garbage collection', {}, error as Error);
    }
  }

  public generateHeapDump(): string {
    try {
      const v8 = require('v8');
      const fs = require('fs');
      const path = require('path');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `heap-dump-${timestamp}.heapsnapshot`;
      const filepath = path.join(process.cwd(), 'logs', filename);
      
      // Ensure logs directory exists
      const logsDir = path.dirname(filepath);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      const heapSnapshot = v8.getHeapSnapshot();
      const writeStream = fs.createWriteStream(filepath);
      
      heapSnapshot.pipe(writeStream);
      
      loggers.service.info('Heap dump generated', { filepath });
      return filepath;
    } catch (error) {
      loggers.service.error('Failed to generate heap dump', {}, error as Error);
      throw error;
    }
  }

  public clearHistory(): void {
    this.snapshots = [];
    this.leaks = [];
    loggers.service.info('Memory monitoring history cleared');
  }

  public updateThresholds(newThresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    loggers.service.info('Memory thresholds updated', { thresholds: this.thresholds });
  }

  public getSnapshots(limit?: number): MemoryUsageSnapshot[] {
    return limit ? this.snapshots.slice(-limit) : this.snapshots;
  }

  public getLeaks(severity?: MemoryLeak['severity']): MemoryLeak[] {
    return severity ? this.leaks.filter(l => l.severity === severity) : this.leaks;
  }
}

// Singleton instance
export const memoryUsageMonitor = new MemoryUsageMonitor();