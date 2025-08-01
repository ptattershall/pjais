import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { MemoryEntity, MemoryTier } from '@shared/types/memory';

// Import shared utilities - this is the power of Phase 2.3!
import {
  calculateDimensions,
  initializeSVG,
  createMainGroup,
  createBandScale,
  createLinearScale,
  createEfficiencyColorScale,
  createXAxis,
  createYAxis,
  addAxisLabel,
  createTooltip,
  showTooltip,
  hideTooltip,
  removeAllTooltips,
  createLegend,
  MEMORY_TIER_COLORS,
  type SVGDimensions,
  type LegendItem
} from './utils/d3-utils';

import {
  calculateFragmentationAnalysis,
  calculateMemoryStats,
  type FragmentationAnalysis
} from './utils/calculation-utils';

interface MemoryDistributionAnalysisProps {
  memories: MemoryEntity[];
  onFragmentationDetected?: (analysis: FragmentationAnalysis) => void;
  enableInteraction?: boolean;
  width?: number;
  height?: number;
}

interface DistributionData {
  tier: MemoryTier;
  count: number;
  totalImportance: number;
  avgImportance: number;
  storageSize: number;
  efficiency: number;
  color: string;
}

export const MemoryDistributionAnalysis: React.FC<MemoryDistributionAnalysisProps> = ({
  memories,
  onFragmentationDetected,
  enableInteraction = true,
  width = 600,
  height = 400
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate dimensions using shared utility
  const dimensions: SVGDimensions = useMemo(() => 
    calculateDimensions(width, height, { top: 20, right: 120, bottom: 60, left: 80 }), 
    [width, height]
  );

  // Use shared calculation utility for fragmentation analysis
  const fragmentationAnalysis = useMemo((): FragmentationAnalysis => 
    calculateFragmentationAnalysis(memories), 
    [memories]
  );

  // Process distribution data using shared memory stats
  const distributionData = useMemo((): DistributionData[] => {
    const memoryStats = calculateMemoryStats(memories);
    
    return (['hot', 'warm', 'cold'] as MemoryTier[]).map(tier => {
      const tierMemories = memories.filter(m => (m.memoryTier || 'cold') === tier);
      const count = memoryStats.tierDistribution[tier];
      const totalImportance = tierMemories.reduce((sum, m) => sum + (m.importance || 0), 0);
      const avgImportance = count > 0 ? totalImportance / count : 0;
      
      // Calculate storage size for this tier
      const storageSize = tierMemories.reduce((sum, memory) => {
        const content = typeof memory.content === 'string' 
          ? memory.content 
          : JSON.stringify(memory.content);
        return sum + content.length;
      }, 0);

      // Efficiency calculation aligned with shared analysis
      const efficiency = fragmentationAnalysis.wasteMetrics.efficiency;
      
      return {
        tier,
        count,
        totalImportance,
        avgImportance,
        storageSize,
        efficiency: tier === 'hot' && avgImportance >= 70 ? 90 :
                   tier === 'warm' && avgImportance >= 40 && avgImportance < 70 ? 85 :
                   tier === 'cold' && avgImportance < 40 ? 80 :
                   efficiency, // Use overall efficiency as fallback
        color: MEMORY_TIER_COLORS[tier] // Using shared colors!
      };
    }).filter(d => d.count > 0); // Only show tiers with data
  }, [memories, fragmentationAnalysis]);

  // D3.js visualization effect - dramatically simplified!
  useEffect(() => {
    if (!svgRef.current || distributionData.length === 0) return;

    // Initialize SVG using shared utility
    const svg = initializeSVG({ current: svgRef.current }, 'distribution-chart');
    if (!svg) return;

    // Create main group using shared utility
    const mainGroup = createMainGroup(svg, dimensions.margin);

    // Create scales using shared utilities
    const xScale = createBandScale(
      distributionData.map(d => d.tier),
      [0, dimensions.innerWidth],
      0.2
    );

    const yScale = createLinearScale(
      [0, d3.max(distributionData, d => d.count) || 0],
      [dimensions.innerHeight, 0]
    );

    const sizeScale = createLinearScale(
      d3.extent(distributionData, d => d.storageSize) as [number, number],
      [20, 80]
    );

    // Create efficiency color scale using shared utility
    const efficiencyScale = createEfficiencyColorScale([0, 100]);

    // Create tooltip using shared utility
    const tooltip = enableInteraction ? createTooltip({
      className: 'distribution-tooltip',
      zIndex: 1000
    }) : null;

    // Create bars
    const bars = mainGroup.selectAll('.bar-group')
      .data(distributionData)
      .enter().append('g')
      .attr('class', 'bar-group')
      .attr('transform', d => `translate(${xScale(d.tier)},0)`);

    // Main bars (count)
    bars.append('rect')
      .attr('class', 'count-bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.count))
      .attr('width', xScale.bandwidth() * 0.6)
      .attr('height', d => dimensions.innerHeight - yScale(d.count))
      .attr('fill', d => d.color)
      .attr('opacity', 0.8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Efficiency indicators using shared color scale
    bars.append('circle')
      .attr('class', 'efficiency-indicator')
      .attr('cx', xScale.bandwidth() * 0.8)
      .attr('cy', d => yScale(d.count / 2))
      .attr('r', d => sizeScale(d.storageSize) / 6)
      .attr('fill', d => efficiencyScale(d.efficiency))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add interactive tooltips using shared utilities
    if (enableInteraction && tooltip) {
      bars.on('mouseover', (event, d) => {
        const content = `
          <strong>${d.tier.toUpperCase()} Tier</strong><br/>
          Count: ${d.count}<br/>
          Avg Importance: ${d.avgImportance.toFixed(1)}<br/>
          Storage: ${(d.storageSize / 1024).toFixed(1)}KB<br/>
          Efficiency: ${d.efficiency.toFixed(1)}%
        `;
        showTooltip(tooltip, content, event);
      })
      .on('mouseout', () => {
        hideTooltip(tooltip);
      });
    }

    // Create axes using shared utilities
    createXAxis(mainGroup, xScale, dimensions.innerHeight, {
      fontSize: '12px',
      fontWeight: '600'
    });

    createYAxis(mainGroup, yScale, {
      fontSize: '11px'
    });

    // Add axis labels using shared utility
    addAxisLabel(mainGroup, 'Memory Tier', 'x', dimensions);
    addAxisLabel(mainGroup, 'Memory Count', 'y', dimensions);

    // Create legend using shared utility
    const legendItems: LegendItem[] = [
      {
        label: 'High Efficiency',
        color: efficiencyScale(90),
        type: 'circle',
        size: 8
      },
      {
        label: 'Low Efficiency', 
        color: efficiencyScale(30),
        type: 'circle',
        size: 8
      }
    ];

    createLegend(
      svg,
      legendItems,
      { x: width - 100, y: 30 },
      'Efficiency'
    );

    // Optimal distribution reference lines
    const optimalRatios = { hot: 0.2, warm: 0.3, cold: 0.5 };
    const totalMemories = memories.length;

    Object.entries(optimalRatios).forEach(([tier, ratio]) => {
      const tierKey = tier as MemoryTier;
      const xPos = xScale(tierKey);
      if (xPos !== undefined) {
        mainGroup.append('line')
          .attr('class', 'optimal-line')
          .attr('x1', xPos + xScale.bandwidth() * 0.1)
          .attr('x2', xPos + xScale.bandwidth() * 0.9)
          .attr('y1', yScale(ratio * totalMemories))
          .attr('y2', yScale(ratio * totalMemories))
          .attr('stroke', '#64748b')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5')
          .attr('opacity', 0.7);
      }
    });

    // Add optimal line label
    mainGroup.append('text')
      .attr('x', dimensions.innerWidth - 80)
      .attr('y', 15)
      .style('font-size', '11px')
      .style('fill', '#64748b')
      .text('Optimal Distribution');

    // Cleanup function
    return () => {
      removeAllTooltips('distribution-tooltip');
    };

  }, [distributionData, dimensions, enableInteraction, memories.length, width]);

  // Notify parent of fragmentation analysis
  useEffect(() => {
    onFragmentationDetected?.(fragmentationAnalysis);
  }, [fragmentationAnalysis, onFragmentationDetected]);

  return (
    <div className="memory-distribution-analysis">
      <div className="analysis-header">
        <h3>Memory Distribution Analysis</h3>
        <div className="fragmentation-score">
          <span className="label">Fragmentation Score:</span>
          <span className={`score ${fragmentationAnalysis.score > 60 ? 'high' : fragmentationAnalysis.score > 30 ? 'medium' : 'low'}`}>
            {fragmentationAnalysis.score.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="visualization-container">
        <svg 
          ref={svgRef} 
          width={width} 
          height={height}
          className="distribution-chart"
        />
      </div>

      <div className="distribution-insights">
        <div className="insights-grid">
          <div className="insight-card">
            <h4>Current Distribution</h4>
            <div className="ratio-bars">
              {Object.entries(fragmentationAnalysis.distribution.current).map(([tier, ratio]) => (
                <div key={tier} className="ratio-bar">
                  <span className="tier-name">{tier}</span>
                  <div className="bar-track">
                    <div 
                      className={`bar-fill ${tier}`}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                  <span className="ratio-value">{(ratio * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="insight-card">
            <h4>Efficiency Analysis</h4>
            <p className="waste-metric">
              Storage Waste: <span className="value">{fragmentationAnalysis.wasteMetrics.underUtilized.toFixed(1)}%</span>
            </p>
            <div className="efficiency-status">
              {fragmentationAnalysis.score < 20 && fragmentationAnalysis.wasteMetrics.underUtilized < 15 ? (
                <span className="status optimal">✓ Well Optimized</span>
              ) : (
                <span className="status suboptimal">⚠ Needs Optimization</span>
              )}
            </div>
          </div>

          {fragmentationAnalysis.hotSpots.length > 0 && (
            <div className="insight-card hot-spots">
              <h4>Optimization Hotspots</h4>
              <ul className="hotspot-list">
                {fragmentationAnalysis.hotSpots.map((spot, index) => (
                  <li key={index} className="hotspot-item">
                    <span className={`tier-badge ${spot.tier}`}>{spot.tier}</span>
                    <span className="recommendation">{spot.recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 