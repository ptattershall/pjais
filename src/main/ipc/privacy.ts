import { IpcMain, IpcMainInvokeEvent } from 'electron';
import { PrivacyController } from '../services/privacy-controller';
import { SecurityEventLogger } from '../services/security-event-logger';
import { 
  EnhancedPrivacySettings, 
  ConsentRecord, 
  ConsentType, 
  DataSubjectRequest, 
  DataSubjectRightType,
  PrivacyTransparencyReport,
  DataType,
  LegalBasis,
  ConsentScope,
  ConsentGranularity
} from '../../shared/types/privacy';

/**
 * Privacy and Consent Management IPC Handlers
 * Provides secure interface for frontend privacy controls
 */
export class PrivacyIpcHandlers {
  constructor(
    private ipcMain: IpcMain,
    private privacyController: PrivacyController,
    private securityLogger: SecurityEventLogger
  ) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    console.log('Registering Privacy IPC handlers...');

    // Privacy Settings Handlers
    this.ipcMain.handle('privacy:get-settings', this.handleGetPrivacySettings.bind(this));
    this.ipcMain.handle('privacy:update-settings', this.handleUpdatePrivacySettings.bind(this));
    this.ipcMain.handle('privacy:reset-settings', this.handleResetPrivacySettings.bind(this));

    // Consent Management Handlers
    this.ipcMain.handle('privacy:grant-consent', this.handleGrantConsent.bind(this));
    this.ipcMain.handle('privacy:withdraw-consent', this.handleWithdrawConsent.bind(this));
    this.ipcMain.handle('privacy:get-consents', this.handleGetUserConsents.bind(this));
    this.ipcMain.handle('privacy:get-consent-history', this.handleGetConsentHistory.bind(this));

    // Data Subject Rights Handlers
    this.ipcMain.handle('privacy:submit-data-request', this.handleSubmitDataRequest.bind(this));
    this.ipcMain.handle('privacy:get-data-requests', this.handleGetDataRequests.bind(this));
    this.ipcMain.handle('privacy:process-data-request', this.handleProcessDataRequest.bind(this));

    // Privacy Transparency Handlers
    this.ipcMain.handle('privacy:generate-report', this.handleGeneratePrivacyReport.bind(this));
    this.ipcMain.handle('privacy:get-compliance-status', this.handleGetComplianceStatus.bind(this));
    this.ipcMain.handle('privacy:export-user-data', this.handleExportUserData.bind(this));

    // Privacy Education & Help
    this.ipcMain.handle('privacy:get-privacy-info', this.handleGetPrivacyInfo.bind(this));
    this.ipcMain.handle('privacy:get-consent-explanations', this.handleGetConsentExplanations.bind(this));

