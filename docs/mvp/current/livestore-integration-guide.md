# LiveStore Integration Guide

> 📋 **PRIORITY**: 🟢 **MEDIUM** - Phase 2, Week 5-8 - See `IMPLEMENTATION_PRIORITIES.md` for context

## Overview

This guide provides detailed technical instructions for integrating LiveStore with PJai's existing Effect SQL architecture. The integration enables reactive UI features while maintaining the stability of the current database system.

**⚠️ CURRENT STATUS**: Basic reactive interface implemented as placeholder. Full LiveStore integration requires dependency installation and hybrid database manager implementation.

## 📊 **IMPLEMENTATION STATUS**

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| **Basic Reactive Interface** | ✅ Implemented | `src/livestore/schema.ts` | Uses EventEmitter, not LiveStore |
| **LiveStore Dependencies** | ❌ Not Installed | `package.json` | Need to add LiveStore packages |
| **Hybrid Database Manager** | ❌ Not Implemented | `src/main/services/` | Target implementation |
| **Reactive Queries** | ⚠️ Partial | `src/livestore/queries.ts` | Basic EventEmitter queries |
| **UI Integration** | ❌ Not Implemented | `src/renderer/` | Need reactive component updates |

## Prerequisites

### Dependencies

**⚠️ NOT YET INSTALLED** - These packages need to be added to the project:

```bash
# Core LiveStore packages
pnpm add @livestore/livestore @livestore/wa-sqlite@0.1.0

# Platform adapters
pnpm add @livestore/adapter-node @livestore/adapter-web

# Framework integration
pnpm add @livestore/react @livestore/peer-deps

# Development tools
pnpm add @livestore/devtools-vite
```

**Current Status**: Basic reactive interface exists in `src/livestore/` but uses EventEmitter instead of LiveStore.

## Architecture Integration

### 1. Hybrid Database Manager

**⚠️ NOT YET IMPLEMENTED** - This is the target implementation after LiveStore integration:

```typescript
// src/main/services/hybrid-database-manager.ts
import { Effect } from 'effect'
import { PersonaRepository, PersonaRepositoryLive } from '../database/persona-repository'
import { MemoryRepository, MemoryRepositoryLive } from '../database/memory-repository'
import { DatabaseService } from '../database/database-service'
import { createStorePromise, makeAdapter } from '@livestore/livestore'
import { makePersistedAdapter } from '@livestore/adapter-web'

export class HybridDatabaseManager {
  private effectSQL: DatabaseService
  private liveStore: any
  private initialized = false

  constructor() {
    this.effectSQL = DatabaseService
  }

  async initialize(): Promise<void> {
    // Initialize Effect SQL (existing system)
    await Effect.runPromise(
      DatabaseService.initialize.pipe(
        Effect.provide(DatabaseServiceLayer)
      )
    )

    // Initialize LiveStore
    const adapter = makePersistedAdapter({
      storage: { type: 'opfs' },
      worker: undefined
    })

    this.liveStore = await createStorePromise({
      adapter,
      schema: await import('../livestore/schema'),
      storeId: 'pjais'
    })

    this.initialized = true
    console.log('Hybrid database manager initialized')
  }

  // Core operations (Effect SQL)
  async createPersona(data: PersonaData): Promise<string> {
    const id = await Effect.runPromise(
      PersonaRepository.create(data).pipe(
        Effect.provide(DatabaseContext)
      )
    )

    // Trigger LiveStore event
    await this.liveStore.commit(events.personaCreated({ id, ...data }))
    
    return id
  }

  // Reactive queries (LiveStore)
  getActivePersona$() {
    return this.liveStore.query(tables.personas.where({ isActive: true }).first())
  }

  getPersonaMemories$(personaId: string) {
    return this.liveStore.query(
      tables.memoryEntities.where({ personaId }).orderBy('createdAt', 'desc')
    )
  }
}
```

**Current Status**: Basic reactive interface exists in `src/livestore/schema.ts` using EventEmitter, but full LiveStore integration requires the above implementation.

### 2. Enhanced Schema Definition

