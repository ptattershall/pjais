# LiveStore Best Practices for PajamasWeb AI Hub

## Overview

This document outlines best practices, patterns, and guidelines for effectively using LiveStore in PajamasWeb AI Hub. These practices ensure optimal performance, maintainability, and reliability for the privacy-first AI application.

## Event Design Patterns

### 1. Event Naming Conventions

```typescript
// ✅ Good: Versioned, descriptive names
Events.synced({
  name: 'v1.PersonaCreated',
  schema: Schema.Struct({ /* ... */ })
})

Events.synced({
  name: 'v1.MemoryEntityUpdated', 
  schema: Schema.Struct({ /* ... */ })
})

// ❌ Bad: No versioning, unclear names
Events.synced({
  name: 'PersonaEvent',
  schema: Schema.Struct({ /* ... */ })
})
```

### 2. Schema Evolution

```typescript
// ✅ Good: Backward-compatible schema changes
const memoryEntityUpdatedV2 = Events.synced({
  name: 'v2.MemoryEntityUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    updates: Schema.Record(Schema.String, Schema.Unknown),
    // New optional field - backward compatible
    version: Schema.Number.pipe(Schema.optional),
    metadata: Schema.Record(Schema.String, Schema.Unknown).pipe(Schema.optional)
  })
})

// Handle both versions in materializers
const materializers = State.SQLite.materializers(events, {
  'v1.MemoryEntityUpdated': ({ id, updates }) => {
    return tables.memoryEntities.update({
      ...updates,
      updatedAt: Date.now(),
      version: 1 // Set default for old events
    }).where({ id })
  },
  
  'v2.MemoryEntityUpdated': ({ id, updates, version, metadata }) => {
    return tables.memoryEntities.update({
      ...updates,
      updatedAt: Date.now(),
      version: version ?? 2,
      metadata: metadata ?? {}
    }).where({ id })
  }
})
```

### 3. Deterministic Event Design

```typescript
// ✅ Good: All non-deterministic data in event payload
const createPersonaWithId = async (personaData: any) => {
  const id = crypto.randomUUID() // Generate outside materializer
  const timestamp = Date.now()   // Generate outside materializer
  
  await store.commit(events.personaCreated({
    id,                          // Include generated ID
    createdAt: timestamp,        // Include timestamp
    ...personaData
  }))
}

// ❌ Bad: Non-deterministic operations in materializer
const badMaterializer = State.SQLite.materializers(events, {
  'v1.PersonaCreated': ({ name, description }) => {
    return tables.personas.insert({
      id: crypto.randomUUID(),     // ❌ Non-deterministic!
      name,
      description,
      createdAt: Date.now()        // ❌ Non-deterministic!
    })
  }
})
```

## Query Optimization Patterns

### 1. Efficient Query Structure

```typescript
// ✅ Good: Specific, indexed queries
export const activePersonaMemories$ = (personaId: string) => queryDb(
  () => tables.memoryEntities
    .where({ personaId, deletedAt: null, memoryTier: 'hot' })
    .orderBy('lastAccessed', 'desc')
    .limit(50), // Limit results for performance
  { 
    label: 'activePersonaMemories$',
    deps: [personaId] // Include dependencies for cache invalidation
  }
)

// ❌ Bad: Expensive, unoptimized queries
export const badMemoryQuery$ = () => queryDb(
  () => tables.memoryEntities
    .where(() => true) // No filtering - loads everything!
    .orderBy('createdAt', 'desc'), // No limit - could be huge!
  { label: 'badMemoryQuery$' }
)
```

### 2. Computed Values for Derived State

```typescript
// ✅ Good: Use computed for expensive calculations
export const memoryInsights$ = (personaId: string) => computed((get) => {
  const memories = get(personaMemories$(personaId))
  
  // Expensive calculation done reactively
  const insights = {
    totalMemories: memories.length,
    memoryByType: memories.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    averageImportance: memories.reduce((sum, m) => sum + m.importance, 0) / memories.length,
    recentActivity: memories.filter(m => 
      Date.now() - m.lastAccessed < 24 * 60 * 60 * 1000 // Last 24 hours
    ).length,
    connectionGraph: buildConnectionGraph(memories) // Complex calculation
  }
  
  return insights
}, { 
  label: 'memoryInsights$',
  deps: [personaId] 
})

// ❌ Bad: Recalculating every render
const BadComponent = ({ personaId }: { personaId: string }) => {
  const memories = useQuery(personaMemories$(personaId))
  
  // ❌ Expensive calculation on every render
  const insights = useMemo(() => {
    return {
      totalMemories: memories.length,
      // ... expensive calculations
    }
  }, [memories]) // Recalculates whenever memories change
}
```

