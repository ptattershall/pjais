import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SecurityEventLogger } from './security-event-logger';
import { PluginManifest } from '../../shared/types/plugin';

export interface CodeSigningConfig {
  trustedCertificates: string[];
  requireCodeSigning: boolean;
  allowSelfSigned: boolean;
  certificateChainValidation: boolean;
  timestampValidation: boolean;
  revokedCertificatesCheck: boolean;
}

export interface SignatureVerificationResult {
  valid: boolean;
  verified: boolean;
  certificateValid: boolean;
  certificateExpired: boolean;
  certificateRevoked: boolean;
  trustLevel: 'trusted' | 'self_signed' | 'untrusted';
  issuer?: string;
  subject?: string;
  validFrom?: Date;
  validUntil?: Date;
  errors: string[];
  warnings: string[];
}

export interface PluginSignature {
  algorithm: string;
  signature: string;
  certificate: string;
  timestamp?: string;
  manifestHash: string;
}

export class PluginCodeSigningService {
  private config: CodeSigningConfig;
  private eventLogger: SecurityEventLogger;
  private trustedCertificates: Map<string, crypto.X509Certificate> = new Map();

  constructor(config: CodeSigningConfig, eventLogger: SecurityEventLogger) {
    this.config = config;
    this.eventLogger = eventLogger;
  }

