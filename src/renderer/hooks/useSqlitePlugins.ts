import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  type PluginCreateRequest, 
  type PluginUpdateRequest, 
  type PluginToggleRequest,
  type PluginResponse,
  type ApiResponse 
} from '../../shared/ipc-contracts';

// Query keys for cache management
const QUERY_KEYS = {
  plugins: ['plugins'] as const,
  plugin: (id: number) => ['plugins', id] as const,
  enabledPlugins: ['plugins', 'enabled'] as const,
  disabledPlugins: ['plugins', 'disabled'] as const,
};

/**
 * Hook to list all plugins
 */
export function usePlugins() {
  return useQuery({
    queryKey: QUERY_KEYS.plugins,
    queryFn: async (): Promise<PluginResponse[]> => {
      const response: ApiResponse<PluginResponse[]> = await window.api.plugins.list();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });
}

/**
 * Hook to get enabled plugins only
 */
export function useEnabledPlugins() {
  return useQuery({
    queryKey: QUERY_KEYS.enabledPlugins,
    queryFn: async (): Promise<PluginResponse[]> => {
      const response: ApiResponse<PluginResponse[]> = await window.api.plugins.list();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data.filter(plugin => plugin.enabled);
    },
  });
}

/**
 * Hook to get disabled plugins only
 */
export function useDisabledPlugins() {
  return useQuery({
    queryKey: QUERY_KEYS.disabledPlugins,
    queryFn: async (): Promise<PluginResponse[]> => {
      const response: ApiResponse<PluginResponse[]> = await window.api.plugins.list();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data.filter(plugin => !plugin.enabled);
    },
  });
}

/**
 * Hook to get a single plugin by ID
 */
export function usePlugin(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.plugin(id),
    queryFn: async (): Promise<PluginResponse> => {
      const response: ApiResponse<PluginResponse> = await window.api.plugins.get(id);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: Boolean(id), // Only run query if id exists
  });
}

/**
 * Hook to create a new plugin
 */
export function useCreatePlugin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: PluginCreateRequest): Promise<PluginResponse> => {
      const response: ApiResponse<PluginResponse> = await window.api.plugins.create(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (newPlugin) => {
      // Invalidate and refetch plugins list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.plugins });
      
      // Invalidate enabled/disabled lists based on plugin state
      if (newPlugin.enabled) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enabledPlugins });
      } else {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.disabledPlugins });
      }
      
      // Optimistically update the cache with the new plugin
      queryClient.setQueryData(QUERY_KEYS.plugin(newPlugin.id), newPlugin);
    },
    onError: (error) => {
      console.error('Failed to create plugin:', error);
    },
  });
}

/**
 * Hook to update an existing plugin
 */
export function useUpdatePlugin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: PluginUpdateRequest): Promise<PluginResponse> => {
      const response: ApiResponse<PluginResponse> = await window.api.plugins.update(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (updatedPlugin) => {
      // Update the individual plugin cache
      queryClient.setQueryData(QUERY_KEYS.plugin(updatedPlugin.id), updatedPlugin);
      
      // Invalidate all plugin lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.plugins });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enabledPlugins });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.disabledPlugins });
    },
    onError: (error) => {
      console.error('Failed to update plugin:', error);
    },
  });
}

/**
 * Hook to delete a plugin
 */
export function useDeletePlugin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number): Promise<boolean> => {
      const response: ApiResponse<boolean> = await window.api.plugins.delete(id);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, deletedId) => {
      // Remove the plugin from the cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.plugin(deletedId) });
      
      // Invalidate all plugin lists
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.plugins });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enabledPlugins });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.disabledPlugins });
    },
    onError: (error) => {
      console.error('Failed to delete plugin:', error);
    },
  });
}

/**
 * Hook to toggle plugin enabled/disabled state
 */
export function useTogglePlugin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: PluginToggleRequest): Promise<PluginResponse> => {
      const response: ApiResponse<PluginResponse> = await window.api.plugins.toggle(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (updatedPlugin) => {
      // Update the individual plugin cache
      queryClient.setQueryData(QUERY_KEYS.plugin(updatedPlugin.id), updatedPlugin);
      
      // Invalidate all plugin lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.plugins });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enabledPlugins });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.disabledPlugins });
    },
    onError: (error) => {
      console.error('Failed to toggle plugin:', error);
    },
  });
}

/**
 * Hook to enable a plugin
 */
export function useEnablePlugin() {
  const togglePlugin = useTogglePlugin();
  
  return useMutation({
    mutationFn: async (id: number): Promise<PluginResponse> => {
      return togglePlugin.mutateAsync({ id, enabled: true });
    },
    onError: (error) => {
      console.error('Failed to enable plugin:', error);
    },
  });
}

