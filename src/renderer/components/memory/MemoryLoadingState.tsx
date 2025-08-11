import React from 'react';

interface MemoryLoadingStateProps {
  message?: string;
  showSpinner?: boolean;
}

export const MemoryLoadingState: React.FC<MemoryLoadingStateProps> = ({
  message = 'Loading memories...',
  showSpinner = true
}) => {
  return (
    <div className="memory-explorer-loading">
      {showSpinner && <div className="loading-spinner"></div>}
      <p className="loading-message">{message}</p>
    </div>
  );
};
