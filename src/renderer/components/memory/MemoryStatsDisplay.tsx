import React from 'react';
import { MemoryEntity, MemoryRelationship } from '@shared/types/memory';

export interface MemoryStats {
  total: number;
  byTier: { hot: number; warm: number; cold: number };
  byType: Record<string, number>;
  averageImportance: number;
  totalRelationships: number;
}

interface MemoryStatsDisplayProps {
  filteredMemories: MemoryEntity[];
  filteredRelationships: MemoryRelationship[];
  stats: MemoryStats;
}

export const MemoryStatsDisplay: React.FC<MemoryStatsDisplayProps> = ({
  filteredMemories,
  filteredRelationships,
  stats
}) => {
  const displayedTotal = filteredMemories.length;
  const displayedRelationships = filteredRelationships.length;
  
  return (
    <div className="memory-stats-display">
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Total Memories</span>
          <span className="stat-value">{displayedTotal}</span>
          {displayedTotal !== stats.total && (
            <span className="stat-filter-note">of {stats.total}</span>
          )}
        </div>

        <div className="stat-item">
          <span className="stat-label">Relationships</span>
          <span className="stat-value">{displayedRelationships}</span>
          {displayedRelationships !== stats.totalRelationships && (
            <span className="stat-filter-note">of {stats.totalRelationships}</span>
          )}
        </div>

        <div className="stat-item">
          <span className="stat-label">Avg. Importance</span>
          <span className="stat-value">
            {stats.averageImportance.toFixed(1)}
          </span>
        </div>

        <div className="stat-item tier-breakdown">
          <span className="stat-label">Memory Tiers</span>
          <div className="tier-stats">
            <div className="tier-stat hot">
              <span className="tier-label">Hot</span>
              <span className="tier-count">{stats.byTier.hot}</span>
            </div>
            <div className="tier-stat warm">
              <span className="tier-label">Warm</span>
              <span className="tier-count">{stats.byTier.warm}</span>
            </div>
            <div className="tier-stat cold">
              <span className="tier-label">Cold</span>
              <span className="tier-count">{stats.byTier.cold}</span>
            </div>
          </div>
        </div>

        {Object.keys(stats.byType).length > 0 && (
          <div className="stat-item type-breakdown">
            <span className="stat-label">By Type</span>
            <div className="type-stats">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="type-stat">
                  <span className="type-label">{type}</span>
                  <span className="type-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const calculateMemoryStats = (
  memories: MemoryEntity[], 
  relationships: MemoryRelationship[]
): MemoryStats => {
  if (!memories || memories.length === 0) {
    return {
      total: 0,
      byTier: { hot: 0, warm: 0, cold: 0 },
      byType: {},
      averageImportance: 0,
      totalRelationships: 0
    };
  }

  // Calculate basic stats
  const total = memories.length;
  const totalImportance = memories.reduce((sum, memory) => sum + memory.importance, 0);
  const averageImportance = totalImportance / total;

  // Calculate tier breakdown
  const byTier = memories.reduce((acc, memory) => {
    const tier = memory.memoryTier || 'warm'; // Default to warm if not specified
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, { hot: 0, warm: 0, cold: 0 });

  // Calculate type breakdown
  const byType = memories.reduce((acc, memory) => {
    acc[memory.type] = (acc[memory.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total,
    byTier,
    byType,
    averageImportance,
    totalRelationships: relationships.length
  };
};
