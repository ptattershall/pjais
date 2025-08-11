import React from 'react';
import { ViewMode } from './MemoryViewRenderer';

export type { ViewMode }; // Re-export ViewMode type for other components to use

interface MemoryViewModeSelectorProps {
  currentViewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  className?: string;
}

export const MemoryViewModeSelector: React.FC<MemoryViewModeSelectorProps> = ({
  currentViewMode,
  onViewModeChange,
  className = ''
}) => {
  const viewModes: Array<{
    key: ViewMode;
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      key: 'graph',
      label: 'Graph View',
      description: 'Visualize memory relationships',
      icon: '🕸️'
    },
    {
      key: 'timeline',
      label: 'Timeline View',
      description: 'See memories over time',
      icon: '📅'
    },
    {
      key: 'health',
      label: 'Health Dashboard',
      description: 'Memory system health metrics',
      icon: '📊'
    },
    {
      key: 'search',
      label: 'Advanced Search',
      description: 'Search and filter memories',
      icon: '🔍'
    },
    {
      key: 'provenance',
      label: 'Provenance',
      description: 'Track memory lineage',
      icon: '🔗'
    },
    {
      key: 'optimization',
      label: 'Optimization',
      description: 'Memory optimization tools',
      icon: '⚡'
    }
  ];

  return (
    <div className={`memory-view-mode-selector ${className}`}>
      <div className="view-mode-tabs">
        {viewModes.map((mode) => (
          <button
            key={mode.key}
            className={`view-mode-tab ${currentViewMode === mode.key ? 'active' : ''}`}
            onClick={() => onViewModeChange(mode.key)}
            title={mode.description}
          >
            <span className="tab-icon">{mode.icon}</span>
            <span className="tab-label">{mode.label}</span>
          </button>
        ))}
      </div>
      
      <div className="view-mode-info">
        {viewModes.find(mode => mode.key === currentViewMode) && (
          <p className="current-view-description">
            {viewModes.find(mode => mode.key === currentViewMode)?.description}
          </p>
        )}
      </div>
    </div>
  );
};
