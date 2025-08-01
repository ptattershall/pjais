import { ServiceFactory } from './ServiceFactory';
import { PluginManager } from './plugin-manager';
import { PluginSandbox, SandboxConfig } from './plugin-sandbox';
import { PluginCodeSigningService, CodeSigningConfig } from './plugin-code-signing';
import { SecurityEventLogger } from './security-event-logger';
import { HealthMonitor } from './health-monitor';
import { EnhancedPluginManager, PluginRegistryConfig } from './enhanced-plugin-manager';
import { PluginLifecycleManager } from './plugin-lifecycle-manager';
import { PluginStore } from './plugin-store';
import { PluginLoader } from './plugin-loader';
import { Services } from './index';
import { PlatformUtils } from '../utils/platform';
import * as path from 'path';
import { Effect } from 'effect';

export interface PluginSystemConfig {
  registry: PluginRegistryConfig;
  sandbox: SandboxConfig;
  codeSigning: CodeSigningConfig;
  healthMonitoring: {
    enabled: boolean;
    checkInterval: number;
    maxRecoveryAttempts: number;
  };
  security: {
    requireCodeSigning: boolean;
    allowSelfSigned: boolean;
    maxPluginSize: number;
    trustedPublishers: string[];
  };
}

export class PluginSystemIntegration {
  private enhancedPluginManager: EnhancedPluginManager | null = null;
  private lifecycleManager: PluginLifecycleManager | null = null;
  private initialized = false;

  private readonly defaultConfig: PluginSystemConfig = {
    registry: {
      registryUrl: 'https://plugins.pjais.com/registry',
      updateCheckInterval: 300000, // 5 minutes
      allowPrerelease: false,
      trustedPublishers: []
    },
    sandbox: {
      maxMemoryMB: 256,
      maxExecutionTimeMs: 30000,
      maxCpuUsagePercent: 50,
      allowedModules: [
        'crypto',
        'path',
        'util',
        'events',
        'stream',
        'buffer'
      ],
      enableNetworking: false,
      enableFileSystemAccess: false,
      maxFileSize: 10485760, // 10MB
      tempDirectory: path.join(PlatformUtils.getPluginsPath(), 'temp')
    },
    codeSigning: {
      trustedCertificates: [],
      requireCodeSigning: true,
      allowSelfSigned: false,
      certificateChainValidation: true,
      timestampValidation: true,
      revokedCertificatesCheck: false
    },
    healthMonitoring: {
      enabled: true,
      checkInterval: 30000, // 30 seconds
      maxRecoveryAttempts: 3
    },
    security: {
      requireCodeSigning: true,
      allowSelfSigned: false,
      maxPluginSize: 104857600, // 100MB
      trustedPublishers: []
    }
  };

  constructor(private config: Partial<PluginSystemConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }

