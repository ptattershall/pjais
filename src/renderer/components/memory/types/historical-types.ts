import { MemoryEntity, MemoryTier, MemoryRelationship } from '@shared/types/memory';

// Historical memory state reconstruction
export interface MemorySnapshot {
  timestamp: Date;
  memoryState: MemoryEntity[];
  totalMemories: number;
  tierDistribution: Record<MemoryTier, number>;
  averageImportance: number;
}

export interface TimePoint {
  id: string;
  timestamp: Date;
  label: string;
  description: string;
  isBookmarked: boolean;
}

export interface MemoryHistoricalStateManagerProps {
  memories: MemoryEntity[];
  onStateReconstructed: (snapshot: MemorySnapshot) => void;
  onTimeTravelModeChange: (enabled: boolean) => void;
  enableTimeTravel?: boolean;
}

// Temporal filtering types (imported from search-types to avoid circular dependency)
export interface TemporalFilter {
  dateRange?: [Date, Date];
  timeOfDay?: {
    start: number; // Hours in 24h format
    end: number;
  };
  dayOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  memoryDensity?: {
    min: number;
    max: number;
  };
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'custom';
  importanceThreshold?: number;
  tierFilter?: string[];
  typeFilter?: string[];
}

// Cross-view synchronization events
export interface TimelineGraphSyncEvent {
  type: 'memory-highlight' | 'time-selection' | 'filter-change' | 'playback-state';
  data: {
    memoryIds?: string[];
    timeRange?: [Date, Date];
    timestamp?: Date;
    filters?: TemporalFilter;
    isPlaying?: boolean;
  };
}

export type SyncMode = 'none' | 'highlight' | 'filter' | 'full';

export interface MemoryTimelineWithSyncProps {
  userId: string;
  memories: MemoryEntity[];
  selectedMemoryId?: string;
  highlightedMemoryIds?: string[];
  onMemorySelect?: (memoryId: string) => void;
  onMemoryHover?: (memory: MemoryEntity | null) => void;
  onTimeRangeChange?: (start: Date, end: Date) => void;
  onSyncEvent?: (event: TimelineGraphSyncEvent) => void;
  enableTimeTravel?: boolean;
  enableSynchronization?: boolean;
  width?: number;
  height?: number;
}

// Provenance types (from existing provenance module)
export interface ProvenanceNodeMetadata {
  createdAt: Date;
  lastModified?: Date;
  accessCount: number;
  derivedFrom: string[];
  influences: string[];
}

export interface ProvenanceNode {
  id: string;
  memory: MemoryEntity;
  level: number;
  children: ProvenanceNode[];
  relationships: MemoryRelationship[];
  metadata: ProvenanceNodeMetadata;
}

export interface KeyAncestor {
  node: ProvenanceNode;
  influenceScore: number;
  pathLength: number;
  influenceType: 'direct' | 'indirect';
  confidence: number;
}

export interface DerivationChain {
  chain: ProvenanceNode[];
  strength: number;
  confidence: number;
  chainType: 'linear' | 'branching';
  totalInfluence: number;
}

export interface LineageAnalysis {
  totalNodes: number;
  maxDepth: number;
  branchingFactor: number;
  influenceStrength: number;
  keyAncestors: KeyAncestor[];
  derivationChains: DerivationChain[];
  analysisTimestamp: string;
}

export interface RelationshipData {
  memory: MemoryEntity;
  relationship: MemoryRelationship;
}

export interface ProvenanceVisualizationProps {
  rootMemoryId: string;
  maxDepth?: number;
  onNodeSelect?: (node: ProvenanceNode) => void;
  onRelationshipSelect?: (relationship: MemoryRelationship) => void;
  enableInteraction?: boolean;
  width?: number;
  height?: number;
} 