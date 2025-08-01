import { loggers } from '../utils/logger';

// Service token types
export type ServiceToken<T = unknown> = string | symbol | (new (...args: unknown[]) => T);

// Service scope types
export type ServiceScope = 'singleton' | 'transient' | 'scoped';

// Service definition interface
export interface ServiceDefinition<T = unknown> {
  token: ServiceToken<T>;
  factory: (...args: unknown[]) => T | Promise<T>;
  dependencies?: ServiceToken[];
  scope?: ServiceScope;
  initialized?: boolean;
}

// Service registry for managing service lifecycle
export class ServiceRegistry {
  private services = new Map<ServiceToken, ServiceDefinition>();
  private instances = new Map<ServiceToken, unknown>();
  private resolutionStack = new Set<ServiceToken>();
  private isInitialized = false;

  // Register a service with its dependencies
  public register<T>(definition: ServiceDefinition<T>): void {
    this.services.set(definition.token, {
      scope: 'singleton',
      initialized: false,
      ...definition,
    });
    
    loggers.service.debug('Service registered', { 
      token: definition.token.toString(),
      scope: definition.scope 
    });
  }

  // Register a singleton service
  public registerSingleton<T>(
    token: ServiceToken<T>,
    factory: (...args: unknown[]) => T | Promise<T>,
    dependencies: ServiceToken[] = []
  ): void {
    this.register({
      token,
      factory,
      dependencies,
      scope: 'singleton',
    });
  }

  // Register a transient service
  public registerTransient<T>(
    token: ServiceToken<T>,
    factory: (...args: unknown[]) => T | Promise<T>,
    dependencies: ServiceToken[] = []
  ): void {
    this.register({
      token,
      factory,
      dependencies,
      scope: 'transient',
    });
  }

  // Register an existing instance
  public registerInstance<T>(token: ServiceToken<T>, instance: T): void {
    this.instances.set(token, instance);
    this.services.set(token, {
      token,
      factory: () => instance,
      scope: 'singleton',
      initialized: true,
    });
    
    loggers.service.debug('Service instance registered', { 
      token: token.toString() 
    });
  }

  // Resolve a service and its dependencies
  public async resolve<T>(token: ServiceToken<T>): Promise<T> {
    // Check for circular dependencies
    if (this.resolutionStack.has(token)) {
      const stackArray = Array.from(this.resolutionStack);
      throw new Error(
        `Circular dependency detected: ${stackArray.map(t => t.toString()).join(' -> ')} -> ${token.toString()}`
      );
    }

    // Check if instance already exists for singletons
    if (this.instances.has(token)) {
      return this.instances.get(token);
    }

    const definition = this.services.get(token);
    if (!definition) {
      throw new Error(`Service not registered: ${token.toString()}`);
    }

    // Handle different scopes
    if (definition.scope === 'singleton' && this.instances.has(token)) {
      return this.instances.get(token);
    }

    // Add to resolution stack
    this.resolutionStack.add(token);

    try {
      // Resolve dependencies
      const dependencies = definition.dependencies || [];
      const resolvedDeps = await Promise.all(
        dependencies.map(dep => this.resolve(dep))
      );

      // Create instance
      const instance = await definition.factory(...resolvedDeps);

      // Store singleton instances
      if (definition.scope === 'singleton') {
        this.instances.set(token, instance);
      }

      // Mark as initialized
      definition.initialized = true;

      loggers.service.debug('Service resolved', { 
        token: token.toString(),
        scope: definition.scope 
      });

      return instance;
    } finally {
      // Remove from resolution stack
      this.resolutionStack.delete(token);
    }
  }

  // Initialize all registered services
  public async initializeAll(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const serviceTokens = Array.from(this.services.keys());
    const startTime = Date.now();

    loggers.service.info('Initializing all services', { 
      serviceCount: serviceTokens.length 
    });

    try {
      // Initialize services in parallel where possible
      await Promise.all(
        serviceTokens.map(token => this.resolve(token))
      );

      this.isInitialized = true;
      const duration = Date.now() - startTime;
      
      loggers.service.info('All services initialized successfully', { 
        duration,
        serviceCount: serviceTokens.length 
      });
    } catch (error) {
      loggers.service.error('Failed to initialize services', {}, error as Error);
      throw error;
    }
  }

