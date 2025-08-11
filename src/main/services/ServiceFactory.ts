import { 
  ServiceRegistry, 
  ServiceConfiguration, 
  IEventBus, 
  IEventIntegration,
  IMemoryManager, 
  IPersonaManager, 
  IDatabaseManager, 
  ISecurityManager, 
  IPluginManager, 
  IEncryptionService 
} from './interfaces';

// Import Electron modules
import { app } from 'electron';
import * as path from 'path';

// Import concrete implementations
import { MemoryManager } from './memory-manager';
import { PersonaManager } from './persona-manager';
import { EffectDatabaseManager } from '../database/effect-database-manager';
import { SecurityManager } from './security-manager';
import { PluginLifecycleManager } from './plugin-lifecycle-manager';
import { EncryptionService } from './encryption-service';

// Import reactive event services
import { EventBusFoundation } from './event-bus-foundation';
import { PersonaEventIntegration } from './persona-event-integration';
import { MemoryEventIntegration } from './memory-event-integration';

export class ServiceFactory {
  private static instance: ServiceFactory;
  private services: Partial<ServiceRegistry> = {};
  private configuration: ServiceConfiguration;
  private isInitialized = false;

  private constructor(configuration: ServiceConfiguration) {
    this.configuration = configuration;
  }

  static getInstance(configuration?: ServiceConfiguration): ServiceFactory {
    if (!ServiceFactory.instance) {
      if (!configuration) {
        throw new Error('Configuration required for first initialization');
      }
      ServiceFactory.instance = new ServiceFactory(configuration);
    }
    return ServiceFactory.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize services in dependency order
      await this.initializeEncryptionService();
      await this.initializeDatabaseManager();
      await this.initializeSecurityManager();
      await this.initializeMemoryManager();
      await this.initializePersonaManager();
      await this.initializePluginManager();

      // Initialize event services
      await this.initializeEventServices();

      this.isInitialized = true;
      console.log('ServiceFactory initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ServiceFactory:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Shutdown services in reverse dependency order
      await this.services.pluginManager?.shutdown();
      await this.services.personaManager?.shutdown();
      await this.services.memoryManager?.shutdown();
      await this.services.securityManager?.shutdown();
      await this.services.databaseManager?.shutdown();
      await this.services.encryptionService?.shutdown();

      this.services = {};
      this.isInitialized = false;
      console.log('ServiceFactory shutdown completed');
    } catch (error) {
      console.error('Error during ServiceFactory shutdown:', error);
      throw error;
    }
  }

  getMemoryManager(): IMemoryManager {
    if (!this.services.memoryManager) {
      throw new Error('MemoryManager not initialized');
    }
    return this.services.memoryManager;
  }

  getPersonaManager(): IPersonaManager {
    if (!this.services.personaManager) {
      throw new Error('PersonaManager not initialized');
    }
    return this.services.personaManager;
  }

  getDatabaseManager(): IDatabaseManager {
    if (!this.services.databaseManager) {
      throw new Error('DatabaseManager not initialized');
    }
    return this.services.databaseManager;
  }

  getSecurityManager(): ISecurityManager {
    if (!this.services.securityManager) {
      throw new Error('SecurityManager not initialized');
    }
    return this.services.securityManager;
  }

  getPluginManager(): IPluginManager {
    if (!this.services.pluginManager) {
      throw new Error('PluginManager not initialized');
    }
    return this.services.pluginManager;
  }

  getEncryptionService(): IEncryptionService {
    if (!this.services.encryptionService) {
      throw new Error('EncryptionService not initialized');
    }
    return this.services.encryptionService;
  }

  // Event service getters
  getEventBus(): IEventBus | undefined {
    return this.services.eventBus;
  }

  getPersonaEventIntegration(): IEventIntegration | undefined {
    return this.services.personaEventIntegration;
  }

  getMemoryEventIntegration(): IEventIntegration | undefined {
    return this.services.memoryEventIntegration;
  }

  getAllServices(): ServiceRegistry {
    if (!this.isInitialized) {
      throw new Error('ServiceFactory not initialized');
    }
    return this.services as ServiceRegistry;
  }

  // Mock factory for testing
  static createMockFactory(): ServiceFactory {
    const mockConfig: ServiceConfiguration = {
      database: {
        dataPath: ':memory:',
        enableEncryption: false
      },
      encryption: {
        algorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2',
        keyLength: 32,
        saltLength: 16
      },
      security: {
        enableAuditLogging: false,
        enableThreatDetection: false,
        maxSecurityEvents: 1000
      },
      plugins: {
        enableSandboxing: false,
        defaultResourceLimits: {
          memory: 128 * 1024 * 1024, // 128MB
          cpu: 50, // 50%
          storage: 10 * 1024 * 1024 // 10MB
        }
      }
    };

    return new ServiceFactory(mockConfig);
  }

  private async initializeEncryptionService(): Promise<void> {
    // EncryptionService creates its own SecurityEventLogger internally
    const { SecurityEventLogger } = await import('./security-event-logger');
    const eventLogger = new SecurityEventLogger();
    this.services.encryptionService = new EncryptionService(eventLogger) as any;
    await this.services.encryptionService?.initialize();
  }