### 3. Query Dependency Management

```typescript
// ✅ Good: Properly declared dependencies
export const filteredMemories$ = (personaId: string, filters: MemoryFilters) => queryDb(
  () => {
    let query = tables.memoryEntities.where({ personaId, deletedAt: null })
    
    if (filters.type !== 'all') {
      query = query.where({ type: filters.type })
    }
    
    if (filters.minImportance > 0) {
      query = query.where('importance', '>=', filters.minImportance)
    }
    
    return query.orderBy('importance', 'desc').limit(100)
  },
  {
    label: 'filteredMemories$',
    deps: [personaId, filters] // ✅ Include all dependencies
  }
)

// ❌ Bad: Missing dependencies
export const badFilteredMemories$ = (personaId: string, filters: MemoryFilters) => queryDb(
  () => {
    let query = tables.memoryEntities.where({ personaId, deletedAt: null })
    
    if (filters.type !== 'all') {
      query = query.where({ type: filters.type })
    }
    
    return query.orderBy('importance', 'desc')
  },
  {
    label: 'badFilteredMemories$',
    deps: [personaId] // ❌ Missing filters dependency!
  }
)
```

## State Management Patterns

### 1. Client Document Usage

```typescript
// ✅ Good: Use client documents for UI-only state
export const uiState = State.SQLite.clientDocument({
  name: 'uiState',
  schema: Schema.Struct({
    // Form inputs
    newPersonaForm: Schema.Struct({
      name: Schema.String,
      description: Schema.String,
      isValid: Schema.Boolean
    }),
    // View state
    currentView: Schema.Literal('dashboard', 'personas', 'memory'),
    // Filters and search
    searchQuery: Schema.String,
    activeFilters: Schema.Record(Schema.String, Schema.Unknown)
  }),
  default: { /* sensible defaults */ }
})

// ❌ Bad: Using synced events for UI-only state
const badUIEvent = Events.synced({ // ❌ Don't sync UI state!
  name: 'v1.SearchQueryChanged',
  schema: Schema.Struct({ query: Schema.String })
})
```

### 2. Batch Operations

```typescript
// ✅ Good: Batch related operations
export const createPersonaWithInitialMemories = async (
  personaData: any, 
  initialMemories: any[]
) => {
  const personaId = crypto.randomUUID()
  
  // Create persona
  await store.commit(events.personaCreated({
    id: personaId,
    ...personaData
  }))
  
  // Batch create memories
  for (const memory of initialMemories) {
    await store.commit(events.memoryEntityCreated({
      id: crypto.randomUUID(),
      personaId,
      ...memory
    }))
  }
  
  // Activate persona
  await store.commit(events.personaActivated({ id: personaId }))
}

// ❌ Bad: Multiple separate API calls from UI
const BadPersonaForm = () => {
  const handleSubmit = async () => {
    await createPersona(personaData)     // Separate call
    await addMemory(memory1)             // Separate call  
    await addMemory(memory2)             // Separate call
    await activatePersona(personaId)     // Separate call
  }
}
```

### 3. Error Handling

```typescript
// ✅ Good: Comprehensive error handling
export const safePersonaOperations = {
  async createPersona(personaData: any) {
    try {
      const id = crypto.randomUUID()
      
      // Validate data before committing
      const validatedData = PersonaSchema.parse(personaData)
      
      await store.commit(events.personaCreated({
        id,
        ...validatedData
      }))
      
      return { success: true, personaId: id }
    } catch (error) {
      console.error('Failed to create persona:', error)
      
      // Don't let invalid data into the store
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  async updatePersona(id: string, updates: any) {
    try {
      // Check if persona exists
      const persona = store.query(tables.personas.where({ id }).first())
      if (!persona) {
        throw new Error(`Persona ${id} not found`)
      }
      
      // Validate updates
      const validatedUpdates = PersonaUpdateSchema.parse(updates)
      
      await store.commit(events.personaUpdated({
        id,
        updates: validatedUpdates
      }))
      
      return { success: true }
    } catch (error) {
      console.error('Failed to update persona:', error)
      return { success: false, error: error.message }
    }
  }
}
```

## Performance Optimization

