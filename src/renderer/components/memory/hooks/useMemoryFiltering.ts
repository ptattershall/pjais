import { useMemo } from 'react';
import { MemoryEntity } from '@shared/types/memory';
import { SearchFilters } from '../types/search-types';

/**
 * useMemoryFiltering - Shared hook for filtering memories by tier, type, importance, date, and tags.
 * @param memories - Array of MemoryEntity
 * @param filters - SearchFilters object
 * @returns Filtered array of MemoryEntity
 */
export const useMemoryFiltering = (
  memories: MemoryEntity[],
  filters: SearchFilters
): MemoryEntity[] => {
  return useMemo(() => {
    return memories.filter(memory => {
      // Date range filter
      if (filters.dateRange) {
        const createdAt = memory.createdAt ? new Date(memory.createdAt) : new Date();
        if (createdAt < filters.dateRange.start || createdAt > filters.dateRange.end) {
          return false;
        }
      }
      // Importance range filter
      if (filters.importanceRange) {
        const importance = memory.importance || 0;
        if (importance < filters.importanceRange.min || importance > filters.importanceRange.max) {
          return false;
        }
      }
      // Tier filter
      if (filters.tiers && filters.tiers.length > 0) {
        const tier = memory.memoryTier || 'cold';
        if (!filters.tiers.includes(tier)) {
          return false;
        }
      }
      // Type filter
      if (filters.types && filters.types.length > 0) {
        if (!filters.types.includes(memory.type)) {
          return false;
        }
      }
      // Tag filter
      if (filters.tags && filters.tags.length > 0) {
        const memoryTags = memory.tags || [];
        const hasMatchingTag = filters.tags.some(tag => memoryTags.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }
      return true;
    });
  }, [memories, filters]);
}; 