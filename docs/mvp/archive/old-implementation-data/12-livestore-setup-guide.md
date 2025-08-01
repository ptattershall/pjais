# LiveStore Setup & Integration Guide

## Overview

This guide provides comprehensive instructions for setting up and integrating LiveStore in PajamasWeb AI Hub. LiveStore is a local-first, event-sourcing framework for building cross-platform apps using reactive, synchronized SQLite databases.

**Key Benefits for PajamasWeb AI Hub:**

- **Event Sourcing Architecture**: Perfect for tracking persona interactions and memory evolution
- **Offline-First**: Essential for privacy-first AI applications
- **Reactive Queries**: Real-time UI updates as data changes
- **SQLite Backend**: Superior performance compared to IndexedDB
- **Cross-Platform**: Works seamlessly with Electron, React, and future mobile apps

## Architecture Overview

LiveStore follows an event-sourcing pattern where:

Events (Data Changes) → Materializers → SQLite State → Reactive Queries → UI Updates

### Core Concepts

1. **Events**: Define how data changes (e.g., `personaCreated`, `memoryAdded`)
2. **Tables**: SQLite tables that store derived state
3. **Materializers**: Functions that transform events into state changes
4. **Reactive Queries**: Automatically update UI when data changes
5. **Client Documents**: Local-only state (like form inputs)

## Installation & Dependencies

### For Electron (Main Process)

```bash
npm install @livestore/livestore @livestore/adapter-node
```

### For React Renderer

```bash
npm install @livestore/livestore @livestore/wa-sqlite@0.1.0 @livestore/adapter-web @livestore/react @livestore/peer-deps
```

### Optional: Development Tools

```bash
npm install @livestore/devtools-vite
```

## Schema Definition

Create `src/livestore/schema.ts` to define your application's data model:

