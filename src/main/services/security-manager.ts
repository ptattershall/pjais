import { PlatformUtils } from '../utils/platform';
import { SecurityEventLogger } from './security-event-logger';
import { SecurityPolicyManager } from './security-policy-manager';
import { EncryptionService } from './encryption-service';
import { DataProtectionManager } from './data-protection-manager';
import { CSPManager } from './csp-manager';
import { PluginSandbox, SandboxConfig } from './plugin-sandbox';
import { PluginCodeSigningService, CodeSigningConfig } from './plugin-code-signing';
import { SecurityEvent } from '../../shared/types/security';
import { ServiceHealth } from '../../shared/types/system';
import { PluginManifest } from '../../shared/types/plugin';
import * as path from 'path';

export interface SecurityManagerConfig {
  enforceCSP?: boolean;
  enableDataProtection?: boolean;
  logLevel?: 'low' | 'medium' | 'high';
  pluginSandboxConfig?: Partial<SandboxConfig>;
  codeSigningConfig?: CodeSigningConfig;
}

export class SecurityManager {
  private eventLogger: SecurityEventLogger;
  private policyManager: SecurityPolicyManager;
  private encryptionService: EncryptionService;
  private dataProtectionManager: DataProtectionManager;
  private cspManager: CSPManager;
  private pluginSandbox?: PluginSandbox;
  private codeSigningService?: PluginCodeSigningService;
  private initialized = false;
  private config: SecurityManagerConfig;

  constructor(config: SecurityManagerConfig = {}) {
    this.config = config;
    this.eventLogger = new SecurityEventLogger();
    this.policyManager = new SecurityPolicyManager();
    this.encryptionService = new EncryptionService(this.eventLogger);
    this.dataProtectionManager = new DataProtectionManager(this.encryptionService, this.eventLogger);
    this.cspManager = new CSPManager(this.eventLogger);
  }

