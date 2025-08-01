// System types and interfaces

export interface SystemInfo {
  app: string;
  electron: string;
  node: string;
  chrome: string;
  platform: string;
}

export interface SecurityEvent {
  type: 'plugin_scan' | 'file_access' | 'network_access' | 'authentication';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface SecurityPolicy {
  allowUnsignedPlugins: boolean;
  maxPluginMemoryMB: number;
  maxFileSize: number;
  blockedDomains: string[];
  allowedFileExtensions: string[];
}

export type ServiceStatus = 'ok' | 'initializing' | 'degraded' | 'error';

export interface ServiceHealth {
  service: string;
  status: ServiceStatus;
  details?: Record<string, any>;
}

export interface SystemHealthReport {
  overallStatus: ServiceStatus;
  services: ServiceHealth[];
  timestamp: Date;
} 