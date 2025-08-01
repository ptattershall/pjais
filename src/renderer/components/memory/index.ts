// Core memory components
export { MemoryExplorer } from './MemoryExplorer';
export { MemoryHealthDashboard } from './MemoryHealthDashboard';
export { MemoryGraphVisualizer } from './MemoryGraphVisualizer';
export { MemoryTimelineVisualizer } from './MemoryTimelineVisualizer';
export { MemoryAdvancedSearch } from './MemoryAdvancedSearch';
export { MemoryDistributionAnalysis } from './MemoryDistributionAnalysis';
export { MemoryProvenanceTracker } from './MemoryProvenanceTracker';

// Phase 2.1: MemoryExplorer extracted components
export { MemoryViewModeSelector } from './MemoryViewModeSelector';
export { MemoryFilterControls } from './MemoryFilterControls';
export { MemoryStatsDisplay } from './MemoryStatsDisplay';
export { MemoryDetailsPanel } from './MemoryDetailsPanel';

// Phase 2.2: MemoryProvenanceTracker extracted components
export { ProvenanceViewModeSelector } from './ProvenanceViewModeSelector';
export { ProvenanceLineageSummary } from './ProvenanceLineageSummary';
export { ProvenanceNodeDetailsPanel } from './ProvenanceNodeDetailsPanel';
export { ProvenanceTreeView } from './ProvenanceTreeView';

// Phase 2.3: Shared utilities and patterns - NEW!
// D3.js utilities
export {
  MEMORY_TIER_COLORS,
  RELATIONSHIP_COLORS,
  DEFAULT_MARGINS,
  calculateDimensions,
  initializeSVG,
  createMainGroup,
  createTimeScale,
  createLinearScale,
  createBandScale,
  createEfficiencyColorScale,
  createRadiusScale,
  processMemoriesForVisualization,
  calculateTimeDomain,
  createTooltip,
  showTooltip,
  hideTooltip,
  removeAllTooltips,
  formatMemoryTooltip,
  createXAxis,
  createYAxis,
  addAxisLabel,
  createLegend,
  fadeIn,
  fadeOut,
  scaleTransition,
  createZoomBehavior,
  applyZoomToGroup,
  truncateText,
  getContrastColor
} from './utils/d3-utils';

// Calculation utilities  
export {
  calculateMemoryStats,
  calculateEfficiencyAnalysis,
  calculateFragmentationAnalysis as calculateFragmentationMetrics, // Renamed to avoid conflict
  calculateTextRelevance,
  calculateSemanticSimilarity,
  calculateRelevanceScore,
  calculateMemoryClusters,
  formatPercentage,
  formatScore,
  clamp,
  lerp,
  normalize
} from './utils/calculation-utils';

// Provenance utilities
export * from './utils/provenance-utils';

// Memory system supporting components
export { MemoryTimelineWithSync } from './MemoryTimelineWithSync';
export { MemoryTimelineBookmarks } from './MemoryTimelineBookmarks';
export { MemoryHistoricalStateManager } from './MemoryHistoricalStateManager';

// Type definitions
export * from './types';

// Analysis and monitoring components
export { MemoryUsageAnalytics } from './MemoryUsageAnalytics';
export { MemoryPerformanceMonitor } from './MemoryPerformanceMonitor';
export { MemoryUsageHeatmap } from './MemoryUsageHeatmap';

// Performance and optimization (consolidated exports)
export { 
  PerformanceMetricsCalculator, 
  type PerformanceMetrics, 
  type PerformanceThresholds,
  DEFAULT_THRESHOLDS 
} from './PerformanceMetricsCalculator';
export { 
  SystemHealthCalculator, 
  type SystemHealth 
} from './SystemHealthCalculator';
export { 
  PerformanceAlertManager, 
  type PerformanceAlert, 
  type OptimizationRecommendation 
} from './PerformanceAlertManager'; 