  // Get service health status
  public getServiceHealth(): Record<string, any> {
    const health = {
      totalServices: this.services.size,
      initializedServices: 0,
      singletons: 0,
      transients: 0,
      instances: this.instances.size,
    };

    this.services.forEach((definition) => {
      if (definition.initialized) {
        health.initializedServices++;
      }
      if (definition.scope === 'singleton') {
        health.singletons++;
      } else {
        health.transients++;
      }
    });

    return health;
  }

  // Clear all services (for testing)
  public clear(): void {
    this.services.clear();
    this.instances.clear();
    this.resolutionStack.clear();
    this.isInitialized = false;
    
    loggers.service.debug('Service registry cleared');
  }

  // Get all registered service tokens
  public getRegisteredServices(): ServiceToken[] {
    return Array.from(this.services.keys());
  }

  // Check if a service is registered
  public has(token: ServiceToken): boolean {
    return this.services.has(token);
  }

  // Check if a service is initialized
  public isServiceInitialized(token: ServiceToken): boolean {
    const definition = this.services.get(token);
    return definition?.initialized || false;
  }
}

// Service tokens - using symbols for type safety
export const ServiceTokens = {
  // Core services
  DATABASE_MANAGER: Symbol('DatabaseManager'),
  SECURITY_MANAGER: Symbol('SecurityManager'),
  MEMORY_MANAGER: Symbol('MemoryManager'),
  PERSONA_MANAGER: Symbol('PersonaManager'),
  PLUGIN_MANAGER: Symbol('PluginManager'),
  PRIVACY_CONTROLLER: Symbol('PrivacyController'),
  
  // Utility services
  MEMORY_STORE: Symbol('MemoryStore'),
  MEMORY_LOADER: Symbol('MemoryLoader'),
  MEMORY_TIER_MANAGER: Symbol('MemoryTierManager'),
  EMBEDDING_SERVICE: Symbol('EmbeddingService'),
  MEMORY_GRAPH_SERVICE: Symbol('MemoryGraphService'),
  
  // Security services
  SECURITY_EVENT_LOGGER: Symbol('SecurityEventLogger'),
  ENCRYPTION_SERVICE: Symbol('EncryptionService'),
  DATA_PROTECTION_MANAGER: Symbol('DataProtectionManager'),
  CSP_MANAGER: Symbol('CSPManager'),
  PLUGIN_SANDBOX: Symbol('PluginSandbox'),
  PLUGIN_CODE_SIGNING: Symbol('PluginCodeSigning'),
  
  // Health and monitoring
  HEALTH_MONITOR: Symbol('HealthMonitor'),
} as const;

// Global service registry instance
export const serviceRegistry = new ServiceRegistry();

// Decorator for injectable services
export function Injectable<T extends new (...args: unknown[]) => unknown>(
  token: ServiceToken,
  dependencies: ServiceToken[] = []
) {
  return function(constructor: T) {
    serviceRegistry.registerSingleton(
      token,
      (...deps) => new constructor(...deps),
      dependencies
    );
    return constructor;
  };
}

// Decorator for service method instrumentation
export function Instrument(operationName: string) {
  return function(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: unknown[]) {
      const startTime = Date.now();
      let success = true;
      
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } catch (error) {
        success = false;
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        
        // Record operation metrics if health monitor is available
        if (serviceRegistry.has(ServiceTokens.HEALTH_MONITOR)) {
          serviceRegistry.resolve(ServiceTokens.HEALTH_MONITOR).then(monitor => {
            monitor.recordOperation(operationName, duration, success);
          }).catch(() => {
            // Ignore health monitor errors
          });
        }
      }
    };
  };
}

// Utility function to configure common services
export function configureServices() {
  // This will be populated by the services as they are refactored
  loggers.service.info('Service configuration started');
}

export default serviceRegistry;