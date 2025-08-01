import { ServiceHealth } from '../../../shared/types/system';

export interface SecurityEvent {
  id: string;
  type: 'access' | 'validation' | 'encryption' | 'audit' | 'threat';
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  userId?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityRule {
  id: string;
  type: 'access' | 'validation' | 'encryption' | 'audit';
  condition: string;
  action: 'allow' | 'deny' | 'audit' | 'encrypt';
  priority: number;
  metadata?: Record<string, unknown>;
}

export interface SecurityScanResult {
  id: string;
  resourceId: string;
  resourceType: 'memory' | 'persona' | 'plugin' | 'file';
  status: 'safe' | 'warning' | 'dangerous' | 'blocked';
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    description: string;
    remediation?: string;
  }>;
  scanDate: Date;
  scanDuration: number;
}

export interface ISecurityManager {
  // Lifecycle management
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  isInitialized(): boolean;

  // Event logging
  logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void>;
  getSecurityEvents(filters?: {
    type?: SecurityEvent['type'];
    level?: SecurityEvent['level'];
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    limit?: number;
  }): Promise<SecurityEvent[]>;

  // Policy management
  createPolicy(policy: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecurityPolicy>;
  updatePolicy(id: string, updates: Partial<SecurityPolicy>): Promise<SecurityPolicy>;
  deletePolicy(id: string): Promise<void>;
  getPolicy(id: string): Promise<SecurityPolicy | null>;
  getAllPolicies(): Promise<SecurityPolicy[]>;
  enablePolicy(id: string): Promise<void>;
  disablePolicy(id: string): Promise<void>;

  // Access control
  checkAccess(userId: string, resourceId: string, action: string): Promise<boolean>;
  grantAccess(userId: string, resourceId: string, permissions: string[]): Promise<void>;
  revokeAccess(userId: string, resourceId: string, permissions?: string[]): Promise<void>;

  // Content validation
  validateContent(content: string, type: 'memory' | 'persona' | 'plugin'): Promise<{
    isValid: boolean;
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
    }>;
  }>;

  // Security scanning
  scanResource(resourceId: string, resourceType: 'memory' | 'persona' | 'plugin' | 'file'): Promise<SecurityScanResult>;
  getBulkScanResults(resourceIds: string[]): Promise<SecurityScanResult[]>;
  schedulePeriodicScan(resourceId: string, intervalMs: number): Promise<string>;
  cancelPeriodicScan(scanId: string): Promise<void>;

  // Threat detection
  detectAnomalies(data: unknown[]): Promise<Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedResources: string[];
    recommendations: string[];
  }>>;

  // Audit trail
  getAuditLog(filters?: {
    userId?: string;
    resourceId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Array<{
    id: string;
    userId: string;
    resourceId: string;
    action: string;
    timestamp: Date;
    success: boolean;
    details?: Record<string, unknown>;
  }>>;

  // Security metrics
  getSecurityMetrics(): Promise<{
    totalEvents: number;
    criticalEvents: number;
    blockedAttempts: number;
    activePolicies: number;
    averageResponseTime: number;
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;

  // Health monitoring
  getHealthStatus(): Promise<ServiceHealth>;
}