    console.log('Privacy IPC handlers registered successfully');
  }

  // =============================================================================
  // PRIVACY SETTINGS HANDLERS
  // =============================================================================

  private async handleGetPrivacySettings(
    event: IpcMainInvokeEvent, 
    userId: string
  ): Promise<{ success: boolean; data?: EnhancedPrivacySettings; error?: string }> {
    try {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'low',
        description: 'Privacy settings requested via IPC',
        timestamp: new Date(),
        details: { userId, action: 'get_settings' }
      });

      const settings = await this.privacyController.getPrivacySettings(userId);
      
      return { success: true, data: settings };
    } catch (error) {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'medium',
        description: 'Failed to get privacy settings via IPC',
        timestamp: new Date(),
        details: { userId, error: error instanceof Error ? error.message : String(error) }
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  private async handleUpdatePrivacySettings(
    event: IpcMainInvokeEvent, 
    userId: string, 
    updates: Partial<EnhancedPrivacySettings>
  ): Promise<{ success: boolean; data?: EnhancedPrivacySettings; error?: string }> {
    try {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'medium',
        description: 'Privacy settings update requested via IPC',
        timestamp: new Date(),
        details: { userId, action: 'update_settings', changes: Object.keys(updates) }
      });

      const updatedSettings = await this.privacyController.updatePrivacySettings(userId, updates);
      
      return { success: true, data: updatedSettings };
    } catch (error) {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'high',
        description: 'Failed to update privacy settings via IPC',
        timestamp: new Date(),
        details: { userId, error: error instanceof Error ? error.message : String(error) }
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update privacy settings' 
      };
    }
  }

  private async handleResetPrivacySettings(
    event: IpcMainInvokeEvent, 
    userId: string
  ): Promise<{ success: boolean; data?: EnhancedPrivacySettings; error?: string }> {
    try {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'medium',
        description: 'Privacy settings reset requested via IPC',
        timestamp: new Date(),
        details: { userId, action: 'reset_settings' }
      });

      // Reset to default settings by getting current and resetting key fields
      const currentSettings = await this.privacyController.getPrivacySettings(userId);
      const resetUpdates: Partial<EnhancedPrivacySettings> = {
        dataCollection: {
          conversationHistory: false,
          emotionalStates: false,
          behaviorPatterns: false,
          performanceMetrics: true,
          errorLogs: true,
          debugInformation: false
        },
        dataSharing: {
          communityFeatures: false,
          marketplaceAnalytics: false,
          researchParticipation: false,
          pluginDevelopers: false,
          thirdPartyIntegrations: false,
          federatedLearning: false
        },
        memorySettings: {
          ...currentSettings.memorySettings,
          longTermStorage: false,
          crossPersonaSharing: false,
          cloudBackup: false,
          automaticCleanup: true
        }
      };

      const resetSettings = await this.privacyController.updatePrivacySettings(userId, resetUpdates);
      
      return { success: true, data: resetSettings };
    } catch (error) {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'high',
        description: 'Failed to reset privacy settings via IPC',
        timestamp: new Date(),
        details: { userId, error: error instanceof Error ? error.message : String(error) }
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reset privacy settings' 
      };
    }
  }

  // =============================================================================
  // CONSENT MANAGEMENT HANDLERS
  // =============================================================================

  private async handleGrantConsent(
    event: IpcMainInvokeEvent,
    userId: string,
    consentType: ConsentType,
    dataTypes: DataType[],
    purpose: string,
    options: {
      expirationDays?: number;
      scope?: ConsentScope;
      granularity?: ConsentGranularity;
      legalBasis?: LegalBasis;
      personaId?: string;
    } = {}
  ): Promise<{ success: boolean; data?: ConsentRecord; error?: string }> {
    try {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'medium',
        description: 'Consent grant requested via IPC',
        timestamp: new Date(),
        details: { userId, action: 'grant_consent', consentType, dataTypes, purpose }
      });

      const consent = await this.privacyController.grantConsent(
        userId, 
        consentType, 
        dataTypes, 
        purpose, 
        options
      );
      
      return { success: true, data: consent };
    } catch (error) {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'high',
        description: 'Failed to grant consent via IPC',
        timestamp: new Date(),
        details: { userId, consentType, error: error instanceof Error ? error.message : String(error) }
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to grant consent' 
      };
    }
  }

  private async handleWithdrawConsent(
    event: IpcMainInvokeEvent,
    userId: string,
    consentId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'medium',
        description: 'Consent withdrawal requested via IPC',
        timestamp: new Date(),
        details: { userId, action: 'withdraw_consent', consentId, reason }
      });

      await this.privacyController.withdrawConsent(userId, consentId, reason);
      
      return { success: true };
    } catch (error) {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'high',
        description: 'Failed to withdraw consent via IPC',
        timestamp: new Date(),
        details: { userId, consentId, error: error instanceof Error ? error.message : String(error) }
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to withdraw consent' 
      };
    }
  }

  private async handleGetUserConsents(
    event: IpcMainInvokeEvent,
    userId: string
  ): Promise<{ success: boolean; data?: ConsentRecord[]; error?: string }> {
    try {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'low',
        description: 'User consents requested via IPC',
        timestamp: new Date(),
        details: { userId, action: 'get_consents' }
      });

      const consents = await this.privacyController.getUserConsents(userId);
      
      return { success: true, data: consents };
    } catch (error) {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'medium',
        description: 'Failed to get user consents via IPC',
        timestamp: new Date(),
        details: { userId, error: error instanceof Error ? error.message : String(error) }
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get consents' 
      };
    }
  }

  private async handleGetConsentHistory(
    event: IpcMainInvokeEvent,
    userId: string
  ): Promise<{ success: boolean; data?: ConsentRecord[]; error?: string }> {
    try {
      // For now, this is the same as getting all consents
      // In a full implementation, this might return additional historical data
      const consents = await this.privacyController.getUserConsents(userId);
      
      return { success: true, data: consents };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get consent history' 
      };
    }
  }

  // =============================================================================
  // DATA SUBJECT RIGHTS HANDLERS
  // =============================================================================

  private async handleSubmitDataRequest(
    event: IpcMainInvokeEvent,
    userId: string,
    requestType: DataSubjectRightType,
    description: string,
    options: {
      dataTypes?: DataType[];
      dateRange?: { startDate: Date; endDate: Date };
      specificData?: string[];
    } = {}
  ): Promise<{ success: boolean; data?: DataSubjectRequest; error?: string }> {
    try {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'medium',
        description: 'Data subject request submitted via IPC',
        timestamp: new Date(),
        details: { userId, action: 'submit_data_request', requestType, description }
      });

      const request = await this.privacyController.submitDataSubjectRequest(
        userId, 
        requestType, 
        description, 
        options
      );
      
      return { success: true, data: request };
    } catch (error) {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'high',
        description: 'Failed to submit data subject request via IPC',
        timestamp: new Date(),
        details: { userId, requestType, error: error instanceof Error ? error.message : String(error) }
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to submit data request' 
      };
    }
  }

  private async handleGetDataRequests(
    event: IpcMainInvokeEvent,
    userId: string
  ): Promise<{ success: boolean; data?: DataSubjectRequest[]; error?: string }> {
    try {
      // Placeholder implementation - would get user's data requests from database
      const requests: DataSubjectRequest[] = [];
      
      return { success: true, data: requests };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get data requests' 
      };
    }
  }

  private async handleProcessDataRequest(
    event: IpcMainInvokeEvent,
    requestId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'medium',
        description: 'Data request processing initiated via IPC',
        timestamp: new Date(),
        details: { action: 'process_data_request', requestId }
      });

      await this.privacyController.processDataSubjectRequest(requestId);
      
      return { success: true };
    } catch (error) {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'high',
        description: 'Failed to process data request via IPC',
        timestamp: new Date(),
        details: { requestId, error: error instanceof Error ? error.message : String(error) }
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process data request' 
      };
    }
  }

  // =============================================================================
  // PRIVACY TRANSPARENCY HANDLERS
  // =============================================================================

  private async handleGeneratePrivacyReport(
    event: IpcMainInvokeEvent,
    userId: string
  ): Promise<{ success: boolean; data?: PrivacyTransparencyReport; error?: string }> {
    try {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'low',
        description: 'Privacy transparency report requested via IPC',
        timestamp: new Date(),
        details: { userId, action: 'generate_privacy_report' }
      });

      const report = await this.privacyController.generatePrivacyReport(userId);
      
      return { success: true, data: report };
    } catch (error) {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'medium',
        description: 'Failed to generate privacy report via IPC',
        timestamp: new Date(),
        details: { userId, error: error instanceof Error ? error.message : String(error) }
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate privacy report' 
      };
    }
  }

  private async handleGetComplianceStatus(
    event: IpcMainInvokeEvent,
    userId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const complianceStatus = await this.privacyController.assessComplianceStatus(userId);
      
      return { success: true, data: complianceStatus };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get compliance status' 
      };
    }
  }

  private async handleExportUserData(
    event: IpcMainInvokeEvent,
    userId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'medium',
        description: 'User data export requested via IPC',
        timestamp: new Date(),
        details: { userId, action: 'export_user_data' }
      });

      // Placeholder implementation for data export
      const exportData = {
        exportId: `export_${userId}_${Date.now()}`,
        generatedAt: new Date(),
        format: 'json',
        size: '0 MB',
        downloadUrl: null,
        status: 'preparing'
      };
      
      return { success: true, data: exportData };
    } catch (error) {
      this.securityLogger.log({
        type: 'privacy_control',
        severity: 'high',
        description: 'Failed to export user data via IPC',
        timestamp: new Date(),
        details: { userId, error: error instanceof Error ? error.message : String(error) }
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to export user data' 
      };
    }
  }

  // =============================================================================
  // PRIVACY EDUCATION & HELP HANDLERS
  // =============================================================================

  private async handleGetPrivacyInfo(
    event: IpcMainInvokeEvent
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const privacyInfo = {
        frameworks: {
          GDPR: {
            name: 'General Data Protection Regulation',
            jurisdiction: 'European Union',
            description: 'Comprehensive data protection law for EU residents',
            rights: [
              'Right to access personal data',
              'Right to rectification',
              'Right to erasure (right to be forgotten)',
              'Right to restrict processing',
              'Right to data portability',
              'Right to object to processing'
            ]
          },
          CCPA: {
            name: 'California Consumer Privacy Act',
            jurisdiction: 'California, USA',
            description: 'Privacy law for California residents',
            rights: [
              'Right to know what personal information is collected',
              'Right to delete personal information',
              'Right to opt-out of sale of personal information',
              'Right to non-discrimination for exercising privacy rights'
            ]
          }
        },
        dataTypes: {
          'Conversation History': 'Records of your interactions with AI personas',
          'Emotional States': 'Information about emotional context and responses',
          'Behavioral Patterns': 'Analysis of how you interact with the system',
          'Performance Metrics': 'System performance and usage statistics',
          'Error Logs': 'Technical information about system errors',
          'Debug Information': 'Detailed technical data for troubleshooting'
        },
        consentTypes: {
          'Data Collection': 'Permission to collect specified types of personal data',
          'Data Processing': 'Permission to process and analyze collected data',
          'Data Sharing': 'Permission to share data with specified third parties',
          'Persona Training': 'Permission to use data for AI persona improvement',
          'Analytics Tracking': 'Permission to collect usage analytics',
          'Research Participation': 'Permission to use anonymized data for research'
        }
      };
      
      return { success: true, data: privacyInfo };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get privacy information' 
      };
    }
  }

  private async handleGetConsentExplanations(
    event: IpcMainInvokeEvent
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const explanations = {
        purposes: {
          'Essential Operations': 'Required for basic functionality of the application',
          'Performance Improvement': 'Used to improve application performance and user experience',
          'Feature Enhancement': 'Used to develop new features and improve existing ones',
          'Security Monitoring': 'Used to protect against security threats and ensure system integrity',
          'Research and Development': 'Used for anonymized research to advance AI technology',
          'Legal Compliance': 'Required to comply with applicable laws and regulations'
        },
        legalBases: {
          'Consent': 'Processing based on your explicit consent',
          'Contract': 'Processing necessary for contract performance',
          'Legal Obligation': 'Processing required by law',
          'Vital Interests': 'Processing necessary to protect vital interests',
          'Public Task': 'Processing for tasks in the public interest',
          'Legitimate Interests': 'Processing for legitimate business interests'
        },
        retentionPeriods: {
          'Session Data': 'Deleted at end of session',
          'Short-term Data': 'Retained for 30 days',
          'Medium-term Data': 'Retained for 1 year',
          'Long-term Data': 'Retained for 7 years',
          'Permanent Data': 'Retained indefinitely (with user consent)'
        }
      };
      
      return { success: true, data: explanations };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get consent explanations' 
      };
    }
  }
} 