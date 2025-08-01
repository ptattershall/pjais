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
import { isNotNullish, safeFind, safeFilter, validateRequired } from '@shared/utils/validation';
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
  const [memories, setMemories] = useState<MemoryEntity[]>([]);
  const [relationships, setRelationships] = useState<MemoryRelationship[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<MemoryEntity[]>([]);
  const [filteredRelationships, setFilteredRelationships] = useState<MemoryRelationship[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<MemoryEntity | null>(null);
  const [hoveredMemory, setHoveredMemory] = useState<MemoryEntity | null>(null);
  const [filters, setFilters] = useState<MemoryFilters>({});
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [error, setError] = useState<string | null>(null);

  // Load memories and relationships
  const loadMemoryData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate required parameters
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get memories for the user/persona
      const memoryResponse = await window.electronAPI.memory.search('', personaId);

      if (memoryResponse && Array.isArray(memoryResponse)) {
        // Validate memory data structure
        const validMemories = memoryResponse.filter(memory => {
          return memory && 
                 typeof memory === 'object' && 
                 memory.id && 
                 memory.content !== undefined;
        });

        setMemories(validMemories);
        
        // For now, we'll use mock relationships since the API doesn't have relationship endpoints yet
        const mockRelationships: MemoryRelationship[] = [];
        setRelationships(mockRelationships);

        // Calculate stats
        const newStats = calculateMemoryStats(validMemories, mockRelationships);
        setStats(newStats);
      } else {
        throw new Error('Invalid memory data received');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load memory data';
      setError(errorMessage);
      console.error('Memory loading error:', err);
      // Set empty data on error
      setMemories([]);
      setRelationships([]);
    } finally {
      setLoading(false);
    }
  }, [userId, personaId]);

  // Apply filters to memories and relationships
  const applyFilters = useCallback(() => {
    if (!isNotNullish(memories) || memories.length === 0) {
      setFilteredMemories([]);
      setFilteredRelationships([]);
      return;
    }

    let filtered = [...memories];

    // Apply tier filter
    if (filters.tier) {
      filtered = safeFilter(filtered, memory => 
        isNotNullish(memory?.memoryTier) && memory.memoryTier === filters.tier
      );
    }

    // Apply type filter
    if (filters.type) {
      filtered = safeFilter(filtered, memory => 
        isNotNullish(memory?.type) && memory.type === filters.type
      );
    }

    // Apply importance filter
    if (filters.minImportance !== undefined) {
      filtered = safeFilter(filtered, memory => 
        isNotNullish(memory?.importance) && memory.importance >= filters.minImportance!
      );
    }

    // Apply search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(memory => {
        const content = typeof memory.content === 'string' ? memory.content : JSON.stringify(memory.content);
        return content.toLowerCase().includes(query) ||
               (memory.tags || []).some(tag => tag.toLowerCase().includes(query));
      });
    }

    // Apply date range filter
    if (filters.dateRange) {
      filtered = filtered.filter(memory => {
        const createdAt = memory.createdAt ? new Date(memory.createdAt) : new Date();
        return createdAt >= filters.dateRange!.start && createdAt <= filters.dateRange!.end;
      });
    }

    setFilteredMemories(filtered);

    // Filter relationships to only include those between filtered memories
    const filteredMemoryIds = new Set(filtered.map(m => m.id).filter(Boolean));
    const filteredRels = relationships.filter(rel => 
      filteredMemoryIds.has(rel.fromMemoryId) && filteredMemoryIds.has(rel.toMemoryId)
    );
    setFilteredRelationships(filteredRels);

  }, [memories, relationships, filters]);

  // Handle memory selection
  const handleMemorySelect = useCallback((memoryId: string) => {
    if (!isNotNullish(memoryId) || !isNotNullish(memories)) {
      console.warn('Invalid memory selection: memoryId or memories is null/undefined');
      return;
    }

    const memory = safeFind(memories, m => m.id === memoryId);
    if (memory) {
      setSelectedMemory(memory);
      onMemorySelect?.(memory);
    } else {
      console.warn(`Memory with ID ${memoryId} not found`);
    }
  }, [memories, onMemorySelect]);

  // Handle memory hover
  const handleMemoryHover = useCallback((memory: MemoryEntity | null) => {
    setHoveredMemory(memory);
  }, []);

  // Update filter with proper typing
  const updateFilter = useCallback((key: keyof MemoryFilters, value: MemoryFilterValue) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Load data on mount
  useEffect(() => {
    loadMemoryData();
  }, [loadMemoryData]);

  // Apply filters when memories or filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  if (loading) {
    return (
      <div className="memory-explorer loading">
        <div className="loading-spinner"></div>
        <p>Loading memory graph...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="memory-explorer error">
        <h2>Memory Explorer</h2>
        <p className="error-message">{error}</p>
        <button onClick={loadMemoryData}>Retry</button>
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
          <AsyncErrorBoundary context="MemoryAdvancedSearch">
            <MemoryAdvancedSearch
              userId={userId}
              memories={filteredMemories}
              onMemorySelect={(memory) => memory.id && handleMemorySelect(memory.id)}
              onResultsChange={(results) => {
                console.log('Search results updated:', results.length);
              }}
              enableSemanticSearch={true}
              enableProvenance={true}
              enableExport={true}
            />
          </AsyncErrorBoundary>
        );

      case 'optimization':
        return (
          <AsyncErrorBoundary context="MemoryOptimizationEngine">
            <MemoryOptimizationEngine
              memories={filteredMemories}
              onOptimizationComplete={(session) => {
                console.log('Optimization completed:', session);
                loadMemoryData();
              }}
              onOptimizationProgress={(progress) => {
                console.log('Optimization progress:', progress);
              }}
              autoOptimize={false}
              optimizationInterval={60}
            />
          </AsyncErrorBoundary>
        );

      case 'provenance':
        if (selectedMemory && isNotNullish(selectedMemory.id)) {
          return (
            <AsyncErrorBoundary context="MemoryProvenanceTracker">
              <MemoryProvenanceTracker
                rootMemoryId={selectedMemory.id}
                maxDepth={3}
                onNodeSelect={(node) => {
                  if (!isNotNullish(node?.id)) {
                    console.warn('Invalid node selected: node or node.id is null/undefined');
                    return;
                  }

                  const memory = safeFind(memories, m => m.id === node.id);
                  if (memory) {
                    setSelectedMemory(memory);
                    onMemorySelect?.(memory);
                  } else {
                    console.warn(`Memory with ID ${node.id} not found`);
                  }
                }}
                onRelationshipSelect={(relationship) => {
                  console.log('Relationship selected:', relationship);
                }}
                enableInteraction={true}
                width={1000}
                height={600}
              />
            </AsyncErrorBoundary>
          );
        } else {
          return (
            <div className="provenance-empty-state">
              <h3>Memory Provenance Tracker</h3>
              <p>Please select a memory from the graph or timeline view to explore its provenance and lineage.</p>
              <button onClick={() => setViewMode('graph')} className="switch-view-button">
                Go to Graph View
              </button>
            </div>
          );
        }

      default:
        return null;
    }
  };

  return (
    <div className="memory-explorer">
      <header className="memory-explorer-header">
        <div className="header-content">
          <h1>Memory Explorer</h1>
          <p>Visualize and navigate your AI memory landscape</p>
        </div>
        
        <MemoryViewModeSelector
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </header>

      <MemoryFilterControls
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
      />

      {stats && (
        <MemoryStatsDisplay
          filteredMemories={filteredMemories}
          filteredRelationships={filteredRelationships}
          stats={stats}
        />
      )}

      <main className="memory-explorer-content">
        {renderViewContent()}
      </main>

      <MemoryDetailsPanel
        selectedMemory={selectedMemory}
        hoveredMemory={hoveredMemory}
        onEdit={onMemoryEdit}
        onDelete={onMemoryDelete}
      />
    </div>
  );
}; 