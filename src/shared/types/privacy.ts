// Enhanced Privacy Controls & Consent Management Types

export interface EnhancedPrivacySettings {
  id: string;
  userId: string;
  
  // Core data collection controls
  dataCollection: {
    conversationHistory: boolean;
    emotionalStates: boolean;
    behaviorPatterns: boolean;
    performanceMetrics: boolean;
    errorLogs: boolean;
    debugInformation: boolean;
  };
  
  // Data sharing and community controls
  dataSharing: {
    communityFeatures: boolean;
    marketplaceAnalytics: boolean;
    researchParticipation: boolean;
    pluginDevelopers: boolean;
    thirdPartyIntegrations: boolean;
    federatedLearning: boolean;
  };
  
  // Memory and storage settings
  memorySettings: {
    longTermStorage: boolean;
    crossPersonaSharing: boolean;
    cloudBackup: boolean;
    encryptionLevel: 'basic' | 'enhanced' | 'maximum';
    retentionPeriodDays: number;
    automaticCleanup: boolean;
  };
  
  // Communication preferences
  communication: {
    systemNotifications: boolean;
    privacyUpdates: boolean;
    consentReminders: boolean;
    dataReports: boolean;
    marketingCommunications: boolean;
    securityAlerts: boolean;
  };
  
  // Advanced privacy controls
  advanced: {
    dataPortability: boolean;
    rightToErasure: boolean;
    dataMinimization: boolean;
    pseudonymization: boolean;
    consentWithdrawalEnabled: boolean;
    dataProcessingTransparency: boolean;
  };
  
  // Legal compliance framework
  compliance: {
    framework: 'GDPR' | 'CCPA' | 'PIPEDA' | 'LGPD' | 'AUTO_DETECT';
    jurisdiction: string;
    consentVersion: string;
    dataProcessorAgreement: boolean;
    lawfulBasisProcessing: LegalBasis;
  };
  
  metadata: {
    createdAt: Date;
    lastModified: Date;
    version: number;
    lastConsentReview: Date;
  };
}

export interface ConsentRecord {
  id: string;
  userId: string;
  personaId?: string;
  
  // Consent details
  consentType: ConsentType;
  purpose: string;
  dataTypes: DataType[];
  processingScope: ConsentScope;
  granularity: ConsentGranularity;
  
  // Permissions granted
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
    share: boolean;
    analyze: boolean;
    backup: boolean;
    transfer: boolean;
  };
  
  // Consent lifecycle
  status: 'active' | 'withdrawn' | 'expired' | 'revoked' | 'superseded';
  grantedAt: Date;
  expiresAt?: Date;
  withdrawnAt?: Date;
  lastModified: Date;
  
  // Context and conditions
  conditions: ConsentCondition[];
  restrictions: DataRestriction[];
  auditTrail: ConsentAuditEntry[];
  
  // Legal basis and compliance
  legalBasis: LegalBasis;
  jurisdiction: string;
  complianceFrameworks: string[];
  dataProcessorInfo?: DataProcessorInfo;
  
  metadata: {
    version: number;
    source: 'user' | 'system' | 'migration' | 'import';
    ipAddress?: string;
    userAgent?: string;
    automaticRenewal: boolean;
  };
}

export enum ConsentType {
  DATA_COLLECTION = 'data_collection',
  DATA_PROCESSING = 'data_processing',
  DATA_SHARING = 'data_sharing',
  PERSONA_TRAINING = 'persona_training',
  MARKETPLACE_USAGE = 'marketplace_usage',
  COMMUNITY_PARTICIPATION = 'community_participation',
  ANALYTICS_TRACKING = 'analytics_tracking',
  PLUGIN_ACCESS = 'plugin_access',
  THIRD_PARTY_INTEGRATION = 'third_party_integration',
  RESEARCH_PARTICIPATION = 'research_participation'
}

export enum DataType {
  PERSONAL_INFORMATION = 'personal_information',
  CONVERSATION_HISTORY = 'conversation_history',
  EMOTIONAL_DATA = 'emotional_data',
  BEHAVIORAL_PATTERNS = 'behavioral_patterns',
  PERFORMANCE_METRICS = 'performance_metrics',
  SYSTEM_LOGS = 'system_logs',
  BIOMETRIC_DATA = 'biometric_data',
  LOCATION_DATA = 'location_data',
  DEVICE_INFORMATION = 'device_information',
  USAGE_ANALYTICS = 'usage_analytics'
}

export enum ConsentScope {
  SINGLE_SESSION = 'single_session',
  LIMITED_TIME = 'limited_time',
  ONGOING = 'ongoing',
  SPECIFIC_PURPOSE = 'specific_purpose',
  BROAD_PURPOSE = 'broad_purpose'
}

export enum ConsentGranularity {
  MINIMAL = 'minimal',
  STANDARD = 'standard',
  DETAILED = 'detailed',
  COMPREHENSIVE = 'comprehensive'
}

export enum LegalBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests'
}

export interface ConsentCondition {
  id: string;
  type: 'time_limit' | 'purpose_limit' | 'data_limit' | 'access_limit';
  description: string;
  parameters: Record<string, any>;
  enforceable: boolean;
}

export interface DataRestriction {
  id: string;
  type: 'processing' | 'sharing' | 'storage' | 'access';
  description: string;
  scope: string[];
  enforcementLevel: 'advisory' | 'mandatory';
}