```typescript
import { Events, makeSchema, Schema, SessionIdSymbol, State } from '@livestore/livestore'

// =============================================================================
// TABLE DEFINITIONS
// =============================================================================

export const tables = {
  // Personas table - Core AI personality data
  personas: State.SQLite.table({
    name: 'personas',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text(),
      description: State.SQLite.text(),
      avatar: State.SQLite.text({ nullable: true }),
      personality: State.SQLite.json({
        schema: Schema.Struct({
          traits: Schema.Array(Schema.String),
          temperament: Schema.String,
          communicationStyle: Schema.String
        })
      }),
      settings: State.SQLite.json({
        schema: Schema.Struct({
          memoryRetention: Schema.Number,
          privacyLevel: Schema.Literal('low', 'medium', 'high'),
          autoLearn: Schema.Boolean
        })
      }),
      isActive: State.SQLite.boolean({ default: false }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      lastUsed: State.SQLite.integer({ schema: Schema.DateFromNumber, nullable: true }),
      usageCount: State.SQLite.integer({ default: 0 })
    }
  }),

  // Memory entities - Knowledge and experiences
  memoryEntities: State.SQLite.table({
    name: 'memoryEntities',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      personaId: State.SQLite.text(),
      type: State.SQLite.text(), // 'person', 'concept', 'event', 'conversation', etc.
      name: State.SQLite.text(),
      content: State.SQLite.json({ schema: Schema.Record(Schema.String, Schema.Unknown) }),
      summary: State.SQLite.text(),
      tags: State.SQLite.json({ schema: Schema.Array(Schema.String) }),
      importance: State.SQLite.integer({ default: 50 }), // 0-100 scale
      embedding: State.SQLite.json({ 
        schema: Schema.Array(Schema.Number),
        nullable: true 
      }),
      embeddingModel: State.SQLite.text({ nullable: true }),
      memoryTier: State.SQLite.text({ default: 'hot' }), // 'hot', 'warm', 'cold'
      connectionCount: State.SQLite.integer({ default: 0 }),
      lastAccessed: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      deletedAt: State.SQLite.integer({ 
        schema: Schema.DateFromNumber, 
        nullable: true 
      })
    }
  }),

  // Conversations - Chat history and interactions
  conversations: State.SQLite.table({
    name: 'conversations',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      personaId: State.SQLite.text(),
      sessionId: State.SQLite.text(),
      messages: State.SQLite.json({
        schema: Schema.Array(Schema.Struct({
          id: Schema.String,
          role: Schema.Literal('user', 'assistant', 'system'),
          content: Schema.String,
          timestamp: Schema.DateFromNumber,
          metadata: Schema.Record(Schema.String, Schema.Unknown).pipe(Schema.optional)
        }))
      }),
      summary: State.SQLite.text({ nullable: true }),
      sentiment: State.SQLite.text({ nullable: true }),
      topics: State.SQLite.json({ schema: Schema.Array(Schema.String) }),
      importance: State.SQLite.integer({ default: 50 }),
      isArchived: State.SQLite.boolean({ default: false }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      archivedAt: State.SQLite.integer({ 
        schema: Schema.DateFromNumber, 
        nullable: true 
      })
    }
  }),

  // Client-only UI state - form inputs, filters, etc.
  uiState: State.SQLite.clientDocument({
    name: 'uiState',
    schema: Schema.Struct({
      selectedPersonaId: Schema.String.pipe(Schema.nullable),
      currentView: Schema.Literal('dashboard', 'personas', 'memory', 'chat', 'settings'),
      memoryFilter: Schema.Struct({
        type: Schema.Literal('all', 'person', 'concept', 'event', 'conversation'),
        importance: Schema.Number,
        dateRange: Schema.Struct({
          start: Schema.DateFromNumber.pipe(Schema.nullable),
          end: Schema.DateFromNumber.pipe(Schema.nullable)
        }).pipe(Schema.nullable)
      }),
      searchQuery: Schema.String,
      theme: Schema.Literal('light', 'dark', 'auto')
    }),
    default: {
      id: SessionIdSymbol,
      value: {
        selectedPersonaId: null,
        currentView: 'dashboard',
        memoryFilter: {
          type: 'all',
          importance: 0,
          dateRange: null
        },
        searchQuery: '',
        theme: 'auto'
      }
    }
  })
}

// =============================================================================
// EVENT DEFINITIONS
// =============================================================================

export const events = {
  // Persona Management Events
  personaCreated: Events.synced({
    name: 'v1.PersonaCreated',
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      description: Schema.String,
      personality: Schema.Struct({
        traits: Schema.Array(Schema.String),
        temperament: Schema.String,
        communicationStyle: Schema.String
      }),
      settings: Schema.Struct({
        memoryRetention: Schema.Number,
        privacyLevel: Schema.Literal('low', 'medium', 'high'),
        autoLearn: Schema.Boolean
      })
    })
  }),

  personaUpdated: Events.synced({
    name: 'v1.PersonaUpdated',
    schema: Schema.Struct({
      id: Schema.String,
      updates: Schema.Record(Schema.String, Schema.Unknown)
    })
  }),

  personaActivated: Events.synced({
    name: 'v1.PersonaActivated',
    schema: Schema.Struct({
      id: Schema.String
    })
  }),

  personaDeactivated: Events.synced({
    name: 'v1.PersonaDeactivated',
    schema: Schema.Struct({
      id: Schema.String
    })
  }),

  // Memory Management Events
  memoryEntityCreated: Events.synced({
    name: 'v1.MemoryEntityCreated',
    schema: Schema.Struct({
      id: Schema.String,
      personaId: Schema.String,
      type: Schema.String,
      name: Schema.String,
      content: Schema.Record(Schema.String, Schema.Unknown),
      summary: Schema.String,
      tags: Schema.Array(Schema.String),
      importance: Schema.Number.pipe(Schema.optional),
      embedding: Schema.Array(Schema.Number).pipe(Schema.optional),
      embeddingModel: Schema.String.pipe(Schema.optional)
    })
  }),

  memoryEntityUpdated: Events.synced({
    name: 'v1.MemoryEntityUpdated',
    schema: Schema.Struct({
      id: Schema.String,
      updates: Schema.Record(Schema.String, Schema.Unknown)
    })
  }),

  memoryEntityAccessed: Events.synced({
    name: 'v1.MemoryEntityAccessed',
    schema: Schema.Struct({
      id: Schema.String,
      accessedAt: Schema.DateFromNumber
    })
  }),

  memoryEntityDeleted: Events.synced({
    name: 'v1.MemoryEntityDeleted',
    schema: Schema.Struct({
      id: Schema.String,
      deletedAt: Schema.DateFromNumber
    })
  }),

  // Conversation Events
  conversationStarted: Events.synced({
    name: 'v1.ConversationStarted',
    schema: Schema.Struct({
      id: Schema.String,
      personaId: Schema.String,
      sessionId: Schema.String
    })
  }),

  messageAdded: Events.synced({
    name: 'v1.MessageAdded',
    schema: Schema.Struct({
      conversationId: Schema.String,
      message: Schema.Struct({
        id: Schema.String,
        role: Schema.Literal('user', 'assistant', 'system'),
        content: Schema.String,
        timestamp: Schema.DateFromNumber,
        metadata: Schema.Record(Schema.String, Schema.Unknown).pipe(Schema.optional)
      })
    })
  }),

  conversationArchived: Events.synced({
    name: 'v1.ConversationArchived',
    schema: Schema.Struct({
      id: Schema.String,
      archivedAt: Schema.DateFromNumber
    })
  }),

  // UI State Events (client-only)
  uiStateSet: tables.uiState.set // Auto-generated client document event
}

// =============================================================================
// MATERIALIZERS
// =============================================================================

const materializers = State.SQLite.materializers(events, {
  // Persona Materializers
  'v1.PersonaCreated': ({ id, name, description, personality, settings }) => {
    const now = Date.now()
    return tables.personas.insert({
      id,
      name,
      description,
      personality,
      settings,
      isActive: false,
      createdAt: now,
      updatedAt: now,
      lastUsed: null,
      usageCount: 0
    })
  },

  'v1.PersonaUpdated': ({ id, updates }) => {
    return tables.personas.update({
      ...updates,
      updatedAt: Date.now()
    }).where({ id })
  },

  'v1.PersonaActivated': ({ id }) => {
    return [
      // Deactivate all other personas
      tables.personas.update({ isActive: false }),
      // Activate the selected persona
      tables.personas.update({
        isActive: true,
        lastUsed: Date.now(),
        usageCount: tables.personas.select('usageCount').where({ id }).first().usageCount + 1
      }).where({ id })
    ]
  },

  'v1.PersonaDeactivated': ({ id }) => {
    return tables.personas.update({ isActive: false }).where({ id })
  },

  // Memory Materializers
  'v1.MemoryEntityCreated': ({ id, personaId, type, name, content, summary, tags, importance, embedding, embeddingModel }) => {
    const now = Date.now()
    return tables.memoryEntities.insert({
      id,
      personaId,
      type,
      name,
      content,
      summary,
      tags,
      importance: importance ?? 50,
      embedding,
      embeddingModel,
      memoryTier: 'hot',
      connectionCount: 0,
      lastAccessed: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    })
  },

  'v1.MemoryEntityUpdated': ({ id, updates }) => {
    return tables.memoryEntities.update({
      ...updates,
      updatedAt: Date.now()
    }).where({ id })
  },

  'v1.MemoryEntityAccessed': ({ id, accessedAt }) => {
    return tables.memoryEntities.update({
      lastAccessed: accessedAt,
      connectionCount: tables.memoryEntities.select('connectionCount').where({ id }).first().connectionCount + 1
    }).where({ id })
  },

  'v1.MemoryEntityDeleted': ({ id, deletedAt }) => {
    return tables.memoryEntities.update({ deletedAt }).where({ id })
  },

  // Conversation Materializers
  'v1.ConversationStarted': ({ id, personaId, sessionId }) => {
    const now = Date.now()
    return tables.conversations.insert({
      id,
      personaId,
      sessionId,
      messages: [],
      summary: null,
      sentiment: null,
      topics: [],
      importance: 50,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      archivedAt: null
    })
  },

  'v1.MessageAdded': ({ conversationId, message }, ctx) => {
    const conversation = ctx.query(
      tables.conversations.select('messages').where({ id: conversationId }).first()
    )
    
    return tables.conversations.update({
      messages: [...conversation.messages, message],
      updatedAt: Date.now()
    }).where({ id: conversationId })
  },

  'v1.ConversationArchived': ({ id, archivedAt }) => {
    return tables.conversations.update({
      isArchived: true,
      archivedAt
    }).where({ id })
  }
})

// =============================================================================
// SCHEMA EXPORT
// =============================================================================

const state = State.SQLite.makeState({ tables, materializers })

export const schema = makeSchema({ events, state })
```

