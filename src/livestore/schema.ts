// LiveStore schema implementation
import { Events, makeSchema, Schema, State } from '@livestore/livestore'
import { PersonaData } from '../shared/types/persona'
import { MemoryEntity } from '../shared/types/memory'
import { EventEmitter } from 'events'

// Event emitter for backward compatibility
const eventEmitter = new EventEmitter()

// =============================================================================
// EVENT PAYLOAD TYPES
// =============================================================================

interface PersonaCreatedPayload {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly personality: Record<string, unknown>
  readonly memoryConfiguration: Record<string, unknown>
  readonly privacySettings: Record<string, unknown>
  readonly isActive: boolean
}

interface PersonaUpdatedPayload {
  readonly id: string
  readonly updates: Record<string, unknown>
}

interface PersonaActivatedPayload {
  readonly id: string
}

interface PersonaDeactivatedPayload {
  readonly id: string
}

interface MemoryEntityCreatedPayload {
  readonly id: string
  readonly personaId: string
  readonly type: string
  readonly name: string
  readonly content: string
  readonly summary: string
  readonly tags: readonly string[]
  readonly importance: number
  readonly memoryTier: string
}

interface MemoryEntityUpdatedPayload {
  readonly id: string
  readonly updates: Record<string, unknown>
}

interface MemoryEntityAccessedPayload {
  readonly id: string
  readonly accessedAt: Date
}

interface MemoryEntityDeletedPayload {
  readonly id: string
  readonly deletedAt: Date
}

// =============================================================================
// EVENTS DEFINITION
// =============================================================================

const events = {
  personaCreated: Events.synced({
    name: "v1.PersonaCreated",
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      description: Schema.String,
      personality: Schema.Any,
      memoryConfiguration: Schema.Any,
      privacySettings: Schema.Any,
      isActive: Schema.Boolean
    })
  }),

  personaUpdated: Events.synced({
    name: "v1.PersonaUpdated",
    schema: Schema.Struct({
      id: Schema.String,
      updates: Schema.Any
    })
  }),

  personaActivated: Events.synced({
    name: "v1.PersonaActivated",
    schema: Schema.Struct({
      id: Schema.String
    })
  }),

  personaDeactivated: Events.synced({
    name: "v1.PersonaDeactivated",
    schema: Schema.Struct({
      id: Schema.String
    })
  }),

  memoryEntityCreated: Events.synced({
    name: "v1.MemoryEntityCreated",
    schema: Schema.Struct({
      id: Schema.String,
      personaId: Schema.String,
      type: Schema.String,
      name: Schema.String,
      content: Schema.String,
      summary: Schema.String,
      tags: Schema.Array(Schema.String),
      importance: Schema.Number,
      memoryTier: Schema.String
    })
  }),

  memoryEntityUpdated: Events.synced({
    name: "v1.MemoryEntityUpdated",
    schema: Schema.Struct({
      id: Schema.String,
      updates: Schema.Any
    })
  }),

  memoryEntityAccessed: Events.synced({
    name: "v1.MemoryEntityAccessed",
    schema: Schema.Struct({
      id: Schema.String,
      accessedAt: Schema.DateFromNumber
    })
  }),

  memoryEntityDeleted: Events.synced({
    name: "v1.MemoryEntityDeleted",
    schema: Schema.Struct({
      id: Schema.String,
      deletedAt: Schema.DateFromNumber
    })
  })
}

// =============================================================================
// TABLE DEFINITIONS
// =============================================================================

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
      name: State.SQLite.text(),
      content: State.SQLite.text(),
      summary: State.SQLite.text(),
      tags: State.SQLite.json(),
      importance: State.SQLite.integer({ default: 50 }),
      memoryTier: State.SQLite.text({ default: 'active' }),
      embedding: State.SQLite.json({ nullable: true }),
      embeddingModel: State.SQLite.text({ nullable: true }),
      accessCount: State.SQLite.integer({ default: 0 }),
      lastAccessed: State.SQLite.integer({ schema: Schema.DateFromNumber, nullable: true }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      deletedAt: State.SQLite.integer({ schema: Schema.DateFromNumber, nullable: true })
    }
  })
}

// =============================================================================
// MATERIALIZERS
// =============================================================================

