import * as d3 from 'd3';
import { MemoryEntity, MemoryRelationship, MemoryTier } from '@shared/types/memory';

// Graph visualization types
export interface MemoryNode extends d3.SimulationNodeDatum {
  id: string;
  entity: MemoryEntity;
  tier: MemoryTier;
  radius: number;
  color: string;
  x?: number;
  y?: number;
}

export interface MemoryLink extends d3.SimulationLinkDatum<MemoryNode> {
  id: string;
  relationship: MemoryRelationship;
  strength: number;
  color: string;
  strokeWidth: number;
}

export interface MemoryGraphVisualizerProps {
  userId: string;
  memories: MemoryEntity[];
  relationships: MemoryRelationship[];
  selectedMemoryId?: string;
  onMemorySelect?: (memoryId: string) => void;
  onMemoryHover?: (memory: MemoryEntity | null) => void;
  width?: number;
  height?: number;
  showTierLabels?: boolean;
  enableZoom?: boolean;
  enableDrag?: boolean;
}

// Timeline visualization types
export interface TimelineNode {
  id: string;
  entity: MemoryEntity;
  date: Date;
  tier: MemoryTier;
  x: number;
  y: number;
  radius: number;
  color: string;
}

export type TimeGranularity = 'hour' | 'day' | 'week' | 'month';

export interface MemoryTimelineVisualizerProps {
  userId: string;
  memories: MemoryEntity[];
  selectedMemoryId?: string;
  onMemorySelect?: (memoryId: string) => void;
  onMemoryHover?: (memory: MemoryEntity | null) => void;
  onTimeRangeChange?: (start: Date, end: Date) => void;
  width?: number;
  height?: number;
  enableBrush?: boolean;
  showDensityChart?: boolean;
  timeGranularity?: TimeGranularity;
}

// Distribution analysis types
export interface FragmentationAnalysis {
  score: number; // 0-100, higher = more fragmented
  hotSpots: Array<{ 
    tier: MemoryTier; 
    size: number; 
    efficiency: number;
    recommendation: string;
  }>;
  distribution: {
    optimal: boolean;
    currentRatio: { hot: number; warm: number; cold: number };
    optimalRatio: { hot: number; warm: number; cold: number };
    wastePercentage: number;
  };
}

export interface DistributionData {
  tier: MemoryTier;
  count: number;
  totalImportance: number;
  avgImportance: number;
  storageSize: number;
  efficiency: number;
  color: string;
}

export interface MemoryDistributionAnalysisProps {
  memories: MemoryEntity[];
  onFragmentationDetected?: (analysis: FragmentationAnalysis) => void;
  enableInteraction?: boolean;
}

// Color schemes
export type TierColorScheme = Record<MemoryTier, string>;

export interface RelationshipColorScheme {
  causal: string;
  temporal: string;
  contextual: string;
  semantic: string;
  reference: string;
  references: string;
  similar: string;
  related: string;
}

// Common visualization props
export interface BaseVisualizationProps {
  width?: number;
  height?: number;
  enableInteraction?: boolean;
  showLegend?: boolean;
}

// Margins configuration
export interface VisualizationMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
} 