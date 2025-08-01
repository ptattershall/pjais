/**
 * Test Utilities for PJAIS Electron Application
 * 
 * This module provides common testing utilities, mocks, and helpers
 * for testing Electron applications with Effect SQL, React components,
 * and complex service integrations.
 */

import { vi } from 'vitest'
import { Effect, Layer, Context } from 'effect'
import { SqlClient } from '@effect/sql'
import { SqliteClient } from '@effect/sql-sqlite-node'
import { PersonaData } from '../shared/types/persona'
import { MemoryEntity } from '../shared/types/memory'
import { PluginManifest } from '../shared/types/plugin'
import { SecurityEvent } from '../shared/types/security'

// =============================================================================
// DATABASE TEST UTILITIES
// =============================================================================

/**
 * Create an in-memory test database layer
 */
export const createTestDatabaseLayer = () => {
  return SqliteClient.layer({
    filename: ':memory:',
    transformQueryNames: (str) => str.toLowerCase()
  })
}

/**
 * Setup test database schema for integration tests
 */
export const setupTestSchema = (sql: SqlClient.SqlClient) => 
  Effect.gen(function* () {
    // Create personas table
    yield* sql`
      CREATE TABLE IF NOT EXISTS personas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        personality_traits TEXT DEFAULT '[]',
        personality_temperament TEXT DEFAULT 'balanced',
        personality_communication_style TEXT DEFAULT 'conversational',
        memory_max_memories INTEGER DEFAULT 1000,
        memory_importance_threshold INTEGER DEFAULT 50,
        memory_auto_optimize BOOLEAN DEFAULT TRUE,
        memory_retention_period INTEGER DEFAULT 30,
        memory_categories TEXT DEFAULT '["conversation","learning","preference","fact"]',
        memory_compression_enabled BOOLEAN DEFAULT TRUE,
        privacy_data_collection BOOLEAN DEFAULT TRUE,
        privacy_analytics_enabled BOOLEAN DEFAULT FALSE,
        privacy_share_with_researchers BOOLEAN DEFAULT FALSE,
        privacy_allow_personality_analysis BOOLEAN DEFAULT TRUE,
        privacy_memory_retention BOOLEAN DEFAULT TRUE,
        privacy_export_data_allowed BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create memory entities table
    yield* sql`
      CREATE TABLE IF NOT EXISTS memory_entities (
        id TEXT PRIMARY KEY,
        persona_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT DEFAULT '',
        content TEXT NOT NULL,
        summary TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        importance INTEGER DEFAULT 50,
        memory_tier TEXT DEFAULT 'active',
        embedding TEXT DEFAULT NULL,
        embedding_model TEXT DEFAULT NULL,
        access_count INTEGER DEFAULT 0,
        last_accessed DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
      )
    `

    // Create conversations table
    yield* sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        persona_id TEXT NOT NULL,
        title TEXT NOT NULL,
        messages TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
      )
    `

    // Create triggers
    yield* sql`
      CREATE TRIGGER IF NOT EXISTS trigger_personas_updated_at
        AFTER UPDATE ON personas
        FOR EACH ROW
      BEGIN
        UPDATE personas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `

    yield* sql`
      CREATE TRIGGER IF NOT EXISTS trigger_memory_entities_updated_at
        AFTER UPDATE ON memory_entities
        FOR EACH ROW
      BEGIN
        UPDATE memory_entities SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `

    yield* sql`
      CREATE TRIGGER IF NOT EXISTS trigger_conversations_updated_at
        AFTER UPDATE ON conversations
        FOR EACH ROW
      BEGIN
        UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `
  })

/**
 * Clean up test database tables
 */
export const cleanupTestDatabase = (sql: SqlClient.SqlClient) =>
  Effect.gen(function* () {
    yield* sql`DELETE FROM conversations`
    yield* sql`DELETE FROM memory_entities`
    yield* sql`DELETE FROM personas`
  })

// =============================================================================
// DATA FACTORIES
// =============================================================================

/**
 * Create test persona data with reasonable defaults
 */
