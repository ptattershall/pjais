import * as d3 from 'd3';
import { MemoryEntity, MemoryTier } from '@shared/types/memory';
import { 
  HTMLDivSelection,
  D3Selection,
  D3Transition,
  SVGGroupSelection,
  SVGSelection
} from '@shared/types/d3';

// =============================================================================
// COLOR SCHEMES & CONSTANTS
// =============================================================================

export const MEMORY_TIER_COLORS: Record<MemoryTier, string> = {
  'hot': '#ff6b6b',      // Warm red
  'warm': '#ffd93d',     // Yellow  
  'cold': '#74c0fc'      // Cool blue
};

export const RELATIONSHIP_COLORS: Record<string, string> = {
  causal: '#e74c3c',
  temporal: '#3498db',
  contextual: '#2ecc71',
  semantic: '#9b59b6',
  reference: '#f39c12',
  references: '#f39c12',
  similar: '#9b59b6',
  related: '#2ecc71'
};

export const DEFAULT_MARGINS = {
  top: 20,
  right: 50,
  bottom: 60,
  left: 70
};

// =============================================================================
// SVG SETUP UTILITIES
// =============================================================================

export interface SVGDimensions {
  width: number;
  height: number;
  margin: typeof DEFAULT_MARGINS;
  innerWidth: number;
  innerHeight: number;
}

export const calculateDimensions = (
  width: number, 
  height: number, 
  margin = DEFAULT_MARGINS
): SVGDimensions => ({
  width,
  height,
  margin,
  innerWidth: width - margin.left - margin.right,
  innerHeight: height - margin.top - margin.bottom
});

export const initializeSVG = (
  svgRef: React.RefObject<SVGSVGElement>,
  className = 'visualization-container'
): SVGSelection | null => {
  if (!svgRef.current) return null;
  
  const svg = d3.select(svgRef.current);
  svg.selectAll('*').remove(); // Clear previous content
  
  // Add main container class
  svg.attr('class', className);
  
  return svg;
};

export const createMainGroup = (
  svg: SVGSelection,
  margin: typeof DEFAULT_MARGINS,
  className = 'main-group'
): SVGGroupSelection => {
  return svg.append('g')
    .attr('class', className)
    .attr('transform', `translate(${margin.left}, ${margin.top})`);
};

// =============================================================================
// SCALE CREATION UTILITIES
// =============================================================================

export const createTimeScale = (
  domain: [Date, Date],
  range: [number, number],
  padding = 0.05
): d3.ScaleTime<number, number> => {
  const timePadding = (domain[1].getTime() - domain[0].getTime()) * padding;
  const paddedDomain: [Date, Date] = [
    new Date(domain[0].getTime() - timePadding),
    new Date(domain[1].getTime() + timePadding)
  ];
  
  return d3.scaleUtc()
    .domain(paddedDomain)
    .range(range)
    .nice();
};

export const createLinearScale = (
  domain: [number, number],
  range: [number, number]
): d3.ScaleLinear<number, number> => {
  return d3.scaleLinear()
    .domain(domain)
    .range(range);
};

export const createBandScale = (
  domain: string[],
  range: [number, number],
  padding = 0.2
): d3.ScaleBand<string> => {
  return d3.scaleBand()
    .domain(domain)
    .range(range)
    .padding(padding);
};

export const createEfficiencyColorScale = (
  domain: [number, number] = [0, 100]
): d3.ScaleSequential<string> => {
  return d3.scaleSequential(d3.interpolateRdYlGn)
    .domain(domain);
};

export const createRadiusScale = (
  importance: number[],
  baseRadius = 4,
  maxRadius = 15
): d3.ScaleLinear<number, number> => {
  const domain = d3.extent(importance) as [number, number];
  return d3.scaleLinear()
    .domain(domain)
    .range([baseRadius, maxRadius]);
};

// =============================================================================
// DATA TRANSFORMATION UTILITIES  
// =============================================================================

export interface ProcessedMemoryNode {
  id: string;
  entity: MemoryEntity;
  tier: MemoryTier;
  date: Date | null;
  importance: number;
  radius: number;
  color: string;
}

