// Service interfaces for dependency injection and testing
export * from './IMemoryManager';
export * from './IPersonaManager';
export * from './IDatabaseManager';
export * from './ISecurityManager';
export * from './IPluginManager';
export * from './IEncryptionService';

// Common types used across interfaces
export interface ServiceRegistry {
  memoryManager: import('./IMemoryManager').IMemoryManager;
  personaManager: import('./IPersonaManager').IPersonaManager;
  databaseManager: import('./IDatabaseManager').IDatabaseManager;
  securityManager: import('./ISecurityManager').ISecurityManager;
  pluginManager: import('./IPluginManager').IPluginManager;
  encryptionService: import('./IEncryptionService').IEncryptionService;
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