export const createTestPersona = (overrides: Partial<PersonaData> = {}): PersonaData => ({
  id: `persona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Assistant',
  description: 'A helpful AI assistant for testing purposes',
  personality: {
    traits: [
      { name: 'helpful', value: 85, category: 'custom' },
      { name: 'analytical', value: 75, category: 'custom' },
      { name: 'creative', value: 65, category: 'custom' }
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

/**
 * Create test memory entity with reasonable defaults
 */
export const createTestMemory = (overrides: Partial<MemoryEntity> = {}): MemoryEntity => ({
  id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  personaId: 'test-persona-id',
  type: 'text',
  content: 'This is a test memory about artificial intelligence and machine learning concepts.',
  importance: 75,
  tags: ['ai', 'ml', 'testing', 'knowledge'],
  memoryTier: 'hot',
  createdAt: new Date(),
  lastAccessed: new Date(),
  ...overrides
})

/**
 * Create test plugin manifest
 */
export const createTestPlugin = (overrides: Partial<PluginManifest> = {}): PluginManifest => ({
  id: `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Plugin',
  version: '1.0.0',
  description: 'A test plugin for unit testing',
  author: 'Test Suite',
  permissions: ['memory:read', 'memory:write'],
  entryPoint: 'index.js',
  apiVersion: '1.0',
  ...overrides
})

/**
 * Create test security event
 */
export const createTestSecurityEvent = (overrides: Partial<SecurityEvent> = {}): SecurityEvent => ({
  id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: 'security_violation',
  severity: 'medium',
  source: 'test-source',
  description: 'Test security event for unit testing',
  timestamp: new Date(),
  metadata: {
    component: 'test-component',
    action: 'test-action',
    userId: 'test-user'
  },
  ...overrides
})

// =============================================================================
// MOCK FACTORIES
// =============================================================================

/**
 * Create mock PersonaManager with common methods
 */
export const createMockPersonaManager = () => ({
  create: vi.fn().mockResolvedValue(createTestPersona()),
  update: vi.fn().mockResolvedValue(createTestPersona()),
  delete: vi.fn().mockResolvedValue(true),
  get: vi.fn().mockResolvedValue(createTestPersona()),
  list: vi.fn().mockResolvedValue([createTestPersona()]),
  activate: vi.fn().mockResolvedValue(undefined),
  deactivate: vi.fn().mockResolvedValue(undefined),
  getActive: vi.fn().mockResolvedValue(createTestPersona({ isActive: true })),
  getHealth: vi.fn().mockResolvedValue({ status: 'healthy', lastCheck: new Date() }),
  initialize: vi.fn().mockResolvedValue(undefined),
  shutdown: vi.fn().mockResolvedValue(undefined)
})

/**
 * Create mock MemoryManager with common methods
 */
export const createMockMemoryManager = () => ({
  create: vi.fn().mockResolvedValue(createTestMemory()),
  update: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(true),
  get: vi.fn().mockResolvedValue(createTestMemory()),
  list: vi.fn().mockResolvedValue([createTestMemory()]),
  search: vi.fn().mockResolvedValue({ memories: [createTestMemory()], total: 1 }),
  semanticSearch: vi.fn().mockResolvedValue({ results: [], totalMatches: 0, processingTime: 100 }),
  optimizeMemoryTiers: vi.fn().mockResolvedValue({ processed: 100, promoted: 10, demoted: 15 }),
  getMemoryTierMetrics: vi.fn().mockResolvedValue({ totalMemories: 100, tierDistribution: { hot: 30, warm: 40, cold: 30 } }),
  getHealth: vi.fn().mockResolvedValue({ status: 'healthy', lastCheck: new Date() }),
  initialize: vi.fn().mockResolvedValue(undefined),
  shutdown: vi.fn().mockResolvedValue(undefined)
})

/**
 * Create mock SecurityManager with common methods
 */
