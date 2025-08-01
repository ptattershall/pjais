import React from 'react';

export type ViewMode = 'graph' | 'timeline' | 'health' | 'search' | 'optimization' | 'provenance';

interface MemoryViewModeSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const MemoryViewModeSelector: React.FC<MemoryViewModeSelectorProps> = ({
  viewMode,
  onViewModeChange
}) => {
  const viewModes: { key: ViewMode; label: string }[] = [
    { key: 'graph', label: 'Graph View' },
    { key: 'timeline', label: 'Timeline View' },
    { key: 'health', label: 'Health Dashboard' },
    { key: 'search', label: 'Advanced Search' },
    { key: 'optimization', label: 'Optimization' },
    { key: 'provenance', label: 'Provenance' }
  ];

  return (
    <div className="view-mode-selector">
      {viewModes.map(({ key, label }) => (
        <button
          key={key}
          className={viewMode === key ? 'active' : ''}
          onClick={() => onViewModeChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}; 