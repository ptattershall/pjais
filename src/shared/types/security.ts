export interface SecurityEvent {
  type: 'plugin_scan' | 'file_access' | 'network_access' | 'authentication' | 'ipc_action' | 'encryption' | 'data_access' | 'privacy_control' | 'security' | 'embedding';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface SecurityPolicy {
  allowUnsignedPlugins: boolean;
  maxPluginMemoryMB: number;
  maxFileSize: number;
  blockedDomains: string[];
  allowedFileExtensions: string[];
  encryptionRequired: boolean;
  dataRetentionDays: number;
  requireUserConsent: boolean;
}

// Encryption Framework Types
export interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  keyDerivation: 'pbkdf2';
  iterations: number;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  tagLength: number;
}

export interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt
  tag: string; // Base64 encoded authentication tag
  algorithm: string;
}

export interface KeyDerivationParams {
  salt: Buffer;
  iterations: number;
  keyLength: number;
  digest: string;
}

// Data Classification Types
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface DataClassificationRule {
  field: string;
  classification: DataClassification;
  encryptionRequired: boolean;
  retentionDays?: number;
}

export interface ClassifiedData {
  classification: DataClassification;
  data: unknown;
  metadata: {
    created: Date;
    lastAccessed: Date;
    accessCount: number;
    source: string;
  };
}

// Privacy Control Types
export interface PrivacySettings {
  dataCollection: boolean;
  analytics: boolean;
  errorReporting: boolean;
  personalDataProcessing: boolean;
  consentTimestamp?: Date;
  consentVersion: string;
}

export interface DataSubjectRequest {
  id: string;
  type: 'access' | 'portability' | 'deletion' | 'rectification' | 'restrict_processing';
  status: 'pending' | 'in_progress' | 'completed' | 'denied';
  requestedAt: Date;
  completedAt?: Date;
  details: Record<string, unknown>;
}

// GDPR/CCPA Compliance Types
export interface ComplianceReport {
  reportId: string;
  generatedAt: Date;
  dataSubjects: number;
  dataRequests: DataSubjectRequest[];
  retentionCompliance: boolean;
  encryptionCompliance: boolean;
  consentCompliance: boolean;
}

export interface AuditTrail {
  id: string;
  action: string;
  actor: string;
  resource: string;
  timestamp: Date;
  outcome: 'success' | 'failure';
  details: Record<string, unknown>;
} 