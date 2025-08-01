import { dialog } from 'electron';
import { PluginManager } from '../services/plugin-manager';
import { Services } from '../services';

export const installPlugin = (services: Services) => {
  return async (event: any, pluginPath?: string) => {
    let pathToInstall = pluginPath;
    const { pluginManager, securityManager } = services;

    if (!pathToInstall) {
      const result = await dialog.showOpenDialog({
        title: 'Select Plugin File',
        filters: [
          { name: 'Plugin Files', extensions: ['zip', 'tar.gz', 'pajamas-plugin'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });
      if (result.canceled || result.filePaths.length === 0) {
        throw new Error('Plugin installation cancelled');
      }
      pathToInstall = result.filePaths[0];
    } else {
      // If path is provided directly, it MUST be validated
      if (!(await securityManager.validateFileAccess(pathToInstall, 'read'))) {
        throw new Error(`Installation from path is not allowed: ${pathToInstall}`);
      }
    }
    return pluginManager.install(pathToInstall);
  };
};

export const uninstallPlugin = (pluginManager: PluginManager) => {
  return (event: any, pluginId: string) => pluginManager.uninstall(pluginId);
};

export const enablePlugin = (pluginManager: PluginManager) => {
  return (event: any, pluginId: string) => pluginManager.enable(pluginId);
};

export const disablePlugin = (pluginManager: PluginManager) => {
  return (event: any, pluginId: string) => pluginManager.disable(pluginId);
};

export const listPlugins = (pluginManager: PluginManager) => {
  return () => pluginManager.list();
};

export const getPluginDetails = (pluginManager: PluginManager) => {
  return (event: any, pluginId: string) => pluginManager.getDetails(pluginId);
};

// Enhanced handlers for new plugin system
import { EnhancedPluginManager, PluginInstallOptions } from '../services/enhanced-plugin-manager';

export const createEnhancedPluginHandlers = (enhancedPluginManager: EnhancedPluginManager, services: Services) => {
  const { securityManager } = services;

  return {
    // Core plugin operations
    installPluginEnhanced: async (event: any, pluginPath?: string, options: PluginInstallOptions = {}) => {
      let pathToInstall = pluginPath;

      if (!pathToInstall) {
        const result = await dialog.showOpenDialog({
          title: 'Select Plugin File',
          filters: [
            { name: 'Plugin Files', extensions: ['zip', 'tar.gz', 'pajamas-plugin'] },
            { name: 'All Files', extensions: ['*'] },
          ],
          properties: ['openFile'],
        });
        if (result.canceled || result.filePaths.length === 0) {
          throw new Error('Plugin installation cancelled');
        }
        pathToInstall = result.filePaths[0];
      } else {
        // If path is provided directly, it MUST be validated
        if (!(await securityManager.validateFileAccess(pathToInstall, 'read'))) {
          throw new Error(`Installation from path is not allowed: ${pathToInstall}`);
        }
      }
      
      return enhancedPluginManager.install(pathToInstall, options);
    },

    uninstallPluginEnhanced: async (event: any, pluginId: string) => {
      return enhancedPluginManager.uninstall(pluginId);
    },

    enablePluginEnhanced: async (event: any, pluginId: string) => {
      return enhancedPluginManager.enable(pluginId);
    },

    disablePluginEnhanced: async (event: any, pluginId: string) => {
      return enhancedPluginManager.disable(pluginId);
    },

    listPluginsEnhanced: async (event: any) => {
      return enhancedPluginManager.list();
    },

    getPluginDetailsEnhanced: async (event: any, pluginId: string) => {
      return enhancedPluginManager.getDetails(pluginId);
    },

    getPluginEnhanced: async (event: any, pluginId: string) => {
      return enhancedPluginManager.get(pluginId);
    },

    // Enhanced features
    updatePlugin: async (event: any, pluginId: string, force: boolean = false) => {
      return enhancedPluginManager.updatePlugin(pluginId, force);
    },

    getPluginState: async (event: any, pluginId: string) => {
      return enhancedPluginManager.getPluginState(pluginId);
    },

    getPluginHealth: async (event: any, pluginId: string) => {
      return enhancedPluginManager.getPluginHealth(pluginId);
    },

    getPluginDependencies: async (event: any, pluginId: string) => {
      return enhancedPluginManager.getPluginDependencies(pluginId);
    },

    getAvailableUpdates: async (event: any) => {
      return enhancedPluginManager.getAvailableUpdates();
    },

    searchPlugins: async (event: any, query: string, options: any = {}) => {
      return enhancedPluginManager.searchPlugins(query, options);
    },

    validatePlugin: async (event: any, pluginPath: string) => {
      return enhancedPluginManager.validatePlugin(pluginPath);
    },

    exportPlugin: async (event: any, pluginId: string, exportPath: string) => {
      return enhancedPluginManager.exportPlugin(pluginId, exportPath);
    },

    clearPluginData: async (event: any, pluginId: string) => {
      return enhancedPluginManager.clearPluginData(pluginId);
    },

    getPluginLogs: async (event: any, pluginId: string, options: any = {}) => {
      return enhancedPluginManager.getPluginLogs(pluginId, options);
    },

    getPluginStatistics: async (event: any) => {
      return enhancedPluginManager.getStatistics();
    },

    // Configuration management
    updateRegistryConfig: async (event: any, config: any) => {
      return enhancedPluginManager.updateRegistryConfig(config);
    },

    getRegistryConfig: async (event: any) => {
      return enhancedPluginManager.getRegistryConfig();
    }
  };
}; 