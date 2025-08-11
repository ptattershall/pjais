import React from 'react';
import { MemoryEntity } from '@shared/types/memory';

interface MemoryDetailsPanelProps {
  memory: MemoryEntity;
  onClose: () => void;
  onEdit: (memory: MemoryEntity) => void;
  onDelete: (memoryId: string) => void;
}

export const MemoryDetailsPanel: React.FC<MemoryDetailsPanelProps> = ({
  memory,
  onClose,
  onEdit,
  onDelete
}) => {
  const handleEdit = () => {
    onEdit(memory);
  };

  const handleDelete = () => {
    if (memory.id) {
      onDelete(memory.id);
    }
  };

  return (
    <div className="memory-details-panel">
      <div className="panel-header">
        <h3>Memory Details</h3>
        <button 
          onClick={onClose}
          className="close-button"
          aria-label="Close details panel"
        >
          ×
        </button>
      </div>
      
      <div className="panel-content">
        <div className="memory-metadata">
          <div className="metadata-row">
            <strong>Type:</strong>
            <span className={`memory-type memory-type-${memory.type}`}>
              {memory.type}
            </span>
          </div>
          
          <div className="metadata-row">
            <strong>Importance:</strong>
            <div className="importance-indicator">
              <span className="importance-value">{memory.importance}</span>
              <div className="importance-bar">
                <div 
                  className="importance-fill"
                  style={{ width: `${(memory.importance / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="metadata-row">
            <strong>Created:</strong>
            <span className="created-date">
              {memory.createdAt?.toLocaleDateString() || 'Unknown'}
            </span>
          </div>

          {memory.lastAccessed && (
            <div className="metadata-row">
              <strong>Last Accessed:</strong>
              <span className="last-accessed-date">
                {memory.lastAccessed.toLocaleDateString()}
              </span>
            </div>
          )}

          {memory.memoryTier && (
            <div className="metadata-row">
              <strong>Memory Tier:</strong>
              <span className={`memory-tier tier-${memory.memoryTier}`}>
                {memory.memoryTier.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="memory-content-section">
          <strong>Content:</strong>
          <div className="memory-content-display">
            <p>{memory.content}</p>
          </div>
        </div>

        {memory.tags && memory.tags.length > 0 && (
          <div className="memory-tags-section">
            <strong>Tags:</strong>
            <div className="memory-tags">
              {memory.tags.map((tag, index) => (
                <span key={index} className="memory-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>

      <div className="panel-actions">
        <button 
          onClick={handleEdit}
          className="edit-button primary-button"
        >
          Edit Memory
        </button>
        <button 
          onClick={handleDelete}
          className="delete-button danger-button"
          disabled={!memory.id}
        >
          Delete Memory
        </button>
      </div>
    </div>
  );
};
