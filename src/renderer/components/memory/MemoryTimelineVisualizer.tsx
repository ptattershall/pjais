import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { MemoryEntity } from '@shared/types/memory';

interface MemoryTimelineVisualizerProps {
  userId: string;
  memories: MemoryEntity[];
  selectedMemoryId?: string;
  onMemorySelect: (memoryId: string) => void;
  onMemoryHover?: (memory: MemoryEntity | null) => void;
  onTimeRangeChange?: (start: Date, end: Date) => void;
  width?: number;
  height?: number;
  enableBrush?: boolean;
  showDensityChart?: boolean;
  timeGranularity?: 'hour' | 'day' | 'week' | 'month';
}

interface TimelineDataPoint {
  date: Date;
  memory: MemoryEntity;
  x: number;
  y: number;
}

export const MemoryTimelineVisualizer: React.FC<MemoryTimelineVisualizerProps> = ({
  userId: _userId,
  memories,
  selectedMemoryId,
  onMemorySelect,
  onMemoryHover,
  onTimeRangeChange,
  width = 1000,
  height = 500,
  enableBrush = true,
  showDensityChart = true,
  timeGranularity: _timeGranularity = 'day'
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredMemory, setHoveredMemory] = useState<MemoryEntity | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<[Date, Date] | null>(null);

  // Process memories into timeline data points
  const timelineData: TimelineDataPoint[] = memories
    .filter(memory => memory.createdAt)
    .map(memory => ({
      date: new Date(memory.createdAt!),
      memory,
      x: 0, // Will be calculated by time scale
      y: memory.importance || 0
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Color scale for memory types
  const colorScale = d3.scaleOrdinal<string>()
    .domain(['text', 'image', 'audio', 'video', 'file'])
    .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']);

  // Size scale for importance
  const sizeScale = d3.scaleLinear()
    .domain(d3.extent(memories, d => d.importance || 0) as [number, number])
    .range([4, 12]);

  // Initialize timeline visualization
  const initializeTimeline = useCallback(() => {
    if (!svgRef.current || timelineData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.bottom - margin.top;

    // Create time scale
    const timeExtent = d3.extent(timelineData, d => d.date) as [Date, Date];
    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, chartWidth]);

    // Create importance scale
    const yScale = d3.scaleLinear()
      .domain([0, 100]) // Importance is 0-100
      .range([chartHeight, 0]);

    // Main chart group
    const chartGroup = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat('%m/%d') as any);
    
    const yAxis = d3.axisLeft(yScale);

    chartGroup.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(xAxis);

    chartGroup.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);

    // Add axis labels
    chartGroup.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (chartHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('Importance');

    chartGroup.append('text')
      .attr('transform', `translate(${chartWidth / 2}, ${chartHeight + margin.bottom})`)
      .style('text-anchor', 'middle')
      .text('Time');

    // Create density chart if enabled
    if (showDensityChart) {
      const densityHeight = 60;
      const densityGroup = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${height - densityHeight - 10})`);

      // Group memories by time interval
      const timeInterval = d3.timeDay; // Can be adjusted based on timeGranularity
      const densityData = d3.rollup(
        timelineData,
        v => v.length,
        d => timeInterval.floor(d.date)
      );

      const densityArray = Array.from(densityData, ([date, count]) => ({ date, count }));
      const densityXScale = d3.scaleTime()
        .domain(timeExtent)
        .range([0, chartWidth]);

      const densityYScale = d3.scaleLinear()
        .domain([0, d3.max(densityArray, d => d.count) || 1])
        .range([densityHeight, 0]);

      // Create density bars
      densityGroup.selectAll('.density-bar')
        .data(densityArray)
        .enter().append('rect')
        .attr('class', 'density-bar')
        .attr('x', d => densityXScale(d.date))
        .attr('y', d => densityYScale(d.count))
        .attr('width', chartWidth / densityArray.length)
        .attr('height', d => densityHeight - densityYScale(d.count))
        .attr('fill', '#e0e0e0')
        .attr('stroke', '#ccc');

      // Add density axis
      const densityAxis = d3.axisLeft(densityYScale).ticks(3);
      densityGroup.append('g')
        .call(densityAxis);

      densityGroup.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -30)
        .attr('x', -densityHeight / 2)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Count');
    }

    // Add memory points
    const memoryPoints = chartGroup.selectAll('.memory-point')
      .data(timelineData)
      .enter().append('circle')
      .attr('class', 'memory-point')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.y))
      .attr('r', d => sizeScale(d.memory.importance || 0))
      .attr('fill', d => colorScale(d.memory.type))
      .attr('stroke', d => d.memory.id === selectedMemoryId ? '#00ff00' : '#fff')
      .attr('stroke-width', d => d.memory.id === selectedMemoryId ? 3 : 1)
      .style('opacity', 0.7)
      .style('cursor', 'pointer');

    // Add hover and click interactions
    memoryPoints
      .on('mouseenter', (event, d) => {
        setHoveredMemory(d.memory);
        onMemoryHover?.(d.memory);
        
        // Highlight point
        d3.select(event.currentTarget)
          .style('opacity', 1)
          .attr('stroke-width', 2);
      })
      .on('mouseleave', (event, d) => {
        setHoveredMemory(null);
        onMemoryHover?.(null);
        
        // Reset highlight
        d3.select(event.currentTarget)
          .style('opacity', 0.7)
          .attr('stroke-width', d.memory.id === selectedMemoryId ? 3 : 1);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        onMemorySelect(d.memory.id || '');
      });

    // Add brush for time range selection
    if (enableBrush && onTimeRangeChange) {
      const brush = d3.brushX()
        .extent([[0, 0], [chartWidth, chartHeight]])
        .on('end', (event) => {
          const selection = event.selection;
          if (selection) {
            const [x0, x1] = selection.map(xScale.invert);
            setSelectedTimeRange([x0, x1]);
            onTimeRangeChange(x0, x1);
          }
        });

      chartGroup.append('g')
        .attr('class', 'brush')
        .call(brush);
    }

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => {
        const newXScale = event.transform.rescaleX(xScale);
        
        // Update axis
        (chartGroup.select('.x-axis') as any)
          .call(d3.axisBottom(newXScale).tickFormat(d3.timeFormat('%m/%d') as any));
        
        // Update points
        memoryPoints
          .attr('cx', d => newXScale(d.date));
      });

    svg.call(zoom);

  }, [timelineData, width, height, selectedMemoryId, enableBrush, showDensityChart, onMemorySelect, onMemoryHover, onTimeRangeChange, colorScale, sizeScale]);

  // Initialize visualization
  useEffect(() => {
    initializeTimeline();
  }, [initializeTimeline]);

  return (
    <div className="memory-timeline-visualizer">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: '1px solid #ddd', borderRadius: '4px' }}
      />
      
      {/* Controls */}
      <div className="timeline-controls" style={{ marginTop: '10px', display: 'flex', gap: '20px', fontSize: '12px' }}>
        <div className="time-range-info">
          {selectedTimeRange && (
            <div>
              <strong>Selected Range:</strong> {selectedTimeRange[0].toLocaleDateString()} - {selectedTimeRange[1].toLocaleDateString()}
              <button 
                style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '10px' }}
                onClick={() => {
                  setSelectedTimeRange(null);
                  onTimeRangeChange?.(new Date(0), new Date());
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
        
        <div className="memory-count">
          <strong>Memories:</strong> {memories.length}
        </div>
      </div>

      {/* Legend */}
      <div className="timeline-legend" style={{ marginTop: '10px', display: 'flex', gap: '20px', fontSize: '12px' }}>
        <div className="memory-types">
          <strong>Memory Types:</strong>
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            {['text', 'image', 'audio', 'video', 'file'].map(type => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div 
                  style={{ 
                    width: '12px', 
                    height: '12px', 
                    backgroundColor: colorScale(type),
                    borderRadius: '50%' 
                  }}
                />
                <span>{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredMemory && (
        <div 
          className="timeline-tooltip"
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            maxWidth: '250px',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          <div><strong>Date:</strong> {hoveredMemory.createdAt ? new Date(hoveredMemory.createdAt).toLocaleString() : 'Unknown'}</div>
          <div><strong>Type:</strong> {hoveredMemory.type}</div>
          <div><strong>Importance:</strong> {hoveredMemory.importance}</div>
          <div><strong>Content:</strong> {hoveredMemory.content?.substring(0, 60)}...</div>
        </div>
      )}
    </div>
  );
};
