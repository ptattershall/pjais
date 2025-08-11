import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  type MemoryCreateRequest, 
  type MemoryUpdateRequest, 
  type MemoryListRequest,
  type MemoryResponse,
  type ApiResponse 
} from '../../shared/ipc-contracts';

// Query keys for cache management
const QUERY_KEYS = {
  memories: (params?: MemoryListRequest) => ['memories', params] as const,
  memory: (id: number) => ['memories', id] as const,
  memoriesByPersona: (personaId: number) => ['memories', 'persona', personaId] as const,
};

/**
 * Hook to list memories with optional filtering
 */
export function useMemories(params?: MemoryListRequest) {
  return useQuery({
    queryKey: QUERY_KEYS.memories(params),
    queryFn: async (): Promise<MemoryResponse[]> => {
      const response: ApiResponse<MemoryResponse[]> = await window.api.memories.list(params);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });
}

/**
 * Hook to get memories for a specific persona
 */
export function usePersonaMemories(personaId: number, limit?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.memoriesByPersona(personaId),
    queryFn: async (): Promise<MemoryResponse[]> => {
      const response: ApiResponse<MemoryResponse[]> = await window.api.memories.list({
        persona_id: personaId,
        limit: limit || 100,
      });
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: Boolean(personaId), // Only run query if personaId exists
  });
}

/**
 * Hook to get a single memory by ID
 */
export function useMemory(id: number) {
  const result = useQuery({
    queryKey: QUERY_KEYS.memory(id),
    queryFn: async (): Promise<MemoryResponse> => {
      const response: ApiResponse<MemoryResponse> = await window.api.memories.get(id);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: Boolean(id), // Only run query if id exists
  });

  // Update access tracking when memory is successfully fetched
  if (result.isSuccess && result.data) {
    window.api.memories.updateAccess(id).catch(console.error);
  }

  return result;
}

/**
 * Hook to create a new memory
 */
export function useCreateMemory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: MemoryCreateRequest): Promise<MemoryResponse> => {
      const response: ApiResponse<MemoryResponse> = await window.api.memories.create(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (newMemory) => {
      // Invalidate all memory queries that might include this new memory
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      
      // Optimistically update the individual memory cache
      queryClient.setQueryData(QUERY_KEYS.memory(newMemory.id), newMemory);
      
      // If the memory belongs to a specific persona, invalidate that persona's memories
      if (newMemory.persona_id) {
        queryClient.invalidateQueries({ 
          queryKey: QUERY_KEYS.memoriesByPersona(newMemory.persona_id) 
        });
      }
    },
    onError: (error) => {
      console.error('Failed to create memory:', error);
    },
  });
}

/**
 * Hook to update an existing memory
 */
export function useUpdateMemory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: MemoryUpdateRequest): Promise<MemoryResponse> => {
      const response: ApiResponse<MemoryResponse> = await window.api.memories.update(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (updatedMemory) => {
      // Update the individual memory cache
      queryClient.setQueryData(QUERY_KEYS.memory(updatedMemory.id), updatedMemory);
      
      // Invalidate memory lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      
      // If the memory belongs to a specific persona, invalidate that persona's memories
      if (updatedMemory.persona_id) {
        queryClient.invalidateQueries({ 
          queryKey: QUERY_KEYS.memoriesByPersona(updatedMemory.persona_id) 
        });
      }
    },
    onError: (error) => {
      console.error('Failed to update memory:', error);
    },
  });
}

/**
 * Hook to delete a memory
 */
export function useDeleteMemory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number): Promise<boolean> => {
      const response: ApiResponse<boolean> = await window.api.memories.delete(id);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, deletedId) => {
      // Remove the memory from the cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.memory(deletedId) });
      
      // Invalidate all memory lists
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
    onError: (error) => {
      console.error('Failed to delete memory:', error);
    },
  });
}

/**
 * Hook to update memory access (for tracking purposes)
 */
export function useUpdateMemoryAccess() {
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response: ApiResponse<void> = await window.api.memories.updateAccess(id);
      if (!response.success) {
        throw new Error(response.error);
      }
    },
    onError: (error) => {
      console.error('Failed to update memory access:', error);
    },
  });
}

/**
 * Batch operations for memories
 */
