import { MemoryEntity, MemoryRelationship } from '@shared/types/memory';
import { MemoryResponse } from '@shared/ipc-contracts';
import { MemoryFilters } from './MemoryFilterControls';

/**
 * Transform MemoryResponse from IPC to MemoryEntity for UI components
 */
export function transformMemoryResponse(memoryResponse: MemoryResponse): MemoryEntity {
  return {
    id: memoryResponse.id.toString(),
    personaId: memoryResponse.persona_id?.toString() || '',
    type: memoryResponse.type as MemoryEntity['type'],
    content: memoryResponse.content,
    importance: memoryResponse.importance_score,
    memoryTier: memoryResponse.tier,
    createdAt: new Date(memoryResponse.created_at),
    lastAccessed: new Date(memoryResponse.last_accessed_at),
    tags: memoryResponse.metadata?.tags as string[] || [],
  };
}

/**
 * Apply filters to a list of memories and relationships
 */
export function applyMemoryFilters(
  memories: MemoryEntity[],
  relationships: MemoryRelationship[],
  filters: MemoryFilters
): { filteredMemories: MemoryEntity[]; filteredRelationships: MemoryRelationship[] } {
  if (!memories || memories.length === 0) {
    return { filteredMemories: [], filteredRelationships: [] };
  }

  let filteredMemories = [...memories];

  // Apply type filter
  if (filters.type && filters.type !== 'all') {
    filteredMemories = filteredMemories.filter(memory => memory.type === filters.type);
  }

  // Apply tier filter
  if (filters.tier) {
    filteredMemories = filteredMemories.filter(memory => memory.memoryTier === filters.tier);
  }

  // Apply importance filter
  if (filters.importance && filters.importance !== 'all') {
    const importanceValue = parseInt(filters.importance);
    if (!isNaN(importanceValue)) {
      filteredMemories = filteredMemories.filter(memory => memory.importance >= importanceValue);
    }
  }

  // Apply minImportance filter
  if (filters.minImportance !== undefined) {
    filteredMemories = filteredMemories.filter(memory => memory.importance >= filters.minImportance!);
  }

  // Apply date range filter
  if (filters.dateRange && filters.dateRange.start && filters.dateRange.end) {
    const startDate = new Date(filters.dateRange.start);
    const endDate = new Date(filters.dateRange.end);
    filteredMemories = filteredMemories.filter(memory => {
      if (!memory.createdAt) return false;
      const memoryDate = new Date(memory.createdAt);
      return memoryDate >= startDate && memoryDate <= endDate;
    });
  }

  // Apply tags filter
  if (filters.tags && filters.tags.length > 0) {
    filteredMemories = filteredMemories.filter(memory => {
      return filters.tags!.some(tag => memory.tags?.includes(tag));
    });
  }

  // Filter relationships based on filtered memories
  const filteredMemoryIds = new Set(filteredMemories.map(m => m.id));
  const filteredRelationships = relationships.filter(rel => 
    filteredMemoryIds.has(rel.fromMemoryId) && filteredMemoryIds.has(rel.toMemoryId)
  );

  return { filteredMemories, filteredRelationships };
}

/**
 * Check if a value is not null or undefined
 */
export function isNotNullish<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
