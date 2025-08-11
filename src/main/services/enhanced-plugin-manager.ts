import { Effect, Context, Layer } from "effect"
import { PluginData, PluginState, PluginUpdateManifest } from '../../shared/types/plugin'

// Configuration interfaces
export interface PluginRegistryConfig {
  registryUrl: string;
  apiKey?: string;
  updateCheckInterval: number;
  allowPrerelease: boolean;
  trustedPublishers: string[];
}

export interface PluginInstallOptions {
  force?: boolean;
  skipDependencies?: boolean;
  skipSignatureCheck?: boolean;
  installDependencies?: boolean;
}

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

export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PluginLogEntry {
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  details?: any;
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

// Service interface
export interface EnhancedPluginManager {
  readonly initialize: () => Effect.Effect<void, never, never>
  readonly install: (pluginPath: string, options?: PluginInstallOptions) => Effect.Effect<PluginData, Error, never>
  readonly uninstall: (pluginId: string) => Effect.Effect<void, Error, never>
  readonly enable: (pluginId: string) => Effect.Effect<void, Error, never>
  readonly disable: (pluginId: string) => Effect.Effect<void, Error, never>
  readonly get: (pluginId: string) => Effect.Effect<PluginData | null, never, never>
  readonly list: () => Effect.Effect<PluginData[], never, never>
  readonly updatePlugin: (pluginId: string, force?: boolean) => Effect.Effect<void, Error, never>
  readonly searchPlugins: (query: string, options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'downloads' | 'rating' | 'updated';
    verified?: boolean;
  }) => Effect.Effect<PluginSearchResult[], never, never>
  readonly validatePlugin: (pluginPath: string) => Effect.Effect<PluginValidationResult, never, never>
  readonly getStatistics: () => Effect.Effect<PluginStatistics, never, never>
  readonly shutdown: () => Effect.Effect<void, never, never>
}

// Create service tag
export const EnhancedPluginManager = Context.GenericTag<EnhancedPluginManager>("EnhancedPluginManager")

