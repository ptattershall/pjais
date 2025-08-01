import React, { useState, useEffect, useCallback } from 'react';
import { MemoryRelationship } from '@shared/types/memory';
import { ProvenanceNode, LineageAnalysis } from '@shared/types/provenance';
import { ProvenanceViewModeSelector, ProvenanceViewMode } from './ProvenanceViewModeSelector';
import { ProvenanceLineageSummary } from './ProvenanceLineageSummary';
import { ProvenanceNodeDetailsPanel } from './ProvenanceNodeDetailsPanel';
import { ProvenanceTreeView } from './ProvenanceTreeView';
import { buildProvenanceTree, analyzeLineage } from './utils/provenance-utils';

interface ProvenanceVisualizationProps {
  rootMemoryId: string;
  maxDepth?: number;
  onNodeSelect?: (node: ProvenanceNode) => void;
  onRelationshipSelect?: (relationship: MemoryRelationship) => void;
  enableInteraction?: boolean;
  width?: number;
  height?: number;
}

export const MemoryProvenanceTracker: React.FC<ProvenanceVisualizationProps> = ({
  rootMemoryId,
  maxDepth = 3,
  onNodeSelect,
  onRelationshipSelect,
  enableInteraction = true,
  width = 800,
  height = 600
}) => {
  const [provenanceTree, setProvenanceTree] = useState<ProvenanceNode | null>(null);
  const [lineageAnalysis, setLineageAnalysis] = useState<LineageAnalysis | null>(null);
  const [selectedNode, setSelectedNode] = useState<ProvenanceNode | null>(null);
  const [viewMode, setViewMode] = useState<ProvenanceViewMode>('tree');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load provenance data
  useEffect(() => {
    const loadProvenance = async () => {
      if (!rootMemoryId) return;

      setLoading(true);
      setError(null);

      try {
        const tree = await buildProvenanceTree(rootMemoryId, maxDepth);
        if (tree) {
          setProvenanceTree(tree);
          const analysis = analyzeLineage(tree);
          setLineageAnalysis(analysis);
        } else {
          setError('Could not build provenance tree for this memory');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load provenance data');
      } finally {
        setLoading(false);
      }
    };

    loadProvenance();
  }, [rootMemoryId, maxDepth]);

  // Handle node selection
  const handleNodeSelect = useCallback((node: ProvenanceNode) => {
    setSelectedNode(node);
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  if (loading) {
    return (
      <div className="memory-provenance-tracker loading">
        <div className="loading-spinner"></div>
        <p>Tracing memory lineage...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="memory-provenance-tracker error">
        <h3>Memory Provenance Tracker</h3>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (!provenanceTree) {
    return (
      <div className="memory-provenance-tracker empty">
        <h3>Memory Provenance Tracker</h3>
        <p>No provenance data available for this memory.</p>
      </div>
    );
  }

  const renderVisualization = () => {
    switch (viewMode) {
      case 'tree':
        return (
          <ProvenanceTreeView
            tree={provenanceTree}
            selectedNode={selectedNode}
            onNodeSelect={handleNodeSelect}
            onRelationshipSelect={onRelationshipSelect}
            width={width}
            height={height}
            enableInteraction={enableInteraction}
          />
        );
      case 'timeline':
        return (
          <div className="timeline-view-placeholder">
            <p>Timeline view will be implemented when relationship APIs are available</p>
          </div>
        );
      case 'influence':
        return (
          <div className="influence-view-placeholder">
            <p>Influence map view will be implemented when relationship APIs are available</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="memory-provenance-tracker">
      <div className="provenance-header">
        <div className="header-content">
          <h3>Memory Provenance & Lineage</h3>
          <p>Trace the origins and influences of memory formation</p>
        </div>

        <div className="view-controls">
          <ProvenanceViewModeSelector
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      </div>

      {lineageAnalysis && (
        <ProvenanceLineageSummary
          lineageAnalysis={lineageAnalysis}
          onAncestorSelect={handleNodeSelect}
        />
      )}

      <div className="provenance-visualization">
        {renderVisualization()}
      </div>

      <ProvenanceNodeDetailsPanel selectedNode={selectedNode} />
    </div>
  );
}; 
