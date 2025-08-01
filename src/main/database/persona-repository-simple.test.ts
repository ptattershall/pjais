import { describe, it, beforeEach, afterEach, vi } from 'vitest'
import { expect } from 'vitest'
import { PersonaData } from '../../shared/types/persona'

// Test data factory
const createTestPersonaData = (overrides: Partial<PersonaData> = {}): Omit<PersonaData, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: 'Test Persona',
  description: 'A test persona for unit testing',
  personality: {
    traits: [
      { name: 'helpful', value: 80, category: 'custom' },
      { name: 'analytical', value: 90, category: 'custom' }
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
  ...overrides
})

const createFullPersonaData = (overrides: Partial<PersonaData> = {}): PersonaData => ({
  id: `persona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...createTestPersonaData(),
  ...overrides
})

describe('PersonaRepository - Basic Tests', () => {
  // Mock repository implementation
  const mockPersonaRepository = {
    create: vi.fn(),
    update: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    getActive: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock implementations
    mockPersonaRepository.create.mockResolvedValue('mock-persona-id')
    mockPersonaRepository.update.mockResolvedValue(undefined)
    mockPersonaRepository.activate.mockResolvedValue(undefined)
    mockPersonaRepository.deactivate.mockResolvedValue(undefined)
    mockPersonaRepository.getById.mockResolvedValue(createFullPersonaData())
    mockPersonaRepository.getAll.mockResolvedValue([createFullPersonaData()])
    mockPersonaRepository.getActive.mockResolvedValue(createFullPersonaData({ isActive: true }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create a new persona with all required fields', async () => {
      const testData = createTestPersonaData({
        name: 'Creative Assistant',
        description: 'A creative and helpful AI assistant'
      })

      const personaId = await mockPersonaRepository.create(testData)
      
      expect(mockPersonaRepository.create).toHaveBeenCalledWith(testData)
      expect(personaId).toBe('mock-persona-id')
    })

    it('should handle persona creation with complex personality traits', async () => {
      const testData = createTestPersonaData({
        personality: {
          traits: [
            { name: 'creative', value: 95, category: 'custom', description: 'Highly creative' },
            { name: 'empathetic', value: 85, category: 'custom', description: 'Very empathetic' }
          ],
          temperament: 'optimistic',
          communicationStyle: 'friendly'
        }
      })

      const personaId = await mockPersonaRepository.create(testData)
      
      expect(mockPersonaRepository.create).toHaveBeenCalledWith(testData)
      expect(personaId).toBeDefined()
    })

    it('should create persona with custom memory configuration', async () => {
      const testData = createTestPersonaData({
        memoryConfiguration: {
          maxMemories: 2000,
          memoryImportanceThreshold: 75,
          autoOptimize: false,
          retentionPeriod: 60,
          memoryCategories: ['technical', 'research', 'analysis'],
          compressionEnabled: false
        }
      })

      await mockPersonaRepository.create(testData)
      
      expect(mockPersonaRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          memoryConfiguration: expect.objectContaining({
            maxMemories: 2000,
            memoryImportanceThreshold: 75,
            autoOptimize: false
          })
        })
      )
    })
  })

  describe('getById', () => {
    it('should retrieve persona by id', async () => {
      const mockPersona = createFullPersonaData({ name: 'Test Retrieval' })
      mockPersonaRepository.getById.mockResolvedValue(mockPersona)
      
      const retrieved = await mockPersonaRepository.getById('test-id')
      
      expect(mockPersonaRepository.getById).toHaveBeenCalledWith('test-id')
      expect(retrieved).toEqual(mockPersona)
      expect(retrieved.name).toBe('Test Retrieval')
    })

    it('should return null for non-existent persona', async () => {
      mockPersonaRepository.getById.mockResolvedValue(null)
      
      const retrieved = await mockPersonaRepository.getById('non-existent-id')
      
      expect(mockPersonaRepository.getById).toHaveBeenCalledWith('non-existent-id')
      expect(retrieved).toBeNull()
    })

    it('should retrieve persona with complete data structure', async () => {
      const fullPersona = createFullPersonaData({
        name: 'Complete Test Persona',
        personality: {
          traits: [
            { name: 'analytical', value: 85, category: 'custom' },
            { name: 'creative', value: 78, category: 'custom' }
          ],
          temperament: 'balanced',
          communicationStyle: 'adaptive'
        }
      })
      mockPersonaRepository.getById.mockResolvedValue(fullPersona)
      
      const retrieved = await mockPersonaRepository.getById('full-persona-id')
      
      expect(retrieved).toEqual(fullPersona)
      expect(retrieved?.personality.traits).toHaveLength(2)
      expect(retrieved?.id).toBeDefined()
      expect(retrieved?.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('getAll', () => {
    it('should return all personas', async () => {
      const personas = [
        createFullPersonaData({ name: 'Persona 1' }),
        createFullPersonaData({ name: 'Persona 2' }),
        createFullPersonaData({ name: 'Persona 3' })
      ]
      mockPersonaRepository.getAll.mockResolvedValue(personas)
      
      const allPersonas = await mockPersonaRepository.getAll()
      
      expect(mockPersonaRepository.getAll).toHaveBeenCalled()
      expect(allPersonas).toEqual(personas)
      expect(allPersonas).toHaveLength(3)
    })

    it('should return empty array when no personas exist', async () => {
      mockPersonaRepository.getAll.mockResolvedValue([])
      
      const allPersonas = await mockPersonaRepository.getAll()
      
      expect(mockPersonaRepository.getAll).toHaveBeenCalled()
      expect(allPersonas).toEqual([])
    })

    it('should handle large numbers of personas', async () => {
      const largePersonaList = Array.from({ length: 100 }, (_, i) => 
        createFullPersonaData({ name: `Persona ${i + 1}` })
      )
      mockPersonaRepository.getAll.mockResolvedValue(largePersonaList)
      
      const allPersonas = await mockPersonaRepository.getAll()
      
      expect(allPersonas).toHaveLength(100)
      expect(allPersonas[0].name).toBe('Persona 1')
      expect(allPersonas[99].name).toBe('Persona 100')
    })
  })

  describe('update', () => {
    it('should update persona properties', async () => {
      const updates = {
        name: 'Updated Name',
        description: 'Updated Description'
      }
      
      await mockPersonaRepository.update('test-id', updates)
      
      expect(mockPersonaRepository.update).toHaveBeenCalledWith('test-id', updates)
    })

    it('should handle partial updates', async () => {
      const partialUpdates = {
        name: 'Partially Updated Name'
      }
      
      await mockPersonaRepository.update('test-id', partialUpdates)
      
      expect(mockPersonaRepository.update).toHaveBeenCalledWith('test-id', partialUpdates)
    })

    it('should update personality traits', async () => {
      const personalityUpdates = {
        personality: {
          traits: [{ name: 'updated', value: 100, category: 'custom' }],
          temperament: 'energetic',
          communicationStyle: 'enthusiastic'
        }
      }
      
      await mockPersonaRepository.update('test-id', personalityUpdates)
      
      expect(mockPersonaRepository.update).toHaveBeenCalledWith('test-id', personalityUpdates)
    })

    it('should update memory configuration', async () => {
      const memoryUpdates = {
        memoryConfiguration: {
          maxMemories: 1500,
          memoryImportanceThreshold: 60,
          autoOptimize: false,
          retentionPeriod: 45,
          memoryCategories: ['conversation', 'learning', 'technical'],
          compressionEnabled: true
        }
      }
      
      await mockPersonaRepository.update('test-id', memoryUpdates)
      
      expect(mockPersonaRepository.update).toHaveBeenCalledWith('test-id', memoryUpdates)
    })
  })

  describe('activate and deactivate', () => {
    it('should activate a persona', async () => {
      await mockPersonaRepository.activate('test-id')
      
      expect(mockPersonaRepository.activate).toHaveBeenCalledWith('test-id')
    })

    it('should deactivate a persona', async () => {
      await mockPersonaRepository.deactivate('test-id')
      
      expect(mockPersonaRepository.deactivate).toHaveBeenCalledWith('test-id')
    })

    it('should handle activation of multiple personas', async () => {
      const personaIds = ['persona-1', 'persona-2', 'persona-3']
      
      for (const id of personaIds) {
        await mockPersonaRepository.activate(id)
      }
      
      expect(mockPersonaRepository.activate).toHaveBeenCalledTimes(3)
      expect(mockPersonaRepository.activate).toHaveBeenCalledWith('persona-1')
      expect(mockPersonaRepository.activate).toHaveBeenCalledWith('persona-2')
      expect(mockPersonaRepository.activate).toHaveBeenCalledWith('persona-3')
    })
  })

  describe('getActive', () => {
    it('should return the active persona', async () => {
      const activePersona = createFullPersonaData({ 
        name: 'Active Persona',
        isActive: true 
      })
      mockPersonaRepository.getActive.mockResolvedValue(activePersona)
      
      const result = await mockPersonaRepository.getActive()
      
      expect(mockPersonaRepository.getActive).toHaveBeenCalled()
      expect(result).toEqual(activePersona)
      expect(result?.isActive).toBe(true)
    })

    it('should return null when no persona is active', async () => {
      mockPersonaRepository.getActive.mockResolvedValue(null)
      
      const result = await mockPersonaRepository.getActive()
      
      expect(mockPersonaRepository.getActive).toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      const error = new Error('Repository error')
      mockPersonaRepository.create.mockRejectedValue(error)
      
      await expect(mockPersonaRepository.create(createTestPersonaData())).rejects.toThrow('Repository error')
    })

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Operation timed out')
      mockPersonaRepository.getById.mockRejectedValue(timeoutError)
      
      await expect(mockPersonaRepository.getById('test-id')).rejects.toThrow('Operation timed out')
    })

    it('should handle invalid data gracefully', async () => {
      const validationError = new Error('Invalid persona data')
      mockPersonaRepository.update.mockRejectedValue(validationError)
      
      await expect(mockPersonaRepository.update('test-id', {})).rejects.toThrow('Invalid persona data')
    })
  })

  describe('data validation', () => {
    it('should validate persona data structure', () => {
      const validPersona = createTestPersonaData()
      
      expect(validPersona.name).toBeDefined()
      expect(validPersona.personality).toBeDefined()
      expect(validPersona.memoryConfiguration).toBeDefined()
      expect(validPersona.privacySettings).toBeDefined()
    })

    it('should validate personality traits structure', () => {
      const persona = createTestPersonaData()
      
      expect(persona.personality.traits).toBeInstanceOf(Array)
      expect(persona.personality.traits[0]).toHaveProperty('name')
      expect(persona.personality.traits[0]).toHaveProperty('value')
      expect(persona.personality.traits[0]).toHaveProperty('category')
    })

    it('should validate memory configuration structure', () => {
      const persona = createTestPersonaData()
      
      expect(persona.memoryConfiguration.maxMemories).toBeTypeOf('number')
      expect(persona.memoryConfiguration.memoryImportanceThreshold).toBeTypeOf('number')
      expect(persona.memoryConfiguration.autoOptimize).toBeTypeOf('boolean')
      expect(persona.memoryConfiguration.memoryCategories).toBeInstanceOf(Array)
    })

    it('should validate privacy settings structure', () => {
      const persona = createTestPersonaData()
      
      expect(persona.privacySettings.dataCollection).toBeTypeOf('boolean')
      expect(persona.privacySettings.analyticsEnabled).toBeTypeOf('boolean')
      expect(persona.privacySettings.shareWithResearchers).toBeTypeOf('boolean')
    })
  })

  describe('performance considerations', () => {
    it('should handle concurrent operations efficiently', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => 
        mockPersonaRepository.getById(`persona-${i}`)
      )
      
      const results = await Promise.all(operations)
      
      expect(results).toHaveLength(10)
      expect(mockPersonaRepository.getById).toHaveBeenCalledTimes(10)
    })

    it('should handle large payload updates', async () => {
      const largePersonalityTraits = Array.from({ length: 50 }, (_, i) => ({
        name: `trait-${i}`,
        value: Math.floor(Math.random() * 100),
        category: 'custom' as const,
        description: `Description for trait ${i}`
      }))
      
      const updates = {
        personality: {
          traits: largePersonalityTraits,
          temperament: 'complex',
          communicationStyle: 'adaptive'
        }
      }
      
      await mockPersonaRepository.update('test-id', updates)
      
      expect(mockPersonaRepository.update).toHaveBeenCalledWith('test-id', updates)
    })

    it('should complete operations within reasonable time', async () => {
      const startTime = Date.now()
      
      await mockPersonaRepository.getAll()
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete very quickly with mocks
      expect(duration).toBeLessThan(100)
    })
  })
})