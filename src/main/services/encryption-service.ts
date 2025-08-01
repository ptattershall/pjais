import { safeStorage } from 'electron';
import * as crypto from 'crypto';
import { EncryptionConfig, EncryptedData, KeyDerivationParams, DataClassification } from '../../shared/types/security';
import { SecurityEventLogger } from './security-event-logger';

export class EncryptionService {
  private config: EncryptionConfig;
  private eventLogger: SecurityEventLogger;
  private masterKey: Buffer | null = null;
  private isInitialized = false;

  constructor(eventLogger: SecurityEventLogger) {
    this.eventLogger = eventLogger;
    this.config = {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
      iterations: 100000, // OWASP recommended minimum
      keyLength: 32, // 256 bits
      ivLength: 12, // 96 bits for GCM
      saltLength: 32, // 256 bits
      tagLength: 16, // 128 bits
    };
  }

  async initialize(passphrase?: string): Promise<void> {
    console.log('Initializing EncryptionService...');
    
    try {
      // Check if safeStorage is available
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('System encryption is not available. Please ensure your system supports secure storage.');
      }

      // Generate or retrieve master key
      await this.initializeMasterKey(passphrase);
      
      this.isInitialized = true;
      this.eventLogger.log({
        type: 'encryption',
        severity: 'low',
        description: 'EncryptionService initialized successfully',
        timestamp: new Date(),
        details: { algorithm: this.config.algorithm }
      });
      
      console.log('EncryptionService initialized successfully');
    } catch (error) {
      this.eventLogger.log({
        type: 'encryption',
        severity: 'critical',
        description: 'Failed to initialize EncryptionService',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  async encrypt(data: any, classification: DataClassification = 'internal'): Promise<EncryptedData> {
    this.ensureInitialized();
    
    try {
      // Serialize data to JSON
      const plaintext = JSON.stringify(data);
      const plaintextBuffer = Buffer.from(plaintext, 'utf8');
      
      // Generate random IV and salt
      const iv = crypto.randomBytes(this.config.ivLength);
      const salt = crypto.randomBytes(this.config.saltLength);
      
      // Derive encryption key
      const key = await this.deriveKey(salt);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.config.algorithm, key, iv);
      
      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(plaintextBuffer),
        cipher.final()
      ]);
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      const result: EncryptedData = {
        data: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        tag: tag.toString('base64'),
        algorithm: this.config.algorithm
      };
      
      this.eventLogger.log({
        type: 'encryption',
        severity: 'low',
        description: 'Data encrypted successfully',
        timestamp: new Date(),
        details: { 
          classification,
          dataSize: plaintextBuffer.length,
          algorithm: this.config.algorithm
        }
      });
      
      return result;
    } catch (error) {
      this.eventLogger.log({
        type: 'encryption',
        severity: 'high',
        description: 'Data encryption failed',
        timestamp: new Date(),
        details: { 
          classification,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async decrypt(encryptedData: EncryptedData): Promise<any> {
    this.ensureInitialized();
    
    try {
      // Validate algorithm
      if (encryptedData.algorithm !== this.config.algorithm) {
        throw new Error(`Unsupported encryption algorithm: ${encryptedData.algorithm}`);
      }
      
      // Parse encrypted components
      const encrypted = Buffer.from(encryptedData.data, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const tag = Buffer.from(encryptedData.tag, 'base64');
      
      // Derive decryption key
      const key = await this.deriveKey(salt);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.config.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      // Parse JSON
      const plaintext = decrypted.toString('utf8');
      const result = JSON.parse(plaintext);
      
      this.eventLogger.log({
        type: 'encryption',
        severity: 'low',
        description: 'Data decrypted successfully',
        timestamp: new Date(),
        details: { 
          dataSize: decrypted.length,
          algorithm: encryptedData.algorithm
        }
      });
      
      return result;
    } catch (error) {
      this.eventLogger.log({
        type: 'encryption',
        severity: 'high',
        description: 'Data decryption failed',
        timestamp: new Date(),
        details: { 
          algorithm: encryptedData.algorithm,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async changePassphrase(currentPassphrase: string, newPassphrase: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      // Verify current passphrase by attempting to derive the current master key
      const currentSalt = await this.getStoredSalt();
      const testKey = await this.deriveKeyFromPassphrase(currentPassphrase, currentSalt);
      
      if (!this.masterKey || !testKey.equals(this.masterKey)) {
        throw new Error('Current passphrase is incorrect');
      }
      
      // Generate new salt and derive new master key
      const newSalt = crypto.randomBytes(this.config.saltLength);
      const newMasterKey = await this.deriveKeyFromPassphrase(newPassphrase, newSalt);
      
      // Store new master key and salt securely
      await this.storeMasterKey(newMasterKey);
      await this.storeSalt(newSalt);
      
      this.masterKey = newMasterKey;
      
      this.eventLogger.log({
        type: 'encryption',
        severity: 'medium',
        description: 'Master passphrase changed successfully',
        timestamp: new Date(),
        details: { timestamp: new Date().toISOString() }
      });
      
      console.log('Master passphrase changed successfully');
    } catch (error) {
      this.eventLogger.log({
        type: 'encryption',
        severity: 'high',
        description: 'Failed to change master passphrase',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  getConfig(): EncryptionConfig {
    return { ...this.config };
  }

  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  private async initializeMasterKey(passphrase?: string): Promise<void> {
    try {
      // Try to load existing master key
      this.masterKey = await this.loadMasterKey();
      
      if (!this.masterKey && passphrase) {
        // Generate new master key from passphrase
        const salt = crypto.randomBytes(this.config.saltLength);
        this.masterKey = await this.deriveKeyFromPassphrase(passphrase, salt);
        
        // Store securely
        await this.storeMasterKey(this.masterKey);
        await this.storeSalt(salt);
        
        console.log('New master key generated and stored');
      } else if (!this.masterKey) {
        // Generate random master key (no passphrase)
        this.masterKey = crypto.randomBytes(this.config.keyLength);
        await this.storeMasterKey(this.masterKey);
        
        console.log('Random master key generated and stored');
      }
    } catch (error) {
      throw new Error(`Failed to initialize master key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async deriveKey(salt: Buffer): Promise<Buffer> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }
    
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(this.masterKey!, salt, this.config.iterations, this.config.keyLength, 'sha512', (err, derivedKey) => {
        if (err) {
          reject(err);
        } else {
          resolve(derivedKey);
        }
      });
    });
  }

  private async deriveKeyFromPassphrase(passphrase: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(passphrase, salt, this.config.iterations, this.config.keyLength, 'sha512', (err, derivedKey) => {
        if (err) {
          reject(err);
        } else {
          resolve(derivedKey);
        }
      });
    });
  }

  private async storeMasterKey(key: Buffer): Promise<void> {
    const encryptedKey = safeStorage.encryptString(key.toString('base64'));
    // Store in a secure location (implement based on your storage strategy)
    // For now, we'll use a simple approach with electron-store
    const { app } = require('electron');
    const Store = require('electron-store');
    
    const secureStore = new Store({
      name: 'security',
      encryptionKey: 'pjais-security-key',
      cwd: app.getPath('userData')
    });
    
    secureStore.set('masterKey', encryptedKey.toString('base64'));
  }

  private async loadMasterKey(): Promise<Buffer | null> {
    try {
      const { app } = require('electron');
      const Store = require('electron-store');
      
      const secureStore = new Store({
        name: 'security',
        encryptionKey: 'pjais-security-key',
        cwd: app.getPath('userData')
      });
      
      const encryptedKey = secureStore.get('masterKey');
      if (!encryptedKey) {
        return null;
      }
      
      const decryptedKey = safeStorage.decryptString(Buffer.from(encryptedKey, 'base64'));
      return Buffer.from(decryptedKey, 'base64');
    } catch (error) {
      console.warn('Failed to load master key:', error);
      return null;
    }
  }

  private async storeSalt(salt: Buffer): Promise<void> {
    const { app } = require('electron');
    const Store = require('electron-store');
    
    const secureStore = new Store({
      name: 'security',
      encryptionKey: 'pjais-security-key',
      cwd: app.getPath('userData')
    });
    
    secureStore.set('masterSalt', salt.toString('base64'));
  }

  private async getStoredSalt(): Promise<Buffer> {
    const { app } = require('electron');
    const Store = require('electron-store');
    
    const secureStore = new Store({
      name: 'security',
      encryptionKey: 'pjais-security-key',
      cwd: app.getPath('userData')
    });
    
    const saltString = secureStore.get('masterSalt');
    if (!saltString) {
      throw new Error('Master salt not found');
    }
    
    return Buffer.from(saltString, 'base64');
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('EncryptionService not initialized');
    }
  }
} 