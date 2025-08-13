import React, { useState, useCallback, useEffect } from 'react';
import { MemoryEntity } from '../../../shared/types/memory';

// Bookmark and filter types
export interface TimelineBookmark {
  id: string;
  name: string;
  description: string;
  timestamp: Date;
  timeRange?: [Date, Date];
  filters?: TemporalFilter;
  color: string;
  isGlobal: boolean;
  createdAt: Date;
  tags: string[];
}

export interface TemporalFilter {
  dateRange?: [Date, Date];
  timeOfDay?: {
    start: number; // Hours in 24h format
    end: number;
  };
  dayOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  memoryDensity?: {
    min: number;
    max: number;
  };
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'custom';
  importanceThreshold?: number;
  tierFilter?: string[];
  typeFilter?: string[];
}

interface MemoryTimelineBookmarksProps {
  memories: MemoryEntity[];
  onFilterChange: (filter: TemporalFilter) => void;
  onBookmarkSelect: (bookmark: TimelineBookmark) => void;
  onMemoriesFiltered: (filteredMemories: MemoryEntity[]) => void;
  enablePersistence?: boolean;
}

export const MemoryTimelineBookmarks: React.FC<MemoryTimelineBookmarksProps> = ({
  memories,
  onFilterChange,
  onBookmarkSelect,
  onMemoriesFiltered,
  enablePersistence = true,
}) => {
  const [bookmarks, setBookmarks] = useState<TimelineBookmark[]>([]);
  const [currentFilter, setCurrentFilter] = useState<TemporalFilter>({});
  const [isCreatingBookmark, setIsCreatingBookmark] = useState(false);
  const [newBookmarkData, setNewBookmarkData] = useState<Partial<TimelineBookmark>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  // Predefined filter presets
  const defaultPresets: Record<string, TemporalFilter> = {
    'today': {
      dateRange: [
        new Date(new Date().setHours(0, 0, 0, 0)),
        new Date(new Date().setHours(23, 59, 59, 999))
      ],
    },
    'thisWeek': {
      dateRange: [
        new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
        new Date()
      ],
    },
    'highActivity': {
      memoryDensity: { min: 10, max: 100 },
      importanceThreshold: 70,
    },
    'workingHours': {
      timeOfDay: { start: 9, end: 17 },
      dayOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
    },
    'hotMemories': {
      tierFilter: ['hot'],
    },
  };

  // Apply temporal filters to memories
  const applyTemporalFilter = useCallback((filter: TemporalFilter, memoriesToFilter: MemoryEntity[]): MemoryEntity[] => {
    let filtered = [...memoriesToFilter];

    // Date range filter
    if (filter.dateRange) {
      const [start, end] = filter.dateRange;
      filtered = filtered.filter(memory => {
        const createdAt = new Date(memory.createdAt || 0);
        return createdAt >= start && createdAt <= end;
      });
    }

    // Time of day filter
    if (filter.timeOfDay) {
      filtered = filtered.filter(memory => {
        const hour = new Date(memory.createdAt || 0).getHours();
        return hour >= filter.timeOfDay!.start && hour <= filter.timeOfDay!.end;
      });
    }

    // Day of week filter
    if (filter.dayOfWeek && filter.dayOfWeek.length > 0) {
      filtered = filtered.filter(memory => {
        const dayOfWeek = new Date(memory.createdAt || 0).getDay();
        return filter.dayOfWeek!.includes(dayOfWeek);
      });
    }

    // Importance threshold filter
    if (filter.importanceThreshold !== undefined) {
      filtered = filtered.filter(memory => (memory.importance || 0) >= filter.importanceThreshold!);
    }

    // Tier filter
    if (filter.tierFilter && filter.tierFilter.length > 0) {
      filtered = filtered.filter(memory => filter.tierFilter!.includes(memory.memoryTier || 'cold'));
    }

    // Type filter
    if (filter.typeFilter && filter.typeFilter.length > 0) {
      filtered = filtered.filter(memory => filter.typeFilter!.includes(memory.type));
    }

    return filtered;
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilter: TemporalFilter) => {
    setCurrentFilter(newFilter);
    onFilterChange(newFilter);
    
    const filteredMemories = applyTemporalFilter(newFilter, memories);
    onMemoriesFiltered(filteredMemories);
  }, [onFilterChange, onMemoriesFiltered, applyTemporalFilter, memories]);

  // Create a new bookmark
  const createBookmark = useCallback(() => {
    if (!newBookmarkData.name) return;

    const bookmark: TimelineBookmark = {
      id: `bookmark-${Date.now()}-${Math.random()}`,
      name: newBookmarkData.name,
      description: newBookmarkData.description || '',
      timestamp: newBookmarkData.timestamp || new Date(),
      timeRange: newBookmarkData.timeRange,
      filters: { ...currentFilter },
      color: newBookmarkData.color || '#3498db',
      isGlobal: newBookmarkData.isGlobal || false,
      createdAt: new Date(),
      tags: newBookmarkData.tags || [],
    };

    setBookmarks(prev => [...prev, bookmark]);
    setIsCreatingBookmark(false);
    setNewBookmarkData({});

    // Persist to local storage if enabled
    if (enablePersistence) {
      const allBookmarks = [...bookmarks, bookmark];
      localStorage.setItem('memoryTimelineBookmarks', JSON.stringify(allBookmarks));
    }
  }, [newBookmarkData, currentFilter, bookmarks, enablePersistence]);

  // Load a bookmark
  const loadBookmark = useCallback((bookmark: TimelineBookmark) => {
    if (bookmark.filters) {
      handleFilterChange(bookmark.filters);
    }
    
    if (bookmark.timeRange) {
      handleFilterChange({
        ...currentFilter,
        dateRange: bookmark.timeRange,
      });
    }

    onBookmarkSelect(bookmark);
  }, [handleFilterChange, currentFilter, onBookmarkSelect]);

  // Delete a bookmark
  const deleteBookmark = useCallback((bookmarkId: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    
    if (enablePersistence) {
      const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
      localStorage.setItem('memoryTimelineBookmarks', JSON.stringify(updatedBookmarks));
    }
  }, [bookmarks, enablePersistence]);

  // Load bookmarks from storage on mount
  useEffect(() => {
    if (enablePersistence) {
      const stored = localStorage.getItem('memoryTimelineBookmarks');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setBookmarks(parsed.map((b: any) => ({
            ...b,
            timestamp: new Date(b.timestamp),
            createdAt: new Date(b.createdAt),
            timeRange: b.timeRange ? [new Date(b.timeRange[0]), new Date(b.timeRange[1])] : undefined,
          })));
        } catch (error) {
          console.error('Error loading bookmarks:', error);
        }
      }
    }
  }, [enablePersistence]);

  return (
    <div className="memory-timeline-bookmarks">
      <div className="bookmarks-controls">
        <div className="filter-presets">
          <label htmlFor="filter-presets-select">Quick Filters:</label>
          <select
            id="filter-presets-select"
            value={selectedPreset}
            onChange={(e) => {
              setSelectedPreset(e.target.value);
              if (e.target.value && defaultPresets[e.target.value]) {
                handleFilterChange(defaultPresets[e.target.value]);
              }
            }}
            title="Quick Filters Preset"
          >
            <option value="">Select preset...</option>
            {Object.entries(defaultPresets).map(([key]) => (
              <option key={key} value={key}>
                {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setIsCreatingBookmark(true)}
          className="create-bookmark-btn"
        >
          📌 Create Bookmark
        </button>

        <button
          onClick={() => {
            setCurrentFilter({});
            handleFilterChange({});
          }}
          className="clear-filter-btn"
        >
          🗑️ Clear Filters
        </button>
      </div>

      {/* Advanced Filter Controls */}
      <div className="advanced-filters">
        <div className="filter-section">
          <h4>Temporal Filters</h4>
          
          <div className="filter-row">
            <label htmlFor="importance-threshold-slider">Importance Threshold:</label>
            <input
              id="importance-threshold-slider"
              type="range"
              min="0"
              max="100"
              value={currentFilter.importanceThreshold || 0}
              onChange={(e) => {
                handleFilterChange({
                  ...currentFilter,
                  importanceThreshold: parseInt(e.target.value),
                });
              }}
              title="Set importance threshold filter"
              aria-label="Importance threshold"
            />
            <span aria-live="polite">{currentFilter.importanceThreshold || 0}</span>
          </div>
        </div>
      </div>

      {/* Bookmarks List */}
      {bookmarks.length > 0 && (
        <div className="bookmarks-list">
          <h4>Saved Bookmarks ({bookmarks.length})</h4>
          <div className="bookmarks-grid">
            {bookmarks.map(bookmark => (
              <div
                key={bookmark.id}
                className="bookmark-card"
                style={{ borderLeftColor: bookmark.color }}
              >
                <div className="bookmark-header">
                  <h5>{bookmark.name}</h5>
                  <div className="bookmark-actions">
                    <button
                      onClick={() => loadBookmark(bookmark)}
                      title="Load bookmark"
                    >
                      📂
                    </button>
                    <button
                      onClick={() => deleteBookmark(bookmark.id)}
                      title="Delete bookmark"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <p className="bookmark-description">{bookmark.description}</p>
                
                <div className="bookmark-details">
                  <span className="bookmark-timestamp">
                    {bookmark.timestamp.toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Bookmark Modal */}
      {isCreatingBookmark && (
        <div className="bookmark-modal">
          <div className="modal-content">
            <h3>Create Timeline Bookmark</h3>
            
            <div className="form-field">
              <label htmlFor="bookmark-name-input">Name:</label>
              <input
                  id="bookmark-name-input"
                  type="text"
                  value={newBookmarkData.name || ''}
                  onChange={(e) => setNewBookmarkData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Bookmark name..."
                  title="Enter bookmark name"
                  aria-label="Bookmark name"
                  aria-required="true"
              />
            </div>

            <div className="form-field">
              <label htmlFor="bookmark-description-textarea">Description:</label>
              <textarea
                id="bookmark-description-textarea"
                value={newBookmarkData.description || ''}
                onChange={(e) => setNewBookmarkData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description..."
                title="Enter bookmark description"
                aria-label="Bookmark description"
              />
            </div>

            <div className="form-field">
              <label htmlFor="bookmark-color-input">Color:</label>
              <input
                id="bookmark-color-input"
                type="color"
                value={newBookmarkData.color || '#3498db'}
                onChange={(e) => setNewBookmarkData(prev => ({ ...prev, color: e.target.value }))}
                title="Select bookmark color"
                aria-label="Bookmark color"
              />
            </div>

            <div className="modal-actions">
              <button onClick={createBookmark} disabled={!newBookmarkData.name}>
                Create Bookmark
              </button>
              <button onClick={() => {
                setIsCreatingBookmark(false);
                setNewBookmarkData({});
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Filter Summary */}
      {Object.keys(currentFilter).length > 0 && (
        <div className="current-filter-summary">
          <h4>Active Filters</h4>
          <div className="filter-tags">
            {currentFilter.dateRange && (
              <span className="filter-tag">
                📅 {currentFilter.dateRange[0].toLocaleDateString()} - {currentFilter.dateRange[1].toLocaleDateString()}
              </span>
            )}
            {currentFilter.importanceThreshold !== undefined && (
              <span className="filter-tag">
                ⭐ Importance ≥ {currentFilter.importanceThreshold}
              </span>
            )}
            {currentFilter.tierFilter && (
              <span className="filter-tag">
                🔥 Tiers: {currentFilter.tierFilter.join(', ')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
