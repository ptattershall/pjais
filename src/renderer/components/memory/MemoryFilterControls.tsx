import React from 'react';
import { MemoryTier } from '@shared/types/memory';

export interface MemoryFilters {
  tier?: MemoryTier;
  type?: string;
  minImportance?: number;
  searchQuery?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export type MemoryFilterValue = 
  | MemoryTier 
  | string 
  | number 
  | { start: Date; end: Date } 
  | undefined;

interface MemoryFilterControlsProps {
  filters: MemoryFilters;
  onFilterChange: (key: keyof MemoryFilters, value: MemoryFilterValue) => void;
  onClearFilters: () => void;
}

export const MemoryFilterControls: React.FC<MemoryFilterControlsProps> = ({
  filters,
  onFilterChange,
  onClearFilters
}) => {
  return (
    <div className="memory-explorer-controls">
      <div className="search-controls">
        <input
          type="text"
          placeholder="Search memories..."
          value={filters.searchQuery || ''}
          onChange={(e) => onFilterChange('searchQuery', e.target.value)}
          className="search-input"
        />
      </div>

      <div className="filter-controls">
        <select 
          value={filters.tier || ''}
          onChange={(e) => onFilterChange('tier', e.target.value as MemoryTier || undefined)}
          className="filter-select"
        >
          <option value="">All Tiers</option>
          <option value="hot">Hot Tier</option>
          <option value="warm">Warm Tier</option>
          <option value="cold">Cold Tier</option>
        </select>

        <select 
          value={filters.type || ''}
          onChange={(e) => onFilterChange('type', e.target.value || undefined)}
          className="filter-select"
        >
          <option value="">All Types</option>
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="audio">Audio</option>
          <option value="video">Video</option>
          <option value="file">File</option>
        </select>

        <div className="importance-filter">
          <label>Min Importance:</label>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.minImportance || 0}
            onChange={(e) => onFilterChange('minImportance', parseInt(e.target.value))}
            className="importance-slider"
          />
          <span>{filters.minImportance || 0}</span>
        </div>

        <button onClick={onClearFilters} className="clear-filters">
          Clear Filters
        </button>
      </div>
    </div>
  );
}; 