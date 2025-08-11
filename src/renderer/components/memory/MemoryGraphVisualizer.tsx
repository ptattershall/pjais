import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { MemoryEntity, MemoryRelationship } from '@shared/types/memory';

interface MemoryGraphVisualizerProps {
  memories: MemoryEntity[];
  relationships: MemoryRelationship[];
  selectedMemory: MemoryEntity | null;
  onMemorySelect: (memory: MemoryEntity) => void;
  onMemoryHover?: (memory: MemoryEntity | null) => void;
  width?: number;
  height?: number;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  memory: MemoryEntity;
  group: number;
  importance: number;
  tier: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  relationship: MemoryRelationship;
  strength: number;
}

export const MemoryGraphVisualizer: React.FC<MemoryGraphVisualizerProps> = ({
  memories,
  relationships,
  selectedMemory,
  onMemorySelect,
  onMemoryHover,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [simulation, setSimulation] = useState<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Transform memories into graph nodes
  const nodes: GraphNode[] = memories.map(memory => ({
    id: memory.id || '',
    memory,
    group: memory.type === 'text' ? 1 : memory.type === 'image' ? 2 : 3,
    importance: memory.importance || 0,
    tier: memory.memoryTier || 'cold',
    x: width / 2 + Math.random() * 100 - 50,
    y: height / 2 + Math.random() * 100 - 50
  }));

  // Transform relationships into graph links
  const links: GraphLink[] = relationships.map(relationship => ({
    source: relationship.fromMemoryId,
    target: relationship.toMemoryId,
    relationship,
    strength: relationship.strength || 0.5
  }));

  // Color scale for different memory types
  const colorScale = d3.scaleOrdinal<string>()
    .domain(['text', 'image', 'audio', 'video', 'file'])
    .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']);

  // Size scale based on importance
  const sizeScale = d3.scaleLinear()
    .domain(d3.extent(memories, d => d.importance || 0) as [number, number])
    .range([8, 24]);

  // Initialize D3 force simulation
  const initializeSimulation = useCallback(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create main group for zoom/pan
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const newSimulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .strength(d => d.strength)
        .distance(100))
      .force('charge', d3.forceManyBody()
        .strength(-400)
        .distanceMax(200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(d => sizeScale((d as GraphNode).importance) + 4));

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.strength * 10));

    // Create nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) newSimulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) newSimulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add circles to nodes
    node.append('circle')
      .attr('r', d => sizeScale(d.importance))
      .attr('fill', d => colorScale(d.memory.type))
      .attr('stroke', d => d.tier === 'hot' ? '#ff4444' : d.tier === 'warm' ? '#ffaa00' : '#666')
      .attr('stroke-width', d => d.tier === 'hot' ? 3 : d.tier === 'warm' ? 2 : 1)
      .style('opacity', 0.8);

    // Add labels to nodes
    node.append('text')
      .text(d => d.memory.content?.substring(0, 20) + (d.memory.content && d.memory.content.length > 20 ? '...' : '') || 'Memory')
      .attr('x', 0)
      .attr('y', d => sizeScale(d.importance) + 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#333')
      .style('pointer-events', 'none');

    // Add hover effects
    node
      .on('mouseenter', (event, d) => {
        setHoveredNode(d);
        onMemoryHover?.(d.memory);
        
        // Highlight connected nodes and links
        link.style('opacity', l => 
          l.source === d || l.target === d ? 1 : 0.1);
        node.style('opacity', n => 
          n === d || links.some(l => 
            (l.source === d && l.target === n) || 
            (l.target === d && l.source === n)) ? 1 : 0.3);
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        onMemoryHover?.(null);
        
        // Reset opacity
        link.style('opacity', 0.6);
        node.style('opacity', 0.8);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        onMemorySelect(d.memory);
      });

    // Update positions on simulation tick
    newSimulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    setSimulation(newSimulation);

    // Cleanup function
    return () => {
      newSimulation.stop();
    };
  }, [nodes, links, width, height, onMemorySelect, onMemoryHover, colorScale, sizeScale]);

  // Update selection highlighting
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('.node circle')
      .attr('stroke-width', (d: any) => {
        if (selectedMemory && d.memory.id === selectedMemory.id) {
          return 4;
        }
        return d.tier === 'hot' ? 3 : d.tier === 'warm' ? 2 : 1;
      })
      .attr('stroke', (d: any) => {
        if (selectedMemory && d.memory.id === selectedMemory.id) {
          return '#00ff00';
        }
        return d.tier === 'hot' ? '#ff4444' : d.tier === 'warm' ? '#ffaa00' : '#666';
      });
  }, [selectedMemory]);

  // Initialize simulation when data changes
  useEffect(() => {
    const cleanup = initializeSimulation();
    return cleanup;
  }, [initializeSimulation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simulation) {
        simulation.stop();
      }
    };
  }, [simulation]);

  return (
    <div className="memory-graph-visualizer">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: '1px solid #ddd', borderRadius: '4px' }}
      />
      
      {/* Legend */}
      <div className="graph-legend" style={{ marginTop: '10px', display: 'flex', gap: '20px', fontSize: '12px' }}>
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
        
        <div className="memory-tiers">
          <strong>Memory Tiers:</strong>
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '12px', height: '12px', border: '3px solid #ff4444', borderRadius: '50%' }} />
              <span>Hot</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '12px', height: '12px', border: '2px solid #ffaa00', borderRadius: '50%' }} />
              <span>Warm</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '12px', height: '12px', border: '1px solid #666', borderRadius: '50%' }} />
              <span>Cold</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredNode && (
        <div 
          className="graph-tooltip"
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            maxWidth: '200px',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          <div><strong>Type:</strong> {hoveredNode.memory.type}</div>
          <div><strong>Importance:</strong> {hoveredNode.memory.importance}</div>
          <div><strong>Tier:</strong> {hoveredNode.memory.memoryTier}</div>
          <div><strong>Content:</strong> {hoveredNode.memory.content?.substring(0, 50)}...</div>
        </div>
      )}
    </div>
  );
};
