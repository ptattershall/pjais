import { ServiceRegistry } from './interfaces';
import { vi } from 'vitest';

export type ServiceKey = keyof ServiceRegistry;
export type ServiceInstance<T extends ServiceKey> = ServiceRegistry[T];

export interface ServiceDefinition<T extends ServiceKey> {
  key: T;
  factory: () => ServiceInstance<T> | Promise<ServiceInstance<T>>;
  singleton?: boolean;
  dependencies?: ServiceKey[];
}

export class DependencyContainer {
  private services = new Map<ServiceKey, any>();
  private definitions = new Map<ServiceKey, ServiceDefinition<any>>();
  private singletons = new Map<ServiceKey, any>();
  private isInitializing = new Set<ServiceKey>();

  // Register a service with its factory function
  register<T extends ServiceKey>(definition: ServiceDefinition<T>): void {
    this.definitions.set(definition.key, definition);
  }

  // Register a singleton instance
  registerSingleton<T extends ServiceKey>(key: T, instance: ServiceInstance<T>): void {
    this.singletons.set(key, instance);
  }

  // Get a service instance
  async get<T extends ServiceKey>(key: T): Promise<ServiceInstance<T>> {
    // Check if it's a singleton and already created
    if (this.singletons.has(key)) {
      return this.singletons.get(key);
    }

    // Check if we're already initializing this service (circular dependency)
    if (this.isInitializing.has(key)) {
      throw new Error(`Circular dependency detected for service: ${key}`);
    }

    const definition = this.definitions.get(key);
    if (!definition) {
      throw new Error(`Service not registered: ${key}`);
    }

    try {
      this.isInitializing.add(key);

      // Initialize dependencies first
      if (definition.dependencies) {
        await Promise.all(
          definition.dependencies.map(depKey => this.get(depKey))
        );
      }

      // Create the service instance
      const instance = await definition.factory();

      // Store as singleton if specified
      if (definition.singleton !== false) {
        this.singletons.set(key, instance);
      }

      return instance;
    } finally {
      this.isInitializing.delete(key);
    }
  }

  // Check if a service is registered
  has(key: ServiceKey): boolean {
    return this.definitions.has(key) || this.singletons.has(key);
  }

  // Clear all services and definitions
  clear(): void {
    this.services.clear();
    this.definitions.clear();
    this.singletons.clear();
    this.isInitializing.clear();
  }

  // Get all registered service keys
  getRegisteredServices(): ServiceKey[] {
    return Array.from(new Set([
      ...this.definitions.keys(),
      ...this.singletons.keys()
    ]));
  }

  // Initialize all services
  async initializeAll(): Promise<void> {
    const keys = this.getRegisteredServices();
    await Promise.all(keys.map(key => this.get(key)));
  }

  // Shutdown all services that have a shutdown method
  async shutdownAll(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];

    for (const [key, instance] of this.singletons.entries()) {
      if (instance && typeof instance.shutdown === 'function') {
        shutdownPromises.push(instance.shutdown());
      }
    }

    await Promise.all(shutdownPromises);
    this.clear();
  }

  // Create a child container that inherits from this one
  createChild(): DependencyContainer {
    const child = new DependencyContainer();
    
    // Copy definitions (not instances)
    for (const [key, definition] of this.definitions.entries()) {
      child.definitions.set(key, definition);
    }

    return child;
  }
}

// Default container instance
export const defaultContainer = new DependencyContainer();

// Decorator for dependency injection (if using TypeScript decorators)
export function Injectable<T extends ServiceKey>(key: T) {
  return function(target: any) {
    defaultContainer.register({
      key,
      factory: () => new target(),
      singleton: true
    });
  };
}

// Helper function to create mock services for testing
export function createMockService<T extends ServiceKey>(
  key: T,
  mockImplementation: Partial<ServiceInstance<T>>
): ServiceInstance<T> {
  const mock = {
    initialize: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
    getHealthStatus: vi.fn().mockResolvedValue({
      status: 'healthy',
      service: key,
      details: {}
    }),
    ...mockImplementation
  } as ServiceInstance<T>;

  return mock;
}

// Helper function to setup test container with mocks
export function setupTestContainer(): DependencyContainer {
  const container = new DependencyContainer();

  // Register mock services without dependencies to avoid circular dependencies
  container.register({
    key: 'encryptionService',
    factory: () => createMockService('encryptionService', {}),
    singleton: true
  });

  container.register({
    key: 'databaseManager',
    factory: () => createMockService('databaseManager', {}),
    singleton: true
  });

  container.register({
    key: 'securityManager',
    factory: () => createMockService('securityManager', {}),
    singleton: true
  });

  container.register({
    key: 'memoryManager',
    factory: () => createMockService('memoryManager', {}),
    singleton: true
  });

  container.register({
    key: 'personaManager',
    factory: () => createMockService('personaManager', {}),
    singleton: true
  });

  container.register({
    key: 'pluginManager',
    factory: () => createMockService('pluginManager', {}),
    singleton: true
  });

  return container;
}