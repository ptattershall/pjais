// Memory Provenance and Lineage Types
import { MemoryEntity, MemoryRelationship } from './memory';

/**
 * Provenance Node
 * Represents a node in the memory provenance tree
 */
export interface ProvenanceNode {
  id: string;
  memory: MemoryEntity;
  level: number;
  children: ProvenanceNode[];
  relationships: MemoryRelationship[];
  metadata: ProvenanceNodeMetadata;
}

/**
 * Provenance Node Metadata
 * Additional information about a provenance node
 */
export interface ProvenanceNodeMetadata {
  createdAt: Date;
  lastModified?: Date;
  accessCount: number;
  derivedFrom?: string[];
  influences?: string[];
  influenceScore?: number;
  pathLength?: number;
}

/**
 * Lineage Analysis Result
 * Comprehensive analysis of memory lineage patterns
 */
export interface LineageAnalysis {
  totalNodes: number;
  maxDepth: number;
  branchingFactor: number;
  influenceStrength: number;
  keyAncestors: KeyAncestor[];
  derivationChains: DerivationChain[];
  analysisTimestamp: string;
  recommendations?: LineageRecommendation[];
}

/**
 * Key Ancestor
 * Represents an influential ancestor in the lineage
 */
export interface KeyAncestor {
  node: ProvenanceNode;
  influenceScore: number;
  pathLength: number;
  influenceType: 'direct' | 'indirect' | 'cascading';
  confidence: number;
}

/**
 * Derivation Chain
 * Represents a chain of memory derivations
 */
export interface DerivationChain {
  chain: ProvenanceNode[];
  strength: number;
  confidence: number;
  chainType: 'linear' | 'branching' | 'convergent';
  totalInfluence: number;
}

/**
 * Lineage Recommendation
 * Suggestions for optimizing memory lineage
 */
export interface LineageRecommendation {
  type: 'optimization' | 'cleanup' | 'strengthening' | 'analysis';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target: string; // memory ID or relationship ID
  message: string;
  action: string;
  estimatedImpact: number; // 0-100
}

/**
 * Memory Relationship Extended
 * Extended relationship information for provenance tracking
 */
export interface RelationshipData {
  memory: MemoryEntity;
  relationship: MemoryRelationship;
  distance: number;
  path?: string[]; // memory IDs in the path
  weight?: number; // calculated weight in the graph
}

/**
 * Provenance Visualization Config
 * Configuration for provenance visualization components
 */
export interface ProvenanceVisualizationConfig {
  maxDepth: number;
  width: number;
  height: number;
  enableInteraction: boolean;
  showTimeline: boolean;
  showInfluenceMap: boolean;
  colorScheme: 'default' | 'tier-based' | 'influence-based' | 'temporal';
  layout: 'tree' | 'force' | 'circular' | 'timeline';
}

/**
 * Provenance Tree Builder Options
 */
export interface ProvenanceTreeOptions {
  rootMemoryId: string;
  maxDepth: number;
  includeWeak: boolean; // include weak relationships
  minStrength: number; // minimum relationship strength to include
  direction: 'ancestors' | 'descendants' | 'both';
  timeRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Provenance Analysis Options
 */
export interface ProvenanceAnalysisOptions {
  calculateInfluence: boolean;
  findKeyPaths: boolean;
  identifyBottlenecks: boolean;
  suggestOptimizations: boolean;
  includeMetrics: boolean;
  depthWeighting: boolean;
}

/**
 * Influence Score Components
 * Breakdown of how influence score is calculated
 */
export interface InfluenceScoreBreakdown {
  childrenInfluence: number;
  relationshipStrength: number;
  accessWeight: number;
  recencyWeight: number;
  totalScore: number;
  confidence: number;
}

/**
 * Provenance Metrics
 * Quantitative metrics about memory provenance
 */
export interface ProvenanceMetrics {
  treeDepth: number;
  nodeCount: number;
  relationshipCount: number;
  averageBranchingFactor: number;
  strongConnectionRatio: number;
  isolatedNodeCount: number;
  convergencePoints: number;
  temporalSpread: number; // days between oldest and newest
  complexityScore: number; // 0-100
}

/**
 * Temporal Provenance Data
 * Time-based provenance information
 */
export interface TemporalProvenanceData {
  timestamp: Date;
  memoryId: string;
  eventType: 'created' | 'modified' | 'accessed' | 'related' | 'deleted';
  relatedMemoryId?: string;
  relationshipType?: string;
  metadata?: Record<string, any>;
}

/**
 * Provenance Search Criteria
 * Criteria for searching within provenance data
 */
export interface ProvenanceSearchCriteria {
  memoryTypes?: string[];
  relationshipTypes?: string[];
  strengthRange?: [number, number];
  timeRange?: [Date, Date];
  influenceRange?: [number, number];
  tags?: string[];
  contentMatch?: string;
}

/**
 * Provenance Export Options
 * Options for exporting provenance data
 */
export interface ProvenanceExportOptions {
  format: 'json' | 'graphml' | 'csv' | 'dot';
  includeMetadata: boolean;
  includeContent: boolean;
  maxDepth?: number;
  filterCriteria?: ProvenanceSearchCriteria;
}

/**
 * Provenance Visualization State
 * State management for provenance visualization
 */
export interface ProvenanceVisualizationState {
  selectedNode: ProvenanceNode | null;
  hoveredNode: ProvenanceNode | null;
  selectedRelationship: MemoryRelationship | null;
  viewMode: 'tree' | 'timeline' | 'influence' | 'graph';
  zoomLevel: number;
  panPosition: { x: number; y: number };
  filterCriteria: ProvenanceSearchCriteria;
  highlightedPath: string[]; // memory IDs
  showLabels: boolean;
  showWeights: boolean;
}

/**
 * Provenance Tree Statistics
 * Statistical information about a provenance tree
 */
export interface ProvenanceTreeStatistics {
  depth: {
    max: number;
    average: number;
    distribution: Record<number, number>; // level -> count
  };
  branching: {
    factor: number;
    maxChildren: number;
    leafNodes: number;
  };
  relationships: {
    total: number;
    byType: Record<string, number>;
    averageStrength: number;
    strongConnections: number; // strength > 0.7
  };
  temporal: {
    oldestNode: Date;
    newestNode: Date;
    timeSpan: number; // milliseconds
    creationRate: number; // nodes per day
  };
} 