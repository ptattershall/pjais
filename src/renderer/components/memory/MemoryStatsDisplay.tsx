import React from 'react';
import { MemoryEntity, MemoryRelationship, MemoryTier } from '@shared/types/memory';

export interface MemoryStats {
  total: number;
  byTier: Record<MemoryTier, number>;
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
  return (
    <div className="memory-stats">
      <div className="stat-card">
        <span className="stat-value">{filteredMemories.length}</span>
        <span className="stat-label">Memories</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{filteredRelationships.length}</span>
        <span className="stat-label">Connections</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{stats.averageImportance.toFixed(1)}</span>
        <span className="stat-label">Avg Importance</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{stats.byTier.hot}</span>
        <span className="stat-label">Hot Memories</span>
      </div>
    </div>
  );
};

// Utility function to calculate memory statistics
export const calculateMemoryStats = (
  memories: MemoryEntity[], 
  relationships: MemoryRelationship[]
): MemoryStats => {
  const byTier: Record<MemoryTier, number> = { hot: 0, warm: 0, cold: 0 };
  const byType: Record<string, number> = {};
  let totalImportance = 0;

  memories.forEach(memory => {
    const tier = memory.memoryTier || 'cold';
    byTier[tier as MemoryTier]++;
    
    byType[memory.type] = (byType[memory.type] || 0) + 1;
    totalImportance += memory.importance || 0;
  });

  return {
    total: memories.length,
    byTier,
    byType,
    averageImportance: memories.length > 0 ? totalImportance / memories.length : 0,
    totalRelationships: relationships.length
  };
}; 