// Service implementation
export const EnhancedPluginManagerLive = Layer.effect(
  EnhancedPluginManager,
  Effect.sync(() => {
    // In-memory storage for this implementation
    const plugins = new Map<string, PluginData>();
    const updateCache = new Map<string, PluginUpdateManifest>();
    
    // Default registry config
    const registryConfig: PluginRegistryConfig = {
      registryUrl: 'https://plugins.example.com',
      updateCheckInterval: 3600000, // 1 hour
      allowPrerelease: false,
      trustedPublishers: []
    };

    const createMockPlugin = (id: string, path: string): PluginData => ({
      id,
      name: `Plugin ${id}`,
      version: '1.0.0',
      author: 'Unknown',
      description: `Plugin loaded from ${path}`,
      permissions: [],
      enabled: false,
      state: 'stopped' as PluginState,
      manifest: {
        id,
        name: `Plugin ${id}`,
        version: '1.0.0',
        description: `Plugin loaded from ${path}`,
        author: 'Unknown',
        main: 'index.js',
        permissions: {}
      },
      dependencies: {}
    });

    const logEvent = (message: string, details?: any) => {
      console.log(`[EnhancedPluginManager] ${message}`, details ? JSON.stringify(details, null, 2) : '');
    };

    return {
      initialize: () =>
        Effect.succeed(void 0).pipe(
          Effect.tap(() => Effect.sync(() => logEvent('Initializing Enhanced Plugin Manager...'))),
          Effect.tap(() => Effect.sync(() => logEvent('Enhanced Plugin Manager initialized', {
            registryUrl: registryConfig.registryUrl,
            managedPlugins: plugins.size
          })))
        ),

      install: (pluginPath: string, _options: PluginInstallOptions = {}) =>
        Effect.gen(function* () {
          const pluginId = `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Validate plugin first
          const validation = yield* Effect.sync(() => {
            // Basic validation - in real implementation would check file existence, manifest, etc.
            if (!pluginPath || pluginPath.length === 0) {
              return {
                valid: false,
                errors: ['Plugin path is required'],
                warnings: []
              };
            }
            
            return {
              valid: true,
              errors: [],
              warnings: []
            };
          });

          if (!validation.valid) {
            return yield* Effect.fail(new Error(`Plugin validation failed: ${validation.errors.join(', ')}`));
          }

          const plugin = createMockPlugin(pluginId, pluginPath);
          plugins.set(pluginId, plugin);
          
          logEvent('Plugin installed', { pluginId, pluginPath });
          return plugin;
        }),

      uninstall: (pluginId: string) =>
        Effect.gen(function* () {
          const plugin = plugins.get(pluginId);
          if (!plugin) {
            return yield* Effect.fail(new Error(`Plugin ${pluginId} not found`));
          }

          // Disable first if enabled
          if (plugin.enabled) {
            plugin.enabled = false;
            plugin.state = 'stopped';
          }

          plugins.delete(pluginId);
          updateCache.delete(pluginId);
          
          logEvent('Plugin uninstalled', { pluginId });
        }),

      enable: (pluginId: string) =>
        Effect.gen(function* () {
          const plugin = plugins.get(pluginId);
          if (!plugin) {
            return yield* Effect.fail(new Error(`Plugin ${pluginId} not found`));
          }

          plugin.enabled = true;
          plugin.state = 'running';
          
          logEvent('Plugin enabled', { pluginId });
        }),

      disable: (pluginId: string) =>
        Effect.gen(function* () {
          const plugin = plugins.get(pluginId);
          if (!plugin) {
            return yield* Effect.fail(new Error(`Plugin ${pluginId} not found`));
          }

          plugin.enabled = false;
          plugin.state = 'stopped';
          
          logEvent('Plugin disabled', { pluginId });
        }),

      get: (pluginId: string) =>
        Effect.succeed(plugins.get(pluginId) || null),

      list: () =>
        Effect.succeed(Array.from(plugins.values())),

      updatePlugin: (pluginId: string, _force: boolean = false) =>
        Effect.gen(function* () {
          const plugin = plugins.get(pluginId);
          if (!plugin) {
            return yield* Effect.fail(new Error(`Plugin ${pluginId} not found`));
          }

          const updateInfo = updateCache.get(pluginId);
          if (!updateInfo) {
            return yield* Effect.fail(new Error(`No update available for plugin ${pluginId}`));
          }

          const oldVersion = plugin.version;
          plugin.version = updateInfo.version;
          
          logEvent('Plugin updated', { pluginId, oldVersion, newVersion: updateInfo.version });
        }),

      searchPlugins: (_query: string, _options: {
        limit?: number;
        offset?: number;
        sortBy?: 'name' | 'downloads' | 'rating' | 'updated';
        verified?: boolean;
      } = {}) =>
        Effect.succeed([]),

      validatePlugin: (pluginPath: string) =>
        Effect.succeed({
          valid: Boolean(pluginPath && pluginPath.length > 0 && pluginPath.length <= 500),
          errors: pluginPath && pluginPath.length > 0 ? [] : ['Plugin path is required'],
          warnings: pluginPath && pluginPath.length > 500 ? ['Plugin path is very long'] : []
        }),

      getStatistics: () =>
        Effect.sync(() => {
          const pluginList = Array.from(plugins.values());
          
          return {
            totalPlugins: pluginList.length,
            enabledPlugins: pluginList.filter(p => p.enabled).length,
            runningPlugins: pluginList.filter(p => p.state === 'running').length,
            errorPlugins: pluginList.filter(p => p.state === 'error').length,
            availableUpdates: updateCache.size,
            totalErrors: 0, // PluginData doesn't have lastError property
            healthyPlugins: pluginList.filter(p => p.state === 'running').length
          };
        }),

      shutdown: () =>
        Effect.sync(() => {
          // Disable all running plugins
          for (const plugin of plugins.values()) {
            if (plugin.enabled) {
              plugin.enabled = false;
              plugin.state = 'stopped';
            }
          }
          
          logEvent('Enhanced Plugin Manager shutdown completed');
        })
    }
  })
)
