import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityManager } from './security-manager';
import { EncryptionService } from './encryption-service';
import { DataProtectionManager } from './data-protection-manager';
import { CSPManager } from './csp-manager';
import { SecurityEventLogger } from './security-event-logger';

// Mock Electron modules
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`encrypted_${text}`, 'utf8'),
    decryptString: (buffer: Buffer) => buffer.toString().replace('encrypted_', '')
  },
  app: {
    getPath: (path: string) => `/mock/userData/${path}`
  },
  BrowserWindow: class MockBrowserWindow {
    id = 1;
    webContents = {
      session: {
        webRequest: {
          onHeadersReceived: vi.fn()
        }
      },
      on: vi.fn()
    };
  }
}));

// Additional mock for require calls within modules
vi.doMock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`encrypted_${text}`, 'utf8'),
    decryptString: (buffer: Buffer) => buffer.toString().replace('encrypted_', '')
  },
  app: {
    getPath: (path: string) => `/mock/userData/${path}`
  }
}));

// Mock electron-store
vi.mock('electron-store', () => {
  const store = new Map();
  return {
    default: vi.fn().mockImplementation(() => ({
      get: (key: string) => store.get(key),
      set: (key: string, value: any) => store.set(key, value),
      delete: (key: string) => store.delete(key),
      clear: () => store.clear()
    }))
  };
});

