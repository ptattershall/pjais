import { EncryptionService } from './encryption-service'
import { SecurityEventLogger } from './security-event-logger'

export interface EncryptedStorageConfig {
  encryptionService: EncryptionService
  eventLogger: SecurityEventLogger
}

// Fields that should be encrypted in each table
type EncryptedFieldsMap = {
  [tableName: string]: string[]
}

const ENCRYPTED_FIELDS: EncryptedFieldsMap = {
  personas: ['personality'], // Encrypt the entire personality object which may contain sensitive data
  memoryEntities: ['content'], // Encrypt sensitive memory content
  conversations: ['messages'], // Encrypt conversation messages
  // Add more tables/fields as needed
}

export class EncryptedDataManager {
  private encryptionService: EncryptionService
  private eventLogger: SecurityEventLogger
  private isInitialized = false

  constructor(config: EncryptedStorageConfig) {
    this.encryptionService = config.encryptionService
    this.eventLogger = config.eventLogger
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Ensure encryption service is ready
    if (!this.encryptionService.isEncryptionAvailable()) {
      throw new Error('Encryption service not available')
    }

    this.isInitialized = true
    this.eventLogger.log({
      type: 'encryption',
      severity: 'low',
      description: 'EncryptedDataManager initialized',
      timestamp: new Date(),
      details: { encryptionEnabled: true }
    })
  }

  // Encrypt sensitive fields in event data before committing to LiveStore
  async encryptEventData(tableName: string, eventData: any): Promise<any> {
    this.ensureInitialized()
    
    const fieldsToEncrypt = ENCRYPTED_FIELDS[tableName]
    if (!fieldsToEncrypt || fieldsToEncrypt.length === 0) {
      return eventData // No encryption needed for this table
    }

    try {
      const encryptedData = { ...eventData }
      
      for (const fieldName of fieldsToEncrypt) {
        const fieldValue = eventData[fieldName]
        if (fieldValue !== undefined && fieldValue !== null) {
          // Only encrypt if field has data and isn't already encrypted
          if (!this.isAlreadyEncrypted(fieldValue)) {
            const encryptedValue = await this.encryptionService.encrypt(
              typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue), 
              'confidential'
            )
            encryptedData[fieldName] = encryptedValue
            // Mark field as encrypted for later decryption
            encryptedData[`_${fieldName}_encrypted`] = true
          }
        }
      }

      this.eventLogger.log({
        type: 'encryption',
        severity: 'low',
        description: `Event data encrypted for table: ${tableName}`,
        timestamp: new Date(),
        details: { 
          table: tableName, 
          encryptedFields: fieldsToEncrypt.filter((f: string) => eventData[f] !== undefined)
        }
      })

      return encryptedData
    } catch (error) {
      this.eventLogger.log({
        type: 'encryption',
        severity: 'high',
        description: `Failed to encrypt event data for table: ${tableName}`,
        timestamp: new Date(),
        details: { 
          table: tableName, 
          error: error instanceof Error ? error.message : String(error)
        }
      })
      throw error
    }
  }

  // Decrypt sensitive fields in query results from LiveStore
  async decryptQueryData(tableName: string, queryData: any): Promise<any> {
    this.ensureInitialized()
    
    const fieldsToDecrypt = ENCRYPTED_FIELDS[tableName]
    if (!fieldsToDecrypt) {
      return queryData // No decryption needed for this table
    }

    // Handle both single records and arrays
    if (Array.isArray(queryData)) {
      return Promise.all(queryData.map(record => this.decryptRecord(fieldsToDecrypt, record)))
    } else if (queryData && typeof queryData === 'object') {
      return this.decryptRecord(fieldsToDecrypt, queryData)
    }

    return queryData
  }

  private async decryptRecord(fieldsToDecrypt: string[], record: any): Promise<any> {
    try {
      const decryptedRecord = { ...record }
      
      for (const fieldName of fieldsToDecrypt) {
        const encryptionFlag = `_${fieldName}_encrypted`
        
        if (record[fieldName] !== undefined && record[encryptionFlag]) {
          // Decrypt the field
          decryptedRecord[fieldName] = await this.encryptionService.decrypt(
            record[fieldName]
          )
          // Remove the encryption flag
          delete decryptedRecord[encryptionFlag]
        }
      }
      
      return decryptedRecord
    } catch (error) {
      this.eventLogger.log({
        type: 'encryption',
        severity: 'high',
        description: `Failed to decrypt record data`,
        timestamp: new Date(),
        details: { 
          error: error instanceof Error ? error.message : String(error)
        }
      })
      // Return original record if decryption fails to prevent data loss
      return record
    }
  }

  private isAlreadyEncrypted(value: any): boolean {
    // Check if the value looks like our encrypted data structure
    return (
      value &&
      typeof value === 'object' &&
      value.data &&
      value.iv &&
      value.salt &&
      value.tag &&
      value.algorithm
    )
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('EncryptedDataManager not initialized')
    }
  }

  getEncryptionStatus(): { enabled: boolean; fieldsEncrypted: EncryptedFieldsMap } {
    return {
      enabled: this.isInitialized && this.encryptionService.isEncryptionAvailable(),
      fieldsEncrypted: ENCRYPTED_FIELDS
    }
  }

  // Utility method to check if a table has encrypted fields
  hasEncryptedFields(tableName: string): boolean {
    return !!ENCRYPTED_FIELDS[tableName]
  }

  // Get list of encrypted fields for a table
  getEncryptedFields(tableName: string): string[] {
    return ENCRYPTED_FIELDS[tableName] || []
  }
} 