export function useBatchMemoryOperations() {
  const queryClient = useQueryClient();
  
  return {
    // Create multiple memories at once
    batchCreate: useMutation({
      mutationFn: async (memories: MemoryCreateRequest[]): Promise<MemoryResponse[]> => {
        const results = await Promise.all(
          memories.map(memory => window.api.memories.create(memory))
        );
        
        const createdMemories: MemoryResponse[] = [];
        for (const response of results) {
          if (!response.success) {
            throw new Error(response.error);
          }
          createdMemories.push(response.data);
        }
        
        return createdMemories;
      },
      onSuccess: () => {
        // Invalidate all memory queries
        queryClient.invalidateQueries({ queryKey: ['memories'] });
      },
    }),
    
    // Delete multiple memories at once
    batchDelete: useMutation({
      mutationFn: async (ids: number[]): Promise<boolean[]> => {
        const results = await Promise.all(
          ids.map(id => window.api.memories.delete(id))
        );
        
        const deletedResults: boolean[] = [];
        for (const response of results) {
          if (!response.success) {
            throw new Error(response.error);
          }
          deletedResults.push(response.data);
        }
        
        return deletedResults;
      },
      onSuccess: (_, deletedIds) => {
        // Remove all deleted memories from cache
        deletedIds.forEach(id => {
          queryClient.removeQueries({ queryKey: QUERY_KEYS.memory(id) });
        });
        
        // Invalidate all memory lists
        queryClient.invalidateQueries({ queryKey: ['memories'] });
      },
    }),
  };
}


/**
 * Hook to get memories by tier
 */
export function useMemoriesByTier(tier: 'hot' | 'warm' | 'cold') {
  return useQuery({
    queryKey: ['memories', 'tier', tier],
    queryFn: async (): Promise<MemoryResponse[]> => {
      const response: ApiResponse<MemoryResponse[]> = await window.api.memories.list();
      if (!response.success) {
        throw new Error(response.error);
      }
      // Filter by tier on the client side for now
      return response.data.filter(memory => memory.tier === tier);
    },
  });
}

/**
 * Hook to move memory to different tier
 */
export function useMoveMemoryToTier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, tier }: { id: number, tier: 'hot' | 'warm' | 'cold' }): Promise<MemoryResponse> => {
      const response: ApiResponse<MemoryResponse> = await window.api.memories.update({ id, tier });
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (updatedMemory) => {
      // Update caches
      queryClient.setQueryData(QUERY_KEYS.memory(updatedMemory.id), updatedMemory);
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
  });
}

/**
 * Hook to get memory statistics
 */
export function useMemoryStats(personaId?: string) {
  return useQuery({
    queryKey: ['memoryStats', personaId],
    queryFn: async () => {
      const params = personaId ? { persona_id: parseInt(personaId), limit: 1000 } : { limit: 1000 };
      const response: ApiResponse<MemoryResponse[]> = await window.api.memories.list(params);
      if (!response.success) {
        throw new Error(response.error);
      }

      const memories = response.data;
      
      // Calculate statistics from memory data
      const stats = {
        totalMemories: memories.length,
        hotMemories: memories.filter(m => m.tier === 'hot').length,
        warmMemories: memories.filter(m => m.tier === 'warm').length,
        coldMemories: memories.filter(m => m.tier === 'cold').length,
        averageImportance: memories.length > 0 
          ? memories.reduce((sum, m) => sum + (m.importance_score || 0), 0) / memories.length 
          : 0,
        totalSize: memories.reduce((sum, m) => sum + (m.content?.length || 0), 0),
        recentMemories: memories.filter(m => {
          const created = new Date(m.created_at);
          const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return created > oneWeekAgo;
        }).length,
        memoryTypes: memories.reduce((acc, m) => {
          const type = m.type || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        averageAge: memories.length > 0 
          ? memories.reduce((sum, m) => {
              const age = Date.now() - new Date(m.created_at).getTime();
              return sum + age;
            }, 0) / memories.length / (1000 * 60 * 60 * 24) // Convert to days
          : 0,
        lastUpdated: new Date().toISOString()
      };

      return stats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: true,
  });
}

/**
 * Hook to get memory analytics data
 */
export function useMemoryAnalytics(personaId?: string, timeRange?: 'day' | 'week' | 'month' | 'year') {
  return useQuery({
    queryKey: ['memoryAnalytics', personaId, timeRange],
    queryFn: async () => {
      const params = personaId ? { persona_id: parseInt(personaId), limit: 1000 } : { limit: 1000 };
      const response: ApiResponse<MemoryResponse[]> = await window.api.memories.list(params);
      if (!response.success) {
        throw new Error(response.error);
      }

      const memories = response.data;
      
      // Filter memories by time range if specified
      let filteredMemories = memories;
      if (timeRange) {
        const now = new Date();
        let startDate: Date;
        
        switch (timeRange) {
          case 'day':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }
        
        filteredMemories = memories.filter(m => 
          new Date(m.created_at) >= startDate
        );
      }

      // Generate analytics data
      const analytics = {
        memoryCreationTrend: generateTimeSeries(filteredMemories, 'created_at'),
        memoryAccessTrend: generateTimeSeries(filteredMemories, 'last_accessed_at'),
        importanceDistribution: generateImportanceDistribution(filteredMemories),
        tierDistribution: generateTierDistribution(filteredMemories),
        typeDistribution: generateTypeDistribution(filteredMemories),
        sizeDistribution: generateSizeDistribution(filteredMemories),
        ageDistribution: generateAgeDistribution(filteredMemories),
        activityHeatmap: generateActivityHeatmap(filteredMemories),
        topMemories: filteredMemories
          .sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0))
          .slice(0, 10),
        totalCount: filteredMemories.length,
        timeRange: timeRange || 'all',
        generatedAt: new Date().toISOString()
      };

      return analytics;
    },
    refetchInterval: 60000, // Refresh every minute
    enabled: true,
  });
}

/**
 * Enhanced hook for memory search with advanced capabilities
 */
export function useMemorySearch(personaId?: string, searchTerm?: string) {
  return useQuery({
    queryKey: ['memorySearch', personaId, searchTerm],
    queryFn: async () => {
      const params = personaId ? { persona_id: parseInt(personaId), limit: 1000 } : { limit: 1000 };
      const response: ApiResponse<MemoryResponse[]> = await window.api.memories.list(params);
      if (!response.success) {
        throw new Error(response.error);
      }

      let memories = response.data;
      
      // Apply search filter if search term provided
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        memories = memories.filter(memory => {
          // Search in available fields only (no title or tags in current schema)
          const searchableContent = [
            memory.content,
            memory.type,
            // Extract from metadata if it contains searchable fields
            ...(memory.metadata ? Object.values(memory.metadata).filter(v => typeof v === 'string') : [])
          ].join(' ').toLowerCase();
          
          return searchableContent.includes(term);
        });
      }

      return memories;
    },
    enabled: Boolean(!searchTerm || searchTerm.trim().length > 0),
  });
}