## Reactive Queries

Create `src/livestore/queries.ts` for reusable reactive queries:

```typescript
import { queryDb, computed, signal } from '@livestore/livestore'
import { tables } from './schema'

// =============================================================================
// PERSONA QUERIES
// =============================================================================

export const activePersona$ = queryDb(
  () => tables.personas.where({ isActive: true }).first(),
  { label: 'activePersona$' }
)

export const allPersonas$ = queryDb(
  () => tables.personas.orderBy('lastUsed', 'desc'),
  { label: 'allPersonas$' }
)

export const recentPersonas$ = queryDb(
  () => tables.personas
    .where('lastUsed', '!=', null)
    .orderBy('lastUsed', 'desc')
    .limit(5),
  { label: 'recentPersonas$' }
)

// =============================================================================
// MEMORY QUERIES
// =============================================================================

export const personaMemories$ = (personaId: string) => queryDb(
  () => tables.memoryEntities
    .where({ personaId, deletedAt: null })
    .orderBy('importance', 'desc')
    .orderBy('lastAccessed', 'desc'),
  { 
    label: 'personaMemories$',
    deps: [personaId]
  }
)

export const hotMemories$ = (personaId: string) => queryDb(
  () => tables.memoryEntities
    .where({ personaId, memoryTier: 'hot', deletedAt: null })
    .orderBy('lastAccessed', 'desc'),
  {
    label: 'hotMemories$',
    deps: [personaId]
  }
)

export const memorySearch$ = (query: string, personaId?: string) => queryDb(
  () => {
    let search = tables.memoryEntities
      .where('deletedAt', '==', null)
      .where(row => 
        row.name.toLowerCase().includes(query.toLowerCase()) ||
        row.summary.toLowerCase().includes(query.toLowerCase()) ||
        row.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      )
    
    if (personaId) {
      search = search.where({ personaId })
    }
    
    return search.orderBy('importance', 'desc').limit(50)
  },
  {
    label: 'memorySearch$',
    deps: [query, personaId]
  }
)

// =============================================================================
// CONVERSATION QUERIES
// =============================================================================

export const recentConversations$ = (personaId: string) => queryDb(
  () => tables.conversations
    .where({ personaId, isArchived: false })
    .orderBy('updatedAt', 'desc')
    .limit(20),
  {
    label: 'recentConversations$',
    deps: [personaId]
  }
)

export const conversationHistory$ = (conversationId: string) => queryDb(
  () => tables.conversations.where({ id: conversationId }).first(),
  {
    label: 'conversationHistory$',
    deps: [conversationId]
  }
)

// =============================================================================
// COMPUTED VALUES
// =============================================================================

export const memoryStats$ = (personaId: string) => computed((get) => {
  const memories = get(personaMemories$(personaId))
  
  return {
    total: memories.length,
    byTier: {
      hot: memories.filter(m => m.memoryTier === 'hot').length,
      warm: memories.filter(m => m.memoryTier === 'warm').length,
      cold: memories.filter(m => m.memoryTier === 'cold').length
    },
    byType: memories.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    averageImportance: memories.reduce((sum, m) => sum + m.importance, 0) / memories.length || 0
  }
}, { 
  label: 'memoryStats$',
  deps: [personaId] 
})

// =============================================================================
// UI STATE QUERIES
// =============================================================================

export const uiState$ = queryDb(
  () => tables.uiState.first(),
  { label: 'uiState$' }
)

export const currentView$ = computed((get) => {
  const ui = get(uiState$)
  return ui?.value.currentView || 'dashboard'
}, { label: 'currentView$' })

export const selectedPersona$ = computed((get) => {
  const ui = get(uiState$)
  const personaId = ui?.value.selectedPersonaId
  
  if (!personaId) return null
  
  return get(queryDb(
    () => tables.personas.where({ id: personaId }).first(),
    { deps: [personaId] }
  ))
}, { label: 'selectedPersona$' })
```

