import { describe, it, beforeEach, afterEach, vi } from 'vitest'
import { expect } from 'vitest'
import { createPersona, updatePersona, deletePersona, getPersona, listPersonas } from './personas'
import { PersonaManager } from '../services/persona-manager'
import { PersonaData } from '../../shared/types/persona'

// Mock dependencies
vi.mock('../services/persona-manager')

describe('Personas IPC Handlers', () => {
  let mockPersonaManager: PersonaManager
  let mockEvent: any

  const createTestPersonaData = (overrides: Partial<PersonaData> = {}): PersonaData => ({
    id: 'test-persona-1',
    name: 'Test Assistant',
    description: 'A helpful AI assistant for testing',
    personality: {
      traits: [
        { name: 'helpful', value: 85, category: 'custom' },
        { name: 'analytical', value: 75, category: 'custom' }
      ],
      temperament: 'balanced',
      communicationStyle: 'conversational'
    },
    memoryConfiguration: {
      maxMemories: 1000,
      memoryImportanceThreshold: 50,
      autoOptimize: true,
      retentionPeriod: 30,
      memoryCategories: ['conversation', 'learning', 'preference', 'fact'],
      compressionEnabled: true
    },
    privacySettings: {
      dataCollection: true,
      analyticsEnabled: false,
      shareWithResearchers: false,
      allowPersonalityAnalysis: true,
      memoryRetention: true,
      exportDataAllowed: true
    },
    behaviorSettings: {},
    memories: [],
    isActive: false,
    version: '1.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  })

  beforeEach(() => {
    // Create mock persona manager
    mockPersonaManager = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      getHealth: vi.fn(),
      initialize: vi.fn(),
      shutdown: vi.fn()
    } as any

    // Mock IPC event object
    mockEvent = {
      reply: vi.fn(),
      sender: {
        send: vi.fn()
      }
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createPersona', () => {
    it('should create a new persona successfully', async () => {
      const personaData = createTestPersonaData({ id: undefined as any })
      const createdPersona = createTestPersonaData()
      
      mockPersonaManager.create = vi.fn().mockResolvedValue(createdPersona)
      
      const handler = createPersona(mockPersonaManager)
      const result = await handler(mockEvent, personaData)
      
      expect(mockPersonaManager.create).toHaveBeenCalledWith(personaData)
      expect(result).toEqual(createdPersona)
    })

    it('should handle creation errors gracefully', async () => {
      const personaData = createTestPersonaData({ id: undefined as any })
      const error = new Error('Failed to create persona')
      
      mockPersonaManager.create = vi.fn().mockRejectedValue(error)
      
      const handler = createPersona(mockPersonaManager)
      
      await expect(handler(mockEvent, personaData)).rejects.toThrow('Failed to create persona')
    })

    it('should validate persona data before creation', async () => {
      const invalidPersonaData = {
        name: '', // Invalid empty name
        description: 'Test description'
        // Missing required fields
      }
      
      const validationError = new Error('Invalid persona data')
      mockPersonaManager.create = vi.fn().mockRejectedValue(validationError)
      
      const handler = createPersona(mockPersonaManager)
      
      await expect(handler(mockEvent, invalidPersonaData)).rejects.toThrow('Invalid persona data')
    })

    it('should handle complex personality configurations', async () => {
      const complexPersonaData = createTestPersonaData({
        id: undefined as any,
        name: 'Complex AI Assistant',
        personality: {
          traits: [
            { name: 'creativity', value: 95, category: 'custom', description: 'Highly creative' },
            { name: 'logic', value: 88, category: 'custom', description: 'Strong logical reasoning' },
            { name: 'empathy', value: 92, category: 'custom', description: 'Very empathetic' }
          ],
          temperament: 'optimistic',
          communicationStyle: 'enthusiastic'
        },
        memoryConfiguration: {
          maxMemories: 2000,
          memoryImportanceThreshold: 75,
          autoOptimize: false,
          retentionPeriod: 60,
          memoryCategories: ['technical', 'creative', 'social', 'analytical'],
          compressionEnabled: false
        }
      })
      
      const createdPersona = createTestPersonaData(complexPersonaData)
      mockPersonaManager.create = vi.fn().mockResolvedValue(createdPersona)
      
      const handler = createPersona(mockPersonaManager)
      const result = await handler(mockEvent, complexPersonaData)
      
      expect(mockPersonaManager.create).toHaveBeenCalledWith(complexPersonaData)
      expect(result.personality.traits).toHaveLength(3)
      expect(result.memoryConfiguration.maxMemories).toBe(2000)
    })
  })

  describe('updatePersona', () => {
    it('should update persona successfully', async () => {
      const personaId = 'test-persona-1'
      const updates = {
        name: 'Updated Assistant',
        description: 'An updated AI assistant',
        personality: {
          traits: [
            { name: 'helpful', value: 90, category: 'custom' }
          ],
          temperament: 'energetic',
          communicationStyle: 'friendly'
        }
      }
      
      const updatedPersona = createTestPersonaData({ ...updates })
      mockPersonaManager.update = vi.fn().mockResolvedValue(updatedPersona)
      
      const handler = updatePersona(mockPersonaManager)
      const result = await handler(mockEvent, personaId, updates)
      
      expect(mockPersonaManager.update).toHaveBeenCalledWith(personaId, updates)
      expect(result).toEqual(updatedPersona)
    })

    it('should handle partial updates', async () => {
      const personaId = 'test-persona-1'
      const partialUpdates = {
        name: 'Partially Updated Name'
      }
      
      const updatedPersona = createTestPersonaData({ name: 'Partially Updated Name' })
      mockPersonaManager.update = vi.fn().mockResolvedValue(updatedPersona)
      
      const handler = updatePersona(mockPersonaManager)
      const result = await handler(mockEvent, personaId, partialUpdates)
      
      expect(mockPersonaManager.update).toHaveBeenCalledWith(personaId, partialUpdates)
      expect(result).toEqual(updatedPersona)
    })

    it('should handle update of non-existent persona', async () => {
      const personaId = 'non-existent-persona'
      const updates = { name: 'Updated Name' }
      const error = new Error('Persona not found')
      
      mockPersonaManager.update = vi.fn().mockRejectedValue(error)
      
      const handler = updatePersona(mockPersonaManager)
      
      await expect(handler(mockEvent, personaId, updates)).rejects.toThrow('Persona not found')
    })

    it('should validate update data', async () => {
      const personaId = 'test-persona-1'
      const invalidUpdates = {
        name: '', // Invalid empty name
        personality: {
          traits: [
            { name: 'invalid', value: 150, category: 'custom' } // Invalid value > 100
          ]
        }
      }
      
      const validationError = new Error('Invalid update data')
      mockPersonaManager.update = vi.fn().mockRejectedValue(validationError)
      
      const handler = updatePersona(mockPersonaManager)
      
      await expect(handler(mockEvent, personaId, invalidUpdates)).rejects.toThrow('Invalid update data')
    })

    it('should handle memory configuration updates', async () => {
      const personaId = 'test-persona-1'
      const memoryUpdates = {
        memoryConfiguration: {
          maxMemories: 1500,
          memoryImportanceThreshold: 60,
          retentionPeriod: 45,
          memoryCategories: ['conversation', 'learning', 'technical'],
          autoOptimize: false,
          compressionEnabled: true
        }
      }
      
      const updatedPersona = createTestPersonaData(memoryUpdates)
      mockPersonaManager.update = vi.fn().mockResolvedValue(updatedPersona)
      
      const handler = updatePersona(mockPersonaManager)
      const result = await handler(mockEvent, personaId, memoryUpdates)
      
      expect(result.memoryConfiguration.maxMemories).toBe(1500)
      expect(result.memoryConfiguration.memoryCategories).toEqual(['conversation', 'learning', 'technical'])
    })

    it('should handle privacy settings updates', async () => {
      const personaId = 'test-persona-1'
      const privacyUpdates = {
        privacySettings: {
          dataCollection: false,
          analyticsEnabled: true,
          shareWithResearchers: false,
          allowPersonalityAnalysis: false,
          memoryRetention: true,
          exportDataAllowed: false
        }
      }
      
      const updatedPersona = createTestPersonaData(privacyUpdates)
      mockPersonaManager.update = vi.fn().mockResolvedValue(updatedPersona)
      
      const handler = updatePersona(mockPersonaManager)
      const result = await handler(mockEvent, personaId, privacyUpdates)
      
      expect(result.privacySettings.dataCollection).toBe(false)
      expect(result.privacySettings.analyticsEnabled).toBe(true)
      expect(result.privacySettings.exportDataAllowed).toBe(false)
    })
  })

  describe('deletePersona', () => {
    it('should delete persona successfully', async () => {
      const personaId = 'test-persona-1'
      
      mockPersonaManager.delete = vi.fn().mockResolvedValue(true)
      
      const handler = deletePersona(mockPersonaManager)
      const result = await handler(mockEvent, personaId)
      
      expect(mockPersonaManager.delete).toHaveBeenCalledWith(personaId)
      expect(result).toBe(true)
    })

    it('should handle deletion of non-existent persona', async () => {
      const personaId = 'non-existent-persona'
      
      mockPersonaManager.delete = vi.fn().mockResolvedValue(false)
      
      const handler = deletePersona(mockPersonaManager)
      const result = await handler(mockEvent, personaId)
      
      expect(mockPersonaManager.delete).toHaveBeenCalledWith(personaId)
      expect(result).toBe(false)
    })

    it('should handle deletion errors', async () => {
      const personaId = 'test-persona-1'
      const error = new Error('Failed to delete persona')
      
      mockPersonaManager.delete = vi.fn().mockRejectedValue(error)
      
      const handler = deletePersona(mockPersonaManager)
      
      await expect(handler(mockEvent, personaId)).rejects.toThrow('Failed to delete persona')
    })

    it('should validate persona ID before deletion', async () => {
      const invalidPersonaId = ''
      const validationError = new Error('Invalid persona ID')
      
      mockPersonaManager.delete = vi.fn().mockRejectedValue(validationError)
      
      const handler = deletePersona(mockPersonaManager)
      
      await expect(handler(mockEvent, invalidPersonaId)).rejects.toThrow('Invalid persona ID')
    })
  })

  describe('getPersona', () => {
    it('should retrieve persona successfully', async () => {
      const personaId = 'test-persona-1'
      const persona = createTestPersonaData()
      
      mockPersonaManager.get = vi.fn().mockResolvedValue(persona)
      
      const handler = getPersona(mockPersonaManager)
      const result = await handler(mockEvent, personaId)
      
      expect(mockPersonaManager.get).toHaveBeenCalledWith(personaId)
      expect(result).toEqual(persona)
    })

    it('should return null for non-existent persona', async () => {
      const personaId = 'non-existent-persona'
      
      mockPersonaManager.get = vi.fn().mockResolvedValue(null)
      
      const handler = getPersona(mockPersonaManager)
      const result = await handler(mockEvent, personaId)
      
      expect(mockPersonaManager.get).toHaveBeenCalledWith(personaId)
      expect(result).toBeNull()
    })

    it('should handle retrieval errors', async () => {
      const personaId = 'test-persona-1'
      const error = new Error('Failed to retrieve persona')
      
      mockPersonaManager.get = vi.fn().mockRejectedValue(error)
      
      const handler = getPersona(mockPersonaManager)
      
      await expect(handler(mockEvent, personaId)).rejects.toThrow('Failed to retrieve persona')
    })

    it('should return complete persona data structure', async () => {
      const personaId = 'test-persona-1'
      const fullPersona = createTestPersonaData({
        name: 'Complete Test Persona',
        personality: {
          traits: [
            { name: 'analytical', value: 85, category: 'custom', description: 'Strong analytical skills' },
            { name: 'creative', value: 78, category: 'custom', description: 'Creative problem solving' },
            { name: 'empathetic', value: 92, category: 'custom', description: 'High emotional intelligence' }
          ],
          temperament: 'balanced',
          communicationStyle: 'adaptive'
        },
        memoryConfiguration: {
          maxMemories: 1200,
          memoryImportanceThreshold: 65,
          autoOptimize: true,
          retentionPeriod: 40,
          memoryCategories: ['conversation', 'learning', 'preference', 'fact', 'creative'],
          compressionEnabled: true
        },
        memories: [], // Will be populated separately
        isActive: true
      })
      
      mockPersonaManager.get = vi.fn().mockResolvedValue(fullPersona)
      
      const handler = getPersona(mockPersonaManager)
      const result = await handler(mockEvent, personaId)
      
      expect(result).toEqual(fullPersona)
      expect(result?.personality.traits).toHaveLength(3)
      expect(result?.memoryConfiguration.memoryCategories).toHaveLength(5)
      expect(result?.isActive).toBe(true)
    })
  })

  describe('listPersonas', () => {
    it('should list all personas successfully', async () => {
      const personas = [
        createTestPersonaData({ id: 'persona-1', name: 'Assistant 1' }),
        createTestPersonaData({ id: 'persona-2', name: 'Assistant 2' }),
        createTestPersonaData({ id: 'persona-3', name: 'Assistant 3' })
      ]
      
      mockPersonaManager.list = vi.fn().mockResolvedValue(personas)
      
      const handler = listPersonas(mockPersonaManager)
      const result = await handler()
      
      expect(mockPersonaManager.list).toHaveBeenCalled()
      expect(result).toEqual(personas)
      expect(result).toHaveLength(3)
    })

    it('should return empty array when no personas exist', async () => {
      mockPersonaManager.list = vi.fn().mockResolvedValue([])
      
      const handler = listPersonas(mockPersonaManager)
      const result = await handler()
      
      expect(mockPersonaManager.list).toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should handle listing errors', async () => {
      const error = new Error('Failed to list personas')
      
      mockPersonaManager.list = vi.fn().mockRejectedValue(error)
      
      const handler = listPersonas(mockPersonaManager)
      
      await expect(handler()).rejects.toThrow('Failed to list personas')
    })

    it('should return personas with correct data structure', async () => {
      const personas = [
        createTestPersonaData({
          id: 'persona-1',
          name: 'Creative Assistant',
          isActive: true,
          personality: {
            traits: [{ name: 'creative', value: 95, category: 'custom' }],
            temperament: 'optimistic',
            communicationStyle: 'enthusiastic'
          }
        }),
        createTestPersonaData({
          id: 'persona-2',
          name: 'Analytical Assistant',
          isActive: false,
          personality: {
            traits: [{ name: 'analytical', value: 90, category: 'custom' }],
            temperament: 'focused',
            communicationStyle: 'precise'
          }
        })
      ]
      
      mockPersonaManager.list = vi.fn().mockResolvedValue(personas)
      
      const handler = listPersonas(mockPersonaManager)
      const result = await handler()
      
      expect(result).toHaveLength(2)
      expect(result[0].isActive).toBe(true)
      expect(result[1].isActive).toBe(false)
      expect(result[0].name).toBe('Creative Assistant')
      expect(result[1].name).toBe('Analytical Assistant')
    })

    it('should handle large numbers of personas efficiently', async () => {
      const largePersonaList = Array.from({ length: 100 }, (_, i) => 
        createTestPersonaData({
          id: `persona-${i + 1}`,
          name: `Assistant ${i + 1}`,
          isActive: i === 0 // Only first one is active
        })
      )
      
      mockPersonaManager.list = vi.fn().mockResolvedValue(largePersonaList)
      
      const handler = listPersonas(mockPersonaManager)
      const startTime = Date.now()
      const result = await handler()
      const endTime = Date.now()
      
      expect(result).toHaveLength(100)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
      expect(result.filter(p => p.isActive)).toHaveLength(1)
    })

    it('should preserve persona data integrity in listings', async () => {
      const personas = [
        createTestPersonaData({
          id: 'persona-1',
          name: 'Test Persona',
          memoryConfiguration: {
            maxMemories: 1500,
            memoryImportanceThreshold: 75,
            autoOptimize: false,
            retentionPeriod: 60,
            memoryCategories: ['custom', 'category'],
            compressionEnabled: true
          },
          privacySettings: {
            dataCollection: false,
            analyticsEnabled: true,
            shareWithResearchers: false,
            allowPersonalityAnalysis: true,
            memoryRetention: false,
            exportDataAllowed: true
          }
        })
      ]
      
      mockPersonaManager.list = vi.fn().mockResolvedValue(personas)
      
      const handler = listPersonas(mockPersonaManager)
      const result = await handler()
      
      const persona = result[0]
      expect(persona.memoryConfiguration.maxMemories).toBe(1500)
      expect(persona.memoryConfiguration.autoOptimize).toBe(false)
      expect(persona.privacySettings.dataCollection).toBe(false)
      expect(persona.privacySettings.analyticsEnabled).toBe(true)
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle null or undefined persona data gracefully', async () => {
      const handler = createPersona(mockPersonaManager)
      
      await expect(handler(mockEvent, null)).rejects.toThrow()
      await expect(handler(mockEvent, undefined)).rejects.toThrow()
    })

    it('should handle malformed persona data', async () => {
      const malformedData = {
        name: 'Test',
        personality: 'not-an-object', // Should be an object
        memoryConfiguration: null, // Should be an object
        privacySettings: 'invalid' // Should be an object
      }
      
      const validationError = new Error('Malformed persona data')
      mockPersonaManager.create = vi.fn().mockRejectedValue(validationError)
      
      const handler = createPersona(mockPersonaManager)
      
      await expect(handler(mockEvent, malformedData)).rejects.toThrow('Malformed persona data')
    })

    it('should handle concurrent operations safely', async () => {
      const personaId = 'test-persona-1'
      const updates1 = { name: 'Update 1' }
      const updates2 = { name: 'Update 2' }
      
      const updatedPersona1 = createTestPersonaData({ name: 'Update 1' })
      const updatedPersona2 = createTestPersonaData({ name: 'Update 2' })
      
      mockPersonaManager.update = vi.fn()
        .mockResolvedValueOnce(updatedPersona1)
        .mockResolvedValueOnce(updatedPersona2)
      
      const handler = updatePersona(mockPersonaManager)
      
      // Simulate concurrent updates
      const [result1, result2] = await Promise.all([
        handler(mockEvent, personaId, updates1),
        handler(mockEvent, personaId, updates2)
      ])
      
      expect(mockPersonaManager.update).toHaveBeenCalledTimes(2)
      expect(result1.name).toBe('Update 1')
      expect(result2.name).toBe('Update 2')
    })

    it('should handle persona manager service unavailability', async () => {
      const unavailableManager = null as any
      
      expect(() => createPersona(unavailableManager)).toThrow()
      expect(() => updatePersona(unavailableManager)).toThrow()
      expect(() => deletePersona(unavailableManager)).toThrow()
      expect(() => getPersona(unavailableManager)).toThrow()
      expect(() => listPersonas(unavailableManager)).toThrow()
    })
  })
})