export interface ConsentAuditEntry {
  id: string;
  action: 'granted' | 'withdrawn' | 'modified' | 'expired' | 'renewed';
  timestamp: Date;
  userId: string;
  reason?: string;
  previousState?: any;
  newState?: any;
  details: Record<string, any>;
}

export interface DataProcessorInfo {
  name: string;
  organization: string;
  contactInfo: string;
  dataProcessingAgreement: string;
  certifications: string[];
}

// Data Subject Rights Types
export interface DataSubjectRequest {
  id: string;
  userId: string;
  type: DataSubjectRightType;
  status: DataRequestStatus;
  requestedAt: Date;
  completedAt?: Date;
  
  // Request details
  description: string;
  dataTypes?: DataType[];
  dateRange?: DateRange;
  specificData?: string[];
  
  // Processing information
  processingNotes: string[];
  verificationRequired: boolean;
  verificationCompleted: boolean;
  
  // Results
  responseData?: any;
  actionsTaken: DataSubjectAction[];
  
  metadata: {
    requestMethod: 'web' | 'email' | 'phone' | 'mail';
    urgency: 'low' | 'medium' | 'high';
    complexity: 'simple' | 'moderate' | 'complex';
  };
}

export enum DataSubjectRightType {
  ACCESS = 'access',                    // Right to access personal data
  PORTABILITY = 'portability',          // Right to data portability
  RECTIFICATION = 'rectification',      // Right to rectify inaccurate data
  ERASURE = 'erasure',                  // Right to be forgotten
  RESTRICT_PROCESSING = 'restrict_processing', // Right to restrict processing
  OBJECT_PROCESSING = 'object_processing',     // Right to object to processing
  WITHDRAW_CONSENT = 'withdraw_consent',       // Right to withdraw consent
  AUTOMATED_DECISION = 'automated_decision'    // Rights related to automated decision-making
}

export enum DataRequestStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  VERIFICATION_REQUIRED = 'verification_required',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DENIED = 'denied',
  PARTIALLY_COMPLETED = 'partially_completed'
}

export interface DataSubjectAction {
  type: 'data_exported' | 'data_deleted' | 'data_anonymized' | 'consent_withdrawn' | 'processing_restricted';
  description: string;
  executedAt: Date;
  affectedRecords: number;
  details: Record<string, any>;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Privacy Transparency Types
export interface PrivacyTransparencyReport {
  userId: string;
  reportId: string;
  generatedAt: Date;
  reportPeriod: DateRange;
  
  summary: {
    totalDataPoints: number;
    dataTypesCollected: DataType[];
    processingPurposes: string[];
    sharingPartners: string[];
    consentChanges: number;
  };
  
  dataProcessingActivities: DataProcessingActivity[];
  consentHistory: ConsentRecord[];
  dataSubjectRequests: DataSubjectRequest[];
  complianceStatus: ComplianceStatus;
  
  recommendations: PrivacyRecommendation[];
  nextReviewDate: Date;
}

export interface DataProcessingActivity {
  id: string;
  activityType: string;
  dataTypes: DataType[];
  purpose: string;
  legalBasis: LegalBasis;
  
  processingDetails: {
    automated: boolean;
    humanReview: boolean;
    dataRetention: number;
    securityMeasures: string[];
  };
  
  dataFlow: {
    source: string;
    destination: string;
    transformations: string[];
    thirdPartyInvolvement: boolean;
  };
  
  timestamp: Date;
  consentId?: string;
}

export interface ComplianceStatus {
  overall: 'compliant' | 'non_compliant' | 'partially_compliant' | 'under_review';
  gdprCompliance: boolean;
  ccpaCompliance: boolean;
  dataRetentionCompliance: boolean;
  consentManagementCompliance: boolean;
  securityCompliance: boolean;
  
  issues: ComplianceIssue[];
  lastAuditDate: Date;
  nextAuditDate: Date;
}

export interface ComplianceIssue {
  id: string;
  type: 'consent' | 'retention' | 'security' | 'access' | 'portability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendedAction: string;
  deadline?: Date;
}

export interface PrivacyRecommendation {
  id: string;
  type: 'settings' | 'consent' | 'data_cleanup' | 'security';
  title: string;
  description: string;
  impact: 'privacy_enhancement' | 'compliance_improvement' | 'security_boost';
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
}

// Privacy by Design Framework Types
export interface PrivacyByDesignAssessment {
  assessmentId: string;
  projectId: string;
  conductedBy: string;
  conductedAt: Date;
  
  principles: {
    proactiveNotReactive: PrivacyPrincipleAssessment;
    privacyAsDefault: PrivacyPrincipleAssessment;
    privacyEmbedded: PrivacyPrincipleAssessment;
    fullFunctionality: PrivacyPrincipleAssessment;
    endToEndSecurity: PrivacyPrincipleAssessment;
    visibilityTransparency: PrivacyPrincipleAssessment;
    respectUserPrivacy: PrivacyPrincipleAssessment;
  };
  
  overallScore: number;
  recommendations: string[];
  actionItems: PrivacyActionItem[];
}

export interface PrivacyPrincipleAssessment {
  score: number; // 0-100
  evidence: string[];
  gaps: string[];
  recommendations: string[];
}

export interface PrivacyActionItem {
  id: string;
  principle: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  deadline: Date;
  assignee?: string;
} 