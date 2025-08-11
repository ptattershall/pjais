import React, { useState, useEffect, useCallback } from 'react';
import { MemoryViewModeSelector, ViewMode } from './MemoryViewModeSelector';
import { MemoryFilterControls, MemoryFilters, MemoryFilterValue } from './MemoryFilterControls';
import { MemoryStatsDisplay, MemoryStats, calculateMemoryStats } from './MemoryStatsDisplay';
import { MemoryViewRenderer } from './MemoryViewRenderer';
import { MemoryDetailsPanel } from './MemoryDetailsPanel';
import { MemoryLoadingState } from './MemoryLoadingState';
import { MemoryEntity, MemoryRelationship } from '@shared/types/memory';
import { transformMemoryResponse, applyMemoryFilters } from './MemoryExplorerUtils';
import { 
  useReactivePersonaMemories, 
  useReactiveMemorySearch,
  useMemoryNotifications 
} from '../../hooks/useReactiveMemories';
import '../../../renderer/styles/memory-graph.css';

interface MemoryExplorerProps {
  userId: string;
  personaId?: string;
  onMemorySelect?: (memory: MemoryEntity) => void;
  onMemoryEdit?: (memory: MemoryEntity) => void;
  onMemoryDelete?: (memoryId: string) => void;
}

export const MemoryExplorer: React.FC<MemoryExplorerProps> = ({
  userId: _userId,
  personaId,
  onMemorySelect,
  onMemoryEdit,
  onMemoryDelete
}) => {
  const [filteredMemories, setFilteredMemories] = useState<MemoryEntity[]>([]);
  const [filteredRelationships, setFilteredRelationships] = useState<MemoryRelationship[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<MemoryEntity | null>(null);
  const [filters, setFilters] = useState<MemoryFilters>({});
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [searchTerm, setSearchTerm] = useState('');

  // Use reactive hooks for real-time data
  const personaIdNum = personaId ? parseInt(personaId) : undefined;
  const memoriesQuery = useReactivePersonaMemories(personaIdNum || 0);
  const searchQuery = useReactiveMemorySearch(personaId, searchTerm);

  // Set up memory notifications for real-time updates
  useMemoryNotifications({
    showToasts: true,
    onMemoryAdded: (memory) => {
      console.log('New memory added:', memory);
      // The reactive hooks will automatically update
    },
    onMemoryUpdated: (memory) => {
      console.log('Memory updated:', memory);
      // The reactive hooks will automatically update
    },
    onMemoryDeleted: (memoryId) => {
      console.log('Memory deleted:', memoryId);
      // Clear selection if deleted memory was selected
      if (selectedMemory?.id === memoryId.toString()) {
        setSelectedMemory(null);
      }
    }
  });

  // Extract and transform data from queries
  const memories = memoriesQuery.data?.map(transformMemoryResponse) || [];
  const searchResults = searchQuery.data?.map(transformMemoryResponse) || [];
  
  // Determine which data to use based on search state
  const currentMemories = searchTerm ? searchResults : memories;

  // For now, we'll use mock relationships since the API doesn't have relationship endpoints yet
  const relationships: MemoryRelationship[] = [];

  // Apply filters to memories and relationships
  const applyFilters = useCallback(() => {
    if (!currentMemories || currentMemories.length === 0) {
      setFilteredMemories([]);
      setFilteredRelationships([]);
      return;
    }

    const { filteredMemories: filtered, filteredRelationships: filteredRels } = applyMemoryFilters(
      currentMemories, 
      relationships, 
      filters
    );
    
    setFilteredMemories(filtered);
    setFilteredRelationships(filteredRels);

    // Update stats with filtered data
    const newStats = calculateMemoryStats(filtered, filteredRels);
    setStats(newStats);
  }, [currentMemories, filters, relationships]);

  // Update filtered data when memories or filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Update loading state based on data availability
  useEffect(() => {
    setLoading(!currentMemories);
  }, [currentMemories]);

  // Handle memory selection
  const handleMemorySelect = useCallback((memory: MemoryEntity) => {
    setSelectedMemory(memory);
    onMemorySelect?.(memory);
  }, [onMemorySelect]);

  // Handle memory hover
  const handleMemoryHover = useCallback((_memory: MemoryEntity | null) => {
    // Currently unused but available for future use
  }, []);

  // Handle filter changes
  const updateFilter = useCallback((key: keyof MemoryFilters, value: MemoryFilterValue) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Handle search
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // Handle memory operations
  const handleMemoryEdit = useCallback((memory: MemoryEntity) => {
    onMemoryEdit?.(memory);
  }, [onMemoryEdit]);

  const handleMemoryDelete = useCallback((memoryId: string) => {
    onMemoryDelete?.(memoryId);
  }, [onMemoryDelete]);

  // Handle time range changes from timeline view
  const handleTimeRangeChange = useCallback((start: Date, end: Date) => {
    updateFilter('dateRange', { start, end });
  }, [updateFilter]);

  return (
    <div className="memory-explorer">
      <div className="memory-explorer-header">
        <div className="memory-explorer-controls">
          <MemoryViewModeSelector
            currentViewMode={viewMode}
            onViewModeChange={setViewMode}
          />
          
          <MemoryFilterControls
            filters={filters}
            onFilterChange={updateFilter}
            stats={stats || {
              total: 0,
              byTier: { hot: 0, warm: 0, cold: 0 },
              byType: {},
              averageImportance: 0,
              totalRelationships: 0
            }}
            loading={loading}
          />
        </div>

        <div className="memory-explorer-stats">
          {stats && (
            <MemoryStatsDisplay
              filteredMemories={filteredMemories}
              filteredRelationships={filteredRelationships}
              stats={stats}
            />
          )}
        </div>
      </div>

      <div className="memory-explorer-content">
        {loading ? (
          <MemoryLoadingState message="Loading memories..." />
        ) : (
          <>
            <MemoryViewRenderer
              viewMode={viewMode}
              userId={_userId}
              filteredMemories={filteredMemories}
              filteredRelationships={filteredRelationships}
              selectedMemory={selectedMemory}
              searchTerm={searchTerm}
              onMemorySelect={handleMemorySelect}
              onMemoryHover={handleMemoryHover}
              onMemoryEdit={handleMemoryEdit}
              onMemoryDelete={handleMemoryDelete}
              onTimeRangeChange={handleTimeRangeChange}
              onSearch={handleSearch}
            />
            
            {selectedMemory && (
              <MemoryDetailsPanel
                memory={selectedMemory}
                onClose={() => setSelectedMemory(null)}
                onEdit={handleMemoryEdit}
                onDelete={handleMemoryDelete}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
