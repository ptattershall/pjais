import { EventEmitter } from 'events';
import { loggers } from '../utils/logger';

export interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    'referrer': string;
    'violated-directive': string;
    'original-policy': string;
    'blocked-uri': string;
    'line-number': number;
    'column-number': number;
    'source-file': string;
    'status-code': number;
    'script-sample': string;
  };
}

export interface CSPViolationAnalytics {
  totalViolations: number;
  violationsByDirective: Record<string, number>;
  violationsBySource: Record<string, number>;
  violationsByType: Record<string, number>;
  recentViolations: CSPViolationReport[];
  trends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
}

export interface CSPPolicy {
  // Basic directives
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'font-src': string[];
  'connect-src': string[];
  'media-src': string[];
  'object-src': string[];
  'frame-src': string[];
  'worker-src': string[];
  'manifest-src': string[];
  
  // Advanced directives
  'base-uri': string[];
  'form-action': string[];
  'frame-ancestors': string[];
  'navigate-to': string[];
  'report-uri': string[];
  'report-to': string[];
  'require-trusted-types-for': string[];
  'trusted-types': string[];
  'upgrade-insecure-requests': boolean;
  'block-all-mixed-content': boolean;
  
  // Sandbox directives
  'sandbox': string[];
}

export class CSPViolationReporter extends EventEmitter {
  private violations: CSPViolationReport[] = [];
  private analytics: CSPViolationAnalytics;
  private currentPolicy: Partial<CSPPolicy>;
  private reportOnlyMode: boolean = false;
  private maxViolationsStored: number = 1000;
  private reportingEndpoint: string | null = null;

  constructor() {
    super();
    this.analytics = this.initializeAnalytics();
    this.currentPolicy = this.getDefaultPolicy();
  }

  private initializeAnalytics(): CSPViolationAnalytics {
    return {
      totalViolations: 0,
      violationsByDirective: {},
      violationsBySource: {},
      violationsByType: {},
      recentViolations: [],
      trends: {
        hourly: new Array(24).fill(0),
        daily: new Array(30).fill(0),
        weekly: new Array(52).fill(0),
      },
    };
  }