// Helper functions for analytics
function generateTimeSeries(memories: MemoryResponse[], dateField: keyof MemoryResponse) {
  const series: Record<string, number> = {};
  
  memories.forEach(memory => {
    const date = memory[dateField];
    if (date) {
      const day = new Date(date as string).toISOString().split('T')[0];
      series[day] = (series[day] || 0) + 1;
    }
  });
  
  return Object.entries(series)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function generateImportanceDistribution(memories: MemoryResponse[]) {
  const distribution: Record<string, number> = {
    'low (0-0.3)': 0,
    'medium (0.3-0.6)': 0,
    'high (0.6-0.8)': 0,
    'critical (0.8-1.0)': 0
  };
  
  memories.forEach(memory => {
    const importance = memory.importance_score || 0;
    if (importance <= 0.3) distribution['low (0-0.3)']++;
    else if (importance <= 0.6) distribution['medium (0.3-0.6)']++;
    else if (importance <= 0.8) distribution['high (0.6-0.8)']++;
    else distribution['critical (0.8-1.0)']++;
  });
  
  return distribution;
}

function generateTierDistribution(memories: MemoryResponse[]) {
  const distribution: Record<string, number> = {
    hot: 0,
    warm: 0,
    cold: 0,
    unknown: 0
  };
  
  memories.forEach(memory => {
    const tier = memory.tier || 'unknown';
    distribution[tier]++;
  });
  
  return distribution;
}

function generateTypeDistribution(memories: MemoryResponse[]) {
  const distribution: Record<string, number> = {};
  
  memories.forEach(memory => {
    const type = memory.type || 'unknown';
    distribution[type] = (distribution[type] || 0) + 1;
  });
  
  return distribution;
}

function generateSizeDistribution(memories: MemoryResponse[]) {
  const distribution: Record<string, number> = {
    'small (<100)': 0,
    'medium (100-500)': 0,
    'large (500-1000)': 0,
    'huge (>1000)': 0
  };
  
  memories.forEach(memory => {
    const size = memory.content?.length || 0;
    if (size < 100) distribution['small (<100)']++;
    else if (size < 500) distribution['medium (100-500)']++;
    else if (size < 1000) distribution['large (500-1000)']++;
    else distribution['huge (>1000)']++;
  });
  
  return distribution;
}

function generateAgeDistribution(memories: MemoryResponse[]) {
  const distribution: Record<string, number> = {
    'today': 0,
    'this week': 0,
    'this month': 0,
    'older': 0
  };
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  memories.forEach(memory => {
    const created = new Date(memory.created_at);
    if (created >= today) distribution['today']++;
    else if (created >= thisWeek) distribution['this week']++;
    else if (created >= thisMonth) distribution['this month']++;
    else distribution['older']++;
  });
  
  return distribution;
}

function generateActivityHeatmap(memories: MemoryResponse[]) {
  const heatmap: Record<string, Record<number, number>> = {};
  
  memories.forEach(memory => {
    const date = new Date(memory.created_at);
    const day = date.toISOString().split('T')[0];
    const hour = date.getHours();
    
    if (!heatmap[day]) {
      heatmap[day] = {};
    }
    
    heatmap[day][hour] = (heatmap[day][hour] || 0) + 1;
  });
  
  return heatmap;
}
