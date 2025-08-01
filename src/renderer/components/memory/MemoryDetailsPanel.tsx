import React from 'react';
import { MemoryEntity } from '@shared/types/memory';

interface MemoryDetailsPanelProps {
  selectedMemory: MemoryEntity | null;
  hoveredMemory: MemoryEntity | null;
  onEdit?: (memory: MemoryEntity) => void;
  onDelete?: (memoryId: string) => void;
}

export const MemoryDetailsPanel: React.FC<MemoryDetailsPanelProps> = ({
  selectedMemory,
  hoveredMemory,
  onEdit,
  onDelete
}) => {
  if (!selectedMemory && !hoveredMemory) {
    return null;
  }

  const formatContent = (content: any): string => {
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    return contentStr.length > 100 ? contentStr.substring(0, 100) + '...' : contentStr;
  };

  const formatFullContent = (content: any): string => {
    return typeof content === 'string' ? content : JSON.stringify(content);
  };

  return (
    <aside className="memory-details-panel">
      <div className="memory-details">
        <h3>Memory Details</h3>
        
        {hoveredMemory && !selectedMemory && (
          <div className="memory-preview">
            <h4>Hover Preview</h4>
            <p><strong>Type:</strong> {hoveredMemory.type}</p>
            <p><strong>Importance:</strong> {hoveredMemory.importance || 0}</p>
            <p><strong>Tier:</strong> {hoveredMemory.memoryTier || 'cold'}</p>
            <p><strong>Content:</strong> {formatContent(hoveredMemory.content)}</p>
          </div>
        )}
        
        {selectedMemory && (
          <div className="memory-full-details">
            <h4>Selected Memory</h4>
            <p><strong>ID:</strong> {selectedMemory.id}</p>
            <p><strong>Type:</strong> {selectedMemory.type}</p>
            <p><strong>Importance:</strong> {selectedMemory.importance || 0}</p>
            <p><strong>Tier:</strong> {selectedMemory.memoryTier || 'cold'}</p>
            <p><strong>Created:</strong> {selectedMemory.createdAt ? new Date(selectedMemory.createdAt).toLocaleString() : 'Unknown'}</p>
            <p><strong>Last Accessed:</strong> {selectedMemory.lastAccessed ? new Date(selectedMemory.lastAccessed).toLocaleString() : 'Never'}</p>
            
            <div className="memory-content">
              <strong>Content:</strong>
              <div className="content-preview">
                {formatFullContent(selectedMemory.content)}
              </div>
            </div>

            {selectedMemory.tags && selectedMemory.tags.length > 0 && (
              <div className="memory-tags">
                <strong>Tags:</strong>
                <div className="tag-list">
                  {selectedMemory.tags.map(tag => (
                    <span key={tag} className="memory-tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="memory-actions">
              {onEdit && (
                <button 
                  onClick={() => onEdit(selectedMemory)}
                  className="edit-memory-button"
                >
                  Edit Memory
                </button>
              )}
              {onDelete && selectedMemory.id && (
                <button 
                  onClick={() => onDelete(selectedMemory.id!)}
                  className="delete-memory-button"
                >
                  Delete Memory
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}; 