  async initialize(services: Services): Promise<void> {
    if (this.initialized) {
      throw new Error('Plugin system already initialized');
    }

    console.log('Initializing Plugin System Integration...');

    try {
      // Initialize core services
      const eventLogger = services.securityEventLogger || new SecurityEventLogger();
      const healthMonitor = services.healthMonitor || new HealthMonitor(eventLogger);
      
      // Initialize plugin store and loader
      const pluginStore = new PluginStore();
      const pluginLoader = new PluginLoader();
      
      // Initialize core plugin manager
      const corePluginManager = new PluginManager(
        pluginStore,
        pluginLoader,
        services.securityManager!,
        eventLogger
      );

      // Initialize plugin sandbox
      const pluginSandbox = new PluginSandbox(
        this.config.sandbox!,
        eventLogger
      );
      await pluginSandbox.initialize();

      // Initialize code signing service
      const codeSigningService = new PluginCodeSigningService(
        this.config.codeSigning!,
        eventLogger
      );
      await codeSigningService.initialize();

      // Initialize enhanced plugin manager
      this.enhancedPluginManager = new EnhancedPluginManager(
        corePluginManager,
        pluginSandbox,
        codeSigningService,
        eventLogger,
        healthMonitor,
        this.config.registry!
      );

      // Initialize the enhanced plugin manager
      await this.enhancedPluginManager.initialize();

      // Register with service factory
      ServiceFactory.registerService('enhancedPluginManager', this.enhancedPluginManager);

      // Setup health monitoring if enabled
      if (this.config.healthMonitoring!.enabled) {
        await this.setupHealthMonitoring(healthMonitor);
      }

      // Setup security monitoring
      await this.setupSecurityMonitoring(eventLogger);

      this.initialized = true;

      console.log('Plugin System Integration initialized successfully');
      
      eventLogger.log({
        type: 'security',
        severity: 'low',
        description: 'Plugin system integration initialized',
        timestamp: new Date(),
        details: {
          registryUrl: this.config.registry!.registryUrl,
          sandboxEnabled: true,
          codeSigningRequired: this.config.codeSigning!.requireCodeSigning,
          healthMonitoringEnabled: this.config.healthMonitoring!.enabled
        }
      });

    } catch (error) {
      console.error('Failed to initialize plugin system:', error);
      throw new Error(`Plugin system initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async setupHealthMonitoring(healthMonitor: HealthMonitor): Promise<void> {
    if (!this.enhancedPluginManager) return;

    // Monitor plugin health
    this.enhancedPluginManager.on('plugin-health-changed', (pluginId, healthy) => {
      healthMonitor.updateMetric(`plugin_${pluginId}_health`, healthy ? 1 : 0);
    });

    // Monitor plugin errors
    this.enhancedPluginManager.on('plugin-error', (error) => {
      healthMonitor.updateMetric(`plugin_${error.pluginId}_errors`, 1);
    });

    // Monitor plugin lifecycle events
    this.enhancedPluginManager.on('plugin-installed', (plugin) => {
      healthMonitor.updateMetric('plugins_installed_total', 1);
    });

    this.enhancedPluginManager.on('plugin-uninstalled', (pluginId) => {
      healthMonitor.updateMetric('plugins_uninstalled_total', 1);
    });

    // Setup periodic health checks
    setInterval(async () => {
      try {
        const stats = this.enhancedPluginManager!.getStatistics();
        
        healthMonitor.updateMetric('plugins_total', stats.totalPlugins);
        healthMonitor.updateMetric('plugins_enabled', stats.enabledPlugins);
        healthMonitor.updateMetric('plugins_running', stats.runningPlugins);
        healthMonitor.updateMetric('plugins_error', stats.errorPlugins);
        healthMonitor.updateMetric('plugins_healthy', stats.healthyPlugins);
        healthMonitor.updateMetric('plugins_updates_available', stats.availableUpdates);
        
      } catch (error) {
        console.error('Health monitoring update failed:', error);
      }
    }, this.config.healthMonitoring!.checkInterval);
  }

  private async setupSecurityMonitoring(eventLogger: SecurityEventLogger): Promise<void> {
    if (!this.enhancedPluginManager) return;

    // Monitor security events
    this.enhancedPluginManager.on('plugin-error', (error) => {
      eventLogger.log({
        type: 'security',
        severity: 'medium',
        description: `Plugin error: ${error.pluginId}`,
        timestamp: new Date(),
        details: {
          pluginId: error.pluginId,
          message: error.message,
          recoverable: error.recoverable
        }
      });
    });

    // Monitor plugin installations
    this.enhancedPluginManager.on('plugin-installed', (plugin) => {
      eventLogger.log({
        type: 'security',
        severity: 'low',
        description: `Plugin installed: ${plugin.id}`,
        timestamp: new Date(),
        details: {
          pluginId: plugin.id,
          name: plugin.name,
          version: plugin.version,
          author: plugin.author
        }
      });
    });

    // Monitor plugin updates
    this.enhancedPluginManager.on('plugin-updated', (pluginId, oldVersion, newVersion) => {
      eventLogger.log({
        type: 'security',
        severity: 'low',
        description: `Plugin updated: ${pluginId}`,
        timestamp: new Date(),
        details: {
          pluginId,
          oldVersion,
          newVersion
        }
      });
    });
  }

  async registerPluginSystemWithIPC(ipcHandlers: any): Promise<void> {
    if (!this.enhancedPluginManager) {
      throw new Error('Plugin system not initialized');
    }

    // Register enhanced plugin manager handlers
    ipcHandlers.registerHandler('plugin:install', async (event: any, pluginPath: string, options: any) => {
      return this.enhancedPluginManager!.install(pluginPath, options);
    });

    ipcHandlers.registerHandler('plugin:uninstall', async (event: any, pluginId: string) => {
      return this.enhancedPluginManager!.uninstall(pluginId);
    });

    ipcHandlers.registerHandler('plugin:enable', async (event: any, pluginId: string) => {
      return this.enhancedPluginManager!.enable(pluginId);
    });

    ipcHandlers.registerHandler('plugin:disable', async (event: any, pluginId: string) => {
      return this.enhancedPluginManager!.disable(pluginId);
    });

    ipcHandlers.registerHandler('plugin:update', async (event: any, pluginId: string, force: boolean) => {
      return this.enhancedPluginManager!.updatePlugin(pluginId, force);
    });

    ipcHandlers.registerHandler('plugin:list', async (event: any) => {
      return this.enhancedPluginManager!.list();
    });

    ipcHandlers.registerHandler('plugin:get', async (event: any, pluginId: string) => {
      return this.enhancedPluginManager!.get(pluginId);
    });

    ipcHandlers.registerHandler('plugin:get-details', async (event: any, pluginId: string) => {
      return this.enhancedPluginManager!.getDetails(pluginId);
    });

    ipcHandlers.registerHandler('plugin:get-state', async (event: any, pluginId: string) => {
      return this.enhancedPluginManager!.getPluginState(pluginId);
    });

    ipcHandlers.registerHandler('plugin:get-health', async (event: any, pluginId: string) => {
      return this.enhancedPluginManager!.getPluginHealth(pluginId);
    });

    ipcHandlers.registerHandler('plugin:get-dependencies', async (event: any, pluginId: string) => {
      return this.enhancedPluginManager!.getPluginDependencies(pluginId);
    });

    ipcHandlers.registerHandler('plugin:get-updates', async (event: any) => {
      return this.enhancedPluginManager!.getAvailableUpdates();
    });

    ipcHandlers.registerHandler('plugin:search', async (event: any, query: string, options: any) => {
      return this.enhancedPluginManager!.searchPlugins(query, options);
    });

    ipcHandlers.registerHandler('plugin:validate', async (event: any, pluginPath: string) => {
      return this.enhancedPluginManager!.validatePlugin(pluginPath);
    });

    ipcHandlers.registerHandler('plugin:export', async (event: any, pluginId: string, exportPath: string) => {
      return this.enhancedPluginManager!.exportPlugin(pluginId, exportPath);
    });

    ipcHandlers.registerHandler('plugin:clear-data', async (event: any, pluginId: string) => {
      return this.enhancedPluginManager!.clearPluginData(pluginId);
    });

    ipcHandlers.registerHandler('plugin:get-logs', async (event: any, pluginId: string, options: any) => {
      return this.enhancedPluginManager!.getPluginLogs(pluginId, options);
    });

    ipcHandlers.registerHandler('plugin:get-statistics', async (event: any) => {
      return this.enhancedPluginManager!.getStatistics();
    });

    console.log('Plugin system IPC handlers registered');
  }

  getEnhancedPluginManager(): EnhancedPluginManager | null {
    return this.enhancedPluginManager;
  }

  async updateConfig(newConfig: Partial<PluginSystemConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    if (this.enhancedPluginManager) {
      // Update registry config
      if (newConfig.registry) {
        this.enhancedPluginManager.updateRegistryConfig(newConfig.registry);
      }
    }
  }

  getConfig(): PluginSystemConfig {
    return { ...this.config } as PluginSystemConfig;
  }

  async shutdown(): Promise<void> {
    if (this.enhancedPluginManager) {
      await this.enhancedPluginManager.shutdown();
    }
    
    this.initialized = false;
    console.log('Plugin system integration shut down');
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Factory function for easy setup
export const createPluginSystemIntegration = (config?: Partial<PluginSystemConfig>): PluginSystemIntegration => {
  return new PluginSystemIntegration(config);
};

// Effect-based initialization for integration with Effect ecosystem
export const initializePluginSystemEffect = (services: Services, config?: Partial<PluginSystemConfig>) =>
  Effect.gen(function* () {
    const pluginSystem = new PluginSystemIntegration(config);
    yield* Effect.promise(() => pluginSystem.initialize(services));
    return pluginSystem;
  });