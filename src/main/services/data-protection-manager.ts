import { EncryptionService } from './encryption-service';
import { SecurityEventLogger } from './security-event-logger';
import { 
  DataClassification, 
  DataClassificationRule, 
  ClassifiedData,
  PrivacySettings, 
  DataSubjectRequest, 
  ComplianceReport,
  AuditTrail
} from '../../shared/types/security';
import * as crypto from 'crypto';

export class DataProtectionManager {
  private encryptionService: EncryptionService;
  private eventLogger: SecurityEventLogger;
  private classificationRules: Map<string, DataClassificationRule> = new Map();
  private privacySettings: PrivacySettings;
  private dataSubjectRequests: Map<string, DataSubjectRequest> = new Map();
  private auditTrail: AuditTrail[] = [];
  private isInitialized = false;

  constructor(encryptionService: EncryptionService, eventLogger: SecurityEventLogger) {
    this.encryptionService = encryptionService;
    this.eventLogger = eventLogger;
    this.privacySettings = this.getDefaultPrivacySettings();
    this.setupDefaultClassificationRules();
  }

  async initialize(): Promise<void> {
    console.log('Initializing DataProtectionManager...');
    
    try {
      // Load existing privacy settings and classification rules
      await this.loadPrivacySettings();
      await this.loadClassificationRules();
      await this.loadDataSubjectRequests();
      
      this.isInitialized = true;
      this.logAudit('initialization', 'system', 'DataProtectionManager', 'success', {
        classificationRules: this.classificationRules.size,
        privacySettings: this.privacySettings
      });
      
      console.log('DataProtectionManager initialized successfully');
    } catch (error) {
      this.eventLogger.log({
        type: 'data_access',
        severity: 'critical',
        description: 'Failed to initialize DataProtectionManager',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  async classifyAndProtectData(data: any, context: string, source: string): Promise<ClassifiedData> {
    this.ensureInitialized();
    
    const classification = this.classifyData(data, context);
    const rule = this.classificationRules.get(context) || this.getDefaultRule(classification);
    
    let protectedData = data;
    
    // Encrypt if required by classification rule
    if (rule.encryptionRequired && classification !== 'public') {
      protectedData = await this.encryptionService.encrypt(data, classification);
      
      this.eventLogger.log({
        type: 'data_access',
        severity: 'low',
        description: `Data encrypted due to classification: ${classification}`,
        timestamp: new Date(),
        details: { context, classification, encrypted: true }
      });
    }
    
    const classifiedData: ClassifiedData = {
      classification,
      data: protectedData,
      metadata: {
        created: new Date(),
        lastAccessed: new Date(),
        accessCount: 1,
        source
      }
    };
    
    this.logAudit('data_classification', source, context, 'success', {
      classification,
      encrypted: rule.encryptionRequired,
      dataSize: JSON.stringify(data).length
    });
    
    return classifiedData;
  }

  async accessClassifiedData(classifiedData: ClassifiedData, accessor: string): Promise<any> {
    this.ensureInitialized();
    
    // Update access metadata
    classifiedData.metadata.lastAccessed = new Date();
    classifiedData.metadata.accessCount++;
    
    let result = classifiedData.data;
    
    // Decrypt if data is encrypted
    if (this.isEncryptedData(classifiedData.data)) {
      result = await this.encryptionService.decrypt(classifiedData.data);
      
      this.eventLogger.log({
        type: 'data_access',
        severity: 'medium',
        description: `Classified data decrypted for access: ${classifiedData.classification}`,
        timestamp: new Date(),
        details: { 
          classification: classifiedData.classification,
          accessor,
          accessCount: classifiedData.metadata.accessCount
        }
      });
    }
    
    this.logAudit('data_access', accessor, 'classified_data', 'success', {
      classification: classifiedData.classification,
      accessCount: classifiedData.metadata.accessCount
    });
    
    return result;
  }

  async submitDataSubjectRequest(type: DataSubjectRequest['type'], details: Record<string, any>): Promise<string> {
    this.ensureInitialized();
    
    const requestId = crypto.randomUUID();
    const request: DataSubjectRequest = {
      id: requestId,
      type,
      status: 'pending',
      requestedAt: new Date(),
      details
    };
    
    this.dataSubjectRequests.set(requestId, request);
    
    this.eventLogger.log({
      type: 'privacy_control',
      severity: 'medium',
      description: `Data subject request submitted: ${type}`,
      timestamp: new Date(),
      details: { requestId, type, details }
    });
    
    this.logAudit('data_subject_request', 'data_subject', requestId, 'success', {
      type,
      requestId
    });
    
    return requestId;
  }

  async processDataSubjectRequest(requestId: string): Promise<void> {
    this.ensureInitialized();
    
    const request = this.dataSubjectRequests.get(requestId);
    if (!request) {
      throw new Error(`Data subject request not found: ${requestId}`);
    }
    
    request.status = 'in_progress';
    
    try {
      switch (request.type) {
        case 'access':
          await this.generateDataAccessReport(request);
          break;
        case 'portability':
          await this.generateDataPortabilityExport(request);
          break;
        case 'deletion':
          await this.processDataDeletion(request);
          break;
        case 'rectification':
          await this.processDataRectification(request);
          break;
        case 'restrict_processing':
          await this.restrictDataProcessing(request);
          break;
      }
      
      request.status = 'completed';
      request.completedAt = new Date();
      
      this.logAudit('data_subject_request_processed', 'system', requestId, 'success', {
        type: request.type,
        processingTime: request.completedAt.getTime() - request.requestedAt.getTime()
      });
      
    } catch (error) {
      request.status = 'denied';
      
      this.eventLogger.log({
        type: 'privacy_control',
        severity: 'high',
        description: `Failed to process data subject request: ${request.type}`,
        timestamp: new Date(),
        details: { 
          requestId, 
          type: request.type,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      this.logAudit('data_subject_request_failed', 'system', requestId, 'failure', {
        type: request.type,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    await this.persistDataSubjectRequests();
  }

  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<void> {
    this.ensureInitialized();
    
    const oldSettings = { ...this.privacySettings };
    this.privacySettings = { ...this.privacySettings, ...settings };
    
    // Update consent timestamp if consent-related settings changed
    if (settings.dataCollection !== undefined || 
        settings.personalDataProcessing !== undefined) {
      this.privacySettings.consentTimestamp = new Date();
    }
    
    this.eventLogger.log({
      type: 'privacy_control',
      severity: 'medium',
      description: 'Privacy settings updated',
      timestamp: new Date(),
      details: { oldSettings, newSettings: this.privacySettings }
    });
    
    this.logAudit('privacy_settings_update', 'user', 'privacy_settings', 'success', {
      changes: settings,
      consentUpdated: settings.dataCollection !== undefined || settings.personalDataProcessing !== undefined
    });
  }

  async generateComplianceReport(): Promise<ComplianceReport> {
    this.ensureInitialized();
    
    const report: ComplianceReport = {
      reportId: crypto.randomUUID(),
      generatedAt: new Date(),
      dataSubjects: 1, // In a single-user app, this would be 1
      dataRequests: Array.from(this.dataSubjectRequests.values()),
      retentionCompliance: await this.checkRetentionCompliance(),
      encryptionCompliance: await this.checkEncryptionCompliance(),
      consentCompliance: this.checkConsentCompliance()
    };
    
    this.logAudit('compliance_report_generated', 'system', 'compliance', 'success', {
      reportId: report.reportId,
      totalRequests: report.dataRequests.length
    });
    
    return report;
  }

  getPrivacySettings(): PrivacySettings {
    return { ...this.privacySettings };
  }

  getDataSubjectRequests(): DataSubjectRequest[] {
    return Array.from(this.dataSubjectRequests.values());
  }

  getAuditTrail(limit: number = 100): AuditTrail[] {
    return this.auditTrail
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  private classifyData(data: any, context: string): DataClassification {
    // Check for explicit classification rules
    const rule = this.classificationRules.get(context);
    if (rule) {
      return rule.classification;
    }
    
    // Auto-classify based on data content
    const dataString = JSON.stringify(data).toLowerCase();
    
    // Check for PII patterns
    if (this.containsPII(dataString)) {
      return 'restricted';
    }
    
    // Check for sensitive information
    if (this.containsSensitiveInfo(dataString)) {
      return 'confidential';
    }
    
    // Check for internal data patterns
    if (context.includes('internal') || context.includes('private')) {
      return 'internal';
    }
    
    return 'public';
  }

  private containsPII(data: string): boolean {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email pattern
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card pattern
      /\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/, // Phone number pattern
    ];
    
    return piiPatterns.some(pattern => pattern.test(data));
  }

  private containsSensitiveInfo(data: string): boolean {
    const sensitiveKeywords = [
      'password', 'secret', 'key', 'token', 'credential',
      'confidential', 'private', 'sensitive', 'restricted'
    ];
    
    return sensitiveKeywords.some(keyword => data.includes(keyword));
  }

  private isEncryptedData(data: any): boolean {
    return data && 
           typeof data === 'object' && 
           'data' in data && 
           'iv' in data && 
           'salt' in data && 
           'tag' in data && 
           'algorithm' in data;
  }

  private setupDefaultClassificationRules(): void {
    const defaultRules: Array<{field: string, rule: DataClassificationRule}> = [
      {
        field: 'user_credentials',
        rule: { field: 'user_credentials', classification: 'restricted', encryptionRequired: true, retentionDays: 365 }
      },
      {
        field: 'personal_data',
        rule: { field: 'personal_data', classification: 'restricted', encryptionRequired: true, retentionDays: 730 }
      },
      {
        field: 'system_logs',
        rule: { field: 'system_logs', classification: 'internal', encryptionRequired: false, retentionDays: 90 }
      },
      {
        field: 'app_settings',
        rule: { field: 'app_settings', classification: 'confidential', encryptionRequired: true, retentionDays: 365 }
      }
    ];
    
    defaultRules.forEach(({ field, rule }) => {
      this.classificationRules.set(field, rule);
    });
  }

  private getDefaultRule(classification: DataClassification): DataClassificationRule {
    return {
      field: 'default',
      classification,
      encryptionRequired: classification !== 'public',
      retentionDays: classification === 'restricted' ? 365 : 730
    };
  }

  private getDefaultPrivacySettings(): PrivacySettings {
    return {
      dataCollection: false,
      analytics: false,
      errorReporting: true,
      personalDataProcessing: false,
      consentVersion: '1.0'
    };
  }

  private async generateDataAccessReport(request: DataSubjectRequest): Promise<void> {
    // In a real implementation, this would collect all data associated with the data subject
    console.log(`Generating data access report for request: ${request.id}`);
    
    // Simulate data collection process
    request.details.reportGenerated = true;
    request.details.dataCollected = {
      personalData: 'simulation',
      systemLogs: 'simulation',
      preferences: 'simulation'
    };
  }

  private async generateDataPortabilityExport(request: DataSubjectRequest): Promise<void> {
    // In a real implementation, this would export all data in a portable format
    console.log(`Generating data portability export for request: ${request.id}`);
    
    request.details.exportGenerated = true;
    request.details.exportFormat = 'JSON';
    request.details.exportSize = '1.2MB (simulated)';
  }

  private async processDataDeletion(request: DataSubjectRequest): Promise<void> {
    // In a real implementation, this would securely delete all data associated with the data subject
    console.log(`Processing data deletion for request: ${request.id}`);
    
    request.details.dataDeleted = true;
    request.details.deletionTimestamp = new Date();
  }

  private async processDataRectification(request: DataSubjectRequest): Promise<void> {
    console.log(`Processing data rectification for request: ${request.id}`);
    
    request.details.rectificationProcessed = true;
    request.details.fieldsUpdated = request.details.fieldsToUpdate || [];
  }

  private async restrictDataProcessing(request: DataSubjectRequest): Promise<void> {
    console.log(`Restricting data processing for request: ${request.id}`);
    
    request.details.processingRestricted = true;
    request.details.restrictionTimestamp = new Date();
  }

  private async checkRetentionCompliance(): Promise<boolean> {
    return true; // Simplified for this implementation
  }

  private async checkEncryptionCompliance(): Promise<boolean> {
    return this.encryptionService.isEncryptionAvailable();
  }

  private checkConsentCompliance(): boolean {
    const hasValidConsent = this.privacySettings.consentTimestamp && 
                           this.privacySettings.personalDataProcessing;
    return Boolean(hasValidConsent);
  }

  private logAudit(action: string, actor: string, resource: string, outcome: 'success' | 'failure', details: Record<string, any>): void {
    const auditEntry: AuditTrail = {
      id: crypto.randomUUID(),
      action,
      actor,
      resource,
      timestamp: new Date(),
      outcome,
      details
    };
    
    this.auditTrail.push(auditEntry);
    
    // Keep only last 1000 audit entries in memory
    if (this.auditTrail.length > 1000) {
      this.auditTrail = this.auditTrail.slice(-500);
    }
  }

  private async loadPrivacySettings(): Promise<void> {
    console.log('Loading privacy settings (simulation)');
  }

  private async loadClassificationRules(): Promise<void> {
    console.log('Loading classification rules (simulation)');
  }

  private async loadDataSubjectRequests(): Promise<void> {
    console.log('Loading data subject requests (simulation)');
  }

  private async persistDataSubjectRequests(): Promise<void> {
    // In a real implementation, this would save to secure storage
    console.log('Persisting data subject requests (simulation)');
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('DataProtectionManager not initialized');
    }
  }
} 