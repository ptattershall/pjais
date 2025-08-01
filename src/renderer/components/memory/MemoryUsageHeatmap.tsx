import React, { useMemo } from 'react';
import { MemoryEntity, MemoryTier } from '@shared/types/memory';

interface MemoryUsageHeatmapProps {
  memories: MemoryEntity[];
  timeRange: '24h' | '7d' | '30d' | '90d';
  onHotspotClick?: (data: HeatmapData) => void;
}

interface HeatmapData {
  hour: number;
  day: number;
  value: number;
  tier: MemoryTier;
  count: number;
  avgImportance: number;
}

interface HeatmapAnalysis {
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

export const MemoryUsageHeatmap: React.FC<MemoryUsageHeatmapProps> = ({
  memories,
  timeRange,
  onHotspotClick
}) => {
  // Process memory data into heatmap format
  const heatmapData = useMemo((): HeatmapData[] => {
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

    // Create 24x7 grid (hours x days)
    const data: HeatmapData[] = [];
    const dayMap = new Map<string, Map<number, { count: number; importance: number; tiers: Record<MemoryTier, number> }>>();

    relevantMemories.forEach(memory => {
      const lastAccessed = memory.lastAccessed ? new Date(memory.lastAccessed) : new Date(memory.createdAt || now);
      const dayKey = lastAccessed.getDay().toString(); // 0-6 (Sunday-Saturday)
      const hour = lastAccessed.getHours(); // 0-23
      const tier = memory.memoryTier || 'cold';

      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, new Map());
      }

      const dayData = dayMap.get(dayKey)!;
      if (!dayData.has(hour)) {
        dayData.set(hour, { count: 0, importance: 0, tiers: { hot: 0, warm: 0, cold: 0 } });
      }

      const hourData = dayData.get(hour)!;
      hourData.count++;
      hourData.importance += memory.importance || 0;
      hourData.tiers[tier]++;
    });

    // Generate heatmap data for all hours and days
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const dayKey = day.toString();
        const dayData = dayMap.get(dayKey);
        const hourData = dayData?.get(hour);

        if (hourData) {
          const dominantTier = Object.entries(hourData.tiers).reduce((max, [tier, count]) => 
            count > max.count ? { tier: tier as MemoryTier, count } : max,
            { tier: 'cold' as MemoryTier, count: 0 }
          ).tier;

          data.push({
            hour,
            day,
            value: hourData.count,
            tier: dominantTier,
            count: hourData.count,
            avgImportance: hourData.importance / hourData.count
          });
        } else {
          data.push({
            hour,
            day,
            value: 0,
            tier: 'cold',
            count: 0,
            avgImportance: 0
          });
        }
      }
    }

    return data;
  }, [memories, timeRange]);

  // Analyze heatmap patterns
  const heatmapAnalysis = useMemo((): HeatmapAnalysis => {
    const maxValue = Math.max(...heatmapData.map(d => d.value));
    const highActivityThreshold = maxValue * 0.7;
    const lowActivityThreshold = maxValue * 0.1;

    // Find peak periods
    const peakPeriods = heatmapData
      .filter(d => d.value >= highActivityThreshold)
      .map(d => ({
        period: `${getDayName(d.day)} ${d.hour}:00`,
        intensity: (d.value / maxValue) * 100,
        recommendation: d.tier === 'hot' ? 'Prime optimization window' : 'Consider tier promotion'
      }))
      .slice(0, 5); // Top 5 peaks

    // Find cold spots (optimization opportunities)
    const coldSpots = heatmapData
      .filter(d => d.value <= lowActivityThreshold && d.value > 0)
      .map(d => ({
        period: `${getDayName(d.day)} ${d.hour}:00`,
        efficiency: (d.avgImportance / 100) * 100,
        opportunity: d.tier === 'hot' ? 'Demote to save resources' : 'Archive opportunity'
      }))
      .slice(0, 3); // Top 3 cold spots

    // Determine access pattern
    const highActivityCount = heatmapData.filter(d => d.value >= highActivityThreshold).length;
    const totalActiveSlots = heatmapData.filter(d => d.value > 0).length;
    
    let accessPattern: 'concentrated' | 'distributed' | 'random' = 'random';
    if (highActivityCount / totalActiveSlots > 0.3) {
      accessPattern = 'concentrated';
    } else if (totalActiveSlots > 100) {
      accessPattern = 'distributed';
    }

    // Calculate optimization score
    const tierEfficiency = heatmapData.reduce((acc, d) => {
      if (d.value === 0) return acc;
      const tierWeight = d.tier === 'hot' ? 3 : d.tier === 'warm' ? 2 : 1;
      const importanceMatch = d.tier === 'hot' && d.avgImportance > 70 ? 1 : 
                             d.tier === 'warm' && d.avgImportance > 40 ? 1 : 
                             d.tier === 'cold' && d.avgImportance <= 40 ? 1 : 0.5;
      return acc + (tierWeight * importanceMatch);
    }, 0);

    const optimizationScore = Math.min(100, (tierEfficiency / heatmapData.filter(d => d.value > 0).length) * 30);

    return {
      peakPeriods,
      coldSpots,
      accessPattern,
      optimizationScore
    };
  }, [heatmapData]);

  const getDayName = (dayIndex: number): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayIndex];
  };

  const getIntensityColor = (value: number, tier: MemoryTier): string => {
    const maxValue = Math.max(...heatmapData.map(d => d.value));
    const intensity = maxValue > 0 ? value / maxValue : 0;
    
    const baseColors = {
      hot: [239, 68, 68],     // Red
      warm: [245, 158, 11],   // Orange
      cold: [59, 130, 246]    // Blue
    };

    const [r, g, b] = baseColors[tier];
    const alpha = Math.max(0.1, intensity);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleCellClick = (data: HeatmapData) => {
    onHotspotClick?.(data);
  };

  return (
    <div className="memory-usage-heatmap">
      <div className="heatmap-header">
        <h3>Memory Access Heatmap</h3>
        <div className="pattern-indicator">
          <span className="label">Pattern:</span>
          <span className={`pattern ${heatmapAnalysis.accessPattern}`}>
            {heatmapAnalysis.accessPattern.toUpperCase()}
          </span>
          <span className="score">
            Score: {heatmapAnalysis.optimizationScore.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="heatmap-container">
        <div className="heatmap-grid">
          <div className="time-labels">
            <div className="corner-label">Day/Hour</div>
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="hour-label">
                {i.toString().padStart(2, '0')}
              </div>
            ))}
          </div>

          {Array.from({ length: 7 }, (_, day) => (
            <div key={day} className="heatmap-row">
              <div className="day-label">{getDayName(day)}</div>
              {Array.from({ length: 24 }, (_, hour) => {
                const cellData = heatmapData.find(d => d.day === day && d.hour === hour);
                return (
                  <div
                    key={hour}
                    className={`heatmap-cell ${cellData?.tier || 'cold'}`}
                    style={{
                      backgroundColor: cellData ? getIntensityColor(cellData.value, cellData.tier) : '#f8f9fa'
                    }}
                    onClick={() => cellData && handleCellClick(cellData)}
                    title={cellData ? 
                      `${getDayName(day)} ${hour}:00\nAccess Count: ${cellData.count}\nTier: ${cellData.tier}\nAvg Importance: ${cellData.avgImportance.toFixed(1)}` 
                      : `${getDayName(day)} ${hour}:00\nNo activity`
                    }
                  >
                    {cellData && cellData.value > 0 && (
                      <span className="cell-value">{cellData.value}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="heatmap-legend">
          <h4>Legend</h4>
          <div className="legend-tiers">
            <div className="legend-item">
              <div className="legend-color hot"></div>
              <span>Hot Tier</span>
            </div>
            <div className="legend-item">
              <div className="legend-color warm"></div>
              <span>Warm Tier</span>
            </div>
            <div className="legend-item">
              <div className="legend-color cold"></div>
              <span>Cold Tier</span>
            </div>
          </div>
          <div className="intensity-scale">
            <span>Low Activity</span>
            <div className="scale-bar">
              <div className="scale-gradient"></div>
            </div>
            <span>High Activity</span>
          </div>
        </div>
      </div>

      <div className="heatmap-insights">
        <div className="insights-grid">
          <div className="insight-panel">
            <h4>Peak Activity Periods</h4>
            {heatmapAnalysis.peakPeriods.length === 0 ? (
              <p className="no-data">No significant peaks detected</p>
            ) : (
              <ul className="peaks-list">
                {heatmapAnalysis.peakPeriods.map((peak, index) => (
                  <li key={index} className="peak-item">
                    <span className="period">{peak.period}</span>
                    <span className="intensity">{peak.intensity.toFixed(0)}%</span>
                    <span className="recommendation">{peak.recommendation}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="insight-panel">
            <h4>Optimization Opportunities</h4>
            {heatmapAnalysis.coldSpots.length === 0 ? (
              <p className="no-data">No optimization opportunities found</p>
            ) : (
              <ul className="coldspots-list">
                {heatmapAnalysis.coldSpots.map((spot, index) => (
                  <li key={index} className="coldspot-item">
                    <span className="period">{spot.period}</span>
                    <span className="efficiency">{spot.efficiency.toFixed(0)}%</span>
                    <span className="opportunity">{spot.opportunity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 
