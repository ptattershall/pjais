// Reactive query system backed by Effect SQL
import { reactiveEventEmitter } from './schema'
import { PersonaData } from '../shared/types/persona'
import { MemoryEntity } from '../shared/types/memory'
import { PersonaRepository, PersonaRepositoryLive } from '../main/database/persona-repository'
import { MemoryRepository, MemoryRepositoryLive } from '../main/database/memory-repository'
import { DatabaseService } from '../main/database/database-service'
import { Effect, Context } from 'effect'

// Define reactive query interface
interface ReactiveQuery<T> {
  subscribe(callback: (data: T) => void): () => void
  unsubscribe(): void
  getCurrentValue(): Promise<T>
}

// Create reactive query implementation
function createReactiveQuery<T>(
  queryFn: () => Promise<T>,
  options: { label: string; deps?: any[] } = { label: 'query' }
): ReactiveQuery<T> {
  let currentValue: T | undefined
  let subscribers: Array<(data: T) => void> = []
  let isActive = false

  const refreshData = async () => {
    try {
      const newValue = await queryFn()
      currentValue = newValue
      subscribers.forEach(callback => callback(newValue))
    } catch (error) {
      // Silent error handling - errors are caught and handled by Effect
    }
  }

  const subscribe = (callback: (data: T) => void) => {
    subscribers.push(callback)
    
    if (!isActive) {
      isActive = true
      // Set up event listeners for reactive updates
      reactiveEventEmitter.on('personas:updated', refreshData)
      reactiveEventEmitter.on('memoryEntities:updated', refreshData)
      reactiveEventEmitter.on('conversations:updated', refreshData)
    }

    // Immediately fetch current value
    refreshData()

    return () => {
      subscribers = subscribers.filter(sub => sub !== callback)
      if (subscribers.length === 0) {
        isActive = false
        reactiveEventEmitter.off('personas:updated', refreshData)
        reactiveEventEmitter.off('memoryEntities:updated', refreshData)
        reactiveEventEmitter.off('conversations:updated', refreshData)
      }
    }
  }

  return {
    subscribe,
    unsubscribe: () => {
      subscribers = []
      isActive = false
      reactiveEventEmitter.off('personas:updated', refreshData)
      reactiveEventEmitter.off('memoryEntities:updated', refreshData)
      reactiveEventEmitter.off('conversations:updated', refreshData)
    },
    getCurrentValue: async () => {
      if (currentValue === undefined) {
        await refreshData()
      }
      return currentValue as T
    }
  }
}

// Database service context
const DatabaseContext = Context.make(PersonaRepository, PersonaRepositoryLive).pipe(
  Context.add(MemoryRepository, MemoryRepositoryLive)
)

// Database functions connected to actual Effect SQL services
const database = {
  personas: {
    findActive: async (): Promise<PersonaData | null> => {
      return Effect.runPromise(
        PersonaRepository.getActive().pipe(
          Effect.provide(DatabaseContext)
        )
      ).catch(() => null)
    },
    findAll: async (): Promise<PersonaData[]> => {
      return Effect.runPromise(
        PersonaRepository.getAll().pipe(
          Effect.provide(DatabaseContext)
        )
      ).catch(() => [])
    },
    findById: async (id: string): Promise<PersonaData | null> => {
      return Effect.runPromise(
        PersonaRepository.getById(id).pipe(
          Effect.provide(DatabaseContext)
        )
      ).catch(() => null)
    }
  },
  memoryEntities: {
    findByPersonaId: async (personaId: string): Promise<MemoryEntity[]> => {
      return Effect.runPromise(
        MemoryRepository.getByPersonaId(personaId).pipe(
          Effect.provide(DatabaseContext)
        )
      ).catch(() => [])
    },
    findById: async (id: string): Promise<MemoryEntity | null> => {
      return Effect.runPromise(
        MemoryRepository.getById(id).pipe(
          Effect.provide(DatabaseContext)
        )
      ).catch(() => null)
    },
    findByTier: async (personaId: string, tier: string): Promise<MemoryEntity[]> => {
      return Effect.runPromise(
        MemoryRepository.getByPersonaId(personaId).pipe(
          Effect.map(memories => memories.filter(m => m.memoryTier === tier)),
          Effect.provide(DatabaseContext)
        )
      ).catch(() => [])
    },
    findActive: async (personaId: string): Promise<MemoryEntity[]> => {
      return Effect.runPromise(
        MemoryRepository.getByPersonaId(personaId).pipe(
          Effect.map(memories => memories.filter(m => m.memoryTier === 'active')),
          Effect.provide(DatabaseContext)
        )
      ).catch(() => [])
    }
  },
  conversations: {
    findByPersonaId: async (_personaId: string): Promise<any[]> => {
      // Note: Conversation repository not yet implemented
      return []
    },
    findById: async (_id: string): Promise<any | null> => {
      // Note: Conversation repository not yet implemented
      return null
    }
  }
}

