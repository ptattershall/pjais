import React, { useState, useMemo } from 'react';
import { FilterControls } from '../ui/FilterControls';
import { ExportControls } from '../ui/ExportControls';
import { useMemoryFiltering } from '../hooks/useMemoryFiltering';
import { MemoryEntity, MemoryTier } from '@shared/types/memory';
import { SearchFilters, ExportFormat } from '../types/search-types';

export const MemoryHealthDashboard: React.FC<{ memories: MemoryEntity[] }> = ({ memories }) => {
  const [filters, setFilters] = useState<SearchFilters>({});
  const filteredMemories = useMemoryFiltering(memories, filters);

  // Gather available options
  const availableTiers = useMemo(() => [...new Set(memories.map(m => m.memoryTier))] as MemoryTier[], [memories]);
  const availableTypes = useMemo(() => [...new Set(memories.map(m => m.type))], [memories]);
  const availableTags = useMemo(() => [...new Set(memories.flatMap(m => m.tags || []))], [memories]);
  const availableFormats: ExportFormat[] = ['json', 'csv', 'txt'];

  // Export handler
  const handleExport = (format: ExportFormat) => {
    // TODO: Implement export logic for filteredMemories in the selected format
    // e.g., download as file or trigger export modal
    // This is a stub for now
    console.log('Exporting', filteredMemories.length, 'memories as', format);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4 items-center">
        <FilterControls
          filters={filters}
          onChange={setFilters}
          availableTiers={availableTiers}
          availableTypes={availableTypes}
          availableTags={availableTags}
        />
        <ExportControls
          onExport={handleExport}
          availableFormats={availableFormats}
        />
      </div>
      {/* ...rest of dashboard, using filteredMemories... */}
    </div>
  );
}; 