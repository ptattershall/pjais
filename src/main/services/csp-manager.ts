import { SecurityEventLogger } from './security-event-logger';
import { BrowserWindow } from 'electron';

export interface CSPViolation {
  id: string;
  timestamp: Date;
  directive: string;
  violatedDirective: string;
  blockedURI: string;
  sourceFile: string;
  lineNumber: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CSPPolicy {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  fontSrc: string[];
  connectSrc: string[];
  objectSrc: string[];
  mediaSrc: string[];
  frameSrc: string[];
  upgradeInsecureRequests: boolean;
  blockAllMixedContent: boolean;
  reportUri?: string;
}

export interface SecurityHeaders {
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'X-XSS-Protection': string;
  'Strict-Transport-Security': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
}

export class CSPManager {
  private eventLogger: SecurityEventLogger;
  private violations: Map<string, CSPViolation> = new Map();
  private policy: CSPPolicy;
  private securityHeaders: SecurityHeaders;
  private violationEndpoint: string | null = null;
  private isInitialized = false;

  constructor(eventLogger: SecurityEventLogger) {
    this.eventLogger = eventLogger;
    this.policy = this.getStrictCSPPolicy();
    this.securityHeaders = this.getSecurityHeaders();
  }

  async initialize(): Promise<void> {
    console.log('Initializing CSPManager...');
    
    try {
      // Set up CSP violation reporting endpoint
      await this.setupViolationReporting();
      
      this.isInitialized = true;
      this.eventLogger.log({
        type: 'security',
        severity: 'low',
        description: 'CSPManager initialized successfully',
        timestamp: new Date(),
        details: { 
          policyDirectives: Object.keys(this.policy).length,
          securityHeaders: Object.keys(this.securityHeaders).length 
        }
      });
      
      console.log('CSPManager initialized successfully');
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'critical',
        description: 'Failed to initialize CSPManager',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  generateCSPHeader(): string {
    const directives: string[] = [];
    
    // Build CSP directives
    if (this.policy.defaultSrc.length > 0) {
      directives.push(`default-src ${this.policy.defaultSrc.join(' ')}`);
    }
    
    if (this.policy.scriptSrc.length > 0) {
      directives.push(`script-src ${this.policy.scriptSrc.join(' ')}`);
    }
    
    if (this.policy.styleSrc.length > 0) {
      directives.push(`style-src ${this.policy.styleSrc.join(' ')}`);
    }
    
    if (this.policy.imgSrc.length > 0) {
      directives.push(`img-src ${this.policy.imgSrc.join(' ')}`);
    }
    
    if (this.policy.fontSrc.length > 0) {
      directives.push(`font-src ${this.policy.fontSrc.join(' ')}`);
    }
    
    if (this.policy.connectSrc.length > 0) {
      directives.push(`connect-src ${this.policy.connectSrc.join(' ')}`);
    }
    
    if (this.policy.objectSrc.length > 0) {
      directives.push(`object-src ${this.policy.objectSrc.join(' ')}`);
    }
    
    if (this.policy.mediaSrc.length > 0) {
      directives.push(`media-src ${this.policy.mediaSrc.join(' ')}`);
    }
    
    if (this.policy.frameSrc.length > 0) {
      directives.push(`frame-src ${this.policy.frameSrc.join(' ')}`);
    }
    
    // Add security enhancements
    if (this.policy.upgradeInsecureRequests) {
      directives.push('upgrade-insecure-requests');
    }
    
    if (this.policy.blockAllMixedContent) {
      directives.push('block-all-mixed-content');
    }
    
    // Add violation reporting
    if (this.policy.reportUri) {
      directives.push(`report-uri ${this.policy.reportUri}`);
    }
    
    return directives.join('; ');
  }

  applyToWindow(window: BrowserWindow): void {
    this.ensureInitialized();
    
    try {
      // Apply CSP header
      const cspHeader = this.generateCSPHeader();
      
      window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = details.responseHeaders || {};
        
        // Apply CSP header
        responseHeaders['Content-Security-Policy'] = [cspHeader];
        
        // Apply additional security headers
        Object.entries(this.securityHeaders).forEach(([key, value]) => {
          responseHeaders[key] = [value];
        });
        
        callback({ responseHeaders });
      });
      
      // Monitor for CSP violations
      this.setupViolationMonitoring(window);
      
      this.eventLogger.log({
        type: 'security',
        severity: 'low',
        description: 'CSP and security headers applied to window',
        timestamp: new Date(),
        details: { 
          windowId: window.id,
          cspHeader: cspHeader.substring(0, 100) + '...' // Truncate for logging
        }
      });
      
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'high',
        description: 'Failed to apply CSP to window',
        timestamp: new Date(),
        details: { 
          windowId: window.id,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  reportViolation(violation: Omit<CSPViolation, 'id' | 'timestamp'>): void {
    this.ensureInitialized();
    
    const violationId = `csp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullViolation: CSPViolation = {
      id: violationId,
      timestamp: new Date(),
      ...violation
    };
    
    this.violations.set(violationId, fullViolation);
    
    // Log violation based on severity
    this.eventLogger.log({
      type: 'security',
      severity: violation.severity,
      description: `CSP violation detected: ${violation.violatedDirective}`,
      timestamp: new Date(),
      details: {
        violationId,
        directive: violation.directive,
        violatedDirective: violation.violatedDirective,
        blockedURI: violation.blockedURI,
        sourceFile: violation.sourceFile,
        lineNumber: violation.lineNumber
      }
    });
    
    // Alert on high severity violations
    if (violation.severity === 'high' || violation.severity === 'critical') {
      console.warn(`[CSP VIOLATION] ${violation.severity.toUpperCase()}: ${violation.violatedDirective}`, {
        blockedURI: violation.blockedURI,
        sourceFile: violation.sourceFile,
        lineNumber: violation.lineNumber
      });
    }
    
    // Prune old violations
    this.pruneViolations();
  }

  getViolations(limit: number = 50): CSPViolation[] {
    return Array.from(this.violations.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getViolationStats(): { total: number; bySeverity: Record<string, number>; byDirective: Record<string, number> } {
    const violations = Array.from(this.violations.values());
    
    const bySeverity: Record<string, number> = {};
    const byDirective: Record<string, number> = {};
    
    violations.forEach(violation => {
      bySeverity[violation.severity] = (bySeverity[violation.severity] || 0) + 1;
      byDirective[violation.violatedDirective] = (byDirective[violation.violatedDirective] || 0) + 1;
    });
    
    return {
      total: violations.length,
      bySeverity,
      byDirective
    };
  }

  updatePolicy(newPolicy: Partial<CSPPolicy>): void {
    this.ensureInitialized();
    
    const oldPolicy = { ...this.policy };
    this.policy = { ...this.policy, ...newPolicy };
    
    this.eventLogger.log({
      type: 'security',
      severity: 'medium',
      description: 'CSP policy updated',
      timestamp: new Date(),
      details: { 
        oldPolicy: this.summarizePolicy(oldPolicy),
        newPolicy: this.summarizePolicy(this.policy),
        changes: newPolicy
      }
    });
    
    console.log('CSP policy updated');
  }

  getPolicy(): CSPPolicy {
    return { ...this.policy };
  }

  getSecurityHeadersConfig(): SecurityHeaders {
    return { ...this.securityHeaders };
  }

  private getStrictCSPPolicy(): CSPPolicy {
    return {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // Remove 'unsafe-inline' and 'unsafe-eval' for production
        ...(process.env.NODE_ENV === 'development' ? ["'unsafe-inline'"] : [])
      ],
      styleSrc: [
        "'self'",
        // Use nonce or hash instead of 'unsafe-inline' in production
        ...(process.env.NODE_ENV === 'development' ? ["'unsafe-inline'"] : [])
      ],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: true,
      blockAllMixedContent: true,
      reportUri: this.violationEndpoint || undefined
    };
  }

  private getSecurityHeaders(): SecurityHeaders {
    return {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()'
    };
  }

  private async setupViolationReporting(): Promise<void> {
    // In a real implementation, this would set up an endpoint for CSP violation reports
    // For now, we'll use internal reporting
    this.violationEndpoint = null; // 'http://localhost:3000/csp-violation-report'
    console.log('CSP violation reporting configured (internal)');
  }

  private setupViolationMonitoring(window: BrowserWindow): void {
    // Listen for console messages that might indicate CSP violations
    window.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (message.includes('Content Security Policy') || message.includes('CSP')) {
        // Parse CSP violation from console message
        this.parseConsoleViolation(message, sourceId, line);
      }
    });
    
    // Monitor for resource loading failures that might be CSP-related
    window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      if (errorDescription.includes('Content Security Policy') || errorCode === -20) {
        this.reportViolation({
          directive: 'unknown',
          violatedDirective: 'resource-loading',
          blockedURI: validatedURL,
          sourceFile: 'renderer',
          lineNumber: 0,
          severity: 'medium'
        });
      }
    });
  }

  private parseConsoleViolation(message: string, sourceId: string, line: number): void {
    // Parse common CSP violation patterns from console messages
    const violationPatterns = [
      /Refused to load the script '([^']+)' because it violates the following Content Security Policy directive: "([^"]+)"/,
      /Refused to apply inline style because it violates the following Content Security Policy directive: "([^"]+)"/,
      /Refused to execute inline script because it violates the following Content Security Policy directive: "([^"]+)"/
    ];
    
    for (const pattern of violationPatterns) {
      const match = message.match(pattern);
      if (match) {
        this.reportViolation({
          directive: 'console-detected',
          violatedDirective: match[2] || 'unknown',
          blockedURI: match[1] || 'inline',
          sourceFile: sourceId,
          lineNumber: line,
          severity: this.assessViolationSeverity(match[2] || 'unknown')
        });
        break;
      }
    }
  }

  private assessViolationSeverity(violatedDirective: string): 'low' | 'medium' | 'high' | 'critical' {
    if (violatedDirective.includes('script-src') || violatedDirective.includes('object-src')) {
      return 'high';
    }
    if (violatedDirective.includes('style-src') || violatedDirective.includes('img-src')) {
      return 'medium';
    }
    return 'low';
  }

  private pruneViolations(): void {
    // Keep only last 500 violations
    if (this.violations.size > 500) {
      const sorted = Array.from(this.violations.entries())
        .sort(([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime());
      
      this.violations.clear();
      sorted.slice(0, 250).forEach(([id, violation]) => {
        this.violations.set(id, violation);
      });
    }
  }

  private summarizePolicy(policy: CSPPolicy): Record<string, number> {
    return {
      defaultSrc: policy.defaultSrc.length,
      scriptSrc: policy.scriptSrc.length,
      styleSrc: policy.styleSrc.length,
      imgSrc: policy.imgSrc.length,
      fontSrc: policy.fontSrc.length,
      connectSrc: policy.connectSrc.length,
      objectSrc: policy.objectSrc.length,
      mediaSrc: policy.mediaSrc.length,
      frameSrc: policy.frameSrc.length
    };
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('CSPManager not initialized');
    }
  }
} 