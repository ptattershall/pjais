import React from 'react';

export type ProvenanceViewMode = 'tree' | 'timeline' | 'influence';

interface ProvenanceViewModeSelectorProps {
  viewMode: ProvenanceViewMode;
  onViewModeChange: (mode: ProvenanceViewMode) => void;
}

export const ProvenanceViewModeSelector: React.FC<ProvenanceViewModeSelectorProps> = ({
  viewMode,
  onViewModeChange
}) => {
  const viewModes: { key: ProvenanceViewMode; label: string }[] = [
    { key: 'tree', label: 'Tree View' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'influence', label: 'Influence Map' }
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