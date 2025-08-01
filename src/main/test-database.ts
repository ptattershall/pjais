import { DatabaseManager } from './services/database-manager'

/**
 * Simple test script to verify LiveStore database functionality
 * This will be called during development to test database operations
 */
export async function testDatabase(): Promise<boolean> {
  console.log('🧪 Starting LiveStore Database Test...')
  
  const dbManager = new DatabaseManager()
  
  try {
    // Initialize database
    console.log('📊 Initializing database...')
    await dbManager.initialize()
    
    // Test persona creation
    console.log('👤 Creating test persona...')
    const personaId = await dbManager.createPersona({
      name: 'Test Assistant',
      description: 'A test AI assistant for database validation',
      personality: {
        traits: ['helpful', 'analytical'],
        temperament: 'balanced',
        communicationStyle: 'professional'
      }
    })
    console.log(`✅ Created persona with ID: ${personaId}`)
    
    // Test persona retrieval
    console.log('🔍 Retrieving persona...')
    const retrievedPersona = await dbManager.getPersona(personaId)
    if (retrievedPersona) {
      console.log(`✅ Retrieved persona: ${retrievedPersona.name}`)
    } else {
      console.log('❌ Failed to retrieve persona')
      return false
    }
    
    // Test persona activation
    console.log('🔄 Activating persona...')
    await dbManager.activatePersona(personaId)
    
    const activePersona = await dbManager.getActivePersona()
    if (activePersona && activePersona.id === personaId) {
      console.log('✅ Persona activated successfully')
    } else {
      console.log('❌ Failed to activate persona')
      return false
    }
    
    // Test memory creation
    console.log('🧠 Creating test memory...')
    const memoryId = await dbManager.createMemoryEntity({
      personaId,
      type: 'text',
      content: 'This is a test memory for database validation',
      importance: 75
    })
    console.log(`✅ Created memory with ID: ${memoryId}`)
    
    // Test memory retrieval
    console.log('🔍 Retrieving memory...')
    const retrievedMemory = await dbManager.getMemoryEntity(memoryId)
    if (retrievedMemory) {
      console.log(`✅ Retrieved memory with importance: ${retrievedMemory.importance}`)
    } else {
      console.log('❌ Failed to retrieve memory')
      return false
    }
    
    // Test getting persona memories
    console.log('📚 Getting persona memories...')
    const personaMemories = await dbManager.getPersonaMemories(personaId)
    console.log(`✅ Found ${personaMemories.length} memories for persona`)
    
    // Test database stats
    console.log('📈 Getting database stats...')
    const stats = await dbManager.getStats()
    console.log(`✅ Database stats:`)
    console.log(`   Personas: ${stats.personaCount}`)
    console.log(`   Memories: ${stats.memoryCount}`)
    console.log(`   Conversations: ${stats.conversationCount}`)
    
    // Test persistence by shutting down and restarting
    console.log('🔄 Testing persistence...')
    await dbManager.shutdown()
    
    const dbManager2 = new DatabaseManager()
    await dbManager2.initialize()
    
    const persistedPersona = await dbManager2.getPersona(personaId)
    if (persistedPersona && persistedPersona.name === 'Test Assistant') {
      console.log('✅ Data persisted successfully across restarts')
    } else {
      console.log('❌ Data persistence failed')
      return false
    }
    
    await dbManager2.shutdown()
    
    console.log('🎉 All database tests passed!')
    return true
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
    await dbManager.shutdown()
    return false
  }
}

// Export for use in main process or development testing
export { DatabaseManager } 