```typescript
// src/livestore/schema.ts
import { Events, makeSchema, Schema, State } from '@livestore/livestore'

// Event definitions
const events = {
  personaCreated: Events.synced({
    name: "v1.PersonaCreated",
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      description: Schema.String,
      personality: Schema.Object,
      memoryConfiguration: Schema.Object,
      privacySettings: Schema.Object,
      isActive: Schema.Boolean
    })
  }),

  personaUpdated: Events.synced({
    name: "v1.PersonaUpdated", 
    schema: Schema.Struct({
      id: Schema.String,
      updates: Schema.Object
    })
  }),

  personaActivated: Events.synced({
    name: "v1.PersonaActivated",
    schema: Schema.Struct({
      id: Schema.String
    })
  }),

  memoryAdded: Events.synced({
    name: "v1.MemoryAdded",
    schema: Schema.Struct({
      id: Schema.String,
      personaId: Schema.String,
      type: Schema.String,
      content: Schema.String,
      importance: Schema.Number,
      memoryTier: Schema.String
    })
  })
}

// Table definitions
const tables = {
  personas: State.SQLite.table({
    name: 'personas',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text(),
      description: State.SQLite.text(),
      personality: State.SQLite.json(),
      memoryConfiguration: State.SQLite.json(),
      privacySettings: State.SQLite.json(),
      isActive: State.SQLite.boolean({ default: false }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber })
    }
  }),

  memoryEntities: State.SQLite.table({
    name: 'memory_entities',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      personaId: State.SQLite.text(),
      type: State.SQLite.text(),
      content: State.SQLite.text(),
      importance: State.SQLite.integer({ default: 50 }),
      memoryTier: State.SQLite.text({ default: 'active' }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber })
    }
  })
}

// Materializers
const materializers = State.SQLite.materializers(events, {
  "v1.PersonaCreated": ({ id, name, description, personality, memoryConfiguration, privacySettings, isActive }) => {
    const now = Date.now()
    return tables.personas.insert({
      id,
      name,
      description,
      personality,
      memoryConfiguration,
      privacySettings,
      isActive,
      createdAt: now,
      updatedAt: now
    })
  },

  "v1.PersonaUpdated": ({ id, updates }) => {
    const now = Date.now()
    return tables.personas.update({ id }, { ...updates, updatedAt: now })
  },

  "v1.PersonaActivated": ({ id }) => {
    // Deactivate all personas first
    const deactivateAll = tables.personas.update({}, { isActive: false })
    // Then activate the specified persona
    const activateOne = tables.personas.update({ id }, { isActive: true })
    return [deactivateAll, activateOne]
  },

  "v1.MemoryAdded": ({ id, personaId, type, content, importance, memoryTier }) => {
    const now = Date.now()
    return tables.memoryEntities.insert({
      id,
      personaId,
      type,
      content,
      importance,
      memoryTier,
      createdAt: now,
      updatedAt: now
    })
  }
})

const state = State.SQLite.makeState({ tables, materializers })
export const schema = makeSchema({ events, state })
```

### 3. React Integration

```typescript
// src/renderer/providers/LiveStoreProvider.tsx
import React from 'react'
import { LiveStoreProvider as BaseLiveStoreProvider } from '@livestore/react'
import { makePersistedAdapter } from '@livestore/adapter-web'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'
import { schema } from '../../livestore/schema'

interface LiveStoreProviderProps {
  children: React.ReactNode
}

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: undefined
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

### 4. Enhanced Queries

```typescript
// src/livestore/queries.ts
import { useStore, useQuery } from '@livestore/react'
import { tables } from './schema'

// Basic queries
export const useActivePersona = () => {
  const { store } = useStore()
  return useQuery(store.query(tables.personas.where({ isActive: true }).first()))
}

export const useAllPersonas = () => {
  const { store } = useStore()
  return useQuery(store.query(tables.personas.all().orderBy('createdAt', 'desc')))
}

export const usePersonaById = (id: string) => {
  const { store } = useStore()
  return useQuery(store.query(tables.personas.where({ id }).first()))
}

export const usePersonaMemories = (personaId: string) => {
  const { store } = useStore()
  return useQuery(
    store.query(
      tables.memoryEntities
        .where({ personaId })
        .orderBy('createdAt', 'desc')
    )
  )
}

export const useMemoriesByTier = (personaId: string, tier: string) => {
  const { store } = useStore()
  return useQuery(
    store.query(
      tables.memoryEntities
        .where({ personaId, memoryTier: tier })
        .orderBy('importance', 'desc')
    )
  )
}

// Advanced queries
export const useMemoryStats = (personaId: string) => {
  const { store } = useStore()
  return useQuery(
    store.query(
      tables.memoryEntities
        .where({ personaId })
        .select({
          totalCount: tables.memoryEntities.count(),
          activeCount: tables.memoryEntities.where({ memoryTier: 'active' }).count(),
          hotCount: tables.memoryEntities.where({ memoryTier: 'hot' }).count(),
          coldCount: tables.memoryEntities.where({ memoryTier: 'cold' }).count(),
          averageImportance: tables.memoryEntities.avg('importance')
        })
    )
  )
}
```

### 5. Component Integration

```typescript
// src/renderer/components/memory/MemoryExplorer.tsx
import React from 'react'
import { useStore } from '@livestore/react'
import { usePersonaMemories, useMemoryStats } from '../../../livestore/queries'
import { events } from '../../../livestore/schema'

interface MemoryExplorerProps {
  personaId: string
}

