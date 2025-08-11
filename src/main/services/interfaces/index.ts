// Service interfaces for dependency injection and testing
export * from './IMemoryManager';
export * from './IPersonaManager';
export * from './IDatabaseManager';
export * from './ISecurityManager';
export * from './IPluginManager';
export * from './IEncryptionService';

// Event service interfaces
export interface IEventBus {
  publish<T = any>(event: string, data: T, metadata?: any): Promise<void>;
  subscribe<T = any>(event: string, callback: (data: T, metadata?: any) => void): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<void>;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export interface IEventIntegration {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getEventBus(): IEventBus;
}

// Common types used across interfaces
export interface ServiceRegistry {
  memoryManager: import('./IMemoryManager').IMemoryManager;
  personaManager: import('./IPersonaManager').IPersonaManager;
  databaseManager: import('./IDatabaseManager').IDatabaseManager;
  securityManager: import('./ISecurityManager').ISecurityManager;
  pluginManager: import('./IPluginManager').IPluginManager;
  encryptionService: import('./IEncryptionService').IEncryptionService;
  // Event services
  eventBus?: IEventBus;
  personaEventIntegration?: IEventIntegration;
  memoryEventIntegration?: IEventIntegration;
}

export interface ServiceConfiguration {
  database: import('./IDatabaseManager').DatabaseConfig;
  encryption: import('./IEncryptionService').EncryptionConfig;
  security: {
    enableAuditLogging: boolean;
    enableThreatDetection: boolean;
    maxSecurityEvents: number;
  };
  plugins: {
    enableSandboxing: boolean;
    defaultResourceLimits: {
      memory: number;
      cpu: number;
      storage: number;
    };
  };
}
