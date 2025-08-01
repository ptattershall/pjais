import React, { useState, useCallback, useRef } from 'react';
import { MemoryEntity } from '@shared/types/memory';
import { MemoryTimelineVisualizer } from './MemoryTimelineVisualizer';
import { MemoryHistoricalStateManager, MemorySnapshot } from './MemoryHistoricalStateManager';

// Cross-view synchronization events
export interface TimelineGraphSyncEvent {
  type: 'memory-highlight' | 'time-selection' | 'filter-change' | 'playback-state';
  data: {
    memoryIds?: string[];
    timeRange?: [Date, Date];
    timestamp?: Date;
    filters?: any;
    isPlaying?: boolean;
  };
}

interface MemoryTimelineWithSyncProps {
  userId: string;
  memories: MemoryEntity[];
  selectedMemoryId?: string;
  highlightedMemoryIds?: string[];
  onMemorySelect?: (memoryId: string) => void;
  onMemoryHover?: (memory: MemoryEntity | null) => void;
  onTimeRangeChange?: (start: Date, end: Date) => void;
  onSyncEvent?: (event: TimelineGraphSyncEvent) => void;
  enableTimeTravel?: boolean;
  enableSynchronization?: boolean;
  width?: number;
  height?: number;
}

export const MemoryTimelineWithSync: React.FC<MemoryTimelineWithSyncProps> = ({
  userId,
  memories,
  selectedMemoryId,
  highlightedMemoryIds = [],
  onMemorySelect,
  onMemoryHover,
  onTimeRangeChange,
  onSyncEvent,
  enableTimeTravel = true,
  enableSynchronization = true,
  width = 1000,
  height = 500,
}) => {
  const [syncMode, setSyncMode] = useState<'none' | 'highlight' | 'filter' | 'full'>('highlight');
  const [crossViewHighlights, setCrossViewHighlights] = useState<string[]>([]);
  const [timelineState, setTimelineState] = useState<MemorySnapshot | null>(null);
  const [isTimeTravelActive, setIsTimeTravelActive] = useState(false);
  const [syncHistory, setSyncHistory] = useState<TimelineGraphSyncEvent[]>([]);
  const lastSyncEventRef = useRef<TimelineGraphSyncEvent | null>(null);

  // Enhanced memory selection with synchronization
  const handleMemorySelectWithSync = useCallback((memoryId: string) => {
    onMemorySelect?.(memoryId);

    if (enableSynchronization && syncMode !== 'none') {
      const syncEvent: TimelineGraphSyncEvent = {
        type: 'memory-highlight',
        data: { memoryIds: [memoryId] },
      };

      // Find related memories for enhanced highlighting
      const selectedMemory = memories.find(m => m.id === memoryId);
      const relatedMemories: string[] = [];

      if (selectedMemory && syncMode === 'full') {
        // Find memories from same time period (within 1 hour)
        const selectionTime = new Date(selectedMemory.createdAt || 0);
        const timeWindow = 60 * 60 * 1000; // 1 hour in milliseconds

        memories.forEach(memory => {
          if (memory.id === memoryId) return;
          
          const memoryTime = new Date(memory.createdAt || 0);
          const timeDiff = Math.abs(memoryTime.getTime() - selectionTime.getTime());
          
          if (timeDiff <= timeWindow || 
              memory.memoryTier === selectedMemory.memoryTier ||
              memory.type === selectedMemory.type) {
            relatedMemories.push(memory.id!);
          }
        });

        syncEvent.data.memoryIds = [memoryId, ...relatedMemories];
      }

      setCrossViewHighlights(syncEvent.data.memoryIds || []);
      onSyncEvent?.(syncEvent);
      
      // Add to sync history
      setSyncHistory(prev => [...prev.slice(-9), syncEvent]); // Keep last 10 events
      lastSyncEventRef.current = syncEvent;
    }
  }, [onMemorySelect, enableSynchronization, syncMode, memories, onSyncEvent]);

  // Enhanced memory hover with smart highlighting
  const handleMemoryHoverWithSync = useCallback((memory: MemoryEntity | null) => {
    onMemoryHover?.(memory);

    if (enableSynchronization && memory && syncMode !== 'none') {
      const memoryIds = [memory.id!];

      // Add contextual highlights based on sync mode
      if (syncMode === 'highlight' || syncMode === 'full') {
        const hoverTime = new Date(memory.createdAt || 0);
        const contextWindow = 30 * 60 * 1000; // 30 minutes

        memories.forEach(m => {
          if (m.id === memory.id) return;
          
          const mTime = new Date(m.createdAt || 0);
          const timeDiff = Math.abs(mTime.getTime() - hoverTime.getTime());
          
          if (timeDiff <= contextWindow) {
            memoryIds.push(m.id!);
          }
        });
      }

      const syncEvent: TimelineGraphSyncEvent = {
        type: 'memory-highlight',
        data: { memoryIds },
      };

      setCrossViewHighlights(memoryIds);
      onSyncEvent?.(syncEvent);
    } else if (!memory) {
      // Clear highlights on hover out
      setCrossViewHighlights([]);
      onSyncEvent?.({
        type: 'memory-highlight',
        data: { memoryIds: [] },
      });
    }
  }, [onMemoryHover, enableSynchronization, syncMode, memories, onSyncEvent]);

  // Enhanced time range change with sync
  const handleTimeRangeChangeWithSync = useCallback((start: Date, end: Date) => {
    onTimeRangeChange?.(start, end);

    if (enableSynchronization) {
      const syncEvent: TimelineGraphSyncEvent = {
        type: 'time-selection',
        data: { timeRange: [start, end] },
      };

      onSyncEvent?.(syncEvent);
      setSyncHistory(prev => [...prev.slice(-9), syncEvent]);
    }
  }, [onTimeRangeChange, enableSynchronization, onSyncEvent]);

  // Handle time travel state changes
  const handleTimeTravelStateChange = useCallback((enabled: boolean) => {
    setIsTimeTravelActive(enabled);

    if (enableSynchronization) {
      const syncEvent: TimelineGraphSyncEvent = {
        type: 'playback-state',
        data: { isPlaying: enabled },
      };

      onSyncEvent?.(syncEvent);
    }
  }, [enableSynchronization, onSyncEvent]);

  // Handle historical state reconstruction
  const handleStateReconstructed = useCallback((snapshot: MemorySnapshot) => {
    setTimelineState(snapshot);

    if (enableSynchronization) {
      const syncEvent: TimelineGraphSyncEvent = {
        type: 'time-selection',
        data: { 
          timestamp: snapshot.timestamp,
          memoryIds: snapshot.memoryState.map(m => m.id!).filter(Boolean),
        },
      };

      onSyncEvent?.(syncEvent);
    }
  }, [enableSynchronization, onSyncEvent]);

  // Smart filtering based on current view state
  const getFilteredMemoriesForView = useCallback(() => {
    if (!timelineState || !isTimeTravelActive) {
      return memories;
    }

    // In time travel mode, show only memories that existed at the selected time
    return timelineState.memoryState;
  }, [memories, timelineState, isTimeTravelActive]);

  // Synchronization mode descriptions
  const syncModeDescriptions = {
    none: 'No synchronization between views',
    highlight: 'Highlight related memories across views',
    filter: 'Apply filters across all views',
    full: 'Full synchronization with context awareness',
  };

  // Create combined highlighted IDs
  const allHighlightedIds = [
    ...highlightedMemoryIds,
    ...crossViewHighlights,
    ...(selectedMemoryId ? [selectedMemoryId] : []),
  ];

  const viewMemories = getFilteredMemoriesForView();

  return (
    <div className="memory-timeline-with-sync">
      {enableSynchronization && (
        <div className="sync-controls">
          <div className="sync-mode-selector">
            <label>Synchronization Mode:</label>
            <select
              value={syncMode}
              onChange={(e) => setSyncMode(e.target.value as typeof syncMode)}
            >
              <option value="none">None</option>
              <option value="highlight">Smart Highlighting</option>
              <option value="filter">Filtered Sync</option>
              <option value="full">Full Sync</option>
            </select>
            <span className="sync-mode-description">
              {syncModeDescriptions[syncMode]}
            </span>
          </div>

          {syncMode !== 'none' && (
            <div className="sync-status">
              <div className="highlighted-count">
                Highlighting: {allHighlightedIds.length} memories
              </div>
              
              {isTimeTravelActive && (
                <div className="time-travel-status">
                  🕐 Time Travel Active
                  {timelineState && (
                    <span> - Viewing {timelineState.totalMemories} memories from {timelineState.timestamp.toLocaleDateString()}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {enableTimeTravel && (
        <MemoryHistoricalStateManager
          memories={memories}
          onStateReconstructed={handleStateReconstructed}
          onTimeTravelModeChange={handleTimeTravelStateChange}
          enableTimeTravel={enableTimeTravel}
        />
      )}

      <MemoryTimelineVisualizer
        userId={userId}
        memories={viewMemories}
        selectedMemoryId={selectedMemoryId}
        onMemorySelect={handleMemorySelectWithSync}
        onMemoryHover={handleMemoryHoverWithSync}
        onTimeRangeChange={handleTimeRangeChangeWithSync}
        width={width}
        height={height}
        enableBrush={true}
        showDensityChart={true}
        timeGranularity="day"
      />

      {enableSynchronization && syncHistory.length > 0 && (
        <div className="sync-history">
          <details>
            <summary>Synchronization History ({syncHistory.length})</summary>
            <div className="sync-events">
              {syncHistory.slice(-5).map((event, index) => (
                <div key={index} className="sync-event">
                  <span className="event-type">{event.type}</span>
                  <span className="event-data">
                    {event.data.memoryIds?.length && `${event.data.memoryIds.length} memories`}
                    {event.data.timeRange && `Range: ${event.data.timeRange[0].toLocaleDateString()} - ${event.data.timeRange[1].toLocaleDateString()}`}
                    {event.data.timestamp && `Time: ${event.data.timestamp.toLocaleDateString()}`}
                  </span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Enhanced visual indicators for synchronization */}
      {syncMode !== 'none' && allHighlightedIds.length > 0 && (
        <div className="sync-visualization">
          <div className="sync-connections">
            {allHighlightedIds.map(memoryId => {
              const memory = memories.find(m => m.id === memoryId);
              return memory ? (
                <div
                  key={memoryId}
                  className={`sync-indicator ${memory.memoryTier || 'cold'}-tier`}
                  title={`${memory.type} - ${memory.memoryTier || 'cold'} tier`}
                >
                  <div className="indicator-pulse"></div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}; 