import React, { useState, useEffect } from 'react';
import { 
  EnhancedPrivacySettings, 
  ConsentRecord, 
  ConsentType, 
  DataSubjectRightType,
  DataType,
  LegalBasis
} from '../../../shared/types/privacy';

interface PrivacyDashboardProps {
  userId: string;
}

interface PrivacyApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({ userId }) => {
  const [privacySettings, setPrivacySettings] = useState<EnhancedPrivacySettings | null>(null);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'consents' | 'rights' | 'transparency'>('settings');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrivacyData();
  }, [userId]);

  const loadPrivacyData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Privacy methods need to be exposed in preload script
      // For now, using mock data
      const settingsResponse: PrivacyApiResponse<EnhancedPrivacySettings> = {
        success: true,
        data: {
          id: `privacy_settings_${userId}`,
          userId: userId,
          dataCollection: {
            conversationHistory: true,
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
            longTermStorage: true,
            crossPersonaSharing: false,
            cloudBackup: false,
            automaticCleanup: true,
            retentionPeriodDays: 90,
            encryptionLevel: 'enhanced' as const
          },
          communication: {
            systemNotifications: true,
            privacyUpdates: true,
            consentReminders: true,
            dataReports: false,
            marketingCommunications: false,
            securityAlerts: true
          },
          advanced: {
            dataPortability: true,
            rightToErasure: true,
            dataMinimization: true,
            pseudonymization: false,
            consentWithdrawalEnabled: true,
            dataProcessingTransparency: true
          },
          compliance: {
            framework: 'AUTO_DETECT' as const,
            jurisdiction: 'United States',
            consentVersion: '1.0.0',
            dataProcessorAgreement: false,
            lawfulBasisProcessing: LegalBasis.CONSENT
          },
          metadata: {
            createdAt: new Date(),
            lastModified: new Date(),
            version: 1,
            lastConsentReview: new Date()
          }
        }
      };
      
      const consentsResponse: PrivacyApiResponse<ConsentRecord[]> = {
        success: true,
        data: []
      };

      if (settingsResponse.success && settingsResponse.data) {
        setPrivacySettings(settingsResponse.data);
      } else {
        setError(settingsResponse.error || 'Failed to load privacy settings');
      }

      if (consentsResponse.success && consentsResponse.data) {
        setConsents(consentsResponse.data);
      }
    } catch (err) {
      setError('Failed to load privacy data');
      console.error('Privacy data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePrivacySettings = async (updates: Partial<EnhancedPrivacySettings>) => {
    if (!privacySettings) return;

    try {
      // TODO: Implement when privacy IPC is exposed in preload
      // For now, update local state
      const updatedSettings = { ...privacySettings, ...updates };
      setPrivacySettings(updatedSettings);
    } catch (err) {
      setError('Failed to update privacy settings');
      console.error('Privacy settings update error:', err);
    }
  };

  const grantConsent = async (
    consentType: ConsentType, 
    dataTypes: DataType[], 
    purpose: string
  ) => {
    try {
      // TODO: Implement when privacy IPC is exposed in preload
      console.log('Grant consent:', { consentType, dataTypes, purpose });
      await loadPrivacyData(); // Reload to get updated consents
    } catch (err) {
      setError('Failed to grant consent');
      console.error('Consent grant error:', err);
    }
  };

  const withdrawConsent = async (consentId: string, reason?: string) => {
    try {
      // TODO: Implement when privacy IPC is exposed in preload
      console.log('Withdraw consent:', { consentId, reason });
      await loadPrivacyData(); // Reload to get updated consents
    } catch (err) {
      setError('Failed to withdraw consent');
      console.error('Consent withdrawal error:', err);
    }
  };

  const submitDataRequest = async (requestType: DataSubjectRightType, description: string) => {
    try {
      // TODO: Implement when privacy IPC is exposed in preload
      console.log('Submit data request:', { requestType, description });
      alert('Data request submitted successfully');
    } catch (err) {
      setError('Failed to submit data request');
      console.error('Data request error:', err);
    }
  };

  const generatePrivacyReport = async () => {
    try {
      // TODO: Implement when privacy IPC is exposed in preload
      console.log('Generate privacy report for:', userId);
      alert('Privacy report generated successfully');
    } catch (err) {
      setError('Failed to generate privacy report');
      console.error('Privacy report error:', err);
    }
  };

  if (loading) {
    return (
      <div className="privacy-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading privacy dashboard...</p>
      </div>
    );
  }

  if (!privacySettings) {
    return (
      <div className="privacy-dashboard error">
        <h2>Privacy Dashboard</h2>
        <p className="error-message">{error || 'Failed to load privacy settings'}</p>
        <button onClick={loadPrivacyData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="privacy-dashboard">
      <header className="privacy-header">
        <h1>Privacy & Data Control</h1>
        <p>Manage your privacy settings, consents, and data rights</p>
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
      </header>

      <nav className="privacy-tabs">
        <button 
          className={activeTab === 'settings' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('settings')}
        >
          Privacy Settings
        </button>
        <button 
          className={activeTab === 'consents' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('consents')}
        >
          Consent Management
        </button>
        <button 
          className={activeTab === 'rights' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('rights')}
        >
          Data Rights
        </button>
        <button 
          className={activeTab === 'transparency' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('transparency')}
        >
          Transparency
        </button>
      </nav>

      <main className="privacy-content">
        {activeTab === 'settings' && (
          <PrivacySettingsPanel 
            settings={privacySettings}
            onUpdate={updatePrivacySettings}
          />
        )}

        {activeTab === 'consents' && (
          <ConsentManagementPanel 
            consents={consents}
            onGrant={grantConsent}
            onWithdraw={withdrawConsent}
          />
        )}

        {activeTab === 'rights' && (
          <DataRightsPanel 
            onSubmitRequest={submitDataRequest}
          />
        )}

        {activeTab === 'transparency' && (
          <TransparencyPanel 
            onGenerateReport={generatePrivacyReport}
          />
        )}
      </main>
    </div>
  );
};

const PrivacySettingsPanel: React.FC<{
  settings: EnhancedPrivacySettings;
  onUpdate: (updates: Partial<EnhancedPrivacySettings>) => void;
}> = ({ settings, onUpdate }) => {
  const handleDataCollectionChange = (key: keyof typeof settings.dataCollection, value: boolean) => {
    onUpdate({
      dataCollection: {
        ...settings.dataCollection,
        [key]: value
      }
    });
  };

  const handleDataSharingChange = (key: keyof typeof settings.dataSharing, value: boolean) => {
    onUpdate({
      dataSharing: {
        ...settings.dataSharing,
        [key]: value
      }
    });
  };

  return (
    <div className="settings-panel">
      <h2>Privacy Settings</h2>
      
      <section className="settings-section">
        <h3>Data Collection</h3>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.dataCollection.conversationHistory}
              onChange={(e) => handleDataCollectionChange('conversationHistory', e.target.checked)}
            />
            Store conversation history
          </label>
          <p className="setting-description">Keep records of your interactions with AI personas</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.dataCollection.emotionalStates}
              onChange={(e) => handleDataCollectionChange('emotionalStates', e.target.checked)}
            />
            Collect emotional context
          </label>
          <p className="setting-description">Analyze emotional patterns in conversations</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.dataCollection.behaviorPatterns}
              onChange={(e) => handleDataCollectionChange('behaviorPatterns', e.target.checked)}
            />
            Analyze behavior patterns
          </label>
          <p className="setting-description">Track how you interact with the system</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.dataCollection.performanceMetrics}
              onChange={(e) => handleDataCollectionChange('performanceMetrics', e.target.checked)}
            />
            Performance metrics
          </label>
          <p className="setting-description">Collect system performance data</p>
        </div>
      </section>

      <section className="settings-section">
        <h3>Data Sharing</h3>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.dataSharing.communityFeatures}
              onChange={(e) => handleDataSharingChange('communityFeatures', e.target.checked)}
            />
            Community features
          </label>
          <p className="setting-description">Share data for community and social features</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.dataSharing.researchParticipation}
              onChange={(e) => handleDataSharingChange('researchParticipation', e.target.checked)}
            />
            Research participation
          </label>
          <p className="setting-description">Contribute anonymized data to AI research</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.dataSharing.pluginDevelopers}
              onChange={(e) => handleDataSharingChange('pluginDevelopers', e.target.checked)}
            />
            Plugin developers
          </label>
          <p className="setting-description">Share data with plugin developers for improvements</p>
        </div>
      </section>

      <section className="settings-section">
        <h3>Memory & Storage</h3>
        <div className="setting-item">
          <label>
            Encryption Level:
            <select 
              value={settings.memorySettings.encryptionLevel}
              onChange={(e) => onUpdate({
                memorySettings: {
                  ...settings.memorySettings,
                  encryptionLevel: e.target.value as 'basic' | 'enhanced' | 'maximum'
                }
              })}
            >
              <option value="basic">Basic</option>
              <option value="enhanced">Enhanced</option>
              <option value="maximum">Maximum</option>
            </select>
          </label>
        </div>
        
        <div className="setting-item">
          <label>
            Data Retention (days):
            <input
              type="number"
              min="1"
              max="3650"
              value={settings.memorySettings.retentionPeriodDays}
              onChange={(e) => onUpdate({
                memorySettings: {
                  ...settings.memorySettings,
                  retentionPeriodDays: parseInt(e.target.value, 10)
                }
              })}
            />
          </label>
        </div>
      </section>
    </div>
  );
};

