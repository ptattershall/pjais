// Plugin system types and interfaces

export type PluginState = 'installing' | 'starting' | 'running' | 'stopping' | 'stopped' | 'updating' | 'error' | 'uninstalling';

export interface PluginData {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: string[];
  enabled: boolean;
  manifest?: PluginManifest;
  installedAt?: Date;
  lastUpdated?: Date;
  state?: PluginState;
  dependencies?: Record<string, string>;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  permissions: Record<string, boolean>;
  main: string;
  icon?: string;
  dependencies?: Record<string, string>;
  engines?: {
    node?: string;
    electron?: string;
  };
  repository?: {
    type: string;
    url: string;
  };
  bugs?: {
    url: string;
  };
  license?: string;
  keywords?: string[];
  scripts?: Record<string, string>;
  updateUrl?: string;
}

export interface PluginPermission {
  name: string;
  description: string;
  required: boolean;
}

export interface PluginLifecycleHooks {
  onInstall?: () => Promise<void>;
  onUninstall?: () => Promise<void>;
  onEnable?: () => Promise<void>;
  onDisable?: () => Promise<void>;
  onUpdate?: (previousVersion: string) => Promise<void>;
  onHealthCheck?: () => Promise<boolean>;
}

export interface PluginExecutionContext {
  pluginId: string;
  version: string;
  config?: Record<string, any>;
  dataDir: string;
  tempDir: string;
  permissions: Record<string, boolean>;
  logger: {
    log: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
  };
}

export interface PluginError {
  pluginId: string;
  message: string;
  stack?: string;
  code?: string;
  timestamp: Date;
  recoverable: boolean;
}

export interface PluginUpdateManifest {
  version: string;
  changelog: string;
  downloadUrl: string;
  signature: string;
  critical: boolean;
  dependencies?: Record<string, string>;
  minVersion?: string;
  maxVersion?: string;
} 