  private getDefaultPolicy(): Partial<CSPPolicy> {
    return {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https:', 'wss:'],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'frame-src': ["'self'"],
      'worker-src': ["'self'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'report-uri': [],
      'report-to': [],
      'upgrade-insecure-requests': false,
      'block-all-mixed-content': false,
      'sandbox': [],
    };
  }

  // Configure CSP policy
  public updatePolicy(policy: Partial<CSPPolicy>): void {
    this.currentPolicy = { ...this.currentPolicy, ...policy };
    loggers.security.info('CSP policy updated', { policy: this.currentPolicy });
    this.emit('policy-updated', this.currentPolicy);
  }

  // Set reporting endpoint
  public setReportingEndpoint(endpoint: string): void {
    this.reportingEndpoint = endpoint;
    
    // Update policy to include reporting endpoint
    if (this.currentPolicy['report-uri']) {
      this.currentPolicy['report-uri'] = [endpoint];
    }
    
    loggers.security.info('CSP reporting endpoint set', { endpoint });
  }

  // Enable/disable report-only mode
  public setReportOnlyMode(enabled: boolean): void {
    this.reportOnlyMode = enabled;
    loggers.security.info('CSP report-only mode', { enabled });
  }

  // Generate CSP header string
  public generateCSPHeader(): string {
    const directives: string[] = [];

    Object.entries(this.currentPolicy).forEach(([directive, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        directives.push(`${directive} ${value.join(' ')}`);
      } else if (typeof value === 'boolean' && value) {
        directives.push(directive);
      }
    });

    return directives.join('; ');
  }

  // Get appropriate CSP header name
  public getCSPHeaderName(): string {
    return this.reportOnlyMode 
      ? 'Content-Security-Policy-Report-Only' 
      : 'Content-Security-Policy';
  }

  // Report a CSP violation
  public reportViolation(violation: CSPViolationReport): void {
    const timestamp = Date.now();
    const violationWithTimestamp = {
      ...violation,
      timestamp,
    };

    // Store violation
    this.violations.push(violationWithTimestamp);
    
    // Limit stored violations
    if (this.violations.length > this.maxViolationsStored) {
      this.violations = this.violations.slice(-this.maxViolationsStored);
    }

    // Update analytics
    this.updateAnalytics(violation);

    // Log violation
    loggers.security.warn('CSP violation reported', {
      directive: violation['csp-report']['violated-directive'],
      blockedUri: violation['csp-report']['blocked-uri'],
      sourceFile: violation['csp-report']['source-file'],
      lineNumber: violation['csp-report']['line-number'],
    });

    // Emit event
    this.emit('violation', violationWithTimestamp);

    // Send to reporting endpoint if configured
    if (this.reportingEndpoint) {
      this.sendToReportingEndpoint(violation);
    }
  }

  private updateAnalytics(violation: CSPViolationReport): void {
    const report = violation['csp-report'];
    
    // Update totals
    this.analytics.totalViolations++;
    
    // Update by directive
    const directive = report['violated-directive'];
    this.analytics.violationsByDirective[directive] = 
      (this.analytics.violationsByDirective[directive] || 0) + 1;
    
    // Update by source
    const source = report['source-file'] || 'unknown';
    this.analytics.violationsBySource[source] = 
      (this.analytics.violationsBySource[source] || 0) + 1;
    
    // Categorize violation type
    const type = this.categorizeViolationType(directive);
    this.analytics.violationsByType[type] = 
      (this.analytics.violationsByType[type] || 0) + 1;
    
    // Update recent violations
    this.analytics.recentViolations.push(violation);
    if (this.analytics.recentViolations.length > 100) {
      this.analytics.recentViolations = this.analytics.recentViolations.slice(-100);
    }
    
    // Update trends
    this.updateTrends();
  }

  private categorizeViolationType(directive: string): string {
    if (directive.includes('script-src')) return 'script';
    if (directive.includes('style-src')) return 'style';
    if (directive.includes('img-src')) return 'image';
    if (directive.includes('connect-src')) return 'xhr';
    if (directive.includes('frame-src')) return 'frame';
    if (directive.includes('font-src')) return 'font';
    if (directive.includes('media-src')) return 'media';
    if (directive.includes('object-src')) return 'object';
    return 'other';
  }

  private updateTrends(): void {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDate() - 1; // 0-indexed
    const week = this.getWeekOfYear(now) - 1; // 0-indexed

    // Update hourly trend
    this.analytics.trends.hourly[hour]++;
    
    // Update daily trend
    if (day >= 0 && day < 30) {
      this.analytics.trends.daily[day]++;
    }
    
    // Update weekly trend
    if (week >= 0 && week < 52) {
      this.analytics.trends.weekly[week]++;
    }
  }

  private getWeekOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek) + 1;
  }

  private async sendToReportingEndpoint(violation: CSPViolationReport): Promise<void> {
    if (!this.reportingEndpoint) return;

    try {
      const response = await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/csp-report',
        },
        body: JSON.stringify(violation),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      loggers.security.debug('CSP violation sent to reporting endpoint', {
        endpoint: this.reportingEndpoint,
        status: response.status,
      });
    } catch (error) {
      loggers.security.error('Failed to send CSP violation to reporting endpoint', {
        endpoint: this.reportingEndpoint,
      }, error as Error);
    }
  }

  // Get analytics data
  public getAnalytics(): CSPViolationAnalytics {
    return { ...this.analytics };
  }

  // Get recent violations
  public getRecentViolations(limit: number = 50): CSPViolationReport[] {
    return this.violations.slice(-limit);
  }

  // Get violations by directive
  public getViolationsByDirective(directive: string): CSPViolationReport[] {
    return this.violations.filter(v => 
      v['csp-report']['violated-directive'] === directive
    );
  }

  // Clear violation history
  public clearViolations(): void {
    this.violations = [];
    this.analytics = this.initializeAnalytics();
    loggers.security.info('CSP violations cleared');
    this.emit('violations-cleared');
  }

  // Generate security report
  public generateSecurityReport(): {
    summary: any;
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const summary = {
      totalViolations: this.analytics.totalViolations,
      uniqueDirectives: Object.keys(this.analytics.violationsByDirective).length,
      uniqueSources: Object.keys(this.analytics.violationsBySource).length,
      mostViolatedDirective: this.getMostViolatedDirective(),
      mostProblematicSource: this.getMostProblematicSource(),
      recentTrend: this.getRecentTrend(),
    };

    const recommendations = this.generateRecommendations();
    const riskLevel = this.calculateRiskLevel();

    return {
      summary,
      recommendations,
      riskLevel,
    };
  }

  private getMostViolatedDirective(): string {
    const directives = this.analytics.violationsByDirective;
    return Object.keys(directives).reduce((a, b) => 
      directives[a] > directives[b] ? a : b
    ) || 'none';
  }

  private getMostProblematicSource(): string {
    const sources = this.analytics.violationsBySource;
    return Object.keys(sources).reduce((a, b) => 
      sources[a] > sources[b] ? a : b
    ) || 'none';
  }

  private getRecentTrend(): 'increasing' | 'decreasing' | 'stable' {
    const recent = this.analytics.trends.hourly.slice(-6); // Last 6 hours
    const earlier = this.analytics.trends.hourly.slice(-12, -6); // 6 hours before
    
    const recentSum = recent.reduce((sum, val) => sum + val, 0);
    const earlierSum = earlier.reduce((sum, val) => sum + val, 0);
    
    if (recentSum > earlierSum * 1.2) return 'increasing';
    if (recentSum < earlierSum * 0.8) return 'decreasing';
    return 'stable';
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.analytics.totalViolations > 100) {
      recommendations.push('High number of violations detected. Consider reviewing and tightening CSP policy.');
    }
    
    if (this.analytics.violationsByType['script'] > 50) {
      recommendations.push('Many script violations detected. Review inline scripts and consider using nonces or hashes.');
    }
    
    if (this.analytics.violationsByType['style'] > 30) {
      recommendations.push('Style violations detected. Consider moving inline styles to external stylesheets.');
    }
    
    if (this.reportOnlyMode) {
      recommendations.push('Currently in report-only mode. Consider enabling enforcement after reviewing violations.');
    }
    
    return recommendations;
  }

  private calculateRiskLevel(): 'low' | 'medium' | 'high' {
    const total = this.analytics.totalViolations;
    const scriptViolations = this.analytics.violationsByType['script'] || 0;
    
    if (total > 500 || scriptViolations > 100) return 'high';
    if (total > 100 || scriptViolations > 20) return 'medium';
    return 'low';
  }

  // Create a strict CSP policy
  public createStrictPolicy(): Partial<CSPPolicy> {
    return {
      'default-src': ["'none'"],
      'script-src': ["'self'"],
      'style-src': ["'self'"],
      'img-src': ["'self'"],
      'font-src': ["'self'"],
      'connect-src': ["'self'"],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'frame-src': ["'none'"],
      'worker-src': ["'self'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': true,
      'block-all-mixed-content': true,
    };
  }
}

// Singleton instance
export const cspViolationReporter = new CSPViolationReporter();