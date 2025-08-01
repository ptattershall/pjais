import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MemoryEntity, MemoryTier } from '@shared/types/memory';
import { MemoryUsageHeatmap } from './MemoryUsageHeatmap';
import { MemoryDistributionAnalysis } from './MemoryDistributionAnalysis';
import { MemoryPerformanceMonitor } from './MemoryPerformanceMonitor';
import '../../styles/memory-health-dashboard.css';

// Import shared utilities - showcasing advanced statistical analysis!
import {
  calculateMemoryStats,
  calculateFragmentationAnalysis,
  calculateEfficiencyAnalysis,
  type MemoryStatistics,
  type FragmentationAnalysis,
  type EfficiencyAnalysis,
  formatFileSize,
  formatPercentage
} from './utils/calculation-utils';

// Import shared formatting utilities
import {
  createTooltip,
  showTooltip
} from './utils/d3-utils';

import { MetricsCard } from './ui/MetricsCard';
import { useMemoryMetrics } from './hooks/useMemoryMetrics';
import { OptimizationActionParams } from './types/dashboard-types';

interface MemoryHealthMetrics {
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
    type: 'optimization' | 'maintenance' | 'security' | 'performance';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
    impact: string;
  }>;
  // Enhanced metrics using shared utilities
  comprehensiveStats: MemoryStatistics;
  fragmentationAnalysis: FragmentationAnalysis;
  efficiencyMetrics: EfficiencyAnalysis;
}

interface MemoryHealthDashboardProps {
  userId: string;
  memories: MemoryEntity[];
  onOptimizationAction?: (actionType: string, params?: OptimizationActionParams) => void;
  refreshInterval?: number;
}

