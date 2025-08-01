import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { MemoryEntity, MemoryRelationship, MemoryTier } from '@shared/types/memory';
import '../../styles/memory-graph.css';

// Import shared utilities - showcasing complex D3 patterns!
import {
  initializeSVG,
  createMainGroup,
  createRadiusScale,
  createZoomBehavior,
  applyZoomToGroup,
  processMemoriesForVisualization,
  formatMemoryTooltip,
  createTooltip,
  showTooltip,
  hideTooltip,
  removeAllTooltips,
  truncateText,
  MEMORY_TIER_COLORS,
  RELATIONSHIP_COLORS,
  type ProcessedMemoryNode
} from './utils/d3-utils';

import { usePaginatedData } from './hooks/usePaginatedData';

interface MemoryNode extends d3.SimulationNodeDatum {
  id: string;
  entity: MemoryEntity;
  tier: MemoryTier;
  radius: number;
  color: string;
  x?: number;
  y?: number;
}

interface MemoryLink extends d3.SimulationLinkDatum<MemoryNode> {
  id: string;
  relationship: MemoryRelationship;
  strength: number;
  color: string;
  strokeWidth: number;
}

interface MemoryGraphVisualizerProps {
  userId: string;
  memories: MemoryEntity[];
  relationships: MemoryRelationship[];
  selectedMemoryId?: string;
  onMemorySelect?: (memoryId: string) => void;
  onMemoryHover?: (memory: MemoryEntity | null) => void;
  width?: number;
  height?: number;
  showTierLabels?: boolean;
  enableZoom?: boolean;
  enableDrag?: boolean;
  enableTooltips?: boolean;
}

