import React from 'react';
import { MemoryTier } from '@shared/types/memory';
import { SearchFilters } from '../types/search-types';

export interface FilterControlsProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  availableTiers: MemoryTier[];
  availableTypes: string[];
  availableTags: string[];
  className?: string;
  'aria-label'?: string;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  onChange,
  availableTiers,
  availableTypes,
  availableTags,
  className = '',
  'aria-label': ariaLabel = 'Memory Filter Controls',
}) => {
  // Handlers for each filter type
  const handleTierChange = (tier: MemoryTier) => {
    const tiers = filters.tiers?.includes(tier)
      ? filters.tiers.filter(t => t !== tier)
      : [...(filters.tiers || []), tier];
    onChange({ ...filters, tiers });
  };

  const handleTypeChange = (type: string) => {
    const types = filters.types?.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...(filters.types || []), type];
    onChange({ ...filters, types });
  };

  const handleTagChange = (tag: string) => {
    const tags = filters.tags?.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...(filters.tags || []), tag];
    onChange({ ...filters, tags });
  };

  const handleDateChange = (start: string, end: string) => {
    if (start && end) {
      onChange({
        ...filters,
        dateRange: {
          start: new Date(start),
          end: new Date(end),
        },
      });
    } else if (start) {
      onChange({
        ...filters,
        dateRange: {
          start: new Date(start),
          end: filters.dateRange?.end ?? new Date(start),
        },
      });
    } else if (end) {
      onChange({
        ...filters,
        dateRange: {
          start: filters.dateRange?.start ?? new Date(end),
          end: new Date(end),
        },
      });
    } else {
      const rest = { ...filters };
      delete rest.dateRange;
      onChange(rest);
    }
  };

  const handleImportanceChange = (min: number, max: number) => {
    onChange({
      ...filters,
      importanceRange: { min, max },
    });
  };

  const handleClear = () => {
    onChange({});
  };

  // Accessibility: handle keyboard for checkboxes
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, onClick: () => void) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <form
      className={`flex flex-col gap-4 p-4 bg-white rounded-lg shadow ${className}`}
      aria-label={ariaLabel}
      role="region"
    >
      <fieldset className="flex flex-wrap gap-2" aria-label="Tier Filters">
        <legend className="font-semibold text-sm mb-1">Tier</legend>
        {availableTiers.map(tier => (
          <label key={tier} className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={!!filters.tiers?.includes(tier)}
              onChange={() => handleTierChange(tier)}
              onKeyDown={e => handleKeyDown(e, () => handleTierChange(tier))}
              className="accent-blue-600"
              aria-checked={!!filters.tiers?.includes(tier)}
              aria-label={tier}
              tabIndex={0}
            />
            <span className="capitalize">{tier}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-wrap gap-2" aria-label="Type Filters">
        <legend className="font-semibold text-sm mb-1">Type</legend>
        {availableTypes.map(type => (
          <label key={type} className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={!!filters.types?.includes(type)}
              onChange={() => handleTypeChange(type)}
              onKeyDown={e => handleKeyDown(e, () => handleTypeChange(type))}
              className="accent-green-600"
              aria-checked={!!filters.types?.includes(type)}
              aria-label={type}
              tabIndex={0}
            />
            <span className="capitalize">{type}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-wrap gap-2" aria-label="Tag Filters">
        <legend className="font-semibold text-sm mb-1">Tags</legend>
        {availableTags.map(tag => (
          <label key={tag} className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={!!filters.tags?.includes(tag)}
              onChange={() => handleTagChange(tag)}
              onKeyDown={e => handleKeyDown(e, () => handleTagChange(tag))}
              className="accent-purple-600"
              aria-checked={!!filters.tags?.includes(tag)}
              aria-label={tag}
              tabIndex={0}
            />
            <span className="capitalize">{tag}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2" aria-label="Date Range Filter">
        <legend className="font-semibold text-sm mb-1">Date Range</legend>
        <div className="flex gap-2 items-center">
          <label className="flex flex-col text-xs">
            Start
            <input
              type="date"
              value={filters.dateRange?.start ? filters.dateRange.start.toISOString().slice(0, 10) : ''}
              onChange={e => handleDateChange(e.target.value, filters.dateRange?.end ? filters.dateRange.end.toISOString().slice(0, 10) : '')}
              className="border rounded px-2 py-1"
              aria-label="Start date"
            />
          </label>
          <label className="flex flex-col text-xs">
            End
            <input
              type="date"
              value={filters.dateRange?.end ? filters.dateRange.end.toISOString().slice(0, 10) : ''}
              onChange={e => handleDateChange(filters.dateRange?.start ? filters.dateRange.start.toISOString().slice(0, 10) : '', e.target.value)}
              className="border rounded px-2 py-1"
              aria-label="End date"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2" aria-label="Importance Range Filter">
        <legend className="font-semibold text-sm mb-1">Importance</legend>
        <div className="flex gap-2 items-center">
          <label className="flex flex-col text-xs">
            Min
            <input
              type="number"
              min={0}
              max={100}
              value={filters.importanceRange?.min ?? ''}
              onChange={e => handleImportanceChange(Number(e.target.value), filters.importanceRange?.max ?? 100)}
              className="border rounded px-2 py-1 w-16"
              aria-label="Minimum importance"
            />
          </label>
          <label className="flex flex-col text-xs">
            Max
            <input
              type="number"
              min={0}
              max={100}
              value={filters.importanceRange?.max ?? ''}
              onChange={e => handleImportanceChange(filters.importanceRange?.min ?? 0, Number(e.target.value))}
              className="border rounded px-2 py-1 w-16"
              aria-label="Maximum importance"
            />
          </label>
        </div>
      </fieldset>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm font-medium"
          onClick={handleClear}
          aria-label="Clear all filters"
        >
          Clear
        </button>
      </div>
    </form>
  );
};

export default FilterControls; 