describe('Phase 1 Security Framework', () => {
  let securityManager: SecurityManager;
  let eventLogger: SecurityEventLogger;

  beforeEach(async () => {
    eventLogger = new SecurityEventLogger();
    securityManager = new SecurityManager();
  });

  describe('SecurityManager Integration', () => {
    it('should initialize successfully with all Phase 1 components', async () => {
      await expect(securityManager.initialize()).resolves.not.toThrow();
      
      const health = await securityManager.getHealth();
      expect(health.status).toBe('ok');
      expect(health.details).toBeDefined();
      expect(health.details?.phase1Complete).toBe(true);
      expect(health.details?.encryptionAvailable).toBe(true);
    });

    it('should initialize with custom passphrase', async () => {
      await expect(securityManager.initialize('test-passphrase-123')).resolves.not.toThrow();
      expect(securityManager.isEncryptionAvailable()).toBe(true);
    });
  });

  describe('Encryption Service', () => {
    let encryptionService: EncryptionService;

    beforeEach(async () => {
      encryptionService = new EncryptionService(eventLogger);
      await encryptionService.initialize();
    });

    it('should encrypt and decrypt data successfully', async () => {
      const testData = { message: 'Hello, World!', number: 42 };
      
      const encrypted = await encryptionService.encrypt(testData);
      expect(encrypted).toHaveProperty('data');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('salt');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('should handle different data classifications', async () => {
      const sensitiveData = { ssn: '123-45-6789', creditCard: '4111-1111-1111-1111' };
      
      const encrypted = await encryptionService.encrypt(sensitiveData, 'restricted');
      expect(encrypted).toHaveProperty('data');
      
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toEqual(sensitiveData);
    });

    it('should fail to decrypt with tampered data', async () => {
      const testData = { message: 'test' };
      const encrypted = await encryptionService.encrypt(testData);
      
      // Tamper with the encrypted data
      encrypted.data = 'tampered_data';
      
      await expect(encryptionService.decrypt(encrypted)).rejects.toThrow();
    });

    it('should validate encryption configuration', () => {
      const config = encryptionService.getConfig();
      expect(config.algorithm).toBe('aes-256-gcm');
      expect(config.keyDerivation).toBe('pbkdf2');
      expect(config.iterations).toBeGreaterThanOrEqual(100000);
    });
  });

  describe('Data Protection Manager', () => {
    let dataProtectionManager: DataProtectionManager;
    let encryptionService: EncryptionService;

    beforeEach(async () => {
      encryptionService = new EncryptionService(eventLogger);
      await encryptionService.initialize();
      dataProtectionManager = new DataProtectionManager(encryptionService, eventLogger);
      await dataProtectionManager.initialize();
    });

    it('should classify and protect data automatically', async () => {
      const piiData = { 
        email: 'user@example.com', 
        phone: '(555) 123-4567',
        name: 'John Doe'
      };
      
      const classified = await dataProtectionManager.classifyAndProtectData(
        piiData, 
        'user_profile', 
        'registration_form'
      );
      
      expect(classified.classification).toBe('restricted');
      expect(classified.metadata).toHaveProperty('created');
      expect(classified.metadata).toHaveProperty('source', 'registration_form');
    });

    it('should handle data subject requests', async () => {
      const requestId = await dataProtectionManager.submitDataSubjectRequest(
        'access',
        { userId: 'test-user-123', requestReason: 'Personal data review' }
      );
      
      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      
      const requests = dataProtectionManager.getDataSubjectRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].type).toBe('access');
      expect(requests[0].status).toBe('pending');
    });

    it('should update privacy settings', async () => {
      await dataProtectionManager.updatePrivacySettings({
        dataCollection: true,
        personalDataProcessing: true,
        analytics: false
      });
      
      const settings = dataProtectionManager.getPrivacySettings();
      expect(settings.dataCollection).toBe(true);
      expect(settings.personalDataProcessing).toBe(true);
      expect(settings.analytics).toBe(false);
      expect(settings.consentTimestamp).toBeDefined();
    });

    it('should generate compliance report', async () => {
      // Submit a test request first
      await dataProtectionManager.submitDataSubjectRequest('access', { test: true });
      
      const report = await dataProtectionManager.generateComplianceReport();
      
      expect(report).toHaveProperty('reportId');
      expect(report).toHaveProperty('generatedAt');
      expect(report.dataSubjects).toBe(1);
      expect(report.dataRequests).toHaveLength(1);
      expect(report.encryptionCompliance).toBe(true);
    });

    it('should maintain audit trail', async () => {
      await dataProtectionManager.classifyAndProtectData({ test: 'data' }, 'test_context', 'test_source');
      await dataProtectionManager.updatePrivacySettings({ analytics: true });
      
      const auditTrail = dataProtectionManager.getAuditTrail(10);
      expect(auditTrail.length).toBeGreaterThan(0);
      
      const latestEntry = auditTrail[0];
      expect(latestEntry).toHaveProperty('id');
      expect(latestEntry).toHaveProperty('action');
      expect(latestEntry).toHaveProperty('timestamp');
      expect(latestEntry).toHaveProperty('outcome');
    });
  });

  describe('CSP Manager', () => {
    let cspManager: CSPManager;

    beforeEach(async () => {
      cspManager = new CSPManager(eventLogger);
      await cspManager.initialize();
    });

    it('should generate strict CSP header', () => {
      const cspHeader = cspManager.generateCSPHeader();
      
      expect(cspHeader).toContain("default-src 'self'");
      expect(cspHeader).toContain("object-src 'none'");
      expect(cspHeader).toContain("frame-src 'none'");
      expect(cspHeader).toContain('upgrade-insecure-requests');
      expect(cspHeader).toContain('block-all-mixed-content');
    });

    it('should handle CSP violations', () => {
      cspManager.reportViolation({
        directive: 'script-src',
        violatedDirective: "script-src 'self'",
        blockedURI: 'https://evil.com/script.js',
        sourceFile: 'index.html',
        lineNumber: 42,
        severity: 'high'
      });
      
      const violations = cspManager.getViolations(10);
      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('high');
      expect(violations[0].blockedURI).toBe('https://evil.com/script.js');
    });

    it('should provide violation statistics', () => {
      // Add multiple violations
      cspManager.reportViolation({
        directive: 'script-src',
        violatedDirective: "script-src 'self'",
        blockedURI: 'inline',
        sourceFile: 'test.html',
        lineNumber: 1,
        severity: 'high'
      });
      
      cspManager.reportViolation({
        directive: 'style-src',
        violatedDirective: "style-src 'self'",
        blockedURI: 'inline',
        sourceFile: 'test.html',
        lineNumber: 2,
        severity: 'medium'
      });
      
      const stats = cspManager.getViolationStats();
      expect(stats.total).toBe(2);
      expect(stats.bySeverity.high).toBe(1);
      expect(stats.bySeverity.medium).toBe(1);
    });

    it('should update CSP policy', () => {
      const newPolicy = {
        scriptSrc: ["'self'", "'nonce-abc123'"]
      };
      
      cspManager.updatePolicy(newPolicy);
      
      const policy = cspManager.getPolicy();
      expect(policy.scriptSrc).toContain("'nonce-abc123'");
    });

    it('should provide security headers configuration', () => {
      const headers = cspManager.getSecurityHeadersConfig();
      
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
    });
  });

  describe('Integration Tests', () => {
    beforeEach(async () => {
      await securityManager.initialize('integration-test-passphrase');
    });

    it('should encrypt data through SecurityManager', async () => {
      const testData = { secret: 'confidential information' };
      
      const encrypted = await securityManager.encryptData(testData, 'confidential');
      expect(encrypted).toHaveProperty('data');
      
      const decrypted = await securityManager.decryptData(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('should handle data classification workflow', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        preferences: { theme: 'dark' }
      };
      
      const classified = await securityManager.classifyAndProtectData(
        userData,
        'user_preferences',
        'settings_update'
      );
      
      expect(classified.classification).toBeDefined();
      expect(classified.metadata.source).toBe('settings_update');
    });

    it('should generate comprehensive compliance report', async () => {
      // Simulate user activity
      await securityManager.submitDataSubjectRequest('access', { reason: 'test' });
      await securityManager.updatePrivacySettings({ dataCollection: true });
      
      const report = await securityManager.generateComplianceReport();
      
      expect(report.encryptionCompliance).toBe(true);
      expect(report.consentCompliance).toBe(true);
      expect(report.dataRequests.length).toBeGreaterThan(0);
    });

    it('should maintain security event log', async () => {
      // Trigger various security events
      await securityManager.encryptData({ test: 'data' });
      await securityManager.submitDataSubjectRequest('access', {});
      
      const events = securityManager.getSecurityEvents(10);
      expect(events.length).toBeGreaterThan(0);
      
      const encryptionEvents = events.filter(e => e.type === 'encryption');
      expect(encryptionEvents.length).toBeGreaterThan(0);
    });
  });
}); 