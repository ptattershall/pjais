// LiveStore replacement using Effect SQL backend
import { PersonaData } from '../shared/types/persona'
import { MemoryEntity } from '../shared/types/memory'
import { EventEmitter } from 'events'

// Event emitter for reactive updates
const eventEmitter = new EventEmitter()

// Define reactive table interface
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

// Create reactive table implementations
function createReactiveTable<T>(tableName: string): ReactiveTable<T> {
  return {
    where(filter: Partial<T>): ReactiveQuery<T> {
      return createReactiveQuery(tableName, { filter })
    },
    first(): ReactiveQuery<T | null> {
      return createReactiveQuery(tableName, { limit: 1 })
    },
    orderBy(field: keyof T, direction: 'asc' | 'desc' = 'asc'): ReactiveQuery<T> {
      return createReactiveQuery(tableName, { orderBy: { field, direction } })
    },
    limit(count: number): ReactiveQuery<T> {
      return createReactiveQuery(tableName, { limit: count })
    },
    subscribe(callback: (data: T[]) => void): () => void {
      const handler = (data: T[]) => callback(data)
      eventEmitter.on(`${tableName}:updated`, handler)
      return () => eventEmitter.off(`${tableName}:updated`, handler)
    }
  }
}

function createReactiveQuery<T>(tableName: string, options: any): ReactiveQuery<T> {
  return {
    subscribe(callback: (data: T) => void): () => void {
      const handler = (data: T) => callback(data)
      eventEmitter.on(`${tableName}:query:updated`, handler)
      return () => eventEmitter.off(`${tableName}:query:updated`, handler)
    },
    first(): ReactiveQuery<T | null> {
      return createReactiveQuery(tableName, { ...options, limit: 1 })
    },
    orderBy(field: keyof T, direction: 'asc' | 'desc' = 'asc'): ReactiveQuery<T> {
      return createReactiveQuery(tableName, { ...options, orderBy: { field, direction } })
    },
    limit(count: number): ReactiveQuery<T> {
      return createReactiveQuery(tableName, { ...options, limit: count })
    }
  }
}

// Export schema with reactive tables
export const schema = {
  version: '1.0.0',
  backend: 'effect-sql',
  reactive: true
}

export const tables = {
  personas: createReactiveTable<PersonaData>('personas'),
  memoryEntities: createReactiveTable<MemoryEntity>('memoryEntities'),
  conversations: createReactiveTable<any>('conversations')
}

// Event system for reactive updates
export const events = {
  personaCreated: (data: PersonaData) => {
    eventEmitter.emit('personas:updated', data)
    return { type: 'personaCreated', data }
  },
  personaUpdated: (data: PersonaData) => {
    eventEmitter.emit('personas:updated', data)
    return { type: 'personaUpdated', data }
  },
  personaActivated: (data: PersonaData) => {
    eventEmitter.emit('personas:updated', data)
    return { type: 'personaActivated', data }
  },
  personaDeactivated: (data: PersonaData) => {
    eventEmitter.emit('personas:updated', data)
    return { type: 'personaDeactivated', data }
  },
  memoryEntityCreated: (data: MemoryEntity) => {
    eventEmitter.emit('memoryEntities:updated', data)
    return { type: 'memoryEntityCreated', data }
  },
  memoryEntityUpdated: (data: MemoryEntity) => {
    eventEmitter.emit('memoryEntities:updated', data)
    return { type: 'memoryEntityUpdated', data }
  },
  memoryEntityAccessed: (data: MemoryEntity) => {
    eventEmitter.emit('memoryEntities:updated', data)
    return { type: 'memoryEntityAccessed', data }
  },
  memoryEntityDeleted: (data: MemoryEntity) => {
    eventEmitter.emit('memoryEntities:updated', data)
    return { type: 'memoryEntityDeleted', data }
  }
}

// Export event emitter for internal use
export const reactiveEventEmitter = eventEmitter

// Original LiveStore schema (commented out for now)
/*
import { Events, makeSchema, Schema, SessionIdSymbol, State } from '@livestore/livestore'

// =============================================================================
// PERSONA SCHEMA
// =============================================================================

const PersonaState = Schema.struct({
  id: Schema.string,
  name: Schema.string,
  description: Schema.string,
  personality: Schema.record(Schema.string, Schema.any),
  isActive: Schema.boolean,
  createdAt: Schema.date,
  updatedAt: Schema.date,
})

const PersonaEvents = Events.schema({
  personaCreated: {
    id: Schema.string,
    name: Schema.string,
    description: Schema.string,
    personality: Schema.record(Schema.string, Schema.any)
  },
  personaUpdated: {
    id: Schema.string,
    updates: Schema.record(Schema.string, Schema.any)
  },
  personaActivated: {
    id: Schema.string
  },
  personaDeactivated: {
    id: Schema.string
  }
})

// =============================================================================
// MEMORY ENTITIES SCHEMA
// =============================================================================

const MemoryEntityState = Schema.struct({
  id: Schema.string,
  personaId: Schema.string,
  type: Schema.string,
  name: Schema.string,
  content: Schema.string,
  summary: Schema.string,
  tags: Schema.array(Schema.string),
  importance: Schema.number,
  memoryTier: Schema.string,
  embedding: Schema.array(Schema.number).optional(),
  embeddingModel: Schema.string.optional(),
  accessCount: Schema.number,
  lastAccessed: Schema.date.optional(),
  createdAt: Schema.date,
  updatedAt: Schema.date,
  deletedAt: Schema.date.optional(),
})

const MemoryEntityEvents = Events.schema({
  memoryEntityCreated: {
    id: Schema.string,
    personaId: Schema.string,
    type: Schema.string,
    name: Schema.string,
    content: Schema.string,
    summary: Schema.string,
    tags: Schema.array(Schema.string),
    importance: Schema.number
  },
  memoryEntityUpdated: {
    id: Schema.string,
    updates: Schema.record(Schema.string, Schema.any)
  },
  memoryEntityAccessed: {
    id: Schema.string,
    accessedAt: Schema.date
  },
  memoryEntityDeleted: {
    id: Schema.string,
    deletedAt: Schema.date
  }
})

// =============================================================================
// CONVERSATIONS SCHEMA
// =============================================================================

const ConversationState = Schema.struct({
  id: Schema.string,
  personaId: Schema.string,
  title: Schema.string,
  messages: Schema.array(Schema.struct({
    id: Schema.string,
    role: Schema.string,
    content: Schema.string,
    timestamp: Schema.date
  })),
  createdAt: Schema.date,
  updatedAt: Schema.date
})

const ConversationEvents = Events.schema({
  conversationStarted: {
    id: Schema.string,
    personaId: Schema.string,
    title: Schema.string
  },
  messageAdded: {
    conversationId: Schema.string,
    messageId: Schema.string,
    role: Schema.string,
    content: Schema.string
  }
})

// =============================================================================
// COMBINE SCHEMAS
// =============================================================================

export const schema = makeSchema({
  // Session identifier
  [SessionIdSymbol]: Schema.string,
  
  // State schemas
  personas: PersonaState,
  memoryEntities: MemoryEntityState,
  conversations: ConversationState,
  
  // Event schemas  
  events: Schema.union(
    PersonaEvents,
    MemoryEntityEvents, 
    ConversationEvents
  )
})

// Export typed tables and events for easy access
export const tables = schema.tables
export const events = schema.events
*/ 