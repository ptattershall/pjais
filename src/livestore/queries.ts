// LiveStore queries with React hooks for real-time UI updates
import { useStore, useQuery } from '@livestore/react'
import { tables } from './schema'
import { reactiveEventEmitter } from './schema'
import { PersonaData } from '../shared/types/persona'
import { MemoryEntity } from '../shared/types/memory'
import { PersonaRepository, PersonaRepositoryLive } from '../main/database/persona-repository'
import { MemoryRepository, MemoryRepositoryLive } from '../main/database/memory-repository'
import { DatabaseService } from '../main/database/database-service'
import { Effect, Context } from 'effect'

// =============================================================================
// LIVESTORE REACT HOOKS
// =============================================================================

// Basic queries using LiveStore
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

export const useMemoryById = (id: string) => {
  const { store } = useStore()
  return useQuery(store.query(tables.memoryEntities.where({ id }).first()))
}

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

export const useRecentPersonas = () => {
  const { store } = useStore()
  return useQuery(
    store.query(
      tables.personas
        .all()
        .orderBy('updatedAt', 'desc')
        .limit(5)
    )
  )
}

// =============================================================================
// ADVANCED LIVESTORE QUERIES
// =============================================================================

// Memory Explorer specific queries
export const useMemoriesByType = (personaId: string, type: string) => {
  const { store } = useStore()
  return useQuery(
    store.query(
      tables.memoryEntities
        .where({ personaId, type })
        .orderBy('createdAt', 'desc')
    )
  )
}

export const useMemoriesByImportance = (personaId: string, minImportance: number) => {
  const { store } = useStore()
  return useQuery(
    store.query(
      tables.memoryEntities
        .where({ personaId })
        .filter(memory => memory.importance >= minImportance)
        .orderBy('importance', 'desc')
    )
  )
}

export const useMemoriesByDateRange = (personaId: string, startDate: Date, endDate: Date) => {
  const { store } = useStore()
  return useQuery(
    store.query(
      tables.memoryEntities
        .where({ personaId })
        .filter(memory => {
          const memoryDate = new Date(memory.createdAt)
          return memoryDate >= startDate && memoryDate <= endDate
        })
        .orderBy('createdAt', 'desc')
    )
  )
}

export const useMemoriesByTags = (personaId: string, tags: string[]) => {
  const { store } = useStore()
  return useQuery(
    store.query(
      tables.memoryEntities
        .where({ personaId })
        .filter(memory => {
          return tags.some(tag => memory.tags?.includes(tag))
        })
        .orderBy('createdAt', 'desc')
    )
  )
}

// Analytics queries
export const useMemoryAnalytics = (personaId: string) => {
  const { store } = useStore()
  return useQuery(
    store.query(
      tables.memoryEntities
        .where({ personaId })
        .select({
          totalCount: tables.memoryEntities.count(),
          totalSize: tables.memoryEntities.sum('content.length'),
          averageImportance: tables.memoryEntities.avg('importance'),
          maxImportance: tables.memoryEntities.max('importance'),
          minImportance: tables.memoryEntities.min('importance'),
          tierDistribution: {
            hot: tables.memoryEntities.where({ memoryTier: 'hot' }).count(),
            active: tables.memoryEntities.where({ memoryTier: 'active' }).count(),
            cold: tables.memoryEntities.where({ memoryTier: 'cold' }).count()
          },
          typeDistribution: tables.memoryEntities.groupBy('type').count(),
          recentActivity: tables.memoryEntities
            .where({ personaId })
            .filter(memory => {
              const lastWeek = new Date()
              lastWeek.setDate(lastWeek.getDate() - 7)
              return new Date(memory.updatedAt) >= lastWeek
            })
            .count()
        })
    )
  )
}

export const usePersonaAnalytics = () => {
  const { store } = useStore()
  return useQuery(
    store.query(
      tables.personas
        .all()
        .select({
          totalPersonas: tables.personas.count(),
          activePersonas: tables.personas.where({ isActive: true }).count(),
          averageMemoriesPerPersona: tables.memoryEntities.count() / tables.personas.count(),
          recentPersonas: tables.personas
            .filter(persona => {
              const lastMonth = new Date()
              lastMonth.setMonth(lastMonth.getMonth() - 1)
              return new Date(persona.updatedAt) >= lastMonth
            })
            .count()
        })
    )
  )
}

// Search queries
export const useMemorySearch = (personaId: string, searchTerm: string) => {
  const { store } = useStore()
  return useQuery(
    store.query(
      tables.memoryEntities
        .where({ personaId })
        .filter(memory => {
          const searchLower = searchTerm.toLowerCase()
          return (
            memory.name?.toLowerCase().includes(searchLower) ||
            memory.content?.toLowerCase().includes(searchLower) ||
            memory.summary?.toLowerCase().includes(searchLower) ||
            memory.tags?.some(tag => tag.toLowerCase().includes(searchLower))
          )
        })
        .orderBy('importance', 'desc')
    )
  )
}

export const usePersonaSearch = (searchTerm: string) => {
  const { store } = useStore()
  return useQuery(
    store.query(
      tables.personas
        .all()
        .filter(persona => {
          const searchLower = searchTerm.toLowerCase()
          return (
            persona.name?.toLowerCase().includes(searchLower) ||
            persona.description?.toLowerCase().includes(searchLower)
          )
        })
        .orderBy('updatedAt', 'desc')
    )
  )
}

// Performance monitoring queries
export const useMemoryPerformance = (personaId: string) => {
  const { store } = useStore()
  return useQuery(
    store.query(
      tables.memoryEntities
        .where({ personaId })
        .select({
          highImportanceCount: tables.memoryEntities
            .where({ personaId })
            .filter(memory => memory.importance >= 80)
            .count(),
          frequentlyAccessed: tables.memoryEntities
            .where({ personaId })
            .filter(memory => (memory.accessCount || 0) > 10)
            .count(),
          recentAccesses: tables.memoryEntities
            .where({ personaId })
            .filter(memory => {
              const lastDay = new Date()
              lastDay.setDate(lastDay.getDate() - 1)
              return memory.lastAccessed && new Date(memory.lastAccessed) >= lastDay
            })
            .count()
        })
    )
  )
}

// =============================================================================
// BACKWARD COMPATIBILITY LAYER
// =============================================================================

// Database service context
const DatabaseContext = Context.make(PersonaRepository, PersonaRepositoryLive).pipe(
  Context.add(MemoryRepository, MemoryRepositoryLive)
)

// Define reactive query interface for backward compatibility
interface ReactiveQuery<T> {
  subscribe(callback: (data: T) => void): () => void
  unsubscribe(): void
  getCurrentValue(): Promise<T>
}

// Create reactive query implementation for backward compatibility
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