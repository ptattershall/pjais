import { ServiceRegistry, ServiceConfiguration } from './interfaces';
import { 
  IMemoryManager, 
  IPersonaManager, 
  IDatabaseManager, 
  ISecurityManager, 
  IPluginManager, 
  IEncryptionService 
} from './interfaces';

// Import concrete implementations
import { MemoryManager } from './memory-manager';
import { PersonaManager } from './persona-manager';
import { DatabaseManager } from './database-manager';
import { SecurityManager } from './security-manager';
import { PluginManager } from './plugin-manager';
import { EncryptionService } from './encryption-service';

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
    this.services.encryptionService = new EncryptionService(this.configuration.encryption);
    await this.services.encryptionService.initialize();
  }

  private async initializeDatabaseManager(): Promise<void> {
    this.services.databaseManager = new DatabaseManager(this.configuration.database);
    await this.services.databaseManager.initialize();
  }

  private async initializeSecurityManager(): Promise<void> {
    if (!this.services.encryptionService) {
      throw new Error('EncryptionService required for SecurityManager');
    }
    this.services.securityManager = new SecurityManager(this.services.encryptionService);
    await this.services.securityManager.initialize();
  }

  private async initializeMemoryManager(): Promise<void> {
    if (!this.services.databaseManager || !this.services.securityManager) {
      throw new Error('DatabaseManager and SecurityManager required for MemoryManager');
    }
    
    // Create memory manager with required dependencies
    // Note: This assumes the concrete MemoryManager constructor signature
    // You may need to adjust based on your actual implementation
    this.services.memoryManager = new MemoryManager(
      this.services.databaseManager as any,
      this.services.securityManager as any
    );
    await this.services.memoryManager.initialize();
  }

  private async initializePersonaManager(): Promise<void> {
    if (!this.services.memoryManager) {
      throw new Error('MemoryManager required for PersonaManager');
    }
    this.services.personaManager = new PersonaManager(this.services.memoryManager as any);
    await this.services.personaManager.initialize();
  }

  private async initializePluginManager(): Promise<void> {
    if (!this.services.securityManager) {
      throw new Error('SecurityManager required for PluginManager');
    }
    this.services.pluginManager = new PluginManager(this.services.securityManager as any);
    await this.services.pluginManager.initialize();
  }
}