import React, { useState, useEffect, useCallback } from 'react';
import { MemoryGraphVisualizer } from './MemoryGraphVisualizer';
import { MemoryTimelineVisualizer } from './MemoryTimelineVisualizer';
import { MemoryHealthDashboard } from './MemoryHealthDashboard';
import { MemoryAdvancedSearch } from './MemoryAdvancedSearch';
import { MemoryOptimizationEngine } from './MemoryOptimizationEngine';
import { MemoryProvenanceTracker } from './MemoryProvenanceTracker';
import { MemoryViewModeSelector, ViewMode } from './MemoryViewModeSelector';
import { MemoryFilterControls, MemoryFilters, MemoryFilterValue } from './MemoryFilterControls';
import { MemoryStatsDisplay, MemoryStats, calculateMemoryStats } from './MemoryStatsDisplay';
import { MemoryDetailsPanel } from './MemoryDetailsPanel';
import { MemoryEntity, MemoryRelationship } from '@shared/types/memory';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { AsyncErrorBoundary } from '../common/AsyncErrorBoundary';
import { isNotNullish } from '@shared/utils/validation';
import { 
  usePersonaMemories, 
  useMemoryStats, 
  useMemoryAnalytics,
  useMemorySearch 
} from '../../../livestore/query';
import '../../../renderer/styles/memory-graph.css';

interface MemoryExplorerProps {
  userId: string;
  personaId?: string;
  onMemorySelect?: (memory: MemoryEntity) => void;
  onMemoryEdit?: (memory: MemoryEntity) => void;
  onMemoryDelete?: (memoryId: string) => void;
}

export const MemoryExplorer: React.FC<MemoryExplorerProps> = ({
  userId,
  personaId,
  onMemorySelect,
  onMemoryEdit,
  onMemoryDelete
}) => {
  const [filteredMemories, setFilteredMemories] = useState<MemoryEntity[]>([]);
  const [filteredRelationships, setFilteredRelationships] = useState<MemoryRelationship[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<MemoryEntity | null>(null);
  const [hoveredMemory, setHoveredMemory] = useState<MemoryEntity | null>(null);
  const [filters, setFilters] = useState<MemoryFilters>({});
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Use LiveStore queries for real-time data
  const memories = usePersonaMemories(personaId || '');
  const memoryStats = useMemoryStats(personaId || '');
  const memoryAnalytics = useMemoryAnalytics(personaId || '');
  const searchResults = useMemorySearch(personaId || '', searchTerm);

  // Determine which data to use based on search state
  const currentMemories = searchTerm ? searchResults : memories;

  // For now, we'll use mock relationships since the API doesn't have relationship endpoints yet
  const relationships: MemoryRelationship[] = [];

  // Apply filters to memories and relationships
  const applyFilters = useCallback(() => {
    if (!isNotNullish(currentMemories) || currentMemories.length === 0) {
      setFilteredMemories([]);
      setFilteredRelationships([]);
      return;
    }

    let filtered = [...currentMemories];

    // Apply type filter
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(memory => memory.type === filters.type);
    }

    // Apply tier filter
    if (filters.tier && filters.tier !== 'all') {
      filtered = filtered.filter(memory => memory.memoryTier === filters.tier);
    }

    // Apply importance filter
    if (filters.importance && filters.importance !== 'all') {
      const importanceValue = parseInt(filters.importance);
      if (!isNaN(importanceValue)) {
        filtered = filtered.filter(memory => memory.importance >= importanceValue);
      }
    }

    // Apply date range filter
    if (filters.dateRange && filters.dateRange.start && filters.dateRange.end) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered.filter(memory => {
        const memoryDate = new Date(memory.createdAt);
        return memoryDate >= startDate && memoryDate <= endDate;
      });
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(memory => {
        return filters.tags!.some(tag => memory.tags?.includes(tag));
      });
    }

    setFilteredMemories(filtered);

    // Filter relationships based on filtered memories
    const filteredMemoryIds = new Set(filtered.map(m => m.id));
    const filteredRels = relationships.filter(rel => 
      filteredMemoryIds.has(rel.sourceId) && filteredMemoryIds.has(rel.targetId)
    );
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
  const handleMemoryHover = useCallback((memory: MemoryEntity | null) => {
    setHoveredMemory(memory);
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

  // Error handling
  if (error) {
    return (
      <div className="memory-explorer-error">
        <h3>Error Loading Memory Data</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const renderViewContent = () => {
    switch (viewMode) {
      case 'graph':
        return (
          <ErrorBoundary context="MemoryGraphVisualizer">
            <MemoryGraphVisualizer
              userId={userId}
              memories={filteredMemories}
              relationships={filteredRelationships}
              selectedMemoryId={selectedMemory?.id}
              onMemorySelect={handleMemorySelect}
              onMemoryHover={handleMemoryHover}
              width={1000}
              height={700}
              showTierLabels={true}
              enableZoom={true}
              enableDrag={true}
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
              onMemorySelect={handleMemorySelect}
              onMemoryHover={handleMemoryHover}
              onTimeRangeChange={(start, end) => {
                updateFilter('dateRange', { start, end });
              }}
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
                if (window.electronAPI?.memory?.optimize) {
                  window.electronAPI.memory.optimize();
                }
              }}
              refreshInterval={30000}
            />
          </AsyncErrorBoundary>
        );

      case 'search':
        return (
          <ErrorBoundary context="MemoryAdvancedSearch">
            <MemoryAdvancedSearch
              userId={userId}
              memories={filteredMemories}
              onSearch={handleSearch}
              onMemorySelect={handleMemorySelect}
              onMemoryEdit={handleMemoryEdit}
              onMemoryDelete={handleMemoryDelete}
              searchTerm={searchTerm}
            />
          </ErrorBoundary>
        );

      case 'provenance':
        return (
          <ErrorBoundary context="MemoryProvenanceTracker">
            <MemoryProvenanceTracker
              userId={userId}
              memories={filteredMemories}
              onMemorySelect={handleMemorySelect}
            />
          </ErrorBoundary>
        );

      case 'optimization':
        return (
          <ErrorBoundary context="MemoryOptimizationEngine">
            <MemoryOptimizationEngine
              userId={userId}
              memories={filteredMemories}
              onOptimizationComplete={(optimizedMemories) => {
                console.log('Optimization completed:', optimizedMemories);
              }}
            />
          </ErrorBoundary>
        );

      default:
        return <div>Unknown view mode: {viewMode}</div>;
    }
  };

  return (
    <div className="memory-explorer">
      <div className="memory-explorer-header">
        <div className="memory-explorer-controls">
          <MemoryViewModeSelector
            currentMode={viewMode}
            onModeChange={setViewMode}
            availableModes={['graph', 'timeline', 'health', 'search', 'provenance', 'optimization']}
          />
          
          <MemoryFilterControls
            filters={filters}
            onFilterChange={updateFilter}
            stats={stats}
            loading={loading}
          />
        </div>

        <div className="memory-explorer-stats">
          <MemoryStatsDisplay
            stats={stats}
            loading={loading}
            totalMemories={currentMemories?.length || 0}
            filteredCount={filteredMemories.length}
          />
        </div>
      </div>

      <div className="memory-explorer-content">
        {loading ? (
          <div className="memory-explorer-loading">
            <div className="loading-spinner"></div>
            <p>Loading memories...</p>
          </div>
        ) : (
          <>
            {renderViewContent()}
            
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