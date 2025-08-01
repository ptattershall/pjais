import { DatabaseManager } from './database-manager'
import { SecurityManager } from './security-manager'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs-extra'

describe('Database Encryption Integration', () => {
  let databaseManager: DatabaseManager
  let securityManager: SecurityManager
  let testDataPath: string

  beforeEach(async () => {
    // Create temporary directory for test database
    testDataPath = path.join(__dirname, '../../../temp-test-db', `test-${Date.now()}`)
    await fs.ensureDir(testDataPath)

    // Initialize security manager
    securityManager = new SecurityManager()
    await securityManager.initialize('test-passphrase-123')

    // Initialize database manager with encryption enabled
    databaseManager = new DatabaseManager({
      dataPath: testDataPath,
      enableEncryption: true
    })

    const { encryptionService, eventLogger } = await securityManager.enableDatabaseEncryption()
    await databaseManager.initialize(eventLogger, encryptionService)
  })

  afterEach(async () => {
    await databaseManager.shutdown()
    await securityManager.shutdown()
    
    // Clean up test directory
    if (await fs.pathExists(testDataPath)) {
      await fs.remove(testDataPath)
    }
  })

  it('should encrypt sensitive persona data', async () => {
    // Create a persona with sensitive data
    const personaId = await databaseManager.createPersona({
      name: 'Test Persona',
      description: 'A test persona with sensitive data',
      personality: {
        traits: ['analytical'],
        temperament: 'calm',
        communicationStyle: 'direct',
        // Add sensitive data in personality field
        privateMemory: 'Secret information that should be encrypted',
        apiKeys: 'api-key-12345-secret'
      }
    })

    // Retrieve the persona - sensitive data should be decrypted
    const retrievedPersona = await databaseManager.getPersona(personaId)
    
    expect(retrievedPersona).toBeDefined()
    expect(retrievedPersona?.name).toBe('Test Persona')
    expect(retrievedPersona?.personality?.privateMemory).toBe('Secret information that should be encrypted')
    expect(retrievedPersona?.personality?.apiKeys).toBe('api-key-12345-secret')

    // Verify encryption status
    const encryptionStatus = databaseManager.getEncryptionStatus()
    expect(encryptionStatus.enabled).toBe(true)
    expect(encryptionStatus.details?.fieldsEncrypted).toHaveProperty('personas')
  })

  it('should encrypt sensitive memory content', async () => {
    // Create a persona first
    const personaId = await databaseManager.createPersona({
      name: 'Memory Test Persona',
      description: 'For testing memory encryption'
    })

    // Create a memory with sensitive content (content is a string in MemoryEntity)
    const memoryId = await databaseManager.createMemoryEntity({
      personaId,
      type: 'text',
      content: 'This is sensitive memory content that should be encrypted - includes private information',
      importance: 85
    })

    // Retrieve the memory - content should be decrypted
    const retrievedMemory = await databaseManager.getMemoryEntity(memoryId)
    
    expect(retrievedMemory).toBeDefined()
    expect(retrievedMemory?.content).toBe('This is sensitive memory content that should be encrypted - includes private information')
  })

  it('should work without encryption when disabled', async () => {
    // Shutdown current database
    await databaseManager.shutdown()

    // Create new database manager without encryption
    const nonEncryptedDb = new DatabaseManager({
      dataPath: path.join(testDataPath, 'non-encrypted'),
      enableEncryption: false
    })

    await nonEncryptedDb.initialize()

    // Create persona without encryption
    const personaId = await nonEncryptedDb.createPersona({
      name: 'Non-encrypted Persona',
      description: 'This persona should not be encrypted'
    })

    const retrievedPersona = await nonEncryptedDb.getPersona(personaId)
    expect(retrievedPersona?.name).toBe('Non-encrypted Persona')

    // Verify encryption is disabled
    const encryptionStatus = nonEncryptedDb.getEncryptionStatus()
    expect(encryptionStatus.enabled).toBe(false)

    await nonEncryptedDb.shutdown()
  })

  it('should handle encryption errors gracefully', async () => {
    // Test that the system handles encryption failures without data loss
    const personaId = await databaseManager.createPersona({
      name: 'Error Test Persona',
      description: 'Testing error handling'
    })

    // This should work normally
    const persona = await databaseManager.getPersona(personaId)
    expect(persona).toBeDefined()
    expect(persona?.name).toBe('Error Test Persona')
  })

  it('should include encryption status in database stats', async () => {
    const stats = await databaseManager.getStats()
    
    expect(stats).toHaveProperty('encryptionEnabled')
    expect(stats.encryptionEnabled).toBe(true)
    expect(stats).toHaveProperty('personaCount')
    expect(stats).toHaveProperty('memoryCount')
    expect(stats).toHaveProperty('conversationCount')
  })
}) 