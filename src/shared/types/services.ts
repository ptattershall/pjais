// Service interface definitions
import { MemoryEntity, MemoryRelationship, MemoryTier } from './memory';
import { PerformanceMetrics } from './performance';

/**
 * Memory Service Interface
 * Defines the contract for memory management operations
 */
export interface IMemoryService {
  // Basic CRUD operations
  createMemory(memory: Omit<MemoryEntity, 'id' | 'createdAt' | 'lastAccessed'>): Promise<MemoryEntity>;
  retrieveMemory(id: string): Promise<MemoryEntity | null>;
  updateMemory(id: string, updates: Partial<MemoryEntity>): Promise<MemoryEntity>;
  deleteMemory(id: string): Promise<boolean>;
  
  // Search and query operations
  searchMemories(query: string, personaId?: string): Promise<MemoryEntity[]>;
  getAllMemories(personaId?: string): Promise<MemoryEntity[]>;
  
  // Tier management
  promoteMemory(id: string): Promise<boolean>;
  demoteMemory(id: string): Promise<boolean>;
  optimizeTiers(): Promise<void>;
  
  // Relationship operations
  createRelationship(relationship: Omit<MemoryRelationship, 'id' | 'createdAt'>): Promise<MemoryRelationship>;
  getRelatedMemories(memoryId: string, maxDistance?: number): Promise<Array<{
    memory: MemoryEntity;
    relationship: MemoryRelationship;
    distance: number;
  }>>;
  
  // Analytics and health
  getMemoryHealth(): Promise<MemoryHealthMetrics>;
  getTierMetrics(): Promise<MemoryServiceTierAnalytics>;
}

/**
 * Database Service Interface
 * Defines the contract for database operations and metrics
 */
export interface IDatabaseService {
  // Connection management
  initialize(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Query operations
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid?: number }>;
  
  // Transaction support
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  
  // Performance metrics
  getConnectionCount(): number;
  getAverageQueryTime(): number;
  getStorageUsage(): Promise<number>;
  getIndexUsage(): Promise<number>;
  getErrorRate(): number;
  
  // Health monitoring
  getDatabaseHealth(): Promise<DatabaseHealthMetrics>;
}

/**
 * Memory Health Metrics
 */
export interface MemoryHealthMetrics {
  totalMemories: number;
  accessLatency: number;
  queryThroughput: number;
  memoryUtilization: number;
  cacheHitRatio: number;
  indexEfficiency: number;
  fragmentationRatio: number;
  tierDistribution: {
    hot: number;
    warm: number;
    cold: number;
  };
  recommendations: Array<{
    type: 'optimization' | 'maintenance' | 'scaling';
    priority: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    action?: string;
  }>;
}

/**
 * Memory Service Tier Analytics
 */
export interface MemoryServiceTierAnalytics {
  tiers: {
    [K in MemoryTier]: {
      count: number;
      totalSize: number;
      averageAccessTime: number;
      hitRatio: number;
      lastOptimized: string;
    };
  };
  rebalanceRecommendations: Array<{
    memoryId: string;
    currentTier: MemoryTier;
    recommendedTier: MemoryTier;
    confidence: number;
    reason: string;
  }>;
}

/**
 * Database Health Metrics
 */
export interface DatabaseHealthMetrics {
  connectionHealth: {
    activeConnections: number;
    maxConnections: number;
    connectionPoolUtilization: number;
    averageConnectionDuration: number;
  };
  queryPerformance: {
    averageQueryTime: number;
    slowQueriesCount: number;
    queriesPerSecond: number;
    cacheHitRatio: number;
  };
  storage: {
    totalSize: number;
    usedSize: number;
    freeSpace: number;
    fragmentationLevel: number;
  };
  reliability: {
    uptime: number;
    errorRate: number;
    lastBackup?: string;
    integrityCheckStatus: 'passed' | 'failed' | 'pending';
  };
  recommendations: Array<{
    category: 'performance' | 'storage' | 'reliability' | 'maintenance';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    suggestedAction?: string;
  }>;
}

/**
 * Service Manager Interface
 * Coordinates between different services
 */
export interface IServiceManager {
  // Service lifecycle
  initializeServices(): Promise<void>;
  shutdownServices(): Promise<void>;
  
  // Service access
  getMemoryService(): IMemoryService;
  getDatabaseService(): IDatabaseService;
  
  // Health monitoring
  getOverallHealth(): Promise<ServiceHealthReport>;
  
  // Performance monitoring
  getPerformanceMetrics(): Promise<PerformanceMetrics>;
}

/**
 * Service Health Report
 */
export interface ServiceHealthReport {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical' | 'unknown';
  services: {
    memory: {
      status: 'healthy' | 'degraded' | 'critical' | 'unknown';
      responseTime: number;
      errorRate: number;
      lastCheck: string;
      details?: MemoryHealthMetrics;
    };
    database: {
      status: 'healthy' | 'degraded' | 'critical' | 'unknown';
      responseTime: number;
      errorRate: number;
      lastCheck: string;
      details?: DatabaseHealthMetrics;
    };
    performance: {
      status: 'healthy' | 'degraded' | 'critical' | 'unknown';
      monitoringActive: boolean;
      alertCount: number;
      lastCheck: string;
    };
  };
  recommendations: Array<{
    service: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    action: string;
  }>;
}

/**
 * Mock Data Types for Development
 */
export interface MockMemoryData {
  id: string;
  type: string;
  content: string | Record<string, unknown>;
  memoryTier?: MemoryTier;
  importance?: number;
  tags?: string[];
  createdAt?: string;
  lastAccessed?: string;
}

export interface MockRelationshipData {
  id: string;
  fromMemoryId: string;
  toMemoryId: string;
  type: string;
  strength?: number;
  confidence?: number;
  createdAt?: string;
}

/**
 * Service Configuration Types
 */
export interface ServiceConfiguration {
  memory: {
    tierOptimizationInterval: number;
    maxMemoriesPerTier: Record<MemoryTier, number>;
    autoOptimizeEnabled: boolean;
  };
  database: {
    connectionPoolSize: number;
    queryTimeout: number;
    backupInterval: number;
    maintenanceWindow: string;
  };
  performance: {
    monitoringInterval: number;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      memoryUsage: number;
    };
  };
} 