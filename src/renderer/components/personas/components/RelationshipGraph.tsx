import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography, Grid, Chip, LinearProgress, Divider } from '@mui/material';
import { Warning as ConflictIcon, Group as CollaborationIcon } from '@mui/icons-material';
import * as d3 from 'd3';
import { PersonaRelationship, GraphNode, GraphLink, RelationshipStats } from '../types/relationship-types';
import { mockPersonas } from '../utils/mock-data';

interface RelationshipGraphProps {
  relationships: PersonaRelationship[];
  stats: RelationshipStats;
}

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({ relationships, stats }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 500;
    const height = 400;

    // Prepare data for D3 with proper typing
    const nodes: GraphNode[] = mockPersonas.map(persona => ({
      id: persona.id,
      name: persona.name,
      group: 1,
    }));

    const links: GraphLink[] = relationships.map(rel => ({
      source: rel.fromPersonaId,
      target: rel.toPersonaId,
      strength: rel.strength,
      type: rel.type,
      quality: rel.quality,
    }));

    // Create force simulation with proper types
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody<GraphNode>().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Add links
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d: GraphLink) => {
        switch (d.quality) {
          case 'excellent': return '#4caf50';
          case 'good': return '#8bc34a';
          case 'neutral': return '#ff9800';
          case 'poor': return '#f44336';
          case 'problematic': return '#d32f2f';
          default: return '#9e9e9e';
        }
      })
      .attr("stroke-width", (d: GraphLink) => Math.max(1, d.strength / 20))
      .attr("opacity", 0.7);

    // Add nodes
    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 25)
      .attr("fill", "#1976d2")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer");

    // Add labels
    const labels = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d: GraphNode) => d.name)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", "10px")
      .attr("fill", "#fff")
      .style("pointer-events", "none");

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: GraphNode) => d.x || 0)
        .attr("cy", (d: GraphNode) => d.y || 0);

      labels
        .attr("x", (d: GraphNode) => d.x || 0)
        .attr("y", (d: GraphNode) => d.y || 0);
    });

    // Add drag behavior
    const drag = d3.drag<SVGCircleElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag as any);

    return () => {
      simulation.stop();
    };
  }, [relationships]);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Paper
          sx={{
            p: 2,
            height: 450,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox="0 0 500 400"
            style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
          />
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Paper
          sx={{
            p: 2,
            height: 450,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Network Statistics
          </Typography>
          
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Total Relationships: {stats.totalRelationships}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={stats.networkDensity}
              sx={{ mt: 1, mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              Network Density: {stats.networkDensity.toFixed(1)}%
            </Typography>
          </Box>

          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Average Strength: {stats.averageStrength.toFixed(1)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={stats.averageStrength}
              sx={{ mt: 1 }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box display="flex" justifyContent="space-between" mb={1}>
            <Chip
              icon={<ConflictIcon />}
              label={`${stats.conflictCount} Conflicts`}
              color={stats.conflictCount > 0 ? 'error' : 'default'}
              size="small"
            />
            <Chip
              icon={<CollaborationIcon />}
              label={`${stats.collaborationOpportunities} Opportunities`}
              color="success"
              size="small"
            />
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}; 