export const MemoryHealthDashboard: React.FC<MemoryHealthDashboardProps> = ({
  userId: _userId,
  memories,
  onOptimizationAction,
  refreshInterval = 30000
}) => {
  const [healthMetrics, setHealthMetrics] = useState<MemoryHealthMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [activeView, setActiveView] = useState<'overview' | 'heatmap' | 'distribution' | 'performance'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Advanced metrics calculations using shared utilities - dramatically simplified!
  const advancedAnalysis = useMemo(() => {
    if (memories.length === 0) return null;

    // Use shared utilities for comprehensive analysis
    const comprehensiveStats = calculateMemoryStats(memories);
    const fragmentationAnalysis = calculateFragmentationAnalysis(memories);
    const efficiencyMetrics = calculateEfficiencyAnalysis(memories);

    return {
      comprehensiveStats,
      fragmentationAnalysis,
      efficiencyMetrics
    };
  }, [memories]);

  // Calculate comprehensive health metrics using shared utilities
  const calculateHealthMetrics = useCallback((): MemoryHealthMetrics => {
    if (memories.length === 0 || !advancedAnalysis) {
      return {
        totalMemories: 0,
        totalSize: 0,
        averageImportance: 0,
        fragmentationScore: 0,
        accessPatternScore: 0,
        retentionScore: 0,
        tierDistribution: { hot: 0, warm: 0, cold: 0 },
        healthScore: 0,
        recommendations: [],
        comprehensiveStats: {} as MemoryStatistics,
        fragmentationAnalysis: {} as FragmentationAnalysis,
        efficiencyMetrics: {} as EfficiencyAnalysis
      };
    }

    const { comprehensiveStats, fragmentationAnalysis, efficiencyMetrics } = advancedAnalysis;

    // Enhanced health scoring using efficiency metrics
    const fragmentationScore = Math.round(Math.max(0, 100 - fragmentationAnalysis.score));
    const accessPatternScore = Math.round(efficiencyMetrics.overallScore);
    const retentionScore = Math.round(fragmentationAnalysis.wasteMetrics.efficiency);
    
    // Advanced overall health score using multiple factors
    const healthScore = Math.round(
      (fragmentationScore * 0.25 + 
       accessPatternScore * 0.35 + 
       retentionScore * 0.25 +
       efficiencyMetrics.overallScore * 100 * 0.15)
    );

    // Generate smart recommendations using analysis results
    const recommendations = generateAdvancedRecommendations(
      fragmentationAnalysis,
      efficiencyMetrics,
      comprehensiveStats
    );

    return {
      totalMemories: comprehensiveStats.totalCount,
      totalSize: comprehensiveStats.storageSize,
      averageImportance: comprehensiveStats.averageImportance,
      fragmentationScore,
      accessPatternScore,
      retentionScore,
      tierDistribution: comprehensiveStats.tierDistribution,
      healthScore,
      recommendations,
      comprehensiveStats,
      fragmentationAnalysis,
      efficiencyMetrics
    };
  }, [memories, advancedAnalysis]);

  // Smart recommendations using advanced analysis
  const generateAdvancedRecommendations = (
    fragAnalysis: FragmentationAnalysis,
    efficiency: EfficiencyAnalysis,
    stats: MemoryStatistics
  ) => {
    const recommendations = [];

    // Fragmentation-based recommendations
    if (fragAnalysis.score > 30) {
      recommendations.push({
        id: 'advanced-tier-rebalance',
        type: 'optimization' as const,
        priority: 'high' as const,
        title: 'Advanced Tier Rebalancing Required',
        description: `High fragmentation detected (${fragAnalysis.score.toFixed(1)}/100). ${fragAnalysis.hotSpots.length} optimization hotspots identified.`,
        action: 'Run intelligent tier redistribution based on access patterns and importance scores',
        impact: `Improve access speed by ${Math.round(fragAnalysis.score * 0.5)}%`
      });
    }

    // Efficiency-based recommendations
    if (efficiency.overallScore < 60) {
      const misplacedCount = efficiency.misplacedMemories.length;
      recommendations.push({
        id: 'access-pattern-optimization',
        type: 'performance' as const,
        priority: 'medium' as const,
        title: 'Optimize Memory Placement',
        description: `Low efficiency score (${efficiency.overallScore.toFixed(1)}/100). ${misplacedCount} memories are in suboptimal tiers.`,
        action: 'Relocate misplaced memories to appropriate tiers based on importance levels',
        impact: `Improve system efficiency by ${Math.round((100 - efficiency.overallScore) * 0.4)}%`
      });
    }

    // Storage efficiency recommendations
    if (fragAnalysis.wasteMetrics.efficiency < 70) {
      recommendations.push({
        id: 'storage-optimization',
        type: 'maintenance' as const,
        priority: 'high' as const,
        title: 'Storage Efficiency Improvement',
        description: `Low storage efficiency (${fragAnalysis.wasteMetrics.efficiency.toFixed(1)}%). ${fragAnalysis.wasteMetrics.underUtilized.toFixed(1)}% capacity underutilized.`,
        action: 'Compress underutilized memories and optimize storage allocation',
        impact: `Reduce storage usage by ${Math.round(fragAnalysis.wasteMetrics.underUtilized * 0.6)}%`
      });
    }

    // Scale-based recommendations
    if (stats.totalCount > 5000) {
      recommendations.push({
        id: 'large-scale-optimization',
        type: 'performance' as const,
        priority: 'medium' as const,
        title: 'Large-Scale Memory Management',
        description: `Managing ${stats.totalCount} memories may impact performance. Consider implementing automated lifecycle management.`,
        action: 'Enable automated archival for old, low-importance memories',
        impact: 'Maintain performance at scale and reduce maintenance overhead'
      });
    }

    return recommendations;
  };

  // Enable advanced analytics display when we have metrics
  const showAdvancedAnalytics = useMemo(() => {
    return healthMetrics && healthMetrics.comprehensiveStats.totalCount > 0;
  }, [healthMetrics]);

  // Use shared metrics hook for core stats
  const memoryMetrics = useMemoryMetrics(memories);

  // Update metrics when memories change
  useEffect(() => {
    const metrics = calculateHealthMetrics();
    setHealthMetrics(metrics);
  }, [calculateHealthMetrics]);

  // Auto-refresh metrics with efficiency considerations
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true);
      const metrics = calculateHealthMetrics();
      setHealthMetrics(metrics);
      setTimeout(() => setIsRefreshing(false), 500);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [calculateHealthMetrics, refreshInterval]);

  const handleOptimizationAction = (actionId: string, actionType: string) => {
    if (onOptimizationAction) {
      const params: OptimizationActionParams = { actionId, timeRange, metrics: healthMetrics };
      onOptimizationAction(actionType, params);
    }
  };

  // Add a refresh handler function
  const handleRefresh = () => {
    setIsRefreshing(true);
    const metrics = calculateHealthMetrics();
    setHealthMetrics(metrics);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (!healthMetrics) {
    return (
      <div className="memory-health-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Analyzing memory health with advanced algorithms...</p>
      </div>
    );
  }

  return (
    <div className="memory-health-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Advanced Memory Health Dashboard</h1>
          <p>AI-powered analysis and optimization recommendations</p>
        </div>
        
        <div className="dashboard-controls">
          <div className="view-selector">
            <button 
              className={activeView === 'overview' ? 'active' : ''}
              onClick={() => setActiveView('overview')}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') setActiveView('overview');
              }}
              aria-label="Show Overview"
              tabIndex={0}
            >
              Overview
            </button>
            <button 
              className={activeView === 'heatmap' ? 'active' : ''}
              onClick={() => setActiveView('heatmap')}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') setActiveView('heatmap');
              }}
              aria-label="Show Heatmap"
              tabIndex={0}
            >
              Heatmap
            </button>
            <button 
              className={activeView === 'distribution' ? 'active' : ''}
              onClick={() => setActiveView('distribution')}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') setActiveView('distribution');
              }}
              aria-label="Show Distribution"
              tabIndex={0}
            >
              Distribution
            </button>
            <button 
              className={activeView === 'performance' ? 'active' : ''}
              onClick={() => setActiveView('performance')}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') setActiveView('performance');
              }}
              aria-label="Show Performance"
              tabIndex={0}
            >
              Performance
            </button>
          </div>

          <div className="time-range-selector">
            <label>Analysis Period:</label>
            <select 
              value={timeRange} 
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTimeRange(e.target.value as typeof timeRange)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  const target = e.target as HTMLSelectElement;
                  setTimeRange(target.value as typeof timeRange);
                }
              }}
              aria-label="Select Analysis Period"
              tabIndex={0}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          
          <button 
            className={`refresh-button ${isRefreshing ? 'refreshing' : ''}`}
            onClick={handleRefresh}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleRefresh();
              }
            }}
            aria-label="Refresh Analysis"
            tabIndex={0}
          >
            {isRefreshing ? '🔄' : '⟳'} Refresh Analysis
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {activeView === 'overview' && (
          <>
            {/* Enhanced Metric Cards with Advanced Analysis */}
            <div className="metrics-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricsCard
                label="AI Health Score"
                value={healthMetrics.healthScore}
                status={healthMetrics.healthScore >= 80 ? 'good' : healthMetrics.healthScore >= 60 ? 'warning' : 'danger'}
                icon={<span aria-hidden="true">🧠</span>}
                unit="%"
                ariaLabel="AI Health Score"
              />
              <MetricsCard
                label="Memory Analytics"
                value={memoryMetrics.totalCount}
                status="neutral"
                icon={<span aria-hidden="true">📊</span>}
                unit="memories"
                ariaLabel="Total Memories"
              />
              <MetricsCard
                label="Storage Analytics"
                value={formatFileSize(memoryMetrics.storageSize)}
                status="neutral"
                icon={<span aria-hidden="true">💾</span>}
                unit="KB"
                ariaLabel="Storage Analytics"
              />
              <MetricsCard
                label="Optimization Score"
                value={healthMetrics.fragmentationScore}
                status={healthMetrics.fragmentationScore >= 80 ? 'good' : healthMetrics.fragmentationScore >= 60 ? 'warning' : 'danger'}
                icon={<span aria-hidden="true">🔧</span>}
                unit="%"
                ariaLabel="Optimization Score"
              />
            </div>

            {/* Advanced Analytics Display */}
            {showAdvancedAnalytics && (
              <div className="advanced-analytics">
                <h3>Advanced Analytics</h3>
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <h4>Tier Distribution Analysis</h4>
                    <div className="tier-breakdown">
                      {healthMetrics && healthMetrics.comprehensiveStats && healthMetrics.comprehensiveStats.tierDistribution
                        ? Object.entries(healthMetrics.comprehensiveStats.tierDistribution).map(([tier, count]) => (
                            <div key={tier} className={`tier-stat ${tier}`}>
                              <span className="tier-name">{tier.toUpperCase()}</span>
                              <span className="tier-count">{count ?? 0}</span>
                              <span className="tier-percentage">
                                ({
                                  healthMetrics.comprehensiveStats.tierPercentages &&
                                  typeof healthMetrics.comprehensiveStats.tierPercentages[tier as MemoryTier] === 'number'
                                    ? formatPercentage(healthMetrics.comprehensiveStats.tierPercentages[tier as MemoryTier])
                                    : 'N/A'
                                })
                              </span>
                            </div>
                          ))
                        : <div className="tier-stat">No data</div>}
                    </div>
                  </div>

                  <div className="analytics-card">
                    <h4>Efficiency Insights</h4>
                    <div className="efficiency-insights">
                      <div className="insight-stat">
                        <span className="stat-label">Misplaced Memories:</span>
                        <span className="stat-value">
                          {healthMetrics && healthMetrics.efficiencyMetrics && Array.isArray(healthMetrics.efficiencyMetrics.misplacedMemories)
                            ? healthMetrics.efficiencyMetrics.misplacedMemories.length
                            : 0}
                        </span>
                      </div>
                      <div className="insight-stat">
                        <span className="stat-label">Fragmentation Hotspots:</span>
                        <span className="stat-value">
                          {healthMetrics && healthMetrics.fragmentationAnalysis && Array.isArray(healthMetrics.fragmentationAnalysis.hotSpots)
                            ? healthMetrics.fragmentationAnalysis.hotSpots.length
                            : 0}
                        </span>
                      </div>
                      <div className="insight-stat">
                        <span className="stat-label">Storage Efficiency:</span>
                        <span className="stat-value">
                          {healthMetrics && healthMetrics.fragmentationAnalysis && healthMetrics.fragmentationAnalysis.wasteMetrics && typeof healthMetrics.fragmentationAnalysis.wasteMetrics.efficiency === 'number'
                            ? healthMetrics.fragmentationAnalysis.wasteMetrics.efficiency.toFixed(1) + '%'
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI-Powered Recommendations */}
            <div className="recommendations-container">
              <h3>AI-Powered Optimization Recommendations</h3>
              {healthMetrics.recommendations.length === 0 ? (
                <div className="no-recommendations">
                  <span className="icon">🎯</span>
                  <p>Your memory system is operating at peak efficiency! No optimizations needed.</p>
                </div>
              ) : (
                <div className="recommendations-list">
                  {healthMetrics.recommendations.map((rec) => (
                    <div key={rec.id} className={`recommendation-card ${rec.priority}`}>
                      <div className="recommendation-header">
                        <div className="recommendation-meta">
                          <span className={`priority-badge ${rec.priority}`}>
                            {rec.priority.toUpperCase()}
                          </span>
                          <span className={`type-badge ${rec.type}`}>
                            {rec.type}
                          </span>
                        </div>
                        <h4>{rec.title}</h4>
                      </div>
                      <div className="recommendation-body">
                        <p className="description">{rec.description}</p>
                        <p className="action"><strong>AI Recommendation:</strong> {rec.action}</p>
                        <p className="impact"><strong>Predicted Impact:</strong> {rec.impact}</p>
                      </div>
                      <div className="recommendation-actions">
                        <button 
                          className="action-button primary"
                          onClick={() => handleOptimizationAction(rec.id, rec.type)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleOptimizationAction(rec.id, rec.type);
                            }
                          }}
                          aria-label={`Apply AI Fix for ${rec.title}`}
                          tabIndex={0}
                        >
                          Apply AI Fix
                        </button>
                        <button
                          className="action-button secondary"
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              const tooltip = createTooltip();
                              // Type-safe: try to use nativeEvent if available
                              const mouseEvent = ('nativeEvent' in e && e.nativeEvent instanceof MouseEvent)
                                ? e.nativeEvent as MouseEvent
                                : undefined;
                              showTooltip(
                                tooltip,
                                `<div><strong>${rec.title}</strong></div><div>${rec.description}</div>`,
                                mouseEvent || (window.event as MouseEvent)
                              );
                            }
                          }}
                          aria-label="Show Analysis Details"
                          tabIndex={0}
                        >
                          Analysis Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeView === 'heatmap' && (
          <MemoryUsageHeatmap
            memories={memories}
            timeRange={timeRange}
            onHotspotClick={(data) => {
              console.log('Hotspot clicked:', data);
            }}
          />
        )}

        {activeView === 'distribution' && (
          <MemoryDistributionAnalysis
            memories={memories}
            onFragmentationDetected={(analysis) => {
              console.log('Fragmentation analysis:', analysis);
            }}
            enableInteraction={true}
          />
        )}

        {activeView === 'performance' && (
          <MemoryPerformanceMonitor
            memories={memories}
            refreshInterval={5000}
            onPerformanceAlert={(alert) => {
              console.log('Performance alert:', alert);
            }}
            onOptimizationRecommended={(rec) => {
              console.log('Optimization recommended:', rec);
            }}
          />
        )}
      </div>
    </div>
  );
}; 