export const createMockSecurityManager = () => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  shutdown: vi.fn().mockResolvedValue(undefined),
  getSecurityEventLogger: vi.fn().mockReturnValue({
    logEvent: vi.fn(),
    getEvents: vi.fn().mockResolvedValue([])
  }),
  getEncryptionService: vi.fn().mockReturnValue({
    encrypt: vi.fn().mockResolvedValue('encrypted-data'),
    decrypt: vi.fn().mockResolvedValue('decrypted-data')
  }),
  getDataProtectionManager: vi.fn().mockReturnValue({
    anonymize: vi.fn().mockResolvedValue({}),
    enforceRetentionPolicy: vi.fn().mockResolvedValue(undefined)
  }),
  getCSPManager: vi.fn().mockReturnValue({
    generateHeaders: vi.fn().mockReturnValue('default-src self'),
    reportViolation: vi.fn().mockResolvedValue(undefined)
  }),
  validatePluginManifest: vi.fn().mockResolvedValue(true),
  validatePluginSignature: vi.fn().mockResolvedValue(true),
  createPluginSandbox: vi.fn().mockResolvedValue({}),
  checkMemoryAccess: vi.fn().mockResolvedValue(true),
  checkPluginPermission: vi.fn().mockResolvedValue(true),
  validateCommunication: vi.fn().mockResolvedValue(true),
  getSecurityMetrics: vi.fn().mockResolvedValue({ totalEvents: 0, eventsByType: {}, eventsBySeverity: {} }),
  generateSecurityReport: vi.fn().mockResolvedValue({ summary: {}, events: [], recommendations: [] }),
  analyzeSecurityTrends: vi.fn().mockResolvedValue({ trends: [], anomalies: [], riskScore: 0 }),
  checkCompliance: vi.fn().mockResolvedValue({ framework: 'test', compliant: true, gaps: [], recommendations: [] }),
  getAuditTrail: vi.fn().mockResolvedValue({ entries: [], totalCount: 0, integrity: {} }),
  exportAuditLogs: vi.fn().mockResolvedValue({ format: 'json', data: '[]', checksum: 'abc123', exportDate: new Date() }),
  getHealth: vi.fn().mockResolvedValue({ status: 'healthy', lastCheck: new Date() })
})

/**
 * Create mock DatabaseManager with common methods
 */
export const createMockDatabaseManager = () => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  shutdown: vi.fn().mockResolvedValue(undefined),
  createPersona: vi.fn().mockResolvedValue('persona-id'),
  updatePersona: vi.fn().mockResolvedValue(undefined),
  getPersona: vi.fn().mockResolvedValue(createTestPersona()),
  deletePersona: vi.fn().mockResolvedValue(true),
  createMemoryEntity: vi.fn().mockResolvedValue('memory-id'),
  updateMemoryEntity: vi.fn().mockResolvedValue(undefined),
  getMemoryEntity: vi.fn().mockResolvedValue(createTestMemory()),
  deleteMemoryEntity: vi.fn().mockResolvedValue(true),
  searchMemories: vi.fn().mockResolvedValue({ memories: [createTestMemory()], total: 1 }),
  getHealth: vi.fn().mockResolvedValue({ status: 'healthy', lastCheck: new Date() })
})

// =============================================================================
// ELECTRON MOCKS
// =============================================================================

/**
 * Mock Electron's main process APIs
 */
export const createElectronMocks = () => {
  const mockApp = {
    getVersion: vi.fn().mockReturnValue('1.0.0'),
    getPath: vi.fn().mockImplementation((name: string) => `/mock/path/${name}`),
    getName: vi.fn().mockReturnValue('PJAIS'),
    quit: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    whenReady: vi.fn().mockResolvedValue(undefined)
  }

  const mockBrowserWindow = vi.fn().mockImplementation(() => ({
    loadFile: vi.fn().mockResolvedValue(undefined),
    loadURL: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    once: vi.fn(),
    webContents: {
      on: vi.fn(),
      send: vi.fn(),
      openDevTools: vi.fn()
    },
    show: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn()
  }))

  const mockIpcMain = {
    handle: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeHandler: vi.fn(),
    removeAllListeners: vi.fn()
  }

  const mockMenu = {
    buildFromTemplate: vi.fn().mockReturnValue({
      popup: vi.fn()
    }),
    setApplicationMenu: vi.fn()
  }

  const mockShell = {
    openExternal: vi.fn().mockResolvedValue(undefined),
    openPath: vi.fn().mockResolvedValue('')
  }

  return {
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    ipcMain: mockIpcMain,
    Menu: mockMenu,
    shell: mockShell
  }
}