export const MemoryGraphVisualizer: React.FC<MemoryGraphVisualizerProps> = ({
  userId: _userId,
  memories,
  relationships,
  selectedMemoryId,
  onMemorySelect,
  onMemoryHover,
  width = 800,
  height = 600,
  showTierLabels = true,
  enableZoom = true,
  enableDrag = true,
  enableTooltips = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [simulation, setSimulation] = useState<d3.Simulation<MemoryNode, MemoryLink> | null>(null);
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [links, setLinks] = useState<MemoryLink[]>([]);
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  // Create processed memory nodes using shared utilities
  const processedNodes = useMemo((): ProcessedMemoryNode[] => {
    const importanceValues = memories.map(m => m.importance || 0);
    const radiusScale = createRadiusScale(importanceValues, 6, 20); // Larger range for graph nodes
    
    return processMemoriesForVisualization(memories, radiusScale);
  }, [memories]);

  // PAGINATION: Use only the current page of nodes for rendering
  const PAGE_SIZE = 50;
  const {
    page: pagedNodes,
    pageIndex,
    totalPages,
    setPageIndex
  } = usePaginatedData(processedNodes, PAGE_SIZE);

  // Convert processed nodes to graph nodes (only paged nodes)
  const createNodes = useCallback((processedNodes: ProcessedMemoryNode[]): MemoryNode[] => {
    return processedNodes.map(node => ({
      id: node.id,
      entity: node.entity,
      tier: node.tier,
      radius: node.radius,
      color: node.color, // Already using shared colors!
      x: Math.random() * width,
      y: Math.random() * height
    }));
  }, [width, height]);

  // Convert relationships to graph links using shared colors (only links between paged nodes)
  const createLinks = useCallback((relationships: MemoryRelationship[], nodes: MemoryNode[]): MemoryLink[] => {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    
    return relationships
      .filter(rel => nodeMap.has(rel.fromMemoryId) && nodeMap.has(rel.toMemoryId))
      .map(relationship => ({
        id: relationship.id,
        relationship,
        source: nodeMap.get(relationship.fromMemoryId)!,
        target: nodeMap.get(relationship.toMemoryId)!,
        strength: relationship.strength,
        color: RELATIONSHIP_COLORS[relationship.type as keyof typeof RELATIONSHIP_COLORS] || '#95a5a6',
        strokeWidth: Math.max(1, relationship.strength * 3)
      }));
  }, []);

  // Initialize or update the D3 simulation (only for paged nodes/links)
  useEffect(() => {
    if (!svgRef.current) return;

    const newNodes = createNodes(pagedNodes);
    const newLinks = createLinks(relationships, newNodes);
    
    setNodes(newNodes);
    setLinks(newLinks);

    // Create force simulation with optimized parameters
    const newSimulation = d3.forceSimulation<MemoryNode>(newNodes)
      .force('link', d3.forceLink<MemoryNode, MemoryLink>(newLinks)
        .id(d => d.id)
        .distance(d => 50 + (1 - d.strength) * 100)
        .strength(d => d.strength * 0.5)
      )
      .force('charge', d3.forceManyBody()
        .strength((d) => {
          const node = d as MemoryNode;
          const baseStrength = -100;
          const tierMultiplier = node.tier === 'hot' ? 1.5 : node.tier === 'warm' ? 1.2 : 1;
          return baseStrength * tierMultiplier;
        })
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<MemoryNode>()
        .radius(d => d.radius + 2)
        .strength(0.8)
      );

    setSimulation(newSimulation);

    return () => {
      newSimulation.stop();
    };
  }, [pagedNodes, relationships, width, height, createNodes, createLinks]);

  // Render the graph - dramatically simplified with shared utilities!
  useEffect(() => {
    if (!svgRef.current || !simulation || nodes.length === 0) return;

    // Initialize SVG using shared utility
    const svg = initializeSVG({ current: svgRef.current }, 'memory-graph-container');
    if (!svg) return;

    // Create main group using shared utility
    const mainGroup = createMainGroup(svg, { top: 0, right: 0, bottom: 0, left: 0 });

    // Create zoom behavior using shared utility
    if (enableZoom) {
      const zoom = createZoomBehavior([0.1, 5], (newTransform) => {
        setTransform(newTransform);
        applyZoomToGroup(mainGroup, newTransform);
      });
      svg.call(zoom);
    }

    // Apply current transform using shared utility
    applyZoomToGroup(mainGroup, transform);

    // Create tooltip using shared utility
    const tooltip = enableTooltips ? createTooltip({
      className: 'graph-tooltip',
      zIndex: 1000
    }) : null;

    // Create definitions for arrowheads using shared colors
    const defs = svg.append('defs');
    Object.entries(RELATIONSHIP_COLORS).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrowhead-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 15)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // Create links
    const linkSelection = mainGroup.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => d.strokeWidth)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', d => {
        const type = Object.keys(RELATIONSHIP_COLORS).find(key => 
          RELATIONSHIP_COLORS[key as keyof typeof RELATIONSHIP_COLORS] === d.color
        ) || 'reference';
        return `url(#arrowhead-${type})`;
      });

    // Create nodes with enhanced interactions
    const nodeSelection = mainGroup.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('stroke', d => selectedMemoryId === d.id ? '#2c3e50' : '#fff')
      .attr('stroke-width', d => selectedMemoryId === d.id ? 3 : 1.5)
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onMemorySelect?.(d.id);
      })
      .on('mouseover', (event, d) => {
        onMemoryHover?.(d.entity);
        highlightConnected(d.id, true);
        
        // Show tooltip using shared utility
        if (enableTooltips && tooltip) {
          const tooltipContent = formatMemoryTooltip(d.entity);
          showTooltip(tooltip, tooltipContent, event);
        }
      })
      .on('mouseout', (event, d) => {
        onMemoryHover?.(null);
        highlightConnected(d.id, false);
        
        // Hide tooltip using shared utility
        if (enableTooltips && tooltip) {
          hideTooltip(tooltip);
        }
      });

    // Add drag behavior
    if (enableDrag) {
      const drag = d3.drag<SVGCircleElement, MemoryNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });

      nodeSelection.call(drag);
    }

    // Add node labels using shared text utility
    const labelSelection = mainGroup.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(nodes)
      .enter().append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', '10px')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .attr('fill', '#2c3e50')
      .attr('pointer-events', 'none')
      .text(d => {
        const content = typeof d.entity.content === 'string' 
          ? d.entity.content 
          : JSON.stringify(d.entity.content);
        return truncateText(content, 20); // Using shared text utility!
      });

    // Add tier labels if enabled using shared colors
    if (showTierLabels) {
      const tierGroups = d3.group(nodes, d => d.tier);
      
      tierGroups.forEach((tierNodes, tier) => {
        const centerX = d3.mean(tierNodes, d => d.x!) || 0;
        const centerY = d3.mean(tierNodes, d => d.y!) || 0;
        
        mainGroup.append('text')
          .attr('x', centerX)
          .attr('y', centerY - 40)
          .attr('text-anchor', 'middle')
          .attr('font-size', '14px')
          .attr('font-weight', 'bold')
          .attr('fill', MEMORY_TIER_COLORS[tier]) // Using shared colors!
          .attr('opacity', 0.7)
          .text(`${tier.toUpperCase()} TIER`);
      });
    }

    // Highlight connected elements function
    const highlightConnected = (nodeId: string, highlight: boolean) => {
      const connectedLinks = links.filter(link => 
        (link.source as MemoryNode).id === nodeId || (link.target as MemoryNode).id === nodeId
      );
      const connectedNodeIds = new Set(connectedLinks.flatMap(link => [
        (link.source as MemoryNode).id,
        (link.target as MemoryNode).id
      ]));

      // Update link opacity
      linkSelection
        .attr('stroke-opacity', d => {
          const isConnected = (d.source as MemoryNode).id === nodeId || (d.target as MemoryNode).id === nodeId;
          return highlight ? (isConnected ? 1 : 0.2) : 0.6;
        });

      // Update node opacity
      nodeSelection
        .attr('opacity', d => {
          const isConnected = connectedNodeIds.has(d.id);
          return highlight ? (isConnected ? 1 : 0.3) : 1;
        });

      // Update label opacity
      labelSelection
        .attr('opacity', d => {
          const isConnected = connectedNodeIds.has(d.id);
          return highlight ? (isConnected ? 1 : 0.3) : 1;
        });
    };

    // Update positions on simulation tick
    simulation.on('tick', () => {
      linkSelection
        .attr('x1', d => (d.source as MemoryNode).x!)
        .attr('y1', d => (d.source as MemoryNode).y!)
        .attr('x2', d => (d.target as MemoryNode).x!)
        .attr('y2', d => (d.target as MemoryNode).y!);

      nodeSelection
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);

      labelSelection
        .attr('x', d => d.x!)
        .attr('y', d => d.y!);
    });

    // Cleanup function
    return () => {
      removeAllTooltips('graph-tooltip');
    };

  }, [simulation, nodes, links, selectedMemoryId, enableZoom, enableDrag, showTierLabels, enableTooltips, onMemorySelect, onMemoryHover, transform]);

  // Pagination controls UI
  const handlePrev = () => setPageIndex(Math.max(0, pageIndex - 1));
  const handleNext = () => setPageIndex(Math.min(totalPages - 1, pageIndex + 1));

  return (
    <div className="memory-graph-visualizer">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: '1px solid #e1e5e9', borderRadius: '8px' }}
      />
      
      <div className="graph-legend">
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
        
        <div className="relationship-legend">
          <h4>Relationships</h4>
          {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
            <div key={type} className="legend-item">
              <div 
                className="legend-line" 
                style={{ backgroundColor: color }}
              />
              <span>{type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pagination-controls flex items-center gap-2 mt-2" role="navigation" aria-label="Graph Pagination">
        <button
          type="button"
          onClick={handlePrev}
          disabled={pageIndex === 0}
          className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm font-medium disabled:opacity-50"
          aria-label="Previous page"
        >
          Prev
        </button>
        <span className="text-sm">Page {pageIndex + 1} of {totalPages}</span>
        <button
          type="button"
          onClick={handleNext}
          disabled={pageIndex === totalPages - 1}
          className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm font-medium disabled:opacity-50"
          aria-label="Next page"
        >
          Next
        </button>
        <span className="text-xs text-gray-500 ml-4">Showing {pagedNodes.length} of {processedNodes.length} nodes</span>
      </div>
    </div>
  );
}; 