/**
 * Hook to disable a plugin
 */
export function useDisablePlugin() {
  const togglePlugin = useTogglePlugin();
  
  return useMutation({
    mutationFn: async (id: number): Promise<PluginResponse> => {
      return togglePlugin.mutateAsync({ id, enabled: false });
    },
    onError: (error) => {
      console.error('Failed to disable plugin:', error);
    },
  });
}

/**
 * Plugin management utilities
 */
export function usePluginManagement() {
  const queryClient = useQueryClient();
  
  return {
    // Bulk enable multiple plugins
    enableMultiple: useMutation({
      mutationFn: async (pluginIds: number[]): Promise<PluginResponse[]> => {
        const results = await Promise.all(
          pluginIds.map(id => window.api.plugins.toggle({ id, enabled: true }))
        );
        
        const enabledPlugins: PluginResponse[] = [];
        for (const response of results) {
          if (!response.success) {
            throw new Error(response.error);
          }
          enabledPlugins.push(response.data);
        }
        
        return enabledPlugins;
      },
      onSuccess: () => {
        // Invalidate all plugin queries
        queryClient.invalidateQueries({ queryKey: ['plugins'] });
      },
    }),
    
    // Bulk disable multiple plugins
    disableMultiple: useMutation({
      mutationFn: async (pluginIds: number[]): Promise<PluginResponse[]> => {
        const results = await Promise.all(
          pluginIds.map(id => window.api.plugins.toggle({ id, enabled: false }))
        );
        
        const disabledPlugins: PluginResponse[] = [];
        for (const response of results) {
          if (!response.success) {
            throw new Error(response.error);
          }
          disabledPlugins.push(response.data);
        }
        
        return disabledPlugins;
      },
      onSuccess: () => {
        // Invalidate all plugin queries
        queryClient.invalidateQueries({ queryKey: ['plugins'] });
      },
    }),
    
    // Bulk delete multiple plugins
    deleteMultiple: useMutation({
      mutationFn: async (pluginIds: number[]): Promise<boolean[]> => {
        const results = await Promise.all(
          pluginIds.map(id => window.api.plugins.delete(id))
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
        // Remove all deleted plugins from cache
        deletedIds.forEach(id => {
          queryClient.removeQueries({ queryKey: QUERY_KEYS.plugin(id) });
        });
        
        // Invalidate all plugin lists
        queryClient.invalidateQueries({ queryKey: ['plugins'] });
      },
    }),
  };
}

/**
 * Plugin search and filtering utilities
 */
export function usePluginFilters() {
  const { data: plugins } = usePlugins();
  
  return {
    // Filter plugins by capability
    getPluginsByCapability: (capability: string): PluginResponse[] => {
      return plugins?.filter(plugin => 
        plugin.manifest.capabilities.includes(capability)
      ) || [];
    },
    
    // Filter plugins by author
    getPluginsByAuthor: (author: string): PluginResponse[] => {
      return plugins?.filter(plugin => 
        plugin.manifest.author === author
      ) || [];
    },
    
    // Search plugins by name or description
    searchPlugins: (query: string): PluginResponse[] => {
      const searchTerm = query.toLowerCase();
      return plugins?.filter(plugin => 
        plugin.name.toLowerCase().includes(searchTerm) ||
        (plugin.manifest.description && 
         plugin.manifest.description.toLowerCase().includes(searchTerm))
      ) || [];
    },
    
    // Get plugins with specific permissions
    getPluginsWithPermission: (permission: string): PluginResponse[] => {
      return plugins?.filter(plugin => 
        plugin.manifest.permissions.includes(permission)
      ) || [];
    },
  };
}

/**
 * Plugin statistics and insights
 */
export function usePluginStats() {
  const { data: plugins } = usePlugins();
  
  const stats = {
    total: plugins?.length || 0,
    enabled: plugins?.filter(p => p.enabled).length || 0,
    disabled: plugins?.filter(p => !p.enabled).length || 0,
    byAuthor: {} as Record<string, number>,
    byCapability: {} as Record<string, number>,
    byPermission: {} as Record<string, number>,
  };
  
  // Calculate statistics
  if (plugins) {
    plugins.forEach(plugin => {
      // By author
      const author = plugin.manifest.author || 'Unknown';
      stats.byAuthor[author] = (stats.byAuthor[author] || 0) + 1;
      
      // By capabilities
      plugin.manifest.capabilities.forEach(capability => {
        stats.byCapability[capability] = (stats.byCapability[capability] || 0) + 1;
      });
      
      // By permissions
      plugin.manifest.permissions.forEach(permission => {
        stats.byPermission[permission] = (stats.byPermission[permission] || 0) + 1;
      });
    });
  }
  
  return stats;
}