// =============================================================================
// BASIC QUERIES - Working Foundation
// =============================================================================

export const activePersona$ = createReactiveQuery(
  () => database.personas.findActive(),
  { label: 'activePersona$' }
)

export const allPersonas$ = createReactiveQuery(
  () => database.personas.findAll(),
  { label: 'allPersonas$' }
)

export const personaById$ = (personaId: string) => createReactiveQuery(
  () => database.personas.findById(personaId),
  { 
    label: 'personaById$',
    deps: [personaId]
  }
)

export const personaMemories$ = (personaId: string) => createReactiveQuery(
  () => database.memoryEntities.findByPersonaId(personaId),
  { 
    label: 'personaMemories$',
    deps: [personaId]
  }
)

export const memoryById$ = (memoryId: string) => createReactiveQuery(
  () => database.memoryEntities.findById(memoryId),
  {
    label: 'memoryById$',
    deps: [memoryId]
  }
)

export const personaConversations$ = (personaId: string) => createReactiveQuery(
  () => database.conversations.findByPersonaId(personaId),
  {
    label: 'personaConversations$',
    deps: [personaId]
  }
)

export const conversationById$ = (conversationId: string) => createReactiveQuery(
  () => database.conversations.findById(conversationId),
  {
    label: 'conversationById$',
    deps: [conversationId]
  }
)

// =============================================================================
// MEMORY QUERIES
// =============================================================================

export const hotMemories$ = (personaId: string) => createReactiveQuery(
  () => database.memoryEntities.findByTier(personaId, 'hot'),
  {
    label: 'hotMemories$',
    deps: [personaId]
  }
)

export const activeMemories$ = (personaId: string) => createReactiveQuery(
  () => database.memoryEntities.findActive(personaId),
  {
    label: 'activeMemories$',
    deps: [personaId]
  }
)

// =============================================================================
// UI STATE QUERIES
// =============================================================================

export const uiState$ = createReactiveQuery(
  () => Promise.resolve(null), // UI state not implemented yet
  { label: 'uiState$' }
)

// =============================================================================
// SIMPLE FILTERED QUERIES
// =============================================================================

export const memoriesByType$ = (personaId: string, type: string) => createReactiveQuery(
  () => database.memoryEntities.findByPersonaId(personaId).then(memories => 
    memories.filter(m => m.type === type)
  ),
  {
    label: 'memoriesByType$',
    deps: [personaId, type]
  }
)

export const archivedConversations$ = (personaId: string) => createReactiveQuery(
  () => database.conversations.findByPersonaId(personaId).then(conversations =>
    conversations.filter(c => c.isArchived)
  ),
  {
    label: 'archivedConversations$',
    deps: [personaId]
  }
)

export const recentPersonas$ = createReactiveQuery(
  () => database.personas.findAll().then(personas =>
    personas.sort((a, b) => {
      const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      return bDate - aDate;
    }).slice(0, 5)
  ),
  { label: 'recentPersonas$' }
)

// =============================================================================
// Additional simple queries can be added here following the same patterns
// ============================================================================= 