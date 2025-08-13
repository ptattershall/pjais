import { ServiceHealth } from '../../../shared/types/system';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  dependencies?: string[];
  permissions: string[];
  entryPoint: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PluginConfig {
  enabled: boolean;
  autoStart: boolean;
  settings: Record<string, unknown>;
  resourceLimits: {
    memory: number;
    cpu: number;
    storage: number;
  };
}

export interface PluginContext {
  pluginId: string;
  userId: string;
  permissions: string[];
  resourceLimits: PluginConfig['resourceLimits'];
  logger: {
    info: (message: string, metadata?: Record<string, unknown>) => void;
    warn: (message: string, metadata?: Record<string, unknown>) => void;
    error: (message: string, metadata?: Record<string, unknown>) => void;
  };
}

export interface PluginInstance {
  metadata: PluginMetadata;
  config: PluginConfig;
  status: 'loading' | 'running' | 'stopped' | 'error';
  runtime: {
    startTime: Date;
    memoryUsage: number;
    cpuUsage: number;
    errorCount: number;
    lastError?: string;
  };
}

export interface PluginExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime: number;
  resourceUsage: {
    memory: number;
    cpu: number;
  };
}

export interface IPluginManager {
  // Lifecycle management
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  isInitialized(): boolean;

  // Plugin installation and management
  installPlugin(pluginPath: string, validate?: boolean): Promise<PluginMetadata>;
  uninstallPlugin(pluginId: string): Promise<void>;
  updatePlugin(pluginId: string, pluginPath: string): Promise<PluginMetadata>;
  getPlugin(pluginId: string): Promise<PluginInstance | null>;
  getAllPlugins(): Promise<PluginInstance[]>;

  // Plugin lifecycle
  startPlugin(pluginId: string): Promise<void>;
  stopPlugin(pluginId: string): Promise<void>;
  restartPlugin(pluginId: string): Promise<void>;
  enablePlugin(pluginId: string): Promise<void>;
  disablePlugin(pluginId: string): Promise<void>;

  // Plugin execution
  executePlugin(pluginId: string, method: string, args: unknown[]): Promise<PluginExecutionResult>;
  executePluginAsync(pluginId: string, method: string, args: unknown[]): Promise<string>; // Returns execution ID
  getExecutionResult(executionId: string): Promise<PluginExecutionResult | null>;

  // Plugin configuration
  getPluginConfig(pluginId: string): Promise<PluginConfig | null>;
  updatePluginConfig(pluginId: string, config: Partial<PluginConfig>): Promise<PluginConfig>;
  resetPluginConfig(pluginId: string): Promise<PluginConfig>;

  // Plugin validation and security
  validatePlugin(pluginPath: string): Promise<{
    isValid: boolean;
    issues: Array<{
      type: 'security' | 'compatibility' | 'performance' | 'metadata';
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
    }>;
  }>;

  sandboxPlugin(pluginId: string, permissions: string[]): Promise<void>;
  getPluginPermissions(pluginId: string): Promise<string[]>;
  updatePluginPermissions(pluginId: string, permissions: string[]): Promise<void>;

  // Plugin monitoring
  getPluginMetrics(pluginId: string): Promise<{
    memoryUsage: number;
    cpuUsage: number;
    executionCount: number;
    averageExecutionTime: number;
    errorRate: number;
    uptime: number;
  }>;

  getPluginLogs(pluginId: string, filters?: {
    level?: 'info' | 'warn' | 'error';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Array<{
    level: 'info' | 'warn' | 'error';
    message: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }>>;

  // Plugin discovery and marketplace
  discoverPlugins(directory: string): Promise<PluginMetadata[]>;
  searchPlugins(query: string, filters?: {
    category?: string;
    author?: string;
    minVersion?: string;
    maxVersion?: string;
  }): Promise<PluginMetadata[]>;

  // Plugin dependencies
  resolveDependencies(pluginId: string): Promise<string[]>;
  installDependencies(pluginId: string): Promise<void>;
  updateDependencies(pluginId: string): Promise<void>;

  // Plugin backup and restore
  exportPlugin(pluginId: string): Promise<string>;
  importPlugin(data: string): Promise<PluginMetadata>;
  backupAllPlugins(): Promise<string>;
  restorePlugins(backupData: string): Promise<void>;

  // Health monitoring
  getHealthStatus(): Promise<ServiceHealth>;
}

// Events interface for plugin manager
export interface PluginError {
  message: string;
  code?: string;
  pluginId?: string;
  stack?: string;
  timestamp?: Date;
}

export interface PluginManagerEvents {
  'plugin-installed': (plugin: PluginMetadata) => void;
  'plugin-uninstalled': (pluginId: string) => void;
  'plugin-enabled': (pluginId: string) => void;
  'plugin-disabled': (pluginId: string) => void;
  'plugin-updated': (pluginId: string, oldVersion: string, newVersion: string) => void;
  'plugin-error': (error: PluginError) => void;
  'plugin-health-changed': (pluginId: string, healthy: boolean) => void;
  'registry-updated': (availableUpdates: number) => void;
}