const materializers = State.SQLite.materializers(events, {
  "v1.PersonaCreated": (eventPayload: PersonaCreatedPayload) => {
    const { id, name, description, personality, memoryConfiguration, privacySettings, isActive } = eventPayload
    const now = new Date()
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

  "v1.PersonaUpdated": (eventPayload: PersonaUpdatedPayload) => {
    const { id, updates } = eventPayload
    const now = new Date()
    return tables.personas.update({ ...updates, updatedAt: now }).where({ id })
  },

  "v1.PersonaActivated": (eventPayload: PersonaActivatedPayload) => {
    const { id } = eventPayload
    // Deactivate all personas first
    const deactivateAll = tables.personas.update({ isActive: false }).where({})
    // Then activate the specified persona
    const activateOne = tables.personas.update({ isActive: true }).where({ id })
    return [deactivateAll, activateOne]
  },

  "v1.PersonaDeactivated": (eventPayload: PersonaDeactivatedPayload) => {
    const { id } = eventPayload
    return tables.personas.update({ isActive: false }).where({ id })
  },

  "v1.MemoryEntityCreated": (eventPayload: MemoryEntityCreatedPayload) => {
    const { id, personaId, type, name, content, summary, tags, importance, memoryTier } = eventPayload
    const now = new Date()
    return tables.memoryEntities.insert({
      id,
      personaId,
      type,
      name,
      content,
      summary,
      tags,
      importance,
      memoryTier,
      createdAt: now,
      updatedAt: now
    })
  },

  "v1.MemoryEntityUpdated": (eventPayload: MemoryEntityUpdatedPayload) => {
    const { id, updates } = eventPayload
    const now = new Date()
    return tables.memoryEntities.update({ ...updates, updatedAt: now }).where({ id })
  },

  "v1.MemoryEntityAccessed": (eventPayload: MemoryEntityAccessedPayload) => {
    const { id, accessedAt } = eventPayload
    return tables.memoryEntities.update({ 
      lastAccessed: accessedAt,
      accessCount: 1 // Increment access count
    }).where({ id })
  },

  "v1.MemoryEntityDeleted": (eventPayload: MemoryEntityDeletedPayload) => {
    const { id, deletedAt } = eventPayload
    return tables.memoryEntities.update({ deletedAt }).where({ id })
  }
})

// =============================================================================
// SCHEMA EXPORT
// =============================================================================

const state = State.SQLite.makeState({ tables, materializers })
export const schema = makeSchema({ events, state })

// Export tables for use in queries
export { tables }

// =============================================================================
// BACKWARD COMPATIBILITY LAYER
// =============================================================================

// Event emitter for backward compatibility with existing components
export const reactiveEventEmitter = eventEmitter

// Reactive table interface for backward compatibility
interface ReactiveTable<T> {
  where(filter: Partial<T>): ReactiveQuery<T>
  first(): ReactiveQuery<T | null>
  orderBy(field: keyof T, direction?: 'asc' | 'desc'): ReactiveQuery<T>
  limit(count: number): ReactiveQuery<T>
  subscribe(callback: (data: T[]) => void): () => void
}

interface ReactiveQuery<T> {
  subscribe(callback: (data: T) => void): () => void
  first(): ReactiveQuery<T | null>
  orderBy(field: keyof T, direction?: 'asc' | 'desc'): ReactiveQuery<T>
  limit(count: number): ReactiveQuery<T>
}

// Backward compatibility functions
function createReactiveTable<T>(tableName: string): ReactiveTable<T> {
  return {
    where(filter: Partial<T>): ReactiveQuery<T> {
      return createReactiveQuery<T>(tableName, { filter })
    },

    first(): ReactiveQuery<T | null> {
      return createReactiveQuery<T | null>(tableName, { limit: 1 })
    },

    orderBy(field: keyof T, direction: 'asc' | 'desc' = 'asc'): ReactiveQuery<T> {
      return createReactiveQuery<T>(tableName, { orderBy: { field: String(field), direction } })
    },

    limit(count: number): ReactiveQuery<T> {
      return createReactiveQuery<T>(tableName, { limit: count })
    },

    subscribe(callback: (data: T[]) => void): () => void {
      const handler = (data: T[]) => callback(data)
      eventEmitter.on(`${tableName}:updated`, handler)
      return () => eventEmitter.off(`${tableName}:updated`, handler)
    }
  }
}

interface QueryOptions {
  filter?: Record<string, unknown>
  limit?: number
  orderBy?: { field: string; direction: 'asc' | 'desc' }
}

function createReactiveQuery<T>(tableName: string, options: QueryOptions): ReactiveQuery<T> {
  return {
    subscribe(callback: (data: T) => void): () => void {
      const handler = (data: T) => callback(data)
      eventEmitter.on(`${tableName}:query`, handler)
      return () => eventEmitter.off(`${tableName}:query`, handler)
    },

    first(): ReactiveQuery<T | null> {
      return createReactiveQuery<T | null>(tableName, { ...options, limit: 1 })
    },

    orderBy(field: keyof T, direction: 'asc' | 'desc' = 'asc'): ReactiveQuery<T> {
      return createReactiveQuery<T>(tableName, { ...options, orderBy: { field: String(field), direction } })
    },

    limit(count: number): ReactiveQuery<T> {
      return createReactiveQuery<T>(tableName, { ...options, limit: count })
    }
  }
}

// Export backward compatibility tables
export const reactiveTables = {
  personas: createReactiveTable<PersonaData>('personas'),
  memoryEntities: createReactiveTable<MemoryEntity>('memory_entities')
}

// Export events for use in the hybrid database manager
export { events } 