## Electron Integration

### Main Process Setup

Create `src/main/database.ts`:

```typescript
import { makeAdapter } from '@livestore/adapter-node'
import { createStorePromise } from '@livestore/livestore'
import { schema } from '../livestore/schema'
import { app } from 'electron'
import path from 'path'

class DatabaseManager {
  private store: any = null
  
  async initialize(): Promise<void> {
    const adapter = makeAdapter({
      storage: { 
        type: 'fs',
        baseDirectory: path.join(app.getPath('userData'), 'livestore')
      }
      // Future: Add sync capabilities
      // sync: { backend: makeCfSync({ url: 'ws://sync-server' }) }
    })

    this.store = await createStorePromise({
      adapter,
      schema,
      storeId: 'pjais'
    })

    console.log('LiveStore initialized successfully')
  }

  getStore() {
    if (!this.store) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.store
  }

  async query(query: any) {
    return this.getStore().query(query)
  }

  async commit(event: any) {
    return this.getStore().commit(event)
  }
}

export const databaseManager = new DatabaseManager()
```

### Renderer Process Setup

Create `src/renderer/LiveStoreProvider.tsx`:

```typescript
import React, { ReactNode } from 'react'
import { LiveStoreProvider as BaseLiveStoreProvider } from '@livestore/react'
import { makePersistedAdapter } from '@livestore/adapter-web'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'
import { schema } from '../livestore/schema'

interface LiveStoreProviderProps {
  children: ReactNode
}

// Create adapter for web/Electron renderer
const adapter = makePersistedAdapter({
  storage: { type: 'opfs' }, // Or 'idb' for broader compatibility
  worker: undefined, // Add LiveStore worker if needed
  sharedWorker: undefined
})

export const LiveStoreProvider: React.FC<LiveStoreProviderProps> = ({ children }) => {
  return (
    <BaseLiveStoreProvider 
      schema={schema} 
      adapter={adapter} 
      batchUpdates={batchUpdates}
    >
      {children}
    </BaseLiveStoreProvider>
  )
}
```