### 1. Memory Tier Management

```typescript
// Automated memory tier optimization
export const memoryTierOptimizer = {
  async optimizePersonaMemories(personaId: string) {
    const memories = store.query(personaMemories$(personaId))
    const now = Date.now()
    
    for (const memory of memories) {
      const daysSinceAccess = (now - memory.lastAccessed) / (1000 * 60 * 60 * 24)
      const accessFrequency = memory.connectionCount / daysSinceAccess
      
      let newTier = memory.memoryTier
      
      // Promote frequently accessed memories
      if (accessFrequency > 2 && memory.importance > 70) {
        newTier = 'hot'
      }
      // Move to warm tier
      else if (accessFrequency > 0.5 || memory.importance > 50) {
        newTier = 'warm'
      }
      // Archive old, unused memories
      else if (daysSinceAccess > 30 && memory.importance < 30) {
        newTier = 'cold'
      }
      
      if (newTier !== memory.memoryTier) {
        await store.commit(events.memoryEntityUpdated({
          id: memory.id,
          updates: { memoryTier: newTier }
        }))
      }
    }
  },

  // Run optimization periodically
  startOptimization() {
    setInterval(() => {
      const activePersona = store.query(activePersona$)
      if (activePersona) {
        this.optimizePersonaMemories(activePersona.id)
      }
    }, 5 * 60 * 1000) // Every 5 minutes
  }
}
```

### 2. Query Result Caching

```typescript
// ✅ Good: Efficient caching patterns
export const cachedQueries = {
  // Cache expensive computations
  personaStats$: new Map<string, any>(),
  
  getPersonaStats(personaId: string) {
    return computed((get) => {
      const cached = this.personaStats$.get(personaId)
      const persona = get(queryDb(() => tables.personas.where({ id: personaId }).first()))
      
      // Only recalculate if persona was updated
      if (cached && cached.lastUpdate >= persona.updatedAt) {
        return cached.stats
      }
      
      // Expensive calculation
      const memories = get(personaMemories$(personaId))
      const stats = this.calculateStats(memories)
      
      this.personaStats$.set(personaId, {
        stats,
        lastUpdate: Date.now()
      })
      
      return stats
    }, { label: 'cachedPersonaStats$', deps: [personaId] })
  }
}
```

## Testing Patterns

### 1. Test Store Setup

```typescript
// Test utilities
export const testUtils = {
  async createTestStore() {
    const adapter = makeTestAdapter()
    const store = await createStorePromise({ adapter, schema })
    return store
  },

  async seedTestData(store: any) {
    // Create test persona
    const personaId = 'test-persona-1'
    await store.commit(events.personaCreated({
      id: personaId,
      name: 'Test Persona',
      description: 'A test persona',
      personality: {
        traits: ['analytical', 'curious'],
        temperament: 'calm',
        communicationStyle: 'direct'
      },
      settings: {
        memoryRetention: 90,
        privacyLevel: 'medium',
        autoLearn: true
      }
    }))

    // Create test memories
    for (let i = 0; i < 5; i++) {
      await store.commit(events.memoryEntityCreated({
        id: `test-memory-${i}`,
        personaId,
        type: 'concept',
        name: `Test Concept ${i}`,
        content: { description: `Test content ${i}` },
        summary: `Summary ${i}`,
        tags: [`tag${i}`, 'test'],
        importance: 50 + i * 10
      }))
    }

    return { personaId }
  }
}
```

### 2. Event Testing

```typescript
describe('Persona Management', () => {
  let store: any

  beforeEach(async () => {
    store = await testUtils.createTestStore()
  })

  it('should create persona with correct data', async () => {
    const personaData = {
      id: 'test-persona',
      name: 'Test Persona',
      description: 'Test description',
      personality: {
        traits: ['friendly'],
        temperament: 'calm',
        communicationStyle: 'casual'
      },
      settings: {
        memoryRetention: 80,
        privacyLevel: 'high',
        autoLearn: true
      }
    }

    await store.commit(events.personaCreated(personaData))

    const persona = store.query(
      tables.personas.where({ id: 'test-persona' }).first()
    )

    expect(persona).toBeDefined()
    expect(persona.name).toBe('Test Persona')
    expect(persona.isActive).toBe(false)
    expect(persona.usageCount).toBe(0)
  })

  it('should activate persona and deactivate others', async () => {
    const { personaId } = await testUtils.seedTestData(store)

    // Create second persona
    await store.commit(events.personaCreated({
      id: 'persona-2',
      name: 'Persona 2',
      // ... other required fields
    }))

    // Activate first persona
    await store.commit(events.personaActivated({ id: personaId }))

    const activePersonas = store.query(
      tables.personas.where({ isActive: true })
    )

    expect(activePersonas).toHaveLength(1)
    expect(activePersonas[0].id).toBe(personaId)
  })
})
```

