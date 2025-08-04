// Shared types for LiveStore queries
import { PersonaData } from '../../shared/types/persona'
import { MemoryEntity } from '../../shared/types/memory'

// Reactive query interface for backward compatibility
export interface ReactiveQuery<T> {
  subscribe(callback: (data: T) => void): () => void
  unsubscribe(): void
  getCurrentValue(): Promise<T>
}

// Query options for reactive queries
export interface QueryOptions {
  label: string
  deps?: any[]
}

// Database context for Effect-based queries
export interface DatabaseContext {
  personas: {
    findActive: () => Promise<PersonaData | null>
    findAll: () => Promise<PersonaData[]>
    findById: (id: string) => Promise<PersonaData | null>
  }
  memoryEntities: {
    findByPersonaId: (personaId: string) => Promise<MemoryEntity[]>
    findById: (id: string) => Promise<MemoryEntity | null>
    findByTier: (personaId: string, tier: string) => Promise<MemoryEntity[]>
    findActive: (personaId: string) => Promise<MemoryEntity[]>
  }
  conversations: {
    findByPersonaId: (personaId: string) => Promise<any[]>
    findById: (id: string) => Promise<any | null>
  }
}

// Memory analytics result type
export interface MemoryAnalytics {
  totalCount: number
  totalSize: number
  averageImportance: number
  maxImportance: number
  minImportance: number
  tierDistribution: {
    hot: number
    active: number
    cold: number
  }
  typeDistribution: Record<string, number>
  recentActivity: number
}

// Persona analytics result type
export interface PersonaAnalytics {
  totalPersonas: number
  activePersonas: number
  averageMemoriesPerPersona: number
  recentPersonas: number
}

// Memory performance result type
export interface MemoryPerformance {
  highImportanceCount: number
  frequentlyAccessed: number
  recentAccesses: number
}

// Memory stats result type
export interface MemoryStats {
  totalCount: number
  activeCount: number
  hotCount: number
  coldCount: number
  averageImportance: number
} 