## React Integration Examples

### Persona Management Component

```typescript
import React from 'react'
import { useQuery, useStore } from '@livestore/react'
import { allPersonas$, activePersona$ } from '../livestore/queries'
import { events } from '../livestore/schema'

export const PersonaSelector: React.FC = () => {
  const { store } = useStore()
  const personas = useQuery(allPersonas$)
  const activePersona = useQuery(activePersona$)

  const handlePersonaActivation = async (personaId: string) => {
    // Deactivate current persona
    if (activePersona) {
      await store.commit(events.personaDeactivated({ id: activePersona.id }))
    }
    
    // Activate new persona
    await store.commit(events.personaActivated({ id: personaId }))
  }

  return (
    <div className="persona-selector">
      <h3>Personas</h3>
      {personas.map(persona => (
        <div 
          key={persona.id}
          className={`persona-card ${persona.isActive ? 'active' : ''}`}
          onClick={() => handlePersonaActivation(persona.id)}
        >
          <img src={persona.avatar || '/default-avatar.png'} alt={persona.name} />
          <div>
            <h4>{persona.name}</h4>
            <p>{persona.description}</p>
            <small>Last used: {persona.lastUsed ? new Date(persona.lastUsed).toLocaleDateString() : 'Never'}</small>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Memory Explorer Component

```typescript
import React, { useState } from 'react'
import { useQuery, useStore } from '@livestore/react'
import { personaMemories$, memorySearch$, activePersona$ } from '../livestore/queries'
import { events } from '../livestore/schema'