/**
 * Mock IPC event object
 */
export const createMockIpcEvent = () => ({
  reply: vi.fn(),
  sender: {
    send: vi.fn(),
    id: 1
  },
  frameId: 0,
  processId: 1234
})

// =============================================================================
// TESTING HELPERS
// =============================================================================

/**
 * Wait for a specified amount of time (useful for testing async operations)
 */
export const wait = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms))

/**
 * Create a promise that can be resolved externally (useful for testing race conditions)
 */
export const createDeferred = <T>() => {
  let resolve: (value: T) => void
  let reject: (reason?: any) => void
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  
  return { promise, resolve: resolve!, reject: reject! }
}

/**
 * Measure execution time of a function
 */
export const measureTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = Date.now()
  const result = await fn()
  const duration = Date.now() - start
  return { result, duration }
}

/**
 * Generate random test data
 */
export const generateRandomString = (length: number = 10): string => {
  return Math.random().toString(36).substring(2, 2 + length)
}

export const generateRandomNumber = (min: number = 0, max: number = 100): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Create a batch of test data
 */
export const createTestBatch = <T>(factory: () => T, count: number): T[] => {
  return Array.from({ length: count }, factory)
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Assert that a promise rejects with a specific error message
 */
export const expectToRejectWith = async (promise: Promise<any>, expectedMessage: string) => {
  try {
    await promise
    throw new Error('Expected promise to reject, but it resolved')
  } catch (error) {
    if (error instanceof Error) {
      expect(error.message).toContain(expectedMessage)
    } else {
      throw new Error('Expected error to be an Error instance')
    }
  }
}

/**
 * Assert that a value is within a certain range
 */
export const expectInRange = (value: number, min: number, max: number) => {
  expect(value).toBeGreaterThanOrEqual(min)
  expect(value).toBeLessThanOrEqual(max)
}

/**
 * Assert that an array contains specific elements
 */
export const expectArrayToContain = <T>(array: T[], expectedElements: T[]) => {
  expectedElements.forEach(element => {
    expect(array).toContain(element)
  })
}

/**
 * Assert that an object has specific properties with expected types
 */
export const expectObjectShape = (obj: any, shape: Record<string, string>) => {
  Object.entries(shape).forEach(([key, expectedType]) => {
    expect(obj).toHaveProperty(key)
    expect(typeof obj[key]).toBe(expectedType)
  })
}

// =============================================================================
// PERFORMANCE TESTING UTILITIES
// =============================================================================

/**
 * Performance test configuration
 */
export interface PerformanceTestConfig {
  iterations: number
  maxDuration: number // milliseconds
  warmupIterations?: number
}

/**
 * Run a performance test
 */
export const runPerformanceTest = async <T>(
  testFn: () => Promise<T>,
  config: PerformanceTestConfig
): Promise<{
  averageDuration: number
  minDuration: number
  maxDuration: number
  totalDuration: number
  iterations: number
}> => {
  const { iterations, maxDuration, warmupIterations = 5 } = config
  const durations: number[] = []

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    await testFn()
  }

  // Actual test
  for (let i = 0; i < iterations; i++) {
    const { duration } = await measureTime(testFn)
    durations.push(duration)
    
    if (duration > maxDuration) {
      throw new Error(`Performance test failed: iteration ${i + 1} took ${duration}ms, exceeding limit of ${maxDuration}ms`)
    }
  }

  const totalDuration = durations.reduce((sum, d) => sum + d, 0)
  const averageDuration = totalDuration / iterations
  const minDuration = Math.min(...durations)
  const maxDurationActual = Math.max(...durations)

  return {
    averageDuration,
    minDuration,
    maxDuration: maxDurationActual,
    totalDuration,
    iterations
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export * from '../shared/types/persona'
export * from '../shared/types/memory'
export * from '../shared/types/plugin'
export * from '../shared/types/security'
export * from '../shared/types/system'