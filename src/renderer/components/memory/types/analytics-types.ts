import { Chart } from 'chart.js';
import { MemoryEntity, MemoryTier } from '@shared/types/memory';

// Analytics time range
export type AnalyticsTimeRange = '24h' | '7d' | '30d' | '90d';

// Usage pattern types
export type UsagePatternType = 'peak_hours' | 'memory_hotspots' | 'access_decay' | 'tier_imbalance';

// Specific data interfaces for each pattern type
export interface PeakHoursData {
  peakHours: number[];
  maxActivity: number;
}

export interface MemoryHotspotData {
  hotspots: Array<{ memoryId: string; accessCount: number; lastAccessed: Date }>;
}

export interface AccessDecayData {
  decayRate: number;
  staleBefore: Date;
  affectedMemories: string[];
}

export interface TierImbalanceData {
  hotRatio: number;
  tierCounts: Record<MemoryTier, number>;
}

export interface UsagePattern {
  type: UsagePatternType;
  description: string;
  confidence: number;
  recommendation: string;
  data: PeakHoursData | MemoryHotspotData | AccessDecayData | TierImbalanceData;
}

// Usage metrics
export interface UsageMetrics {
  hourlyActivity: number[];
  dailyAccess: { date: string; count: number; importance: number }[];
  tierActivity: { tier: string; accesses: number; avgImportance: number }[];
  typeDistribution: { type: string; count: number; percentage: number }[];
  accessTrends: { week: string; hot: number; warm: number; cold: number }[];
}

// Heatmap types
export interface HeatmapData {
  hour: number;
  day: number;
  value: number;
  tier: MemoryTier;
  count: number;
  avgImportance: number;
}

export interface HeatmapAnalysis {
  peakPeriods: Array<{
    period: string;
    intensity: number;
    recommendation: string;
  }>;
  coldSpots: Array<{
    period: string;
    efficiency: number;
    opportunity: string;
  }>;
  accessPattern: 'concentrated' | 'distributed' | 'random';
  optimizationScore: number;
}

// Chart reference types
export interface ChartRefs {
  hourly: React.RefObject<Chart<'line'>>;
  daily: React.RefObject<Chart<'bar'>>;
  tiers: React.RefObject<Chart<'bar'>>;
}

// Component props
export interface MemoryUsageAnalyticsProps {
  memories: MemoryEntity[];
  timeRange: AnalyticsTimeRange;
  onPatternDetected?: (pattern: UsagePattern) => void;
}

export interface MemoryUsageHeatmapProps {
  memories: MemoryEntity[];
  timeRange: AnalyticsTimeRange;
  onHotspotClick?: (data: HeatmapData) => void;
} 