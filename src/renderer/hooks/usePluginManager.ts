import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEventSystem, useEventSubscription } from './useEventSystem';
import { PluginResponse } from '../../shared/ipc-contracts';

type PluginState = 'installing' | 'starting' | 'running' | 'stopping' | 'stopped' | 'updating' | 'error' | 'uninstalling';

export interface PluginSearchResult {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  downloads: number;
  rating: number;
  lastUpdated: Date;
  verified: boolean;
}

export interface PluginStatistics {
  totalPlugins: number;
  enabledPlugins: number;
  runningPlugins: number;
  errorPlugins: number;
  availableUpdates: number;
  totalErrors: number;
  healthyPlugins: number;
}

export interface PluginUpdateInfo {
  pluginId: string;
  currentVersion: string;
  availableVersion: string;
  changelog?: string;
  critical: boolean;
}

/**
 * Custom hook for managing plugins using the existing plugin API
 * Interfaces with TanStack Query for state management and event system for reactivity
 */
export const usePluginManager = () => {
  const queryClient = useQueryClient();
  const { publish } = useEventSystem();
  const [searchResults, setSearchResults] = useState<PluginSearchResult[]>([]);

  // Query for all installed plugins
  const {
    data: plugins = [],
    isLoading: isLoadingPlugins,
    error: pluginsError,
    refetch: refetchPlugins
  } = useQuery({
    queryKey: ['plugins'],
    queryFn: async (): Promise<PluginResponse[]> => {
      const result = await window.api.plugins.list();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Derived statistics from plugins data
  const statistics: PluginStatistics = React.useMemo(() => {
    const totalPlugins = plugins.length;
    const enabledPlugins = plugins.filter(p => p.enabled).length;
    const healthyPlugins = enabledPlugins; // Assume enabled = healthy for now
    
    return {
      totalPlugins,
      enabledPlugins,
      runningPlugins: enabledPlugins, // Assume enabled = running for now
      errorPlugins: 0, // No error tracking in current API
      availableUpdates: 0, // No update tracking in current API
      totalErrors: 0,
      healthyPlugins,
    };
  }, [plugins]);

  // Enhanced lifecycle-based plugin operations using the new advanced API

  // Install plugin mutation (using existing API, ready for lifecycle upgrade)
  const installMutation = useMutation({
    mutationFn: async (pluginData: { name: string; manifest: any }): Promise<PluginResponse> => {
      // TODO: Upgrade to lifecycle API when types are available
      // const result = await window.api.plugins.installPluginLifecycle?.(pluginPath);
      const result = await window.api.plugins.create({
        name: pluginData.name,
        manifest: pluginData.manifest,
        enabled: true
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (newPlugin) => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      queryClient.invalidateQueries({ queryKey: ['plugin-statistics'] });
      publish('plugin.request.persona.access', { pluginId: newPlugin.id.toString(), plugin: newPlugin });
    },
    onError: (error) => {
      publish('plugin.security.violation', { 
        error: error instanceof Error ? error.message : String(error),
        operation: 'install'
      });
    }
  });

  // Uninstall plugin mutation (using existing API, ready for lifecycle upgrade)
  const uninstallMutation = useMutation({
    mutationFn: async (pluginId: string): Promise<boolean> => {
      // TODO: Upgrade to lifecycle API when types are available
      // const result = await window.api.plugins.uninstallPluginLifecycle?.(pluginId);
      const id = parseInt(pluginId, 10);
      const result = await window.api.plugins.delete(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (_, pluginId) => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      queryClient.invalidateQueries({ queryKey: ['plugin-statistics'] });
      publish('plugin.security.violation', { pluginId, operation: 'uninstall' });
    },
    onError: (error, pluginId) => {
      publish('plugin.security.violation', { 
        pluginId,
        error: error instanceof Error ? error.message : String(error),
        operation: 'uninstall'
      });
    }
  });

  // Enable plugin mutation (simulating start)
  const startMutation = useMutation({
    mutationFn: async (pluginId: string): Promise<PluginResponse> => {
      // TODO: Upgrade to lifecycle API when types are available
      // const result = await window.api.plugins.startPlugin?.(pluginId);
      const id = parseInt(pluginId, 10);
      const result = await window.api.plugins.toggle({ id, enabled: true });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (_, pluginId) => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      queryClient.invalidateQueries({ queryKey: ['plugin-statistics'] });
      publish('plugin.persona.permission.granted', { pluginId });
    },
    onError: (error, pluginId) => {
      publish('plugin.security.violation', { 
        pluginId,
        error: error instanceof Error ? error.message : String(error),
        operation: 'start'
      });
    }
  });

  // Disable plugin mutation (simulating stop)
  const stopMutation = useMutation({
    mutationFn: async (pluginId: string): Promise<PluginResponse> => {
      // TODO: Upgrade to lifecycle API when types are available
      // const result = await window.api.plugins.stopPlugin?.(pluginId);
      const id = parseInt(pluginId, 10);
      const result = await window.api.plugins.toggle({ id, enabled: false });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (_, pluginId) => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      queryClient.invalidateQueries({ queryKey: ['plugin-statistics'] });
      publish('plugin.persona.permission.denied', { pluginId });
    },
    onError: (error, pluginId) => {
      publish('plugin.security.violation', { 
        pluginId,
        error: error instanceof Error ? error.message : String(error),
        operation: 'stop'
      });
    }
  });

  // Update plugin mutation (using existing API, ready for lifecycle upgrade)
  const updateMutation = useMutation({
    mutationFn: async ({ pluginId, updateData }: { pluginId: string; updateData: any }): Promise<PluginResponse> => {
      // TODO: Upgrade to lifecycle API when types are available
      // const result = await window.api.plugins.updatePluginLifecycle?.(pluginId, force);
      const id = parseInt(pluginId, 10);
      const result = await window.api.plugins.update({
        id,
        ...updateData
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (_, { pluginId }) => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      queryClient.invalidateQueries({ queryKey: ['plugin-statistics'] });
      publish('memory.updated', { pluginId });
    },
    onError: (error, { pluginId }) => {
      publish('plugin.security.violation', { 
        pluginId,
        error: error instanceof Error ? error.message : String(error),
        operation: 'update'
      });
    }
  });

  // Search plugins function (simulated - returns mock data for now)
  const searchPlugins = useCallback(async (
    query: string, 
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'name' | 'downloads' | 'rating' | 'updated';
      verified?: boolean;
    } = {}
  ): Promise<PluginSearchResult[]> => {
    // Mock search results for now
    const mockResults: PluginSearchResult[] = [
      {
        id: 'search-1',
        name: `Search Plugin: ${query}`,
        version: '1.0.0',
        description: `A plugin matching "${query}"`,
        author: 'Mock Author',
        downloads: 1000,
        rating: 4.5,
        lastUpdated: new Date(),
        verified: options.verified ?? true
      }
    ];
    
    setSearchResults(mockResults);
    return mockResults;
  }, []);

  // Get plugin health (mock implementation)
  const getPluginHealth = useCallback(async (_pluginId: string) => {
    return {
      healthy: true,
      uptime: Date.now(),
      memoryUsage: 50,
      cpuUsage: 10,
      errors: 0,
      performance: {
        avgResponseTime: 100,
        successRate: 0.99,
        totalRequests: 1000
      }
    };
  }, []);

  // Get plugin details
  const getPluginDetails = useCallback(async (pluginId: string): Promise<PluginResponse | null> => {
    try {
      const id = parseInt(pluginId, 10);
      const result = await window.api.plugins.get(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    } catch {
      return null;
    }
  }, []);

  // Subscribe to plugin events
  const { subscribe: subscribeToPluginEvents } = useEventSubscription(
    'plugin.request.persona.access', // Use existing event type
    {
      pluginId: 'plugin-manager',
      accessToken: 'plugin-manager-token',
    },
    () => {
      refetchPlugins();
    }
  );

  React.useEffect(() => {
    subscribeToPluginEvents();
  }, [subscribeToPluginEvents]);

  return {
    // Data
    plugins,
    statistics,
    searchResults,
    availableUpdates: [] as PluginUpdateInfo[], // Mock empty array for now
    
    // Loading states
    isLoadingPlugins,
    isLoadingStats: false, // Derived from plugins, so no separate loading
    isLoadingUpdates: false, // Mock for now
    
    // Errors
    pluginsError,
    
    // Actions
    installPlugin: installMutation.mutate,
    uninstallPlugin: uninstallMutation.mutate,
    startPlugin: startMutation.mutate,
    stopPlugin: stopMutation.mutate,
    updatePlugin: updateMutation.mutate,
    
    // Mutation states
    isInstalling: installMutation.isPending,
    isUninstalling: uninstallMutation.isPending,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    isUpdating: updateMutation.isPending,
    
    // Utility functions
    searchPlugins,
    getPluginHealth,
    getPluginDetails,
    
    // Refetch functions
    refetchPlugins,
    refetchStats: refetchPlugins, // Same data source
    refetchUpdates: () => Promise.resolve(), // Mock for now
    
    // Helper functions
    getPluginById: (id: string) => plugins.find(p => p.id.toString() === id),
    getPluginsByState: (state: PluginState) => {
      // Mock state filtering since API doesn't have state field
      if (state === 'running') return plugins.filter(p => p.enabled);
      if (state === 'stopped') return plugins.filter(p => !p.enabled);
      return [];
    },
    getEnabledPlugins: () => plugins.filter(p => p.enabled),
    getDisabledPlugins: () => plugins.filter(p => !p.enabled),
  };
};