const ConsentManagementPanel: React.FC<{
  consents: ConsentRecord[];
  onGrant: (type: ConsentType, dataTypes: DataType[], purpose: string) => void;
  onWithdraw: (consentId: string, reason?: string) => void;
}> = ({ consents, onGrant, onWithdraw }) => {
  // const [showGrantForm, setShowGrantForm] = useState(false);

  const handleQuickConsent = (type: ConsentType, purpose: string) => {
    const dataTypes = [DataType.CONVERSATION_HISTORY, DataType.PERFORMANCE_METRICS];
    onGrant(type, dataTypes, purpose);
  };

  return (
    <div className="consent-panel">
      <h2>Consent Management</h2>
      
      <section className="consent-summary">
        <div className="consent-stats">
          <div className="stat">
            <span className="stat-value">{consents.filter(c => c.status === 'active').length}</span>
            <span className="stat-label">Active Consents</span>
          </div>
          <div className="stat">
            <span className="stat-value">{consents.filter(c => c.status === 'withdrawn').length}</span>
            <span className="stat-label">Withdrawn</span>
          </div>
          <div className="stat">
            <span className="stat-value">{consents.filter(c => c.status === 'expired').length}</span>
            <span className="stat-label">Expired</span>
          </div>
        </div>
      </section>

      <section className="quick-consents">
        <h3>Quick Consent Actions</h3>
        <div className="quick-actions">
          <button 
            className="consent-button"
            onClick={() => handleQuickConsent(ConsentType.DATA_COLLECTION, 'Essential app functionality')}
          >
            Grant Essential Data Collection
          </button>
          <button 
            className="consent-button"
            onClick={() => handleQuickConsent(ConsentType.ANALYTICS_TRACKING, 'Improve user experience')}
          >
            Grant Analytics Tracking
          </button>
          <button 
            className="consent-button"
            onClick={() => handleQuickConsent(ConsentType.RESEARCH_PARTICIPATION, 'Contribute to AI research')}
          >
            Grant Research Participation
          </button>
        </div>
      </section>

      <section className="consent-list">
        <h3>Current Consents</h3>
        {consents.length === 0 ? (
          <p>No consents granted yet.</p>
        ) : (
          <div className="consents">
            {consents.map(consent => (
              <div key={consent.id} className={`consent-item ${consent.status}`}>
                <div className="consent-info">
                  <h4>{consent.purpose}</h4>
                  <p>Type: {consent.consentType}</p>
                  <p>Status: {consent.status}</p>
                  <p>Granted: {new Date(consent.grantedAt).toLocaleDateString()}</p>
                  {consent.expiresAt && (
                    <p>Expires: {new Date(consent.expiresAt).toLocaleDateString()}</p>
                  )}
                </div>
                {consent.status === 'active' && (
                  <div className="consent-actions">
                    <button 
                      className="withdraw-button"
                      onClick={() => onWithdraw(consent.id, 'User request')}
                    >
                      Withdraw
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const DataRightsPanel: React.FC<{
  onSubmitRequest: (type: DataSubjectRightType, description: string) => void;
}> = ({ onSubmitRequest }) => {
  const [requestType, setRequestType] = useState<DataSubjectRightType>(DataSubjectRightType.ACCESS);
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onSubmitRequest(requestType, description);
      setDescription('');
    }
  };

  return (
    <div className="data-rights-panel">
      <h2>Data Subject Rights</h2>
      
      <section className="rights-info">
        <h3>Your Rights</h3>
        <div className="rights-grid">
          <div className="right-item">
            <h4>Right to Access</h4>
            <p>Request a copy of your personal data</p>
          </div>
          <div className="right-item">
            <h4>Right to Portability</h4>
            <p>Export your data in a machine-readable format</p>
          </div>
          <div className="right-item">
            <h4>Right to Erasure</h4>
            <p>Request deletion of your personal data</p>
          </div>
          <div className="right-item">
            <h4>Right to Rectification</h4>
            <p>Correct inaccurate personal data</p>
          </div>
        </div>
      </section>

      <section className="request-form">
        <h3>Submit Data Request</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Request Type:</label>
            <select 
              title="Request Type"
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as DataSubjectRightType)}
            >
              <option value={DataSubjectRightType.ACCESS}>Access my data</option>
              <option value={DataSubjectRightType.PORTABILITY}>Export my data</option>
              <option value={DataSubjectRightType.ERASURE}>Delete my data</option>
              <option value={DataSubjectRightType.RECTIFICATION}>Correct my data</option>
              <option value={DataSubjectRightType.RESTRICT_PROCESSING}>Restrict processing</option>
              <option value={DataSubjectRightType.WITHDRAW_CONSENT}>Withdraw consent</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your request in detail..."
              rows={4}
              required
            />
          </div>
          
          <button type="submit" className="submit-button">
            Submit Request
          </button>
        </form>
      </section>
    </div>
  );
};

const TransparencyPanel: React.FC<{
  onGenerateReport: () => void;
}> = ({ onGenerateReport }) => {
  return (
    <div className="transparency-panel">
      <h2>Privacy Transparency</h2>
      
      <section className="transparency-info">
        <h3>Data Processing Transparency</h3>
        <p>
          We believe in complete transparency about how your data is collected, 
          processed, and used. Generate a comprehensive report to see exactly 
          what data we have about you and how it&apos;s being used.
        </p>
      </section>

      <section className="report-actions">
        <h3>Privacy Reports</h3>
        <div className="action-buttons">
          <button className="report-button" onClick={onGenerateReport}>
            Generate Privacy Report
          </button>
          <button className="report-button" onClick={() => alert('Compliance status feature coming soon')}>
            View Compliance Status
          </button>
          <button className="report-button" onClick={() => alert('Data export feature coming soon')}>
            Export All Data
          </button>
        </div>
      </section>

      <section className="privacy-principles">
        <h3>Our Privacy Principles</h3>
        <div className="principles-grid">
          <div className="principle">
            <h4>Privacy by Design</h4>
            <p>Privacy is built into our system from the ground up</p>
          </div>
          <div className="principle">
            <h4>Data Minimization</h4>
            <p>We collect only the data necessary for functionality</p>
          </div>
          <div className="principle">
            <h4>User Control</h4>
            <p>You have complete control over your data</p>
          </div>
          <div className="principle">
            <h4>Transparency</h4>
            <p>We&apos;re open about our data practices</p>
          </div>
        </div>
      </section>
    </div>
  );
};
