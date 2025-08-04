// Backward compatibility layer for existing components
import { Effect, Context } from 'effect'
import { PersonaRepository, PersonaRepositoryLive } from '../../main/database/persona-repository'
import { MemoryRepository, MemoryRepositoryLive } from '../../main/database/memory-repository'
import { PersonaData } from '../../shared/types/persona'
import { MemoryEntity } from '../../shared/types/memory'
import { ReactiveQuery, QueryOptions } from './types'

// Database service context
const DatabaseContext = Context.make(PersonaRepository, PersonaRepositoryLive).pipe(
  Context.add(MemoryRepository, MemoryRepositoryLive)
)

// Create reactive query implementation for backward compatibility
function createReactiveQuery<T>(
  queryFn: () => Promise<T>,
  options: QueryOptions = { label: 'query' }
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
      // Note: These events would need to be emitted by the actual database operations
    }

    // Immediately fetch current value
    refreshData()

    return () => {
      subscribers = subscribers.filter(sub => sub !== callback)
      if (subscribers.length === 0) {
        isActive = false
      }
    }
  }

  return {
    subscribe,
    unsubscribe: () => {
      subscribers = []
      isActive = false
    },
    getCurrentValue: async () => {
      if (currentValue === undefined) {
        await refreshData()
      }
      return currentValue as T
    }
  }
}

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
// BACKWARD COMPATIBILITY QUERIES
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
// MEMORY QUERIES (Backward Compatibility)
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
// UI STATE QUERIES (Backward Compatibility)
// =============================================================================

export const uiState$ = createReactiveQuery(
  () => Promise.resolve(null), // UI state not implemented yet
  { label: 'uiState$' }
)

// =============================================================================
// SIMPLE FILTERED QUERIES (Backward Compatibility)
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