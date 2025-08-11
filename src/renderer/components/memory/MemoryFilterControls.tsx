import React from 'react';
import { MemoryTier } from '@shared/types/memory';
import { MemoryStats } from './MemoryStatsDisplay'; // Import existing MemoryStats interface

export interface MemoryFilters {
  tier?: MemoryTier;
  type?: string;
  minImportance?: number;
  importance?: string; // For compatibility with existing usage
  searchQuery?: string;
  tags?: string[]; // Added missing tags property
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export type MemoryFilterValue = 
  | MemoryTier 
  | string 
  | string[]
  | number 
  | { start: Date; end: Date } 
  | undefined;

interface MemoryFilterControlsProps {
  filters: MemoryFilters;
  onFilterChange: (key: keyof MemoryFilters, value: MemoryFilterValue) => void;
  onClearFilters?: () => void; // Made optional
  stats?: MemoryStats | null; // Added missing stats prop using existing interface
  loading?: boolean; // Added missing loading prop
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
        <div className="filter-group">
          <label htmlFor="tier-filter">Memory Tier:</label>
          <select 
            id="tier-filter"
            value={filters.tier || ''}
            onChange={(e) => onFilterChange('tier', e.target.value as MemoryTier || undefined)}
            className="filter-select"
            aria-label="Filter by memory tier"
          >
            <option value="">All Tiers</option>
            <option value="hot">Hot Tier</option>
            <option value="warm">Warm Tier</option>
            <option value="cold">Cold Tier</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="type-filter">Memory Type:</label>
          <select 
            id="type-filter"
            value={filters.type || ''}
            onChange={(e) => onFilterChange('type', e.target.value || undefined)}
            className="filter-select"
            aria-label="Filter by memory type"
          >
            <option value="">All Types</option>
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="audio">Audio</option>
            <option value="video">Video</option>
            <option value="file">File</option>
          </select>
        </div>

        <div className="importance-filter">
          <label htmlFor="importance-slider">Min Importance: {filters.minImportance || 0}</label>
          <input
            id="importance-slider"
            type="range"
            min="0"
            max="100"
            value={filters.minImportance || 0}
            onChange={(e) => onFilterChange('minImportance', parseInt(e.target.value))}
            className="importance-slider"
            aria-label="Minimum importance threshold"
          />
        </div>

        {onClearFilters && (
          <button onClick={onClearFilters} className="clear-filters" type="button">
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};
