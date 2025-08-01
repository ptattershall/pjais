import React, { useState, useCallback, useEffect } from 'react';
import { MemoryEntity, MemoryTier } from '@shared/types/memory';

// Historical memory state reconstruction
export interface MemorySnapshot {
  timestamp: Date;
  memoryState: MemoryEntity[];
  totalMemories: number;
  tierDistribution: Record<MemoryTier, number>;
  averageImportance: number;
}

export interface TimePoint {
  id: string;
  timestamp: Date;
  label: string;
  description: string;
  isBookmarked: boolean;
}

interface MemoryHistoricalStateManagerProps {
  memories: MemoryEntity[];
  onStateReconstructed: (snapshot: MemorySnapshot) => void;
  onTimeTravelModeChange: (enabled: boolean) => void;
  enableTimeTravel?: boolean;
}

export const MemoryHistoricalStateManager: React.FC<MemoryHistoricalStateManagerProps> = ({
  memories,
  onStateReconstructed,
  onTimeTravelModeChange,
  enableTimeTravel = true,
}) => {
  const [isTimeTravelMode, setIsTimeTravelMode] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState<Date>(new Date());
  const [timePoints, setTimePoints] = useState<TimePoint[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackInterval, setPlaybackInterval] = useState<NodeJS.Timeout | null>(null);

  // Generate significant time points from memory data
  const generateTimePoints = useCallback((memories: MemoryEntity[]): TimePoint[] => {
    const points: TimePoint[] = [];
    const sortedMemories = [...memories]
      .filter(m => m.createdAt)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

    if (sortedMemories.length === 0) return points;

    // Add first memory point
    const firstMemory = sortedMemories[0];
    points.push({
      id: 'first-memory',
      timestamp: new Date(firstMemory.createdAt!),
      label: 'First Memory',
      description: 'The beginning of memory recording',
      isBookmarked: false,
    });

    // Add daily milestones
    const memoryByDate = new Map<string, MemoryEntity[]>();
    sortedMemories.forEach(memory => {
      const dateKey = new Date(memory.createdAt!).toDateString();
      if (!memoryByDate.has(dateKey)) {
        memoryByDate.set(dateKey, []);
      }
      memoryByDate.get(dateKey)!.push(memory);
    });

    // Add high-activity days
    Array.from(memoryByDate.entries())
      .filter(([_, memories]) => memories.length >= 5) // Days with 5+ memories
      .forEach(([dateKey, dayMemories]) => {
        points.push({
          id: `high-activity-${dateKey}`,
          timestamp: new Date(dateKey),
          label: `High Activity (${dayMemories.length} memories)`,
          description: `Day with significant memory creation`,
          isBookmarked: false,
        });
      });

    // Add tier transition points
    const tierTransitions = findTierTransitions(sortedMemories);
    tierTransitions.forEach((transition, index) => {
      points.push({
        id: `tier-transition-${index}`,
        timestamp: transition.timestamp,
        label: `Tier Shift: ${transition.description}`,
        description: `Memory tier distribution changed significantly`,
        isBookmarked: false,
      });
    });

    return points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, []);

  // Find significant tier distribution changes
  const findTierTransitions = (memories: MemoryEntity[]): Array<{
    timestamp: Date;
    description: string;
  }> => {
    const transitions: Array<{ timestamp: Date; description: string }> = [];
    const windowSize = 10; // Look at memory sets of 10

    for (let i = windowSize; i < memories.length; i += windowSize) {
      const previousSet = memories.slice(i - windowSize, i);
      const currentSet = memories.slice(i, i + windowSize);

      const prevTierDist = calculateTierDistribution(previousSet);
      const currTierDist = calculateTierDistribution(currentSet);

      // Check for significant changes (>30% shift in any tier)
      Object.keys(prevTierDist).forEach(tier => {
        const tierKey = tier as MemoryTier;
        const prevPercent = prevTierDist[tierKey];
        const currPercent = currTierDist[tierKey];
        
        if (Math.abs(prevPercent - currPercent) > 0.3) {
          transitions.push({
            timestamp: new Date(currentSet[0].createdAt!),
            description: `${tier} tier ${currPercent > prevPercent ? 'increased' : 'decreased'}`,
          });
        }
      });
    }

    return transitions;
  };

  // Calculate tier distribution for a set of memories
  const calculateTierDistribution = (memories: MemoryEntity[]): Record<MemoryTier, number> => {
    const total = memories.length;
    if (total === 0) return { hot: 0, warm: 0, cold: 0 };

    const counts = { hot: 0, warm: 0, cold: 0 };
    memories.forEach(memory => {
      const tier = memory.memoryTier || 'cold';
      counts[tier as MemoryTier]++;
    });

    return {
      hot: counts.hot / total,
      warm: counts.warm / total,
      cold: counts.cold / total,
    };
  };

  // Reconstruct memory state at a specific timestamp
  const reconstructStateAtTime = useCallback((timestamp: Date): MemorySnapshot => {
    const memoriesAtTime = memories.filter(memory => {
      const createdAt = new Date(memory.createdAt || 0);
      return createdAt <= timestamp;
    });

    const tierDistribution = calculateTierDistribution(memoriesAtTime);
    const totalImportance = memoriesAtTime.reduce((sum, m) => sum + (m.importance || 0), 0);

    return {
      timestamp,
      memoryState: memoriesAtTime,
      totalMemories: memoriesAtTime.length,
      tierDistribution,
      averageImportance: memoriesAtTime.length > 0 ? totalImportance / memoriesAtTime.length : 0,
    };
  }, [memories]);

  // Handle time travel navigation
  const travelToTime = useCallback((timestamp: Date) => {
    setCurrentTimestamp(timestamp);
    const snapshot = reconstructStateAtTime(timestamp);
    onStateReconstructed(snapshot);
  }, [reconstructStateAtTime, onStateReconstructed]);

  // Playback controls
  const startPlayback = useCallback(() => {
    if (timePoints.length === 0) return;

    setIsPlaying(true);
    const interval = setInterval(() => {
      setCurrentTimestamp(prev => {
        const currentIndex = timePoints.findIndex(p => p.timestamp.getTime() === prev.getTime());
        const nextIndex = (currentIndex + 1) % timePoints.length;
        const nextTimestamp = timePoints[nextIndex].timestamp;
        
        travelToTime(nextTimestamp);
        
        // Stop at the end
        if (nextIndex === timePoints.length - 1) {
          setIsPlaying(false);
          clearInterval(interval);
        }
        
        return nextTimestamp;
      });
    }, 2000 / playbackSpeed); // Base 2 second intervals

    setPlaybackInterval(interval);
  }, [timePoints, playbackSpeed, travelToTime]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (playbackInterval) {
      clearInterval(playbackInterval);
      setPlaybackInterval(null);
    }
  }, [playbackInterval]);

  // Toggle time travel mode
  const toggleTimeTravelMode = useCallback(() => {
    const newMode = !isTimeTravelMode;
    setIsTimeTravelMode(newMode);
    onTimeTravelModeChange(newMode);

    if (newMode) {
      // Enter time travel mode - go to current time
      travelToTime(new Date());
    } else {
      // Exit time travel mode - reconstruct current state
      const currentSnapshot = reconstructStateAtTime(new Date());
      onStateReconstructed(currentSnapshot);
      stopPlayback();
    }
  }, [isTimeTravelMode, onTimeTravelModeChange, travelToTime, reconstructStateAtTime, onStateReconstructed, stopPlayback]);

  // Update time points when memories change
  useEffect(() => {
    const points = generateTimePoints(memories);
    setTimePoints(points);
  }, [memories, generateTimePoints]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackInterval) {
        clearInterval(playbackInterval);
      }
    };
  }, [playbackInterval]);

  if (!enableTimeTravel) {
    return null;
  }

  return (
    <div className="memory-historical-state-manager">
      <div className="time-travel-controls">
        <button
          onClick={toggleTimeTravelMode}
          className={`time-travel-toggle ${isTimeTravelMode ? 'active' : ''}`}
        >
          {isTimeTravelMode ? '🕐 Exit Time Travel' : '🕐 Enter Time Travel'}
        </button>

        {isTimeTravelMode && (
          <>
            <div className="current-time-display">
              <span>Current View: {currentTimestamp.toLocaleDateString()} {currentTimestamp.toLocaleTimeString()}</span>
            </div>

            <div className="playback-controls">
              <button
                onClick={isPlaying ? stopPlayback : startPlayback}
                disabled={timePoints.length === 0}
              >
                {isPlaying ? '⏸️ Pause' : '▶️ Play'}
              </button>

              <label>
                Speed:
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                </select>
              </label>
            </div>
          </>
        )}
      </div>

      {isTimeTravelMode && timePoints.length > 0 && (
        <div className="time-points-navigation">
          <h4>Key Time Points ({timePoints.length})</h4>
          <div className="time-points-list">
            {timePoints.map((point) => (
              <div
                key={point.id}
                className={`time-point ${currentTimestamp.getTime() === point.timestamp.getTime() ? 'active' : ''}`}
                onClick={() => travelToTime(point.timestamp)}
              >
                <div className="time-point-header">
                  <span className="time-point-label">{point.label}</span>
                  <span className="time-point-timestamp">
                    {point.timestamp.toLocaleDateString()}
                  </span>
                </div>
                <div className="time-point-description">{point.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isTimeTravelMode && (
        <div className="historical-state-info">
          <div className="state-snapshot">
            <h4>State at {currentTimestamp.toLocaleDateString()}</h4>
            <div className="snapshot-stats">
              <span>Memories: {reconstructStateAtTime(currentTimestamp).totalMemories}</span>
              <span>Avg Importance: {reconstructStateAtTime(currentTimestamp).averageImportance.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 