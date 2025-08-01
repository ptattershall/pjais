import React from 'react';
import { ProvenanceNode } from '@shared/types/provenance';

interface ProvenanceNodeDetailsPanelProps {
  selectedNode: ProvenanceNode | null;
}

export const ProvenanceNodeDetailsPanel: React.FC<ProvenanceNodeDetailsPanelProps> = ({
  selectedNode
}) => {
  if (!selectedNode) {
    return null;
  }

  return (
    <div className="node-details-panel">
      <h4>Memory Details</h4>
      <div className="details-content">
        <p><strong>ID:</strong> {selectedNode.id}</p>
        <p><strong>Level:</strong> {selectedNode.level}</p>
        <p><strong>Created:</strong> {selectedNode.metadata.createdAt.toLocaleString()}</p>
        <p><strong>Access Count:</strong> {selectedNode.metadata.accessCount}</p>
        <p><strong>Children:</strong> {selectedNode.children.length}</p>
        <p><strong>Relationships:</strong> {selectedNode.relationships.length}</p>
        
        {selectedNode.metadata.lastModified && (
          <p><strong>Last Modified:</strong> {selectedNode.metadata.lastModified.toLocaleString()}</p>
        )}
        
        {selectedNode.metadata.derivedFrom && selectedNode.metadata.derivedFrom.length > 0 && (
          <p><strong>Derived From:</strong> {selectedNode.metadata.derivedFrom.length} sources</p>
        )}
        
        {selectedNode.metadata.influences && selectedNode.metadata.influences.length > 0 && (
          <p><strong>Influences:</strong> {selectedNode.metadata.influences.length} memories</p>
        )}

        <div className="memory-content">
          <strong>Content:</strong>
          <div className="content-preview">
            {typeof selectedNode.memory.content === 'string' 
              ? selectedNode.memory.content 
              : JSON.stringify(selectedNode.memory.content, null, 2)}
          </div>
        </div>

        {selectedNode.memory.tags && selectedNode.memory.tags.length > 0 && (
          <div className="memory-tags">
            <strong>Tags:</strong>
            <div className="tag-list">
              {selectedNode.memory.tags.map(tag => (
                <span key={tag} className="memory-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 