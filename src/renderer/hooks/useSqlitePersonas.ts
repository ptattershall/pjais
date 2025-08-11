import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  type PersonaCreateRequest, 
  type PersonaUpdateRequest, 
  type PersonaResponse,
  type ApiResponse 
} from '../../shared/ipc-contracts';

// Query keys for cache management
const QUERY_KEYS = {
  personas: ['personas'] as const,
  persona: (id: number) => ['personas', id] as const,
};

/**
 * Hook to list all personas
 */
export function usePersonas() {
  return useQuery({
    queryKey: QUERY_KEYS.personas,
    queryFn: async (): Promise<PersonaResponse[]> => {
      const response: ApiResponse<PersonaResponse[]> = await window.api.personas.list();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });
}

/**
 * Hook to get a single persona by ID
 */
export function usePersona(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.persona(id),
    queryFn: async (): Promise<PersonaResponse> => {
      const response: ApiResponse<PersonaResponse> = await window.api.personas.get(id);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: Boolean(id), // Only run query if id exists
  });
}

/**
 * Hook to create a new persona
 */
export function useCreatePersona() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: PersonaCreateRequest): Promise<PersonaResponse> => {
      const response: ApiResponse<PersonaResponse> = await window.api.personas.create(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (newPersona) => {
      // Invalidate and refetch personas list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.personas });
      
      // Optimistically update the cache with the new persona
      queryClient.setQueryData(QUERY_KEYS.persona(newPersona.id), newPersona);
    },
    onError: (error) => {
      console.error('Failed to create persona:', error);
    },
  });
}

/**
 * Hook to update an existing persona
 */
export function useUpdatePersona() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: PersonaUpdateRequest): Promise<PersonaResponse> => {
      const response: ApiResponse<PersonaResponse> = await window.api.personas.update(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (updatedPersona) => {
      // Update the individual persona cache
      queryClient.setQueryData(QUERY_KEYS.persona(updatedPersona.id), updatedPersona);
      
      // Invalidate personas list to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.personas });
    },
    onError: (error) => {
      console.error('Failed to update persona:', error);
    },
  });
}

/**
 * Hook to delete a persona
 */
export function useDeletePersona() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number): Promise<boolean> => {
      const response: ApiResponse<boolean> = await window.api.personas.delete(id);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, deletedId) => {
      // Remove the persona from the cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.persona(deletedId) });
      
      // Invalidate personas list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.personas });
    },
    onError: (error) => {
      console.error('Failed to delete persona:', error);
    },
  });
}

/**
 * Optimistic update hook for persona operations
 */
export function useOptimisticPersonaUpdate() {
  const queryClient = useQueryClient();
  
  return {
    // Optimistically update a persona in the cache
    updatePersonaOptimistic: (id: number, updates: Partial<PersonaResponse>) => {
      const previousPersona = queryClient.getQueryData(QUERY_KEYS.persona(id));
      
      if (previousPersona) {
        queryClient.setQueryData(QUERY_KEYS.persona(id), {
          ...previousPersona,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      }
      
      return previousPersona;
    },
    
    // Revert optimistic update on error
    revertPersonaOptimistic: (id: number, previousData: any) => {
      if (previousData) {
        queryClient.setQueryData(QUERY_KEYS.persona(id), previousData);
      }
    },
  };
}