export const MemoryExplorer: React.FC<MemoryExplorerProps> = ({ personaId }) => {
  const { store } = useStore()
  const memories = usePersonaMemories(personaId)
  const stats = useMemoryStats(personaId)

  const handleAddMemory = async (content: string, type: string) => {
    const id = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await store.commit(events.memoryAdded({
      id,
      personaId,
      type,
      content,
      importance: 50,
      memoryTier: 'active'
    }))
  }

  if (!memories) return <div>Loading memories...</div>

  return (
    <div className="memory-explorer">
      <div className="memory-stats">
        <h3>Memory Statistics</h3>
        <p>Total: {stats?.totalCount || 0}</p>
        <p>Active: {stats?.activeCount || 0}</p>
        <p>Hot: {stats?.hotCount || 0}</p>
        <p>Cold: {stats?.coldCount || 0}</p>
      </div>
      
      <div className="memory-list">
        {memories.map(memory => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </div>
    </div>
  )
}
```

## Migration Steps

### Step 1: Install Dependencies

```bash
cd pjais
pnpm add @livestore/livestore @livestore/wa-sqlite@0.1.0 @livestore/adapter-web @livestore/react @livestore/peer-deps @livestore/devtools-vite
```

### Step 2: Update Main Process

```typescript
// src/main/index.ts
import { HybridDatabaseManager } from './services/hybrid-database-manager'

const dbManager = new HybridDatabaseManager()

app.whenReady().then(async () => {
  await dbManager.initialize()
  // ... rest of initialization
})
```

### Step 3: Update Renderer Process

```typescript
// src/renderer/App.tsx
import { LiveStoreProvider } from './providers/LiveStoreProvider'

const App: React.FC = () => {
  return (
    <LiveStoreProvider>
      <AppShell>
        {/* Your app components */}
      </AppShell>
    </LiveStoreProvider>
  )
}
```

### Step 4: Activate Features Gradually

1. **Memory Explorer** - First reactive component
2. **Dashboard Metrics** - Real-time statistics
3. **Persona Switching** - Instant UI updates
4. **Event Sourcing** - Audit trails

## Performance Considerations

### Caching Strategy

```typescript
// Implement query caching
const queryCache = new Map()
const CACHE_TIMEOUT = 5 * 60 * 1000 // 5 minutes

const cachedQuery = (queryFn: () => any, key: string) => {
  const cached = queryCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
    return cached.data
  }
  
  const data = queryFn()
  queryCache.set(key, { data, timestamp: Date.now() })
  return data
}
```

### Memory Management

```typescript
// Clean up subscriptions
useEffect(() => {
  const subscription = memories$.subscribe(setMemories)
  return () => subscription.unsubscribe()
}, [personaId])
```

## Testing Strategy

### Unit Tests

```typescript
// src/livestore/__tests__/queries.test.ts
import { renderHook } from '@testing-library/react'
import { usePersonaMemories } from '../queries'

describe('LiveStore Queries', () => {
  it('should return persona memories', () => {
    const { result } = renderHook(() => usePersonaMemories('test-persona-id'))
    expect(result.current).toBeDefined()
  })
})
```

### Integration Tests

```typescript
// src/livestore/__tests__/integration.test.ts
import { HybridDatabaseManager } from '../../main/services/hybrid-database-manager'

describe('Hybrid Database Manager', () => {
  let dbManager: HybridDatabaseManager

  beforeEach(async () => {
    dbManager = new HybridDatabaseManager()
    await dbManager.initialize()
  })

  it('should create persona in both systems', async () => {
    const personaData = { name: 'Test Persona', description: 'Test' }
    const id = await dbManager.createPersona(personaData)
    
    // Check Effect SQL
    const effectSQLPersona = await dbManager.getPersonaById(id)
    expect(effectSQLPersona).toBeDefined()
    
    // Check LiveStore
    const liveStorePersona = await dbManager.getActivePersona$()
    expect(liveStorePersona).toBeDefined()
  })
})
```

## Troubleshooting

### Common Issues

1. **LiveStore not initializing**
   - Check adapter configuration
   - Verify schema exports
   - Check browser console for errors

2. **Reactive queries not updating**
   - Ensure events are being committed
   - Check subscription cleanup
   - Verify query dependencies

3. **Performance issues**
   - Implement query caching
   - Use pagination for large datasets
   - Monitor memory usage

### Debug Tools

```typescript
// Enable LiveStore devtools
import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite'

// vite.config.ts
export default defineConfig({
  plugins: [
    livestoreDevtoolsPlugin({ schemaPath: './src/livestore/schema.ts' })
  ]
})
```

## Conclusion

This integration guide provides a comprehensive approach to adding LiveStore to PJai's while maintaining the stability of the existing Effect SQL system. The hybrid approach ensures:

- **Backward compatibility** with existing code
- **Gradual migration** of features
- **Performance optimization** through caching
- **Comprehensive testing** strategy
- **Debug capabilities** for development

The implementation allows PJai's to benefit from LiveStore's reactive capabilities while maintaining the proven reliability of Effect SQL for core operations.
