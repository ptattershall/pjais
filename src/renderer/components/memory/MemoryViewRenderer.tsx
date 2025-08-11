import React from 'react';
import { MemoryEntity, MemoryRelationship } from '@shared/types/memory';
import { MemoryGraphVisualizer } from './MemoryGraphVisualizer';
import { MemoryTimelineVisualizer } from './MemoryTimelineVisualizer';
import { MemoryHealthDashboard } from './MemoryHealthDashboard';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { AsyncErrorBoundary } from '../common/AsyncErrorBoundary';

export type ViewMode = 'graph' | 'timeline' | 'health' | 'search' | 'provenance' | 'optimization';

interface MemoryViewRendererProps {
  viewMode: ViewMode;
  userId: string;
  filteredMemories: MemoryEntity[];
  filteredRelationships: MemoryRelationship[];
  selectedMemory: MemoryEntity | null;
  searchTerm: string;
  onMemorySelect: (memory: MemoryEntity) => void;
  onMemoryHover: (memory: MemoryEntity | null) => void;
  onMemoryEdit: (memory: MemoryEntity) => void;
  onMemoryDelete: (memoryId: string) => void;
  onTimeRangeChange: (start: Date, end: Date) => void;
  onSearch: (term: string) => void;
}

export const MemoryViewRenderer: React.FC<MemoryViewRendererProps> = ({
  viewMode,
  userId,
  filteredMemories,
  filteredRelationships,
  selectedMemory,
  searchTerm,
  onMemorySelect,
  onMemoryHover,
  onMemoryEdit: _onMemoryEdit,
  onMemoryDelete: _onMemoryDelete,
  onTimeRangeChange,
  onSearch
}) => {
  // Helper function to convert memory ID to memory entity
  const handleMemorySelectById = (memoryId: string) => {
    const memory = filteredMemories.find(m => m.id === memoryId);
    if (memory) {
      onMemorySelect(memory);
    }
  };

  switch (viewMode) {
    case 'graph':
      return (
        <ErrorBoundary context="MemoryGraphVisualizer">
          <MemoryGraphVisualizer
            memories={filteredMemories}
            relationships={filteredRelationships}
            selectedMemory={selectedMemory}
            onMemorySelect={onMemorySelect}
            onMemoryHover={onMemoryHover}
            width={1000}
            height={700}
          />
        </ErrorBoundary>
      );

    case 'timeline':
      return (
        <ErrorBoundary context="MemoryTimelineVisualizer">
          <MemoryTimelineVisualizer
            userId={userId}
            memories={filteredMemories}
            selectedMemoryId={selectedMemory?.id}
            onMemorySelect={handleMemorySelectById}
            onMemoryHover={onMemoryHover}
            onTimeRangeChange={onTimeRangeChange}
            width={1000}
            height={500}
            enableBrush={true}
            showDensityChart={true}
            timeGranularity="day"
          />
        </ErrorBoundary>
      );

    case 'health':
      return (
        <AsyncErrorBoundary context="MemoryHealthDashboard">
          <MemoryHealthDashboard
            userId={userId}
            memories={filteredMemories}
            onOptimizationAction={(actionType, params) => {
              console.log('Optimization action:', actionType, params);
              // Note: optimize method doesn't exist in current API
              // This would trigger optimization through other means
            }}
            refreshInterval={30000}
          />
        </AsyncErrorBoundary>
      );

    case 'search':
      return (
        <div className="memory-search-placeholder">
          <div className="placeholder-content">
            <h3>Advanced Search</h3>
            <p>Component under development</p>
            <div className="search-controls">
              <input
                type="text"
                placeholder="Search memories..."
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="search-results">
              {filteredMemories.map(memory => (
                <div 
                  key={memory.id} 
                  className="memory-result"
                  onClick={() => onMemorySelect(memory)}
                >
                  <h4>{memory.type}</h4>
                  <p>{memory.content.substring(0, 100)}...</p>
                  <span>Importance: {memory.importance}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'provenance':
      return (
        <div className="memory-provenance-placeholder">
          <div className="placeholder-content">
            <h3>Memory Provenance Tracking</h3>
            <p>Component under development</p>
            <div className="provenance-info">
              <p>This view will show memory lineage and relationships</p>
              <p>Total memories: {filteredMemories.length}</p>
            </div>
          </div>
        </div>
      );

    case 'optimization':
      return (
        <div className="memory-optimization-placeholder">
          <div className="placeholder-content">
            <h3>Memory Optimization Engine</h3>
            <p>Component under development</p>
            <div className="optimization-info">
              <p>This view will provide memory optimization tools</p>
              <button 
                onClick={() => console.log('Optimization triggered for', filteredMemories.length, 'memories')}
              >
                Start Optimization
              </button>
            </div>
          </div>
        </div>
      );

    default:
      return <div>Unknown view mode: {viewMode}</div>;
  }
};