  async initialize(): Promise<void> {
    console.log('Initializing Plugin Code Signing Service...');
    
    try {
      // Load trusted certificates
      await this.loadTrustedCertificates();
      
      this.eventLogger.log({
        type: 'security',
        severity: 'low',
        description: 'Plugin Code Signing Service initialized',
        timestamp: new Date(),
        details: {
          trustedCertificates: this.trustedCertificates.size,
          requireCodeSigning: this.config.requireCodeSigning,
          allowSelfSigned: this.config.allowSelfSigned
        }
      });
      
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'critical',
        description: 'Failed to initialize Plugin Code Signing Service',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  private async loadTrustedCertificates(): Promise<void> {
    for (const certPath of this.config.trustedCertificates) {
      try {
        if (await fs.pathExists(certPath)) {
          const certData = await fs.readFile(certPath, 'utf8');
          const cert = new crypto.X509Certificate(certData);
          
          // Use subject as key for now - in production, use a proper cert identifier
          const subject = cert.subject;
          this.trustedCertificates.set(subject, cert);
          
          console.log(`Loaded trusted certificate: ${subject}`);
        } else {
          console.warn(`Trusted certificate not found: ${certPath}`);
        }
      } catch (error) {
        console.error(`Failed to load certificate ${certPath}:`, error);
      }
    }
  }

  /**
   * Verify the code signature of a plugin
   * @param pluginDir - Path to the plugin directory
   * @param manifest - Plugin manifest
   * @returns Signature verification result
   */
  async verifyPluginSignature(
    pluginDir: string,
    manifest: PluginManifest
  ): Promise<SignatureVerificationResult> {
    const result: SignatureVerificationResult = {
      valid: false,
      verified: false,
      certificateValid: false,
      certificateExpired: false,
      certificateRevoked: false,
      trustLevel: 'untrusted',
      errors: [],
      warnings: []
    };

    try {
      // Look for signature file
      const signatureFile = path.join(pluginDir, 'plugin.sig');
      
      if (!await fs.pathExists(signatureFile)) {
        if (this.config.requireCodeSigning) {
          result.errors.push('Plugin signature file not found and code signing is required');
          return result;
        } else {
          result.warnings.push('Plugin is not code signed');
          result.valid = true; // Allow unsigned plugins if not required
          return result;
        }
      }

      // Read signature file
      const signatureData = await fs.readJson(signatureFile) as PluginSignature;
      
      // Verify signature structure
      if (!this.validateSignatureStructure(signatureData)) {
        result.errors.push('Invalid signature file structure');
        return result;
      }

      // Calculate manifest hash
      const manifestHash = this.calculateManifestHash(manifest);
      
      // Verify manifest hash matches signature
      if (manifestHash !== signatureData.manifestHash) {
        result.errors.push('Manifest hash mismatch - plugin may have been tampered with');
        return result;
      }

      // Parse certificate
      let certificate: crypto.X509Certificate;
      try {
        certificate = new crypto.X509Certificate(signatureData.certificate);
      } catch (error) {
        result.errors.push(`Invalid certificate: ${error instanceof Error ? error.message : String(error)}`);
        return result;
      }

      // Verify certificate validity
      const certificateResult = this.verifyCertificate(certificate);
      result.certificateValid = certificateResult.valid;
      result.certificateExpired = certificateResult.expired;
      result.certificateRevoked = certificateResult.revoked;
      result.trustLevel = certificateResult.trustLevel;
      result.issuer = certificate.issuer;
      result.subject = certificate.subject;
      result.validFrom = certificate.validFrom;
      result.validUntil = certificate.validTo;

      if (!result.certificateValid) {
        result.errors.push(...certificateResult.errors);
        if (result.trustLevel === 'untrusted') {
          return result;
        }
      }

      // Verify signature
      const signatureValid = this.verifySignature(
        manifestHash,
        signatureData.signature,
        certificate.publicKey,
        signatureData.algorithm
      );

      if (!signatureValid) {
        result.errors.push('Digital signature verification failed');
        return result;
      }

      // If we get here, everything is valid
      result.valid = true;
      result.verified = true;

      this.eventLogger.log({
        type: 'security',
        severity: 'low',
        description: 'Plugin signature verified successfully',
        timestamp: new Date(),
        details: {
          pluginId: manifest.id,
          trustLevel: result.trustLevel,
          issuer: result.issuer,
          subject: result.subject
        }
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Signature verification failed: ${errorMessage}`);
      
      this.eventLogger.log({
        type: 'security',
        severity: 'high',
        description: 'Plugin signature verification failed',
        timestamp: new Date(),
        details: {
          pluginId: manifest.id,
          error: errorMessage
        }
      });

      return result;
    }
  }

  private validateSignatureStructure(signature: any): signature is PluginSignature {
    return (
      typeof signature === 'object' &&
      typeof signature.algorithm === 'string' &&
      typeof signature.signature === 'string' &&
      typeof signature.certificate === 'string' &&
      typeof signature.manifestHash === 'string'
    );
  }

  private calculateManifestHash(manifest: PluginManifest): string {
    // Create a consistent hash of the manifest
    const manifestStr = JSON.stringify(manifest, Object.keys(manifest).sort());
    return crypto.createHash('sha256').update(manifestStr).digest('hex');
  }

  private verifyCertificate(certificate: crypto.X509Certificate): {
    valid: boolean;
    expired: boolean;
    revoked: boolean;
    trustLevel: 'trusted' | 'self_signed' | 'untrusted';
    errors: string[];
  } {
    const result = {
      valid: false,
      expired: false,
      revoked: false,
      trustLevel: 'untrusted' as const,
      errors: [] as string[]
    };

    try {
      // Check if certificate is expired
      const now = new Date();
      if (certificate.validTo < now) {
        result.expired = true;
        result.errors.push('Certificate has expired');
      }

      if (certificate.validFrom > now) {
        result.errors.push('Certificate is not yet valid');
      }

      // Check if certificate is in trusted list
      const subject = certificate.subject;
      if (this.trustedCertificates.has(subject)) {
        result.trustLevel = 'trusted';
        result.valid = true;
      } else if (this.config.allowSelfSigned) {
        // Check if it's self-signed
        if (certificate.issuer === certificate.subject) {
          result.trustLevel = 'self_signed';
          result.valid = true;
          result.errors.push('Certificate is self-signed');
        }
      }

      // Certificate revocation check would go here
      // For now, we'll just mark it as not revoked
      result.revoked = false;

      if (this.config.certificateChainValidation) {
        // Certificate chain validation would go here
        // For now, we'll just validate the certificate itself
      }

      return result;

    } catch (error) {
      result.errors.push(`Certificate verification error: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  private verifySignature(
    data: string,
    signature: string,
    publicKey: crypto.KeyObject,
    algorithm: string
  ): boolean {
    try {
      const verifier = crypto.createVerify(algorithm);
      verifier.update(data);
      return verifier.verify(publicKey, signature, 'base64');
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Generate a signature for a plugin (for development/testing purposes)
   * In production, this would be done by the plugin author with their private key
   */
  async generatePluginSignature(
    manifest: PluginManifest,
    privateKeyPath: string,
    certificatePath: string
  ): Promise<PluginSignature> {
    const privateKey = await fs.readFile(privateKeyPath, 'utf8');
    const certificate = await fs.readFile(certificatePath, 'utf8');
    
    const manifestHash = this.calculateManifestHash(manifest);
    const algorithm = 'RSA-SHA256';
    
    const signer = crypto.createSign(algorithm);
    signer.update(manifestHash);
    const signature = signer.sign(privateKey, 'base64');
    
    return {
      algorithm,
      signature,
      certificate,
      manifestHash,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Add a trusted certificate to the store
   */
  async addTrustedCertificate(certificatePath: string): Promise<void> {
    try {
      const certData = await fs.readFile(certificatePath, 'utf8');
      const cert = new crypto.X509Certificate(certData);
      const subject = cert.subject;
      
      this.trustedCertificates.set(subject, cert);
      
      this.eventLogger.log({
        type: 'security',
        severity: 'low',
        description: 'Trusted certificate added',
        timestamp: new Date(),
        details: { subject }
      });
      
    } catch (error) {
      throw new Error(`Failed to add trusted certificate: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Remove a trusted certificate from the store
   */
  removeTrustedCertificate(subject: string): void {
    if (this.trustedCertificates.delete(subject)) {
      this.eventLogger.log({
        type: 'security',
        severity: 'low',
        description: 'Trusted certificate removed',
        timestamp: new Date(),
        details: { subject }
      });
    }
  }

  /**
   * Get list of trusted certificates
   */
  getTrustedCertificates(): Array<{ subject: string; issuer: string; validFrom: Date; validTo: Date }> {
    return Array.from(this.trustedCertificates.values()).map(cert => ({
      subject: cert.subject,
      issuer: cert.issuer,
      validFrom: cert.validFrom,
      validTo: cert.validTo
    }));
  }

  /**
   * Get configuration
   */
  getConfig(): CodeSigningConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CodeSigningConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    this.eventLogger.log({
      type: 'security',
      severity: 'medium',
      description: 'Code signing configuration updated',
      timestamp: new Date(),
      details: { newConfig }
    });
  }
}