export const processMemoriesForVisualization = (
  memories: MemoryEntity[],
  radiusScale?: d3.ScaleLinear<number, number>
): ProcessedMemoryNode[] => {
  const importanceValues = memories.map(m => m.importance || 0);
  const defaultRadiusScale = radiusScale || createRadiusScale(importanceValues);
  
  return memories.map(memory => {
    const tier = (memory.memoryTier || 'cold') as MemoryTier;
    const importance = memory.importance || 0;
    const date = memory.createdAt ? new Date(memory.createdAt) : null;
    
    return {
      id: memory.id || `memory-${Date.now()}-${Math.random()}`,
      entity: memory,
      tier,
      date,
      importance,
      radius: defaultRadiusScale(importance),
      color: MEMORY_TIER_COLORS[tier]
    };
  });
};

export const calculateTimeDomain = (
  memories: MemoryEntity[],
  fallbackDays = 30
): [Date, Date] => {
  const validDates = memories
    .filter(m => m.createdAt)
    .map(m => new Date(m.createdAt!));
    
  if (validDates.length === 0) {
    const now = new Date();
    const fallback = new Date(now.getTime() - fallbackDays * 24 * 60 * 60 * 1000);
    return [fallback, now];
  }
  
  return d3.extent(validDates) as [Date, Date];
};

// =============================================================================
// INTERACTIVE BEHAVIOR UTILITIES
// =============================================================================

export interface TooltipConfig {
  className?: string;
  offset?: { x: number; y: number };
  zIndex?: number;
}

export const createTooltip = (config: TooltipConfig = {}): HTMLDivSelection => {
  const {
    className = 'visualization-tooltip',
    zIndex = 1000
  } = config;
  
  return d3.select('body').append('div')
    .attr('class', className)
    .style('position', 'absolute')
    .style('padding', '8px 12px')
    .style('background', 'rgba(0, 0, 0, 0.85)')
    .style('color', 'white')
    .style('border-radius', '6px')
    .style('font-size', '12px')
    .style('font-family', 'system-ui, -apple-system, sans-serif')
    .style('pointer-events', 'none')
    .style('opacity', '0')
    .style('z-index', zIndex.toString())
    .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.15)')
    .style('transition', 'opacity 0.2s ease');
};

export const showTooltip = (
  tooltip: HTMLDivSelection,
  content: string,
  event: MouseEvent,
  offset = { x: 10, y: -10 }
): void => {
  tooltip
    .style('opacity', '1')
    .style('left', (event.pageX + offset.x) + 'px')
    .style('top', (event.pageY + offset.y) + 'px')
    .html(content);
};

export const hideTooltip = (
  tooltip: HTMLDivSelection
): void => {
  tooltip.style('opacity', '0');
};

export const removeAllTooltips = (className = 'visualization-tooltip'): void => {
  d3.selectAll(`.${className}`).remove();
};

export const formatMemoryTooltip = (memory: MemoryEntity): string => {
  const content = typeof memory.content === 'string' 
    ? memory.content 
    : JSON.stringify(memory.content);
    
  const truncatedContent = content.length > 60 
    ? content.substring(0, 57) + '...' 
    : content;
    
  const createdDate = memory.createdAt 
    ? new Date(memory.createdAt).toLocaleDateString()
    : 'Unknown';
  
  return `
    <div><strong>${truncatedContent}</strong></div>
    <div>Tier: <span style="color: ${MEMORY_TIER_COLORS[memory.memoryTier || 'cold']}">${memory.memoryTier || 'cold'}</span></div>
    <div>Importance: ${memory.importance || 0}</div>
    <div>Created: ${createdDate}</div>
    ${memory.tags && memory.tags.length > 0 ? `<div>Tags: ${memory.tags.join(', ')}</div>` : ''}
  `;
};

// =============================================================================
// AXIS CREATION UTILITIES
// =============================================================================

export interface AxisConfig {
  tickCount?: number;
  tickFormat?: (domainValue: any, index: number) => string;
  fontSize?: string;
  fontWeight?: string;
}

