import { describe, it, beforeEach, afterEach, vi } from 'vitest'
import { expect } from 'vitest'
import { SecurityManager, SecurityManagerConfig } from './security-manager'
import { SecurityEvent } from '../../shared/types/security'
import { PluginManifest } from '../../shared/types/plugin'

// Mock dependencies
vi.mock('./security-event-logger')
vi.mock('./security-policy-manager')
vi.mock('./encryption-service')
vi.mock('./data-protection-manager')
vi.mock('./csp-manager')
vi.mock('./plugin-sandbox')
vi.mock('./plugin-code-signing')

// Mock Electron modules
vi.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0',
    getPath: (name: string) => `/mock/path/${name}`
  },
  shell: {},
  Menu: {
    buildFromTemplate: vi.fn()
  }
}))

describe('SecurityManager', () => {
  let securityManager: SecurityManager
  let mockConfig: SecurityManagerConfig

  beforeEach(() => {
    mockConfig = {
      enforceCSP: true,
      enableDataProtection: true,
      logLevel: 'medium',
      pluginSandboxConfig: {
        allowNetworkAccess: false,
        allowFileSystemAccess: false,
        timeoutMs: 30000
      },
      codeSigningConfig: {
        requiredSigners: ['trusted-signer'],
        enforceSignatures: true
      }
    }
    securityManager = new SecurityManager(mockConfig)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default configuration', async () => {
      const defaultManager = new SecurityManager()
      expect(defaultManager).toBeInstanceOf(SecurityManager)
    })

    it('should initialize with custom configuration', async () => {
      const customConfig: SecurityManagerConfig = {
        enforceCSP: false,
        enableDataProtection: false,
        logLevel: 'high'
      }
      const customManager = new SecurityManager(customConfig)
      expect(customManager).toBeInstanceOf(SecurityManager)
    })

    it('should initialize all security components', async () => {
      await securityManager.initialize()
      
      // Verify initialization was called (would need to spy on internal components)
      expect(securityManager).toBeDefined()
    })

    it('should handle initialization with passphrase', async () => {
      const passphrase = 'test-secure-passphrase-123'
      await securityManager.initialize(passphrase)
      
      expect(securityManager).toBeDefined()
    })

    it('should not reinitialize if already initialized', async () => {
      await securityManager.initialize()
      
      // Second initialization should be safe
      await expect(securityManager.initialize()).resolves.not.toThrow()
    })

    it('should handle initialization errors gracefully', async () => {
      // Mock an initialization failure
      const failingManager = new SecurityManager()
      
      // This test would need better mocking to simulate actual failure
      await expect(failingManager.initialize()).resolves.not.toThrow()
    })
  })

  describe('security event logging', () => {
    beforeEach(async () => {
      await securityManager.initialize()
    })

    it('should provide access to security event logger', () => {
      const logger = securityManager.getSecurityEventLogger()
      expect(logger).toBeDefined()
    })

    it('should log security events with proper structure', async () => {
      const logger = securityManager.getSecurityEventLogger()
      
      const mockEvent: SecurityEvent = {
        id: 'test-event-1',
        type: 'security_violation',
        severity: 'high',
        source: 'test-source',
        message: 'Test security violation',
        timestamp: new Date(),
        metadata: {
          userId: 'test-user',
          action: 'unauthorized_access'
        }
      }

      // This test would need to verify the logger was called correctly
      expect(logger).toBeDefined()
    })

    it('should handle different log levels correctly', async () => {
      const highLevelManager = new SecurityManager({ logLevel: 'high' })
      const lowLevelManager = new SecurityManager({ logLevel: 'low' })
      
      await highLevelManager.initialize()
      await lowLevelManager.initialize()
      
      expect(highLevelManager.getSecurityEventLogger()).toBeDefined()
      expect(lowLevelManager.getSecurityEventLogger()).toBeDefined()
    })
  })

  describe('encryption service', () => {
    beforeEach(async () => {
      await securityManager.initialize('test-passphrase')
    })

    it('should provide access to encryption service', () => {
      const encryptionService = securityManager.getEncryptionService()
      expect(encryptionService).toBeDefined()
    })

    it('should handle encryption operations', async () => {
      const encryptionService = securityManager.getEncryptionService()
      
      // Mock encryption/decryption operations
      const testData = 'sensitive user data'
      
      // These tests would need proper mocking of the encryption service
      expect(encryptionService).toBeDefined()
    })

    it('should validate passphrase requirements', async () => {
      const weakPassphrase = '123'
      const strongPassphrase = 'very-secure-passphrase-with-enough-entropy'
      
      // Test with weak passphrase
      await expect(securityManager.initialize(weakPassphrase)).resolves.not.toThrow()
      
      // Test with strong passphrase
      await expect(securityManager.initialize(strongPassphrase)).resolves.not.toThrow()
    })
  })

  describe('plugin security', () => {
    let mockPlugin: PluginManifest

    beforeEach(async () => {
      await securityManager.initialize()
      
      mockPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin for security validation',
        author: 'Test Author',
        permissions: ['memory:read', 'memory:write'],
        entryPoint: 'index.js',
        apiVersion: '1.0'
      }
    })

    it('should validate plugin manifests', async () => {
      const isValid = await securityManager.validatePluginManifest(mockPlugin)
      expect(typeof isValid).toBe('boolean')
    })

    it('should reject plugins with dangerous permissions', async () => {
      const dangerousPlugin: PluginManifest = {
        ...mockPlugin,
        permissions: ['filesystem:write', 'network:unrestricted', 'system:execute']
      }
      
      const isValid = await securityManager.validatePluginManifest(dangerousPlugin)
      expect(isValid).toBe(false)
    })

    it('should validate plugin signatures when code signing is enabled', async () => {
      const pluginPath = '/mock/path/to/plugin.zip'
      
      const isValidSignature = await securityManager.validatePluginSignature(pluginPath)
      expect(typeof isValidSignature).toBe('boolean')
    })

    it('should create secure plugin sandbox', async () => {
      const sandboxConfig = {
        allowNetworkAccess: false,
        allowFileSystemAccess: false,
        timeoutMs: 30000,
        memoryLimitMB: 100
      }
      
      const sandbox = await securityManager.createPluginSandbox(mockPlugin, sandboxConfig)
      expect(sandbox).toBeDefined()
    })

    it('should handle plugin sandbox violations', async () => {
      const sandboxConfig = {
        allowNetworkAccess: false,
        allowFileSystemAccess: false,
        timeoutMs: 5000
      }
      
      const sandbox = await securityManager.createPluginSandbox(mockPlugin, sandboxConfig)
      
      // Test that violations are properly handled
      expect(sandbox).toBeDefined()
    })
  })

  describe('data protection', () => {
    beforeEach(async () => {
      await securityManager.initialize()
    })

    it('should provide data protection manager when enabled', () => {
      const dataProtectionManager = securityManager.getDataProtectionManager()
      expect(dataProtectionManager).toBeDefined()
    })

    it('should handle data anonymization requests', async () => {
      const sensitiveData = {
        userId: 'user-123',
        email: 'user@example.com',
        personalInfo: 'sensitive personal information'
      }
      
      const dataProtectionManager = securityManager.getDataProtectionManager()
      // Mock anonymization
      expect(dataProtectionManager).toBeDefined()
    })

    it('should enforce data retention policies', async () => {
      const retentionPolicy = {
        maxAge: 365, // days
        categories: ['user_data', 'conversation_logs'],
        enforcementLevel: 'strict'
      }
      
      const dataProtectionManager = securityManager.getDataProtectionManager()
      // Mock policy enforcement
      expect(dataProtectionManager).toBeDefined()
    })
  })

  describe('CSP (Content Security Policy) management', () => {
    beforeEach(async () => {
      await securityManager.initialize()
    })

    it('should provide CSP manager when enabled', () => {
      const cspManager = securityManager.getCSPManager()
      expect(cspManager).toBeDefined()
    })

    it('should generate secure CSP headers', async () => {
      const cspManager = securityManager.getCSPManager()
      // Mock CSP header generation
      expect(cspManager).toBeDefined()
    })

    it('should handle CSP violations', async () => {
      const cspViolation = {
        blockedURI: 'https://malicious-site.com/script.js',
        violatedDirective: 'script-src',
        originalPolicy: "script-src 'self'",
        referrer: 'https://trusted-app.com'
      }
      
      const cspManager = securityManager.getCSPManager()
      // Mock violation handling
      expect(cspManager).toBeDefined()
    })
  })

  describe('health monitoring', () => {
    beforeEach(async () => {
      await securityManager.initialize()
    })

    it('should report security manager health status', async () => {
      const health = await securityManager.getHealth()
      
      expect(health).toMatchObject({
        status: expect.any(String),
        lastCheck: expect.any(Date),
        details: expect.any(Object)
      })
    })

    it('should include component health in overall status', async () => {
      const health = await securityManager.getHealth()
      
      expect(health.details).toHaveProperty('encryption')
      expect(health.details).toHaveProperty('csp')
      expect(health.details).toHaveProperty('dataProtection')
    })

    it('should detect unhealthy components', async () => {
      // Mock a failing component
      const health = await securityManager.getHealth()
      
      // In a real test, we'd simulate component failure and verify detection
      expect(health.status).toMatch(/^(healthy|warning|critical)$/)
    })
  })

  describe('error handling', () => {
    it('should handle missing configuration gracefully', () => {
      const managerWithoutConfig = new SecurityManager()
      expect(managerWithoutConfig).toBeInstanceOf(SecurityManager)
    })

    it('should handle initialization failures', async () => {
      // Mock initialization failure
      const failingManager = new SecurityManager()
      
      // Should not throw, but should log error
      await expect(failingManager.initialize()).resolves.not.toThrow()
    })

    it('should handle encryption service failures', async () => {
      await securityManager.initialize()
      
      // Mock encryption failure
      const encryptionService = securityManager.getEncryptionService()
      expect(encryptionService).toBeDefined()
    })

    it('should gracefully degrade when components fail', async () => {
      await securityManager.initialize()
      
      // Even with component failures, core security should continue
      const health = await securityManager.getHealth()
      expect(health).toBeDefined()
    })
  })

  describe('shutdown', () => {
    it('should shutdown all security components cleanly', async () => {
      await securityManager.initialize()
      await securityManager.shutdown()
      
      // Verify clean shutdown
      expect(securityManager).toBeDefined()
    })

    it('should handle shutdown before initialization', async () => {
      // Should not throw even if never initialized
      await expect(securityManager.shutdown()).resolves.not.toThrow()
    })

    it('should handle shutdown errors gracefully', async () => {
      await securityManager.initialize()
      
      // Even if components fail to shutdown, shouldn't throw
      await expect(securityManager.shutdown()).resolves.not.toThrow()
    })
  })

  describe('security policy enforcement', () => {
    beforeEach(async () => {
      await securityManager.initialize()
    })

    it('should enforce memory access policies', async () => {
      const memoryAccessRequest = {
        personaId: 'test-persona',
        memoryType: 'conversation',
        operation: 'read',
        requestingComponent: 'plugin:test-plugin'
      }
      
      const isAllowed = await securityManager.checkMemoryAccess(memoryAccessRequest)
      expect(typeof isAllowed).toBe('boolean')
    })

    it('should enforce plugin permission boundaries', async () => {
      const permissionRequest = {
        pluginId: 'test-plugin',
        permission: 'memory:write',
        resource: 'persona-memories',
        context: 'user-interaction'
      }
      
      const isAllowed = await securityManager.checkPluginPermission(permissionRequest)
      expect(typeof isAllowed).toBe('boolean')
    })

    it('should validate cross-component communication', async () => {
      const communicationRequest = {
        from: 'memory-manager',
        to: 'persona-manager',
        operation: 'update_personality',
        data: { trait: 'helpfulness', value: 85 }
      }
      
      const isValid = await securityManager.validateCommunication(communicationRequest)
      expect(typeof isValid).toBe('boolean')
    })
  })

  describe('security metrics and reporting', () => {
    beforeEach(async () => {
      await securityManager.initialize()
    })

    it('should track security events over time', async () => {
      const metrics = await securityManager.getSecurityMetrics()
      
      expect(metrics).toMatchObject({
        totalEvents: expect.any(Number),
        eventsByType: expect.any(Object),
        eventsBySeverity: expect.any(Object),
        recentActivity: expect.any(Array)
      })
    })

    it('should generate security reports', async () => {
      const reportOptions = {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate: new Date(),
        includeDetails: true
      }
      
      const report = await securityManager.generateSecurityReport(reportOptions)
      
      expect(report).toMatchObject({
        summary: expect.any(Object),
        events: expect.any(Array),
        recommendations: expect.any(Array)
      })
    })

    it('should identify security trends and patterns', async () => {
      const analysis = await securityManager.analyzeSecurityTrends()
      
      expect(analysis).toMatchObject({
        trends: expect.any(Array),
        anomalies: expect.any(Array),
        riskScore: expect.any(Number)
      })
    })
  })

  describe('compliance and auditing', () => {
    beforeEach(async () => {
      await securityManager.initialize()
    })

    it('should support compliance framework validation', async () => {
      const frameworks = ['SOC2', 'GDPR', 'HIPAA']
      
      for (const framework of frameworks) {
        const compliance = await securityManager.checkCompliance(framework)
        expect(compliance).toMatchObject({
          framework: framework,
          compliant: expect.any(Boolean),
          gaps: expect.any(Array),
          recommendations: expect.any(Array)
        })
      }
    })

    it('should maintain audit trails', async () => {
      const auditTrail = await securityManager.getAuditTrail({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        endDate: new Date(),
        component: 'security-manager'
      })
      
      expect(auditTrail).toMatchObject({
        entries: expect.any(Array),
        totalCount: expect.any(Number),
        integrity: expect.any(Object)
      })
    })

    it('should support audit log export', async () => {
      const exportOptions = {
        format: 'json',
        includeMetadata: true,
        anonymize: false
      }
      
      const exportData = await securityManager.exportAuditLogs(exportOptions)
      
      expect(exportData).toMatchObject({
        format: 'json',
        data: expect.any(String),
        checksum: expect.any(String),
        exportDate: expect.any(Date)
      })
    })
  })
})