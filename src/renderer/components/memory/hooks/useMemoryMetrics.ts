import { useMemo } from 'react';
import { MemoryEntity } from '@shared/types/memory';
import { MemoryStatistics } from '../utils/calculation-utils';
import { calculateMemoryStats } from '../utils/calculation-utils';

/**
 * useMemoryMetrics - Shared hook for calculating memory statistics and metrics.
 * @param memories - Array of MemoryEntity
 * @returns MemoryStatistics object (totalCount, averageImportance, tierDistribution, storageSize, dateRange, etc.)
 */
export const useMemoryMetrics = (memories: MemoryEntity[]): MemoryStatistics => {
  return useMemo(() => calculateMemoryStats(memories), [memories]);
}; 