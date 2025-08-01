import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { ProvenanceNode } from '@shared/types/provenance';
import { MemoryRelationship } from '@shared/types/memory';

interface ProvenanceTreeViewProps {
  tree: ProvenanceNode;
  selectedNode: ProvenanceNode | null;
  onNodeSelect: (node: ProvenanceNode) => void;
  onRelationshipSelect?: (relationship: MemoryRelationship) => void;
  width: number;
  height: number;
  enableInteraction: boolean;
}

export const ProvenanceTreeView: React.FC<ProvenanceTreeViewProps> = ({ 
  tree, 
  selectedNode, 
  onNodeSelect, 
  width, 
  height, 
  enableInteraction 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create tree layout
    const treeLayout = d3.tree<ProvenanceNode>()
      .size([width - 40, height - 40]);

    // Convert to d3 hierarchy
    const root = d3.hierarchy(tree, d => d.children);
    const treeData = treeLayout(root);

    const g = svg.append('g')
      .attr('transform', 'translate(20, 20)');

    // Draw links
    g.selectAll('.link')
      .data(treeData.links())
      .enter().append('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal<d3.HierarchyLink<ProvenanceNode>, d3.HierarchyPointNode<ProvenanceNode>>()
        .x((d: d3.HierarchyPointNode<ProvenanceNode>) => d.y)
        .y((d: d3.HierarchyPointNode<ProvenanceNode>) => d.x))
      .attr('stroke', '#999')
      .attr('stroke-width', 1.5)
      .attr('fill', 'none');

    // Draw nodes
    const nodes = g.selectAll('.node')
      .data(treeData.descendants())
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    nodes.append('circle')
      .attr('r', 6)
      .attr('fill', d => d.data.id === selectedNode?.id ? '#3b82f6' : '#10b981')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    if (enableInteraction) {
      nodes.style('cursor', 'pointer')
        .on('click', (event, d) => {
          onNodeSelect(d.data);
        });
    }

    // Add labels
    nodes.append('text')
      .attr('dx', 12)
      .attr('dy', 4)
      .style('font-size', '12px')
      .text(d => {
        const content = typeof d.data.memory.content === 'string' 
          ? d.data.memory.content 
          : 'Complex content';
        return content.length > 20 ? content.substring(0, 20) + '...' : content;
      });

  }, [tree, selectedNode, onNodeSelect, width, height, enableInteraction]);

  return <svg ref={svgRef} width={width} height={height} />;
}; 