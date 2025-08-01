import React, { useMemo, useRef, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  registerMemoryCharts,
  getTierChartData,
  getHourlyChartData,
  getDailyChartData,
  getDefaultChartOptions,
  getAccessibleChartProps,
} from './utils/chart-utils';
import {
  UsagePattern,
  UsageMetrics,
  MemoryUsageAnalyticsProps
} from './types/analytics-types';

registerMemoryCharts();

export const MemoryUsageAnalytics: React.FC<MemoryUsageAnalyticsProps> = ({
  memories,
  timeRange,
  onPatternDetected
}) => {
  const chartRefs = {
    hourly: useRef(null),
    daily: useRef(null),
    tiers: useRef(null)
  };

  // Calculate comprehensive usage metrics
  const usageMetrics = useMemo((): UsageMetrics => {
    const now = new Date();
    const timeRangeMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    }[timeRange];

    const relevantMemories = memories.filter(memory => {
      const lastAccessed = memory.lastAccessed ? new Date(memory.lastAccessed) : new Date(memory.createdAt || now);
      return (now.getTime() - lastAccessed.getTime()) <= timeRangeMs;
    });

    // Hourly activity pattern (0-23 hours)
    const hourlyActivity = new Array(24).fill(0);
    relevantMemories.forEach(memory => {
      const lastAccessed = memory.lastAccessed ? new Date(memory.lastAccessed) : new Date(memory.createdAt || now);
      const hour = lastAccessed.getHours();
      hourlyActivity[hour]++;
    });

    // Daily access patterns
    const dailyMap = new Map<string, { count: number; importance: number }>();
    relevantMemories.forEach(memory => {
      const lastAccessed = memory.lastAccessed ? new Date(memory.lastAccessed) : new Date(memory.createdAt || now);
      const dateKey = lastAccessed.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { count: 0, importance: 0 };
      dailyMap.set(dateKey, {
        count: existing.count + 1,
        importance: existing.importance + (memory.importance || 0)
      });
    });

    const dailyAccess = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        importance: data.importance / data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days

    // Tier activity analysis
    const tierMap = new Map<string, { accesses: number; totalImportance: number; count: number }>();
    relevantMemories.forEach(memory => {
      const tier = memory.memoryTier || 'cold';
      const existing = tierMap.get(tier) || { accesses: 0, totalImportance: 0, count: 0 };
      tierMap.set(tier, {
        accesses: existing.accesses + 1,
        totalImportance: existing.totalImportance + (memory.importance || 0),
        count: existing.count + 1
      });
    });

    const tierActivity = Array.from(tierMap.entries()).map(([tier, data]) => ({
      tier,
      accesses: data.accesses,
      avgImportance: data.count > 0 ? data.totalImportance / data.count : 0
    }));

    // Type distribution
    const typeMap = new Map<string, number>();
    relevantMemories.forEach(memory => {
      typeMap.set(memory.type, (typeMap.get(memory.type) || 0) + 1);
    });

    const totalCount = relevantMemories.length;
    const typeDistribution = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: totalCount > 0 ? (count / totalCount) * 100 : 0
    }));

    // Access trends by week (mock for demonstration - real implementation would track historical data)
    const accessTrends = Array.from({ length: 12 }, (_, i) => {
      const weekOffset = i - 11;
      const weekDate = new Date(now.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000);
      return {
        week: weekDate.toISOString().slice(0, 10),
        hot: Math.max(0, tierActivity.find(t => t.tier === 'hot')?.accesses || 0) + Math.random() * 10 - 5,
        warm: Math.max(0, tierActivity.find(t => t.tier === 'warm')?.accesses || 0) + Math.random() * 15 - 7,
        cold: Math.max(0, tierActivity.find(t => t.tier === 'cold')?.accesses || 0) + Math.random() * 20 - 10
      };
    });

    return {
      hourlyActivity,
      dailyAccess,
      tierActivity,
      typeDistribution,
      accessTrends
    };
  }, [memories, timeRange]);

  // Detect usage patterns and generate insights
  const detectedPatterns = useMemo((): UsagePattern[] => {
    const patterns: UsagePattern[] = [];

    // Peak hours detection
    const maxHourlyActivity = Math.max(...usageMetrics.hourlyActivity);
    const peakHours = usageMetrics.hourlyActivity
      .map((activity, hour) => ({ hour, activity }))
      .filter(({ activity }) => activity > maxHourlyActivity * 0.7)
      .map(({ hour }) => hour);

    if (peakHours.length > 0) {
      patterns.push({
        type: 'peak_hours',
        description: `Peak memory access hours detected: ${peakHours.join(', ')}:00`,
        confidence: 0.85,
        recommendation: 'Schedule memory optimization during low-activity hours',
        data: { peakHours, maxActivity: maxHourlyActivity }
      });
    }

    // Tier imbalance detection
    const tierCounts = usageMetrics.tierActivity.reduce((acc, tier) => {
      acc[tier.tier] = tier.accesses;
      return acc;
    }, {} as Record<string, number>);

    const totalAccesses = Object.values(tierCounts).reduce((sum, count) => sum + count, 0);
    const hotRatio = (tierCounts.hot || 0) / totalAccesses;

    if (hotRatio > 0.4) { // More than 40% in hot tier
      patterns.push({
        type: 'tier_imbalance',
        description: 'High concentration of memories in hot tier detected',
        confidence: 0.9,
        recommendation: 'Consider promoting important warm memories and demoting stale hot memories',
        data: { hotRatio, tierCounts }
      });
    }

    return patterns;
  }, [usageMetrics]);

  // Notify parent of detected patterns
  useEffect(() => {
    detectedPatterns.forEach(pattern => {
      onPatternDetected?.(pattern);
    });
  }, [detectedPatterns, onPatternDetected]);

  // Chart configurations using shared utils
  const hourlyChartConfig = useMemo(() => ({
    data: getHourlyChartData(usageMetrics, 24),
    options: {
      ...getDefaultChartOptions('line', 'Hourly Memory Access Pattern'),
      scales: {
        x: { title: { display: true, text: 'Hour of Day' } },
        y: { title: { display: true, text: 'Access Count' }, beginAtZero: true }
      }
    }
  }), [usageMetrics]);

  const dailyChartConfig = useMemo(() => ({
    data: getDailyChartData(usageMetrics, 60),
    options: {
      ...getDefaultChartOptions('bar', 'Daily Access vs Importance'),
      scales: {
        x: { title: { display: true, text: 'Date' } },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: { display: true, text: 'Access Count' }
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: { display: true, text: 'Average Importance' },
          grid: { drawOnChartArea: false }
        }
      }
    }
  }), [usageMetrics]);

  const tierChartConfig = useMemo(() => ({
    data: getTierChartData(usageMetrics),
    options: {
      ...getDefaultChartOptions('bar', 'Memory Tier Activity'),
      scales: {
        x: { title: { display: true, text: 'Memory Tier' } },
        y: { title: { display: true, text: 'Access Count' }, beginAtZero: true }
      }
    }
  }), [usageMetrics]);

  return (
    <div className="memory-usage-analytics">
      <div className="analytics-grid">
        <div className="chart-container">
          <Line ref={chartRefs.hourly} {...hourlyChartConfig} {...getAccessibleChartProps('Hourly Memory Access Pattern')} />
        </div>
        <div className="chart-container">
          <Bar ref={chartRefs.daily} {...dailyChartConfig} {...getAccessibleChartProps('Daily Access vs Importance')} />
        </div>
        <div className="chart-container">
          <Bar ref={chartRefs.tiers} {...tierChartConfig} {...getAccessibleChartProps('Memory Tier Activity')} />
        </div>
        <div className="insights-container">
          <h4>Usage Insights</h4>
          {detectedPatterns.length === 0 ? (
            <p className="no-patterns">No significant patterns detected in current timeframe.</p>
          ) : (
            <div className="patterns-list">
              {detectedPatterns.map((pattern, index) => (
                <div key={index} className={`pattern-card ${pattern.type}`}>
                  <div className="pattern-header">
                    <span className="confidence-badge">{Math.round(pattern.confidence * 100)}%</span>
                    <h5>{pattern.description}</h5>
                  </div>
                  <p className="recommendation">{pattern.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="metrics-summary">
        <div className="summary-grid">
          <div className="summary-card">
            <span className="metric-label">Peak Activity Hour</span>
            <span className="metric-value">
              {usageMetrics.hourlyActivity.indexOf(Math.max(...usageMetrics.hourlyActivity))}:00
            </span>
          </div>
          <div className="summary-card">
            <span className="metric-label">Most Active Tier</span>
            <span className="metric-value">
              {usageMetrics.tierActivity.reduce((max, tier) =>
                tier.accesses > max.accesses ? tier : max,
                usageMetrics.tierActivity[0] || { tier: 'N/A', accesses: 0 }
              ).tier.toUpperCase()}
            </span>
          </div>
          <div className="summary-card">
            <span className="metric-label">Dominant Type</span>
            <span className="metric-value">
              {usageMetrics.typeDistribution.reduce((max, type) =>
                type.count > max.count ? type : max,
                usageMetrics.typeDistribution[0] || { type: 'N/A', count: 0 }
              ).type}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}; 