export const createXAxis = (
  group: SVGGroupSelection,
  scale: any, // Use any to avoid complex type issues with D3's various scale types
  height: number,
  config: AxisConfig = {}
): void => {
  const {
    tickCount = 10,
    fontSize = '12px',
    fontWeight = 'normal'
  } = config;
  
  const axis = config.tickFormat 
    ? d3.axisBottom(scale).ticks(tickCount).tickFormat(config.tickFormat)
    : d3.axisBottom(scale).ticks(tickCount);
  
  group.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height})`)
    .call(axis)
    .selectAll('text')
    .style('font-size', fontSize)
    .style('font-weight', fontWeight);
};

export const createYAxis = (
  group: SVGGroupSelection,
  scale: any, // Use any to avoid complex type issues with D3's various scale types
  config: AxisConfig = {}
): void => {
  const {
    tickCount = 10,
    fontSize = '11px',
    fontWeight = 'normal'
  } = config;
  
  const axis = config.tickFormat 
    ? d3.axisLeft(scale).ticks(tickCount).tickFormat(config.tickFormat)
    : d3.axisLeft(scale).ticks(tickCount);
  
  group.append('g')
    .attr('class', 'y-axis')
    .call(axis)
    .selectAll('text')
    .style('font-size', fontSize)
    .style('font-weight', fontWeight);
};

export const addAxisLabel = (
  group: SVGGroupSelection,
  text: string,
  position: 'x' | 'y',
  dimensions: SVGDimensions,
  offset = { x: 0, y: 40 }
): void => {
  if (position === 'x') {
    group.append('text')
      .attr('class', 'x-axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', dimensions.innerWidth / 2)
      .attr('y', dimensions.innerHeight + offset.y)
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#374151')
      .text(text);
  } else {
    group.append('text')
      .attr('class', 'y-axis-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -dimensions.innerHeight / 2)
      .attr('y', offset.x - 50)
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#374151')
      .text(text);
  }
};

// =============================================================================
// LEGEND CREATION UTILITIES
// =============================================================================

export interface LegendItem {
  label: string;
  color: string;
  type?: 'circle' | 'rect' | 'line';
  size?: number;
}

export const createLegend = (
  svg: SVGSelection,
  items: LegendItem[],
  position: { x: number; y: number },
  title?: string
): void => {
  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${position.x}, ${position.y})`);
  
  if (title) {
    legend.append('text')
      .attr('class', 'legend-title')
      .attr('x', 0)
      .attr('y', 0)
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#374151')
      .text(title);
  }
  
  const itemGroups = legend.selectAll('.legend-item')
    .data(items)
    .enter().append('g')
    .attr('class', 'legend-item')
    .attr('transform', (d, i) => `translate(0, ${(title ? 20 : 0) + i * 25})`);
  
  itemGroups.each(function(d) {
    const group = d3.select(this);
    const size = d.size || 8;
    
    switch (d.type || 'circle') {
      case 'circle':
        group.append('circle')
          .attr('r', size)
          .attr('fill', d.color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
        break;
      case 'rect':
        group.append('rect')
          .attr('width', size * 2)
          .attr('height', size * 2)
          .attr('x', -size)
          .attr('y', -size)
          .attr('fill', d.color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
        break;
      case 'line':
        group.append('line')
          .attr('x1', -size)
          .attr('x2', size)
          .attr('y1', 0)
          .attr('y2', 0)
          .attr('stroke', d.color)
          .attr('stroke-width', 3);
        break;
    }
    
    group.append('text')
      .attr('x', 15)
      .attr('y', 4)
      .style('font-size', '12px')
      .style('fill', '#374151')
      .text(d.label);
  });
};

// =============================================================================
// ANIMATION UTILITIES
// =============================================================================

export const fadeIn = (
  selection: D3Selection,
  duration = 300
): D3Transition => {
  return selection
    .style('opacity', 0)
    .transition()
    .duration(duration)
    .style('opacity', 1);
};

export const fadeOut = (
  selection: D3Selection,
  duration = 300
): D3Transition => {
  return selection
    .transition()
    .duration(duration)
    .style('opacity', 0);
};

export const scaleTransition = (
  selection: D3Selection,
  scale: number,
  duration = 200
): D3Transition => {
  return selection
    .transition()
    .duration(duration)
    .attr('transform', `scale(${scale})`);
};

// =============================================================================
// ZOOM & PAN UTILITIES
// =============================================================================

export const createZoomBehavior = (
  scaleExtent: [number, number] = [0.1, 5],
  onZoom?: (transform: d3.ZoomTransform) => void
): d3.ZoomBehavior<SVGSVGElement, unknown> => {
  return d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent(scaleExtent)
    .on('zoom', (event) => {
      if (onZoom) {
        onZoom(event.transform);
      }
    });
};

export const applyZoomToGroup = (
  group: SVGGroupSelection,
  transform: d3.ZoomTransform
): void => {
  group.attr('transform', transform.toString());
};

// =============================================================================
// UTILITY HELPERS
// =============================================================================

export const truncateText = (text: string, maxLength: number): string => {
  return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
};

export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const getContrastColor = (backgroundColor: string): string => {
  // Simple contrast calculation - could be enhanced
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  return brightness > 155 ? '#000000' : '#ffffff';
}; 