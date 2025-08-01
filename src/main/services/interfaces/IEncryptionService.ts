import { ServiceHealth } from '../../../shared/types/system';

export interface EncryptionConfig {
  algorithm: 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
  keyDerivation: 'pbkdf2' | 'scrypt' | 'argon2';
  keyLength: number;
  iterations?: number;
  saltLength: number;
  tagLength?: number;
}

export interface EncryptionKey {
  id: string;
  algorithm: string;
  keyData: Buffer;
  salt: Buffer;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface EncryptionResult {
  data: Buffer;
  iv: Buffer;
  tag?: Buffer;
  salt: Buffer;
  keyId: string;
  algorithm: string;
  metadata?: Record<string, unknown>;
}

export interface DecryptionResult {
  data: Buffer;
  verified: boolean;
  keyId: string;
  algorithm: string;
  metadata?: Record<string, unknown>;
}

export interface IEncryptionService {
  // Lifecycle management
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  isInitialized(): boolean;

  // Key management
  generateKey(config: EncryptionConfig): Promise<EncryptionKey>;
  deriveKey(password: string, salt: Buffer, config: EncryptionConfig): Promise<EncryptionKey>;
  storeKey(key: EncryptionKey): Promise<void>;
  getKey(keyId: string): Promise<EncryptionKey | null>;
  deleteKey(keyId: string): Promise<void>;
  rotateKey(keyId: string): Promise<EncryptionKey>;
  getAllKeys(): Promise<EncryptionKey[]>;

  // Encryption operations
  encrypt(data: Buffer, keyId: string, metadata?: Record<string, unknown>): Promise<EncryptionResult>;
  encryptString(text: string, keyId: string, metadata?: Record<string, unknown>): Promise<string>;
  encryptJSON(obj: unknown, keyId: string, metadata?: Record<string, unknown>): Promise<string>;

  // Decryption operations
  decrypt(encryptedData: EncryptionResult): Promise<DecryptionResult>;
  decryptString(encryptedText: string): Promise<string>;
  decryptJSON<T>(encryptedText: string): Promise<T>;

  // Batch operations
  encryptBatch(items: Array<{
    data: Buffer;
    keyId: string;
    metadata?: Record<string, unknown>;
  }>): Promise<EncryptionResult[]>;

  decryptBatch(items: EncryptionResult[]): Promise<DecryptionResult[]>;

  // Key derivation utilities
  generateSalt(length?: number): Promise<Buffer>;
  generateIV(length?: number): Promise<Buffer>;
  hashPassword(password: string, salt: Buffer): Promise<Buffer>;
  verifyPassword(password: string, hash: Buffer, salt: Buffer): Promise<boolean>;

  // Security operations
  secureDelete(data: Buffer): Promise<void>;
  secureRandom(length: number): Promise<Buffer>;
  constant TimeComparison(a: Buffer, b: Buffer): boolean;

  // Key validation and verification
  validateKey(key: EncryptionKey): Promise<boolean>;
  verifyIntegrity(encryptedData: EncryptionResult): Promise<boolean>;
  checkKeyExpiry(keyId: string): Promise<boolean>;

  // Configuration management
  getConfig(): EncryptionConfig;
  updateConfig(config: Partial<EncryptionConfig>): Promise<void>;
  validateConfig(config: EncryptionConfig): Promise<boolean>;

  // Performance monitoring
  getEncryptionMetrics(): Promise<{
    totalEncryptions: number;
    totalDecryptions: number;
    averageEncryptionTime: number;
    averageDecryptionTime: number;
    keyRotations: number;
    failedOperations: number;
    activeKeys: number;
  }>;

  // Health monitoring
  getHealthStatus(): Promise<ServiceHealth>;
}