  async initialize(passphrase?: string): Promise<void> {
    if (this.initialized) {
      console.log('SecurityManager already initialized');
      return;
    }

    try {
      console.log('Initializing SecurityManager...');
      
      // Initialize core security services
      await this.policyManager.loadPolicy();
      await this.encryptionService.initialize(passphrase);
      await this.dataProtectionManager.initialize();
      await this.cspManager.initialize();

      // Initialize plugin sandbox with secure defaults
      await this.initializePluginSandbox();

      // Initialize code signing service if configured
      await this.initializeCodeSigningService();

      this.initialized = true;
      
      this.eventLogger.log({
        type: 'security',
        severity: 'low',
        description: 'SecurityManager initialized successfully',
        timestamp: new Date(),
        details: {
          encryption: this.encryptionService.isEncryptionAvailable(),
          dataProtection: true,
          csp: true,
          pluginSandbox: !!this.pluginSandbox
        }
      });
      
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'critical',
        description: 'Failed to initialize SecurityManager',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  private async initializePluginSandbox(): Promise<void> {
    const defaultSandboxConfig: SandboxConfig = {
      maxMemoryMB: 128,
      maxExecutionTimeMs: 30000, // 30 seconds
      maxCpuUsagePercent: 50,
      allowedModules: [
        'lodash',
        'moment',
        'crypto-js',
        // Add other safe modules as needed
      ],
      enableNetworking: false, // Disabled by default for security
      enableFileSystemAccess: false, // Disabled by default for security
      maxFileSize: 10 * 1024 * 1024, // 10MB max file size
      tempDirectory: path.join(PlatformUtils.getAppDataPath(), 'plugin-temp')
    };

    // Merge with user config
    const sandboxConfig: SandboxConfig = {
      ...defaultSandboxConfig,
      ...this.config.pluginSandboxConfig
    };

    this.pluginSandbox = new PluginSandbox(sandboxConfig, this.eventLogger);
    await this.pluginSandbox.initialize();

    this.eventLogger.log({
      type: 'security',
      severity: 'low',
      description: 'Plugin sandbox initialized',
      timestamp: new Date(),
      details: {
        maxMemoryMB: sandboxConfig.maxMemoryMB,
        maxExecutionTimeMs: sandboxConfig.maxExecutionTimeMs,
        networkingEnabled: sandboxConfig.enableNetworking,
        filesystemEnabled: sandboxConfig.enableFileSystemAccess
      }
    });
  }

  private async initializeCodeSigningService(): Promise<void> {
    if (!this.config.codeSigningConfig) {
      // Set default code signing configuration
      this.config.codeSigningConfig = {
        trustedCertificates: [],
        requireCodeSigning: false, // Default to false for development
        allowSelfSigned: true,
        certificateChainValidation: false,
        timestampValidation: false,
        revokedCertificatesCheck: false
      };
    }

    this.codeSigningService = new PluginCodeSigningService(
      this.config.codeSigningConfig,
      this.eventLogger
    );
    
    await this.codeSigningService.initialize();

    this.eventLogger.log({
      type: 'security',
      severity: 'low',
      description: 'Plugin code signing service initialized',
      timestamp: new Date(),
      details: {
        requireCodeSigning: this.config.codeSigningConfig.requireCodeSigning,
        allowSelfSigned: this.config.codeSigningConfig.allowSelfSigned,
        trustedCertificates: this.config.codeSigningConfig.trustedCertificates.length
      }
    });
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      // Shutdown plugin sandbox
      if (this.pluginSandbox) {
        await this.pluginSandbox.shutdown();
      }

      // Other services don't have shutdown methods, so just mark as uninitialized
      this.initialized = false;
      
      this.eventLogger.log({
        type: 'security',
        severity: 'low',
        description: 'SecurityManager shutdown completed',
        timestamp: new Date(),
        details: {}
      });
      
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'high',
        description: 'Error during SecurityManager shutdown',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  // =============================================================================
  // PLUGIN SECURITY METHODS
  // =============================================================================

  /**
   * Scan a plugin directory for security threats and validate its contents
   * @param pluginDir - Path to the extracted plugin directory
   * @param manifest - Plugin manifest to validate
   * @returns Security scan results
   */
  async scanPlugin(
    pluginDir: string,
    manifest: PluginManifest
  ): Promise<{
    safe: boolean;
    threats: string[];
    warnings: string[];
    securityLevel: 'safe' | 'moderate' | 'high_risk';
    codeSigningResult?: any;
  }> {
    this.ensureInitialized();
    
    const threats: string[] = [];
    const warnings: string[] = [];
    let securityLevel: 'safe' | 'moderate' | 'high_risk' = 'safe';
    let codeSigningResult: any = null;

    try {
      // 1. Code signing verification (first and most important)
      if (this.codeSigningService) {
        codeSigningResult = await this.codeSigningService.verifyPluginSignature(pluginDir, manifest);
        
        if (!codeSigningResult.valid) {
          threats.push(...codeSigningResult.errors);
          securityLevel = 'high_risk';
        } else if (codeSigningResult.warnings.length > 0) {
          warnings.push(...codeSigningResult.warnings);
          if (codeSigningResult.trustLevel === 'self_signed') {
            securityLevel = 'moderate';
          }
        }
        
        // Log code signing result
        this.eventLogger.log({
          type: 'security',
          severity: codeSigningResult.valid ? 'low' : 'high',
          description: `Plugin code signing verification: ${codeSigningResult.valid ? 'PASSED' : 'FAILED'}`,
          timestamp: new Date(),
          details: {
            pluginId: manifest.id,
            verified: codeSigningResult.verified,
            trustLevel: codeSigningResult.trustLevel,
            certificateValid: codeSigningResult.certificateValid,
            errors: codeSigningResult.errors.length,
            warnings: codeSigningResult.warnings.length
          }
        });
      }

      // 2. Validate manifest structure
      const manifestValidation = await this.validatePluginManifest(manifest);
      if (!manifestValidation.valid) {
        threats.push(...manifestValidation.issues);
      }
      
      // Update security level based on manifest validation
      if (manifestValidation.securityLevel === 'high_risk') {
        securityLevel = 'high_risk';
      } else if (manifestValidation.securityLevel === 'moderate' && securityLevel === 'safe') {
        securityLevel = 'moderate';
      }

      // Check for dangerous file patterns
      const fs = require('fs');
      const path = require('path');
      
      const scanDirectory = (dir: string) => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            // Recursively scan subdirectories
            scanDirectory(filePath);
          } else {
            // Check file patterns
            const extension = path.extname(file).toLowerCase();
            
            // Check for dangerous file types
            if (['.exe', '.bat', '.sh', '.cmd', '.ps1', '.vbs', '.scr'].includes(extension)) {
              threats.push(`Dangerous executable file detected: ${file}`);
              securityLevel = 'high_risk';
            }
            
            // Check for suspicious file names
            if (file.includes('keylogger') || file.includes('backdoor') || file.includes('trojan')) {
              threats.push(`Suspicious file name detected: ${file}`);
              securityLevel = 'high_risk';
            }
            
            // Check JavaScript files for dangerous patterns
            if (['.js', '.ts', '.jsx', '.tsx'].includes(extension)) {
              try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Check for dangerous JavaScript patterns
                const dangerousPatterns = [
                  /eval\s*\(/g,
                  /Function\s*\(/g,
                  /process\.exit/g,
                  /require\s*\(\s*['"]child_process['"]/g,
                  /require\s*\(\s*['"]fs['"]/g,
                  /require\s*\(\s*['"]path['"]/g,
                  /XMLHttpRequest/g,
                  /fetch\s*\(/g
                ];
                
                for (const pattern of dangerousPatterns) {
                  if (pattern.test(content)) {
                    warnings.push(`Potentially dangerous code pattern in ${file}: ${pattern.source}`);
                    if (securityLevel === 'safe') {
                      securityLevel = 'moderate';
                    }
                  }
                }
              } catch (error) {
                warnings.push(`Could not scan file: ${file}`);
              }
            }
          }
        }
      };

      // Scan the plugin directory
      if (fs.existsSync(pluginDir)) {
        scanDirectory(pluginDir);
      } else {
        threats.push('Plugin directory does not exist');
      }

      // Check plugin size
      const getDirSize = (dir: string): number => {
        let size = 0;
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            size += getDirSize(filePath);
          } else {
            size += stat.size;
          }
        }
        return size;
      };

      const pluginSize = getDirSize(pluginDir);
      const maxSize = 50 * 1024 * 1024; // 50MB limit
      
      if (pluginSize > maxSize) {
        threats.push(`Plugin size exceeds limit: ${pluginSize} bytes > ${maxSize} bytes`);
        securityLevel = 'high_risk';
      }

      // Log security scan results
      this.eventLogger.log({
        type: 'security',
        severity: threats.length > 0 ? 'high' : 'low',
        description: `Plugin security scan completed: ${manifest.id}`,
        timestamp: new Date(),
        details: {
          pluginId: manifest.id,
          pluginDir,
          threats: threats.length,
          warnings: warnings.length,
          securityLevel,
          pluginSize
        }
      });

      return {
        safe: threats.length === 0,
        threats,
        warnings,
        securityLevel,
        codeSigningResult
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      threats.push(`Security scan failed: ${errorMessage}`);
      
      this.eventLogger.log({
        type: 'security',
        severity: 'critical',
        description: `Plugin security scan failed: ${manifest.id}`,
        timestamp: new Date(),
        details: {
          pluginId: manifest.id,
          pluginDir,
          error: errorMessage
        }
      });
      
      return {
        safe: false,
        threats,
        warnings,
        securityLevel: 'high_risk',
        codeSigningResult
      };
    }
  }

  async executePlugin(
    pluginId: string,
    pluginCode: string,
    manifest: PluginManifest,
    context?: any
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    securityReport: {
      violations: string[];
      resourceUsage: any;
      permissionsGranted: string[];
    };
  }> {
    this.ensureInitialized();
    
    if (!this.pluginSandbox) {
      throw new Error('Plugin sandbox not initialized');
    }

    // Log plugin execution attempt
    this.eventLogger.log({
      type: 'security',
      severity: 'low',
      description: `Plugin execution requested: ${pluginId}`,
      timestamp: new Date(),
      details: {
        pluginId,
        manifestVersion: manifest.version,
        permissions: Object.keys(manifest.permissions)
      }
    });

    // Execute plugin in sandbox
    const sandboxResult = await this.pluginSandbox.executePlugin(
      pluginId,
      pluginCode,
      manifest,
      context
    );

    // Prepare security report
    const securityReport = {
      violations: sandboxResult.securityViolations,
      resourceUsage: sandboxResult.resourceUsage,
      permissionsGranted: Object.entries(manifest.permissions)
        .filter(([, required]) => required)
        .map(([permission]) => permission)
    };

    // Log security violations if any
    if (sandboxResult.securityViolations.length > 0) {
      this.eventLogger.log({
        type: 'security',
        severity: 'high',
        description: `Plugin security violations detected: ${pluginId}`,
        timestamp: new Date(),
        details: {
          pluginId,
          violations: sandboxResult.securityViolations,
          resourceUsage: sandboxResult.resourceUsage
        }
      });
    }

    return {
      success: sandboxResult.success,
      result: sandboxResult.result,
      error: sandboxResult.error,
      securityReport
    };
  }

  async validatePluginManifest(manifest: PluginManifest): Promise<{
    valid: boolean;
    issues: string[];
    securityLevel: 'safe' | 'moderate' | 'high_risk';
  }> {
    this.ensureInitialized();
    
    const issues: string[] = [];
    let securityLevel: 'safe' | 'moderate' | 'high_risk' = 'safe';

    // Validate basic manifest structure
    if (!manifest.id || !manifest.name || !manifest.version) {
      issues.push('Missing required manifest fields (id, name, version)');
    }

    // Check permissions
    const permissions = Object.entries(manifest.permissions);
    const requestedPermissions = permissions.filter(([, required]) => required);
    
    if (requestedPermissions.length === 0) {
      securityLevel = 'safe';
    } else if (requestedPermissions.some(([perm]) => perm === 'filesystem' || perm === 'network')) {
      securityLevel = 'high_risk';
      issues.push('Plugin requests high-risk permissions (filesystem/network)');
    } else {
      securityLevel = 'moderate';
    }

    // Check for dangerous permission combinations
    const hasNetwork = manifest.permissions['network'];
    const hasFilesystem = manifest.permissions['filesystem'];
    
    if (hasNetwork && hasFilesystem) {
      issues.push('Dangerous permission combination: network + filesystem access');
      securityLevel = 'high_risk';
    }

    this.eventLogger.log({
      type: 'security',
      severity: securityLevel === 'high_risk' ? 'high' : 'low',
      description: `Plugin manifest validated: ${manifest.id}`,
      timestamp: new Date(),
      details: {
        pluginId: manifest.id,
        securityLevel,
        issues: issues.length,
        permissions: requestedPermissions.map(([perm]) => perm)
      }
    });

    return {
      valid: issues.length === 0 || securityLevel !== 'high_risk',
      issues,
      securityLevel
    };
  }

  getPluginSandboxStatus(): any {
    this.ensureInitialized();
    
    if (!this.pluginSandbox) {
      return { enabled: false };
    }

    return {
      enabled: true,
      ...this.pluginSandbox.getStatus()
    };
  }

  // Update sandbox configuration
  async updateSandboxConfig(newConfig: Partial<SandboxConfig>): Promise<void> {
    this.ensureInitialized();
    
    if (!this.pluginSandbox) {
      throw new Error('Plugin sandbox not initialized');
    }

    // For security reasons, require reinitialization to change config
    await this.pluginSandbox.shutdown();
    
    // Merge new config
    this.config.pluginSandboxConfig = {
      ...this.config.pluginSandboxConfig,
      ...newConfig
    };
    
    // Reinitialize with new config
    await this.initializePluginSandbox();
    
    this.eventLogger.log({
      type: 'security',
      severity: 'medium',
      description: 'Plugin sandbox configuration updated',
      timestamp: new Date(),
      details: { updatedConfig: newConfig }
    });
  }

  // =============================================================================
  // EXISTING METHODS (Phase 1: Database Integration Methods)
  // =============================================================================

  getEncryptionService(): EncryptionService {
    this.ensureInitialized();
    return this.encryptionService;
  }

  getSecurityEventLogger(): SecurityEventLogger {
    this.ensureInitialized();
    return this.eventLogger;
  }

  // Enable database encryption for a DatabaseManager instance
  async enableDatabaseEncryption(): Promise<{ encryptionService: EncryptionService; eventLogger: SecurityEventLogger }> {
    this.ensureInitialized();
    
    if (!this.isEncryptionAvailable()) {
      throw new Error('Encryption service not available for database integration');
    }

    this.eventLogger.log({
      type: 'encryption',
      severity: 'low',
      description: 'Database encryption integration enabled',
      timestamp: new Date(),
      details: { 
        encryptionAlgorithm: this.encryptionService.getConfig().algorithm,
        integrationPoint: 'DatabaseManager'
      }
    });

    return {
      encryptionService: this.encryptionService,
      eventLogger: this.eventLogger
    };
  }

  async getHealth(): Promise<ServiceHealth> {
    const health: ServiceHealth = {
      service: 'SecurityManager',
      status: this.initialized ? 'ok' : 'initializing',
      details: {
        encryption: this.encryptionService.isEncryptionAvailable(),
        dataProtection: this.initialized,
        csp: this.initialized,
        pluginSandbox: !!this.pluginSandbox,
        eventLogging: true
      }
    };

    return health;
  }

  // =============================================================================
  // EXISTING SECURITY METHODS
  // =============================================================================

  isEncryptionAvailable(): boolean {
    return this.encryptionService.isEncryptionAvailable();
  }

  async encryptData(data: string, classification: 'public' | 'internal' | 'confidential' | 'restricted' = 'confidential'): Promise<any> {
    this.ensureInitialized();
    return this.encryptionService.encrypt(data, classification);
  }

  async decryptData(encryptedData: any): Promise<string> {
    this.ensureInitialized();
    return this.encryptionService.decrypt(encryptedData);
  }

  // CSP Management
  getCSPHeader(): string {
    this.ensureInitialized();
    return this.cspManager.generateCSPHeader();
  }

  // Security Events
  logSecurityEvent(event: SecurityEvent): void {
    this.eventLogger.log(event);
  }

  getSecurityEvents(filter?: any): SecurityEvent[] {
    return this.eventLogger.getEvents(filter);
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SecurityManager not initialized. Call initialize() first.');
    }
  }
} 