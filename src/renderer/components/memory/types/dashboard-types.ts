import { MemoryEntity, MemoryTier } from '@shared/types/memory';
import { AnalyticsTimeRange } from './analytics-types';

// Health dashboard types
export type HealthRecommendationType = 'optimization' | 'maintenance' | 'security' | 'performance';
export type HealthRecommendationPriority = 'high' | 'medium' | 'low';

export interface MemoryHealthMetrics {
  totalMemories: number;
  totalSize: number;
  averageImportance: number;
  fragmentationScore: number;
  accessPatternScore: number;
  retentionScore: number;
  tierDistribution: Record<MemoryTier, number>;
  healthScore: number;
  recommendations: Array<{
    id: string;
    type: HealthRecommendationType;
    priority: HealthRecommendationPriority;
    title: string;
    description: string;
    action: string;
    impact: string;
  }>;
}

export type HealthDashboardView = 'overview' | 'heatmap' | 'distribution' | 'performance';

// Optimization action parameters
export interface OptimizationActionParams {
  actionId: string;
  timeRange: '24h' | '7d' | '30d' | '90d';
  metrics: MemoryHealthMetrics | null;
}

export interface MemoryHealthDashboardProps {
  userId: string;
  memories: MemoryEntity[];
  onOptimizationAction?: (actionType: string, params?: OptimizationActionParams) => void;
  refreshInterval?: number;
}

// Memory Explorer types
export interface MemoryExplorerProps {
  userId: string;
  personaId?: string;
  onMemorySelect?: (memory: MemoryEntity) => void;
  onMemoryEdit?: (memory: MemoryEntity) => void;
  onMemoryDelete?: (memoryId: string) => void;
}

export interface MemoryFilters {
  tier?: MemoryTier;
  type?: string;
  minImportance?: number;
  searchQuery?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export type MemoryFilterValue = MemoryTier | string | number | { start: Date; end: Date } | undefined;

export interface MemoryStats {
  total: number;
  byTier: Record<MemoryTier, number>;
  byType: Record<string, number>;
  averageImportance: number;
  totalRelationships: number;
}

export type ExplorerViewMode = 'graph' | 'timeline' | 'health' | 'search' | 'optimization' | 'provenance';

// Example component props
export interface MemoryExplorerExampleProps {
  userId: string;
  personaId?: string;
}

// Common dashboard props
export interface BaseDashboardProps {
  userId: string;
  memories: MemoryEntity[];
  refreshInterval?: number;
  timeRange?: AnalyticsTimeRange;
} 