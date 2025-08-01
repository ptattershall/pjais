import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { MemoryEntity, MemoryTier } from '@shared/types/memory';
import '../../styles/memory-timeline.css';

// Import shared utilities - showcasing temporal visualization patterns!
import {
  calculateDimensions,
  initializeSVG,
  createMainGroup,
  createTimeScale,
  calculateTimeDomain,
  createRadiusScale,
  createXAxis,
  addAxisLabel,
  processMemoriesForVisualization,
  formatMemoryTooltip,
  createTooltip,
  showTooltip,
  hideTooltip,
  removeAllTooltips,
  MEMORY_TIER_COLORS,
  type SVGDimensions,
  type ProcessedMemoryNode
} from './utils/d3-utils';

interface TimelineNode {
  id: string;
  entity: MemoryEntity;
  date: Date;
  tier: MemoryTier;
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface MemoryTimelineVisualizerProps {
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
  timeGranularity?: 'hour' | 'day' | 'week' | 'month';
  enableTooltips?: boolean;
}

export const MemoryTimelineVisualizer: React.FC<MemoryTimelineVisualizerProps> = ({
  userId: _userId,
  memories,
  selectedMemoryId,
  onMemorySelect,
  onMemoryHover,
  onTimeRangeChange,
  width = 1000,
  height = 400,
  enableBrush = true,
  showDensityChart: _showDensityChart = true,
  timeGranularity = 'day',
  enableTooltips = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<[Date, Date] | null>(null);
  const [currentGranularity, setCurrentGranularity] = useState(timeGranularity);

  // Calculate dimensions using shared utility
  const dimensions: SVGDimensions = useMemo(() => 
    calculateDimensions(width, height, { top: 20, right: 50, bottom: 60, left: 70 }), 
    [width, height]
  );

  const brushHeight = 60;
  const mainTimelineHeight = dimensions.innerHeight - brushHeight - 20;

  // Process memories using shared utilities
  const processedNodes = useMemo((): ProcessedMemoryNode[] => {
    const importanceValues = memories.map(m => m.importance || 0);
    const radiusScale = createRadiusScale(importanceValues, 3, 8); // Smaller range for timeline
    
    return processMemoriesForVisualization(memories, radiusScale);
  }, [memories]);

  // Convert to timeline nodes with temporal positioning
  const timelineNodes = useMemo((): TimelineNode[] => {
    return processedNodes
      .filter(node => node.date) // Only nodes with valid dates
      .map(node => ({
        id: node.id,
        entity: node.entity,
        date: node.date!,
        tier: node.tier,
        x: 0, // Will be calculated by time scale
        y: 0, // Will be calculated by tier positioning
        radius: node.radius,
        color: node.color // Already using shared colors!
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [processedNodes]);

  // Time domain using shared utility
  const timeDomain = useMemo((): [Date, Date] => 
    calculateTimeDomain(memories, 30), 
    [memories]
  );

  // Create time scale using shared utility
  const timeScale = useMemo(() => 
    createTimeScale(timeDomain, [dimensions.margin.left, width - dimensions.margin.right]), 
    [timeDomain, width, dimensions]
  );

  // Position nodes based on time scale and tier grouping
  const positionedNodes = useMemo((): TimelineNode[] => {
    const tierYPositions = {
      'hot': mainTimelineHeight * 0.2,
      'warm': mainTimelineHeight * 0.5,
      'cold': mainTimelineHeight * 0.8
    };

    // Group nodes by time buckets to avoid overlap
    const bucketSize = Math.max(1, dimensions.innerWidth / 100);
    const buckets = new Map<number, TimelineNode[]>();

    timelineNodes.forEach(node => {
      const x = timeScale(node.date);
      const bucketIndex = Math.floor((x - dimensions.margin.left) / bucketSize);
      
      if (!buckets.has(bucketIndex)) {
        buckets.set(bucketIndex, []);
      }
      buckets.get(bucketIndex)!.push(node);
    });

    // Position nodes within each bucket using smart jittering
    return timelineNodes.map(node => {
      const x = timeScale(node.date);
      const bucketIndex = Math.floor((x - dimensions.margin.left) / bucketSize);
      const bucketNodes = buckets.get(bucketIndex)!;
      const nodeIndex = bucketNodes.indexOf(node);
      
      // Base Y position for tier
      const baseY = tierYPositions[node.tier];
      
      // Add smart jitter for overlapping nodes in same bucket
      const jitterRange = 15;
      const jitter = bucketNodes.length > 1 
        ? (nodeIndex - (bucketNodes.length - 1) / 2) * (jitterRange / Math.max(bucketNodes.length, 1))
        : 0;
      
      return {
        ...node,
        x,
        y: dimensions.margin.top + baseY + jitter
      };
    });
  }, [timelineNodes, timeScale, dimensions, mainTimelineHeight]);

  // Handle brush selection with enhanced logic
  const handleBrushEnd = useCallback((selection: [number, number] | null) => {
    if (selection) {
      const [x0, x1] = selection;
      const startDate = timeScale.invert(x0);
      const endDate = timeScale.invert(x1);
      
      setSelectedTimeRange([startDate, endDate]);
      onTimeRangeChange?.(startDate, endDate);
    } else {
      setSelectedTimeRange(null);
      onTimeRangeChange?.(timeDomain[0], timeDomain[1]);
    }
  }, [timeScale, onTimeRangeChange, timeDomain]);

  // Render the timeline - dramatically simplified with shared utilities!
  useEffect(() => {
    if (!svgRef.current) return;

    // Initialize SVG using shared utility
    const svg = initializeSVG({ current: svgRef.current }, 'memory-timeline-container');
    if (!svg) return;

    // Create main group using shared utility
    const mainGroup = createMainGroup(svg, dimensions.margin, 'main-timeline');

    // Create tooltip using shared utility
    const tooltip = enableTooltips ? createTooltip({
      className: 'timeline-tooltip',
      zIndex: 1000
    }) : null;

    // Create time axis using shared utility
    createXAxis(mainGroup, timeScale, mainTimelineHeight, {
      tickCount: Math.floor(dimensions.innerWidth / 100),
      tickFormat: (domainValue) => {
        const date = domainValue as Date;
        return d3.timeFormat('%m/%d')(date);
      },
      fontSize: '11px'
    });

    // Add axis label using shared utility
    addAxisLabel(mainGroup, 'Timeline', 'x', dimensions, { x: 0, y: 35 });

    // Add tier labels using shared colors
    const tierYPositions = {
      'hot': mainTimelineHeight * 0.2,
      'warm': mainTimelineHeight * 0.5,
      'cold': mainTimelineHeight * 0.8
    };

    Object.entries(tierYPositions).forEach(([tier, yPos]) => {
      mainGroup.append('text')
        .attr('x', -10)
        .attr('y', yPos)
        .attr('text-anchor', 'end')
        .attr('alignment-baseline', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', MEMORY_TIER_COLORS[tier as MemoryTier]) // Using shared colors!
        .text(tier.toUpperCase());
    });

    // Render memory nodes with enhanced interactions
    mainGroup.append('g')
      .attr('class', 'memory-nodes')
      .selectAll('circle')
      .data(positionedNodes)
      .enter().append('circle')
      .attr('cx', d => d.x - dimensions.margin.left) // Adjust for group transform
      .attr('cy', d => d.y - dimensions.margin.top)   // Adjust for group transform
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('stroke', d => selectedMemoryId === d.id ? '#2c3e50' : '#fff')
      .attr('stroke-width', d => selectedMemoryId === d.id ? 2 : 1)
      .attr('opacity', d => {
        if (!selectedTimeRange) return 1;
        const [start, end] = selectedTimeRange;
        return d.date >= start && d.date <= end ? 1 : 0.3;
      })
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => {
        onMemorySelect?.(d.id);
      })
      .on('mouseover', (event, d) => {
        onMemoryHover?.(d.entity);
        
        // Show tooltip using shared utility
        if (enableTooltips && tooltip) {
          const tooltipContent = formatMemoryTooltip(d.entity);
          showTooltip(tooltip, tooltipContent, event);
        }
      })
      .on('mouseout', () => {
        onMemoryHover?.(null);
        
        // Hide tooltip using shared utility
        if (enableTooltips && tooltip) {
          hideTooltip(tooltip);
        }
      });

    // Add brush if enabled
    if (enableBrush) {
      const brushGroup = svg.append('g')
        .attr('class', 'brush-container')
        .attr('transform', `translate(0, ${height - brushHeight})`);

      // Create brush with enhanced extent
      const brush = d3.brushX()
        .extent([[dimensions.margin.left, 0], [width - dimensions.margin.right, brushHeight - 20]])
        .on('end', (event) => {
          handleBrushEnd(event.selection as [number, number] | null);
        });

      brushGroup.call(brush);

      // Add mini axis for context using shared time scale
      const miniScale = createTimeScale(timeDomain, [dimensions.margin.left, width - dimensions.margin.right], 0);

      const miniAxis = d3.axisBottom(miniScale)
        .ticks(5)
        .tickFormat((domainValue) => {
          const date = domainValue as Date;
          return d3.timeFormat('%m/%d')(date);
        });

      brushGroup.append('g')
        .attr('class', 'mini-axis')
        .attr('transform', `translate(0, ${brushHeight - 20})`)
        .call(miniAxis as any)
        .selectAll('text')
        .style('font-size', '10px');
    }

    // Cleanup function
    return () => {
      removeAllTooltips('timeline-tooltip');
    };

  }, [
    timeScale, dimensions, mainTimelineHeight, brushHeight, positionedNodes, 
    selectedMemoryId, selectedTimeRange, enableBrush, enableTooltips,
    onMemorySelect, onMemoryHover, width, height, timeDomain, handleBrushEnd
  ]);

  return (
    <div className="memory-timeline-visualizer">
      <div className="timeline-controls">
        <div className="granularity-controls">
          <label>Time Granularity:</label>
          <select 
            value={currentGranularity} 
            onChange={(e) => {
              setCurrentGranularity(e.target.value as typeof timeGranularity);
            }}
          >
            <option value="hour">Hour</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
        
        {selectedTimeRange && (
          <div className="time-range-display">
            <span>Selected: {selectedTimeRange[0].toLocaleDateString()} - {selectedTimeRange[1].toLocaleDateString()}</span>
            <button onClick={() => {
              setSelectedTimeRange(null);
              onTimeRangeChange?.(timeDomain[0], timeDomain[1]);
            }}>Clear Selection</button>
          </div>
        )}
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: '1px solid #e1e5e9', borderRadius: '8px' }}
      />

      <div className="timeline-legend">
        <div className="tier-legend">
          <h4>Memory Tiers</h4>
          {Object.entries(MEMORY_TIER_COLORS).map(([tier, color]) => (
            <div key={tier} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: color }}
              />
              <span>{tier}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 