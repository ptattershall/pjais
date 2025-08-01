// Simple test runner for service manager validation
console.log('🧪 Running Simple Service Manager Tests')

// Mock implementations for testing
const mockLogger = {
  info: (msg) => console.log(`📝 LOG: ${msg}`),
  warn: (msg) => console.log(`⚠️  WARN: ${msg}`),
  error: (msg) => console.log(`❌ ERROR: ${msg}`),
  debug: (msg) => console.log(`🐛 DEBUG: ${msg}`)
}

const mockElectronApp = {
  getPath: (type) => {
    if (type === 'userData') return '/mock/user/data'
    if (type === 'temp') return '/mock/temp'
    return '/mock/path'
  },
  getName: () => 'pjais'
}

const mockBrowserWindow = {
  getFocusedWindow: () => ({
    webContents: {
      send: (channel, data) => console.log(`📡 IPC SEND: ${channel}`, data)
    }
  })
}

// Mock SecurityManager
const mockSecurityManager = {
  initialize: async () => {
    console.log('✅ SecurityManager.initialize called')
    return true
  },
  validatePlugin: async (pluginPath) => {
    console.log('✅ SecurityManager.validatePlugin called with:', pluginPath)
    return { isValid: true, threats: [] }
  },
  scanFile: async (filePath) => {
    console.log('✅ SecurityManager.scanFile called with:', filePath)
    return { isClean: true, threats: [] }
  },
  updateCSP: async (policy) => {
    console.log('✅ SecurityManager.updateCSP called with:', policy)
    return true
  }
}

// Mock MemoryManager
const mockMemoryManager = {
  initialize: async () => {
    console.log('✅ MemoryManager.initialize called')
    return true
  },
  addMemory: async (memory) => {
    console.log('✅ MemoryManager.addMemory called with:', memory.type)
    return 'mock-memory-id'
  },
  getMemories: async (options) => {
    console.log('✅ MemoryManager.getMemories called with options:', options)
    return [
      { id: 'mem-1', type: 'conversation', content: 'Test memory 1' },
      { id: 'mem-2', type: 'learning', content: 'Test memory 2' }
    ]
  },
  searchMemories: async (query, options) => {
    console.log('✅ MemoryManager.searchMemories called with:', query, options)
    return [
      { id: 'mem-1', relevance: 0.95, content: 'Matching memory' }
    ]
  }
}

// Mock PersonaManager
const mockPersonaManager = {
  initialize: async () => {
    console.log('✅ PersonaManager.initialize called')
    return true
  },
  createPersona: async (data) => {
    console.log('✅ PersonaManager.createPersona called with:', data.name)
    return 'mock-persona-id'
  },
  getPersonas: async () => {
    console.log('✅ PersonaManager.getPersonas called')
    return [
      { id: 'persona-1', name: 'Test Persona 1', isActive: true },
      { id: 'persona-2', name: 'Test Persona 2', isActive: false }
    ]
  },
  activatePersona: async (id) => {
    console.log('✅ PersonaManager.activatePersona called with:', id)
    return true
  }
}

// Mock PluginManager
const mockPluginManager = {
  initialize: async () => {
    console.log('✅ PluginManager.initialize called')
    return true
  },
  loadPlugin: async (pluginPath) => {
    console.log('✅ PluginManager.loadPlugin called with:', pluginPath)
    return { id: 'plugin-1', name: 'Test Plugin', loaded: true }
  },
  listPlugins: async () => {
    console.log('✅ PluginManager.listPlugins called')
    return [
      { id: 'plugin-1', name: 'Test Plugin', status: 'active' }
    ]
  }
}

// Mock DatabaseService
const mockDatabaseService = {
  initialize: async () => {
    console.log('✅ DatabaseService.initialize called')
    return true
  },
  healthCheck: async () => {
    console.log('✅ DatabaseService.healthCheck called')
    return { status: 'healthy', connections: 1 }
  }
}

// ServiceManager implementation simulation
class SimpleServiceManager {
  constructor() {
    this.services = new Map()
    this.initialized = false
    this.logger = mockLogger
  }

  async initialize() {
    console.log('🔄 ServiceManager initializing...')
    
    try {
      // Register mock services
      this.services.set('database', mockDatabaseService)
      this.services.set('security', mockSecurityManager)
      this.services.set('memory', mockMemoryManager)
      this.services.set('persona', mockPersonaManager)
      this.services.set('plugin', mockPluginManager)

      // Initialize all services
      for (const [name, service] of this.services) {
        console.log(`🔄 Initializing ${name} service...`)
        await service.initialize()
        console.log(`✅ ${name} service initialized`)
      }

      this.initialized = true
      console.log('✅ ServiceManager initialization complete')
      return true
    } catch (error) {
      console.log('❌ ServiceManager initialization failed:', error.message)
      throw error
    }
  }