export const MemoryExplorer: React.FC = () => {
  const { store } = useStore()
  const activePersona = useQuery(activePersona$)
  const [searchQuery, setSearchQuery] = useState('')
  
  const memories = useQuery(
    searchQuery && activePersona 
      ? memorySearch$(searchQuery, activePersona.id)
      : activePersona 
        ? personaMemories$(activePersona.id)
        : null
  )

  const handleMemoryAccess = async (memoryId: string) => {
    await store.commit(events.memoryEntityAccessed({
      id: memoryId,
      accessedAt: Date.now()
    }))
  }

  if (!activePersona) {
    return <div>Please select a persona to view memories</div>
  }

  return (
    <div className="memory-explorer">
      <div className="memory-search">
        <input
          type="text"
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="memory-grid">
        {memories?.map(memory => (
          <div 
            key={memory.id}
            className={`memory-card tier-${memory.memoryTier}`}
            onClick={() => handleMemoryAccess(memory.id)}
          >
            <div className="memory-header">
              <h4>{memory.name}</h4>
              <span className="memory-type">{memory.type}</span>
              <span className="memory-importance">{memory.importance}%</span>
            </div>
            <p>{memory.summary}</p>
            <div className="memory-tags">
              {memory.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
            <div className="memory-meta">
              <small>Accessed: {new Date(memory.lastAccessed).toLocaleDateString()}</small>
              <small>Connections: {memory.connectionCount}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Performance Optimization

### Query Optimization

```typescript
// Use computed queries for derived state
export const importantMemories$ = (personaId: string) => computed((get) => {
  const memories = get(personaMemories$(personaId))
  return memories.filter(m => m.importance > 80)
}, { 
  label: 'importantMemories$',
  deps: [personaId] 
})

// Batch related operations
const createPersonaWithMemories = async (personaData: any, initialMemories: any[]) => {
  const personaId = crypto.randomUUID()
  
  // Create persona
  await store.commit(events.personaCreated({
    id: personaId,
    ...personaData
  }))
  
  // Batch create initial memories
  for (const memory of initialMemories) {
    await store.commit(events.memoryEntityCreated({
      id: crypto.randomUUID(),
      personaId,
      ...memory
    }))
  }
}
```

### Memory Management

```typescript
// Implement memory tier management
export const optimizeMemoryTiers = async (personaId: string) => {
  const memories = await store.query(personaMemories$(personaId))
  
  for (const memory of memories) {
    let newTier = memory.memoryTier
    
    // Promote frequently accessed memories
    if (memory.connectionCount > 50 && memory.memoryTier !== 'hot') {
      newTier = 'hot'
    }
    // Demote old, unused memories
    else if (
      Date.now() - memory.lastAccessed > 30 * 24 * 60 * 60 * 1000 && // 30 days
      memory.connectionCount < 5 &&
      memory.memoryTier === 'hot'
    ) {
      newTier = 'warm'
    }
    
    if (newTier !== memory.memoryTier) {
      await store.commit(events.memoryEntityUpdated({
        id: memory.id,
        updates: { memoryTier: newTier }
      }))
    }
  }
}
```

## Testing & Development

### Development Tools

```typescript
// Add to vite.config.ts or webpack config
import { liveStoreDevtools } from '@livestore/devtools-vite'

export default defineConfig({
  plugins: [
    react(),
    liveStoreDevtools()
  ]
})
```

### Testing Utilities

```typescript
import { createStorePromise } from '@livestore/livestore'
import { makeTestAdapter } from '@livestore/adapter-test'
import { schema } from '../src/livestore/schema'

export const createTestStore = async () => {
  const adapter = makeTestAdapter()
  return await createStorePromise({ adapter, schema })
}

// Example test
describe('Persona Management', () => {
  it('should create and activate persona', async () => {
    const store = await createTestStore()
    
    const personaId = 'test-persona-1'
    await store.commit(events.personaCreated({
      id: personaId,
      name: 'Test Persona',
      description: 'A test persona',
      personality: {
        traits: ['curious', 'analytical'],
        temperament: 'calm',
        communicationStyle: 'direct'
      },
      settings: {
        memoryRetention: 90,
        privacyLevel: 'medium',
        autoLearn: true
      }
    }))
    
    await store.commit(events.personaActivated({ id: personaId }))
    
    const activePersona = store.query(activePersona$)
    expect(activePersona.id).toBe(personaId)
    expect(activePersona.isActive).toBe(true)
  })
})
```

## Migration from RxDB

### Data Migration Script

```typescript
// scripts/migrate-from-rxdb.ts
import { createStorePromise } from '@livestore/livestore'
import { makeAdapter } from '@livestore/adapter-node'
import { schema, events } from '../src/livestore/schema'

export const migrateFromRxDB = async (rxdbData: any) => {
  const adapter = makeAdapter({ storage: { type: 'fs' } })
  const store = await createStorePromise({ adapter, schema })
  
  // Migrate personas
  for (const persona of rxdbData.personas) {
    await store.commit(events.personaCreated({
      id: persona.id,
      name: persona.name,
      description: persona.description,
      personality: persona.personality,
      settings: persona.settings
    }))
    
    if (persona.isActive) {
      await store.commit(events.personaActivated({ id: persona.id }))
    }
  }
  
  // Migrate memories
  for (const memory of rxdbData.memoryEntities) {
    await store.commit(events.memoryEntityCreated({
      id: memory.id,
      personaId: memory.personaId,
      type: memory.type,
      name: memory.name,
      content: memory.content,
      summary: memory.summary,
      tags: memory.tags,
      importance: memory.importance,
      embedding: memory.embedding,
      embeddingModel: memory.embeddingModel
    }))
  }
  
  console.log('Migration completed successfully')
}
```

## Next Steps

1. **Implement Vector Search**: Add vector similarity search using embeddings
2. **Add Sync Capabilities**: Set up LiveStore sync for multi-device support
3. **Performance Monitoring**: Implement query performance tracking
4. **Advanced Memory Features**: Add memory relationship graphs and automated insights
5. **Plugin Integration**: Connect LiveStore to the plugin system for data sharing

This guide provides a solid foundation for integrating LiveStore into PajamasWeb AI Hub while maintaining the privacy-first, offline-first architecture principles.