  private async initializeDatabaseManager(): Promise<void> {
    this.services.databaseManager = new EffectDatabaseManager(this.configuration.database) as any;
    await this.services.databaseManager?.initialize();
  }

  private async initializeSecurityManager(): Promise<void> {
    if (!this.services.encryptionService) {
      throw new Error('EncryptionService required for SecurityManager');
    }
    
    // SecurityManager takes a SecurityManagerConfig, not EncryptionService
    const securityConfig = {
      enforceCSP: true,
      enableDataProtection: this.configuration.security.enableAuditLogging,
      logLevel: 'medium' as const,
      pluginSandboxConfig: {
        maxMemoryMB: this.configuration.plugins.defaultResourceLimits.memory / (1024 * 1024),
        maxCpuUsagePercent: this.configuration.plugins.defaultResourceLimits.cpu,
        enableNetworking: false,
        enableFileSystemAccess: false
      }
    };
    
    this.services.securityManager = new SecurityManager(securityConfig) as any;
    await this.services.securityManager?.initialize();
  }

  private async initializeMemoryManager(): Promise<void> {
    if (!this.services.databaseManager || !this.services.securityManager || !this.services.encryptionService) {
      throw new Error('DatabaseManager, SecurityManager, and EncryptionService required for MemoryManager');
    }
    
    // Create memory manager with required dependencies - use type assertion to handle constructor mismatch
    this.services.memoryManager = new MemoryManager(
      this.services.databaseManager as any,
      this.services.securityManager as any,
      this.services.encryptionService as any,
      {} as any // Additional config if needed
    ) as unknown as IMemoryManager;
    await this.services.memoryManager.initialize();
  }

  private async initializePersonaManager(): Promise<void> {
    if (!this.services.memoryManager) {
      throw new Error('MemoryManager required for PersonaManager');
    }
    this.services.personaManager = new PersonaManager(this.services.memoryManager as any) as unknown as IPersonaManager;
    await this.services.personaManager.initialize();
  }

  private async initializePluginManager(): Promise<void> {
    if (!this.services.securityManager) {
      throw new Error('SecurityManager required for PluginManager');
    }

    // Initialize the advanced PluginLifecycleManager instead of basic PluginManager
    const lifecycleManager = new PluginLifecycleManager({
      pluginDirectory: path.join(app.getPath('userData'), 'plugins'),
      maxRecoveryAttempts: 3,
      healthCheckInterval: 30000, // 30 seconds
      updateCheckInterval: 300000, // 5 minutes
      enableAutoRecovery: true,
      enableAutoUpdates: false
    });

    // Create a wrapper that implements IPluginManager interface
    const pluginManagerWrapper = {
      ...lifecycleManager,
      // Map advanced lifecycle methods to basic interface
      async install(pluginPath: string) {
        await lifecycleManager.installPlugin(pluginPath);
        return lifecycleManager.getPlugin(path.basename(pluginPath, '.zip'));
      },
      async uninstall(pluginId: string) {
        await lifecycleManager.uninstallPlugin(pluginId);
        return true;
      },
      async enable(pluginId: string) {
        await lifecycleManager.startPlugin(pluginId);
        return true;
      },
      async disable(pluginId: string) {
        await lifecycleManager.stopPlugin(pluginId);
        return true;
      },
      async list() {
        return lifecycleManager.getAllPlugins();
      },
      async getDetails(pluginId: string) {
        return lifecycleManager.getPlugin(pluginId);
      },
      async initialize() {
        // PluginLifecycleManager doesn't need explicit initialization
        console.log('PluginLifecycleManager initialized');
      },
      async shutdown() {
        lifecycleManager.destroy();
      },
      async getHealth() {
        const plugins = lifecycleManager.getAllPlugins();
        const runningPlugins = plugins.filter(p => p.state === 'running').length;
        return {
          service: 'PluginLifecycleManager',
          status: 'ok' as const,
          details: {
            totalPlugins: plugins.length,
            runningPlugins,
            healthyPlugins: plugins.filter(p => p.healthStatus.healthy).length
          }
        };
      }
    };

    this.services.pluginManager = pluginManagerWrapper as any;
    await this.services.pluginManager?.initialize();

    console.log('Advanced PluginLifecycleManager integrated successfully');
  }

  private async initializeEventServices(): Promise<void> {
    try {
      // Import required services for event bus
      const { SecurityEventLogger } = await import('./security-event-logger');
      const { healthMonitor } = await import('./health-monitor');

      // Initialize EventBus with required dependencies
      const eventLogger = new SecurityEventLogger();
      this.services.eventBus = new EventBusFoundation(eventLogger, healthMonitor) as any;

      // Initialize PersonaEventIntegration
      if (this.services.personaManager && this.services.eventBus && this.services.securityManager) {
        this.services.personaEventIntegration = new PersonaEventIntegration(
          this.services.personaManager as any,
          this.services.eventBus as any,
          this.services.securityManager as any
        ) as any;
      }

      // Initialize MemoryEventIntegration  
      if (this.services.memoryManager && this.services.eventBus) {
        this.services.memoryEventIntegration = new MemoryEventIntegration(
          this.services.memoryManager as any,
          this.services.eventBus as any
        ) as any;
      }

      console.log('Event services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize event services:', error);
      throw error;
    }
  }
}