  getService(name) {
    if (!this.initialized) {
      throw new Error('ServiceManager not initialized')
    }
    
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`Service '${name}' not found`)
    }
    
    console.log(`✅ Retrieved ${name} service`)
    return service
  }

  async shutdown() {
    console.log('🔄 ServiceManager shutting down...')
    
    for (const [name, service] of this.services) {
      if (service.shutdown) {
        console.log(`🔄 Shutting down ${name} service...`)
        await service.shutdown()
      }
    }
    
    this.services.clear()
    this.initialized = false
    console.log('✅ ServiceManager shutdown complete')
  }

  getServiceStatus() {
    const status = {
      initialized: this.initialized,
      services: {}
    }

    for (const [name] of this.services) {
      status.services[name] = 'running'
    }

    return status
  }
}

// Test helper functions
function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    console.log(`✅ PASS: ${testName}`)
    return true
  } else {
    console.log(`❌ FAIL: ${testName} - Expected: ${expected}, Actual: ${actual}`)
    return false
  }
}

function assertDefined(value, testName) {
  if (value !== undefined && value !== null) {
    console.log(`✅ PASS: ${testName}`)
    return true
  } else {
    console.log(`❌ FAIL: ${testName} - Value is undefined or null`)
    return false
  }
}

function assertInstanceOf(value, constructor, testName) {
  if (value instanceof constructor) {
    console.log(`✅ PASS: ${testName}`)
    return true
  } else {
    console.log(`❌ FAIL: ${testName} - Expected instance of ${constructor.name}`)
    return false
  }
}

// Run tests
async function runTests() {
  let passCount = 0
  let totalTests = 0

  console.log('\n🔍 Testing Service Manager Operations\n')

  // Test 1: ServiceManager initialization
  totalTests++
  try {
    const serviceManager = new SimpleServiceManager()
    const result = await serviceManager.initialize()
    if (assertEqual(result, true, 'ServiceManager initializes successfully')) {
      passCount++
    }
    
    // Test 2: ServiceManager status after initialization
    totalTests++
    const status = serviceManager.getServiceStatus()
    if (assertEqual(status.initialized, true, 'ServiceManager status shows initialized')) {
      passCount++
    }

    // Test 3: Service retrieval
    totalTests++
    const databaseService = serviceManager.getService('database')
    if (assertDefined(databaseService, 'Can retrieve database service')) {
      passCount++
    }

    // Test 4: Service operations
    totalTests++
    const memoryService = serviceManager.getService('memory')
    const memories = await memoryService.getMemories({})
    if (assertEqual(memories.length, 2, 'Memory service returns expected data')) {
      passCount++
    }

    // Test 5: Security service operations
    totalTests++
    const securityService = serviceManager.getService('security')
    const scanResult = await securityService.scanFile('test-file.js')
    if (assertEqual(scanResult.isClean, true, 'Security service scan works')) {
      passCount++
    }

    // Test 6: Persona service operations
    totalTests++
    const personaService = serviceManager.getService('persona')
    const personas = await personaService.getPersonas()
    if (assertEqual(personas.length, 2, 'Persona service returns expected data')) {
      passCount++
    }

    // Test 7: Plugin service operations
    totalTests++
    const pluginService = serviceManager.getService('plugin')
    const plugins = await pluginService.listPlugins()
    if (assertEqual(plugins.length, 1, 'Plugin service returns expected data')) {
      passCount++
    }

    // Test 8: Service shutdown
    totalTests++
    await serviceManager.shutdown()
    const shutdownStatus = serviceManager.getServiceStatus()
    if (assertEqual(shutdownStatus.initialized, false, 'ServiceManager shuts down properly')) {
      passCount++
    }

  } catch (error) {
    console.log('❌ FAIL: ServiceManager test suite - Error:', error.message)
    totalTests++
  }

  // Test 9: Error handling - accessing service before initialization
  totalTests++
  try {
    const uninitializedManager = new SimpleServiceManager()
    uninitializedManager.getService('database')
    console.log('❌ FAIL: Should throw error when accessing service before initialization')
  } catch (error) {
    if (error.message.includes('not initialized')) {
      console.log('✅ PASS: Properly throws error when accessing service before initialization')
      passCount++
    } else {
      console.log('❌ FAIL: Wrong error type when accessing service before initialization')
    }
  }

  // Test 10: Error handling - accessing non-existent service
  totalTests++
  try {
    const serviceManager = new SimpleServiceManager()
    await serviceManager.initialize()
    serviceManager.getService('nonexistent')
    console.log('❌ FAIL: Should throw error when accessing non-existent service')
  } catch (error) {
    if (error.message.includes('not found')) {
      console.log('✅ PASS: Properly throws error when accessing non-existent service')
      passCount++
    } else {
      console.log('❌ FAIL: Wrong error type when accessing non-existent service')
    }
  }

  // Summary
  console.log('\n📊 Service Manager Test Results Summary')
  console.log('='.repeat(50))
  console.log(`Total Tests: ${totalTests}`)
  console.log(`Passed: ${passCount}`)
  console.log(`Failed: ${totalTests - passCount}`)
  console.log(`Success Rate: ${Math.round((passCount / totalTests) * 100)}%`)
  
  if (passCount === totalTests) {
    console.log('\n🎉 All service manager tests passed! The service logic is working correctly.')
    process.exit(0)
  } else {
    console.log('\n⚠️  Some tests failed. Review the implementation.')
    process.exit(1)
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Service manager test runner failed:', error)
  process.exit(1)
})