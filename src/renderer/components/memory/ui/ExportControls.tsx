import React, { useState } from 'react';
import { ExportFormat } from '../types/search-types';

export interface ExportControlsProps {
  onExport: (format: ExportFormat) => void;
  availableFormats: ExportFormat[];
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export const ExportControls: React.FC<ExportControlsProps> = ({
  onExport,
  availableFormats,
  disabled = false,
  className = '',
  'aria-label': ariaLabel = 'Export Controls',
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(availableFormats[0]);

  const handleExport = () => {
    if (!disabled) onExport(selectedFormat);
  };

  return (
    <form className={`flex items-center gap-2 ${className}`} aria-label={ariaLabel} role="region">
      <fieldset className="flex items-center gap-2" aria-label="Export Format">
        <legend className="sr-only">Export Format</legend>
        {availableFormats.map(format => (
          <label key={format} className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="export-format"
              value={format}
              checked={selectedFormat === format}
              onChange={() => setSelectedFormat(format)}
              disabled={disabled}
              aria-checked={selectedFormat === format}
              aria-label={format}
              tabIndex={0}
              className="accent-blue-600"
            />
            <span className="capitalize">{format}</span>
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        onClick={handleExport}
        disabled={disabled}
        aria-label={`Export as ${selectedFormat}`}
      >
        Export
      </button>
    </form>
  );
};

export default ExportControls; 