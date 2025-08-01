import React from 'react';
import { LineageAnalysis, ProvenanceNode } from '@shared/types/provenance';

interface ProvenanceLineageSummaryProps {
  lineageAnalysis: LineageAnalysis;
  onAncestorSelect: (node: ProvenanceNode) => void;
}

export const ProvenanceLineageSummary: React.FC<ProvenanceLineageSummaryProps> = ({
  lineageAnalysis,
  onAncestorSelect
}) => {
  return (
    <div className="lineage-summary">
      <div className="summary-metrics">
        <div className="metric">
          <span className="value">{lineageAnalysis.totalNodes}</span>
          <span className="label">Total Nodes</span>
        </div>
        <div className="metric">
          <span className="value">{lineageAnalysis.maxDepth}</span>
          <span className="label">Max Depth</span>
        </div>
        <div className="metric">
          <span className="value">{(lineageAnalysis.branchingFactor * 100).toFixed(1)}%</span>
          <span className="label">Branching</span>
        </div>
        <div className="metric">
          <span className="value">{(lineageAnalysis.influenceStrength * 100).toFixed(1)}%</span>
          <span className="label">Influence</span>
        </div>
      </div>

      {lineageAnalysis.keyAncestors.length > 0 && (
        <div className="key-ancestors">
          <h4>Key Influences</h4>
          <div className="ancestor-list">
            {lineageAnalysis.keyAncestors.slice(0, 3).map((ancestor, index) => (
              <div 
                key={ancestor.node.id} 
                className="ancestor-item"
                onClick={() => onAncestorSelect(ancestor.node)}
              >
                <span className="rank">#{index + 1}</span>
                <span className="content">
                  {typeof ancestor.node.memory.content === 'string' 
                    ? ancestor.node.memory.content.substring(0, 50) + '...'
                    : 'Complex content'}
                </span>
                <span className="influence-score">
                  {(ancestor.influenceScore * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 