## Security & Privacy Patterns

### 1. Data Sanitization

```typescript
// ✅ Good: Sanitize sensitive data
export const secureOperations = {
  async createSecureMemory(memoryData: any) {
    // Remove sensitive fields that shouldn't be stored
    const sanitized = {
      ...memoryData,
      content: this.sanitizeContent(memoryData.content),
      // Remove any API keys, passwords, etc.
      metadata: this.sanitizeMetadata(memoryData.metadata)
    }

    // Validate against schema
    const validated = MemorySchema.parse(sanitized)

    await store.commit(events.memoryEntityCreated({
      id: crypto.randomUUID(),
      ...validated
    }))
  },

  sanitizeContent(content: any): any {
    if (typeof content === 'string') {
      // Remove potential sensitive patterns
      return content
        .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '[REDACTED]') // Credit cards
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Emails
    }
    return content
  }
}
```

### 2. Local Storage Encryption

```typescript
// Configure encrypted storage adapter
const createSecureAdapter = () => {
  return makePersistedAdapter({
    storage: { 
      type: 'opfs',
      encryption: {
        key: deriveEncryptionKey(), // Derive from user password/keychain
        algorithm: 'AES-GCM'
      }
    }
  })
}

// Key derivation for encryption
const deriveEncryptionKey = async (): Promise<string> => {
  // Use Electron's safeStorage or Web Crypto API
  if (window.electronAPI?.safeStorage) {
    return window.electronAPI.safeStorage.encryptString('encryption-key')
  }
  
  // Fallback to user-provided key
  const userKey = await promptForEncryptionKey()
  return await crypto.subtle.deriveKey(/* ... */)
}
```

## Debugging & Monitoring

### 1. Development Tools Integration

```typescript
// Development helpers
export const devTools = {
  // Download database for inspection
  async downloadDatabase() {
    if (process.env.NODE_ENV === 'development') {
      const data = await store._dev.downloadDb()
      const blob = new Blob([data], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `pajamasweb-db-${Date.now()}.sqlite`
      a.click()
    }
  },

  // Query performance monitoring
  monitorQueries() {
    if (process.env.NODE_ENV === 'development') {
      let queryCount = 0
      let totalTime = 0

      const originalQuery = store.query
      store.query = function(query: any) {
        const start = performance.now()
        const result = originalQuery.call(this, query)
        const end = performance.now()
        
        queryCount++
        totalTime += (end - start)
        
        if (queryCount % 100 === 0) {
          console.log(`Query stats: ${queryCount} queries, avg: ${totalTime/queryCount}ms`)
        }
        
        return result
      }
    }
  }
}
```

### 2. Error Tracking

```typescript
// Error boundary for LiveStore operations
export const LiveStoreErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<div>Something went wrong with the database</div>}
      onError={(error, errorInfo) => {
        console.error('LiveStore Error:', error)
        
        // Send to monitoring service
        if (window.electronAPI?.sendError) {
          window.electronAPI.sendError({
            error: error.message,
            stack: error.stack,
            context: 'livestore',
            timestamp: Date.now()
          })
        }
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
```

## Migration & Versioning

### 1. Schema Migration Strategy

```typescript
export const migrations = {
  // Migration from v1 to v2 schema
  async migrateToV2(store: any) {
    const personas = store.query(tables.personas)
    
    for (const persona of personas) {
      // Add new fields with defaults
      await store.commit(events.personaUpdated({
        id: persona.id,
        updates: {
          version: 2,
          newFeatureFlag: false,
          migrationTimestamp: Date.now()
        }
      }))
    }
  },

  async runMigrations(store: any) {
    const currentVersion = await this.getCurrentVersion(store)
    
    if (currentVersion < 2) {
      await this.migrateToV2(store)
    }
    
    // Add future migrations here
  }
}
```

These best practices ensure that PajamasWeb AI Hub leverages LiveStore effectively while maintaining performance, security, and maintainability. Regular review and updates of these patterns will help the codebase evolve with the application's needs.
