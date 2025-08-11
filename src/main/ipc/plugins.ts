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

// Enhanced handlers for Plugin Lifecycle Manager
import { PluginLifecycleManager, PluginState } from '../services/plugin-lifecycle-manager';

export interface PluginInstallOptions {
  force?: boolean;
  skipValidation?: boolean;
}

export const createLifecyclePluginHandlers = (lifecycleManager: PluginLifecycleManager, services: Services) => {
  const { securityManager } = services;

  return {
    // Core plugin operations
    installPluginLifecycle: async (_event: any, pluginPath?: string, _options: PluginInstallOptions = {}) => {
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
      
      await lifecycleManager.installPlugin(pathToInstall);
      return lifecycleManager.getPlugin(pathToInstall.split('/').pop()?.split('.')[0] || '');
    },

    uninstallPluginLifecycle: async (_event: any, pluginId: string) => {
      await lifecycleManager.uninstallPlugin(pluginId);
      return true;
    },

    startPlugin: async (_event: any, pluginId: string) => {
      await lifecycleManager.startPlugin(pluginId);
      return true;
    },

    stopPlugin: async (_event: any, pluginId: string) => {
      await lifecycleManager.stopPlugin(pluginId);
      return true;
    },

    listPluginsLifecycle: async (_event: any) => {
      return lifecycleManager.getAllPlugins();
    },

    getPluginLifecycle: async (_event: any, pluginId: string) => {
      return lifecycleManager.getPlugin(pluginId);
    },

    // Advanced lifecycle features
    updatePluginLifecycle: async (_event: any, pluginId: string, force: boolean = false) => {
      await lifecycleManager.updatePlugin(pluginId, force);
      return true;
    },

    getPluginState: async (_event: any, pluginId: string) => {
      const plugin = lifecycleManager.getPlugin(pluginId);
      return plugin ? plugin.state : null;
    },

    getPluginHealth: async (_event: any, pluginId: string) => {
      return lifecycleManager.getPluginHealth(pluginId);
    },

    getPluginDependencies: async (_event: any, pluginId: string) => {
      const plugin = lifecycleManager.getPlugin(pluginId);
      return plugin ? plugin.dependencies : [];
    },

    getPluginsByState: async (_event: any, state: PluginState) => {
      return lifecycleManager.getPluginsByState(state);
    },

    getDependencyGraph: async (_event: any) => {
      return lifecycleManager.getDependencyGraph();
    },

    checkForUpdates: async (_event: any, pluginId?: string) => {
      return lifecycleManager.checkForUpdates(pluginId);
    },

    // Plugin statistics and monitoring
    getPluginStatistics: async (_event: any) => {
      const plugins = lifecycleManager.getAllPlugins();
      const runningPlugins = plugins.filter(p => p.state === PluginState.RUNNING);
      const errorPlugins = plugins.filter(p => p.state === PluginState.ERROR);
      const healthyPlugins = plugins.filter(p => p.healthStatus.healthy);

      return {
        totalPlugins: plugins.length,
        runningPlugins: runningPlugins.length,
        errorPlugins: errorPlugins.length,
        healthyPlugins: healthyPlugins.length,
        updateCheckInterval: 300000, // 5 minutes
        autoRecoveryEnabled: true
      };
    }
  };
};
