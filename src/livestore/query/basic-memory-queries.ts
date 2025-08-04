// Basic memory queries using LiveStore
import { useStore } from '@livestore/react'
import { queryDb } from '@livestore/livestore'
import { tables } from '../schema'

// Get all memories for a specific persona
export const usePersonaMemories = (personaId: string) => {
  const { store } = useStore()
  const query$ = queryDb(
    tables.memoryEntities
      .where({ personaId })
      .orderBy('createdAt', 'desc'),
    { label: 'personaMemories', deps: [personaId] }
  )
  return store.useQuery(query$)
}

// Get memories by tier for a specific persona
export const useMemoriesByTier = (personaId: string, tier: string) => {
  const { store } = useStore()
  const query$ = queryDb(
    tables.memoryEntities
      .where({ personaId, memoryTier: tier })
      .orderBy('importance', 'desc'),
    { label: 'memoriesByTier', deps: [personaId, tier] }
  )
  return store.useQuery(query$)
}

// Get a specific memory by ID
export const useMemoryById = (id: string) => {
  const { store } = useStore()
  const query$ = queryDb(
    tables.memoryEntities.where({ id }).first(),
    { label: 'memoryById', deps: [id] }
  )
  return store.useQuery(query$)
}

// Get memory statistics for a persona
export const useMemoryStats = (personaId: string) => {
  const { store } = useStore()
  
  // Get all memories for the persona
  const memories$ = queryDb(
    tables.memoryEntities.where({ personaId }),
    { label: 'personaMemoriesForStats', deps: [personaId] }
  )
  
  const memories = store.useQuery(memories$)
  
  // Calculate stats from the memories array
  const stats = {
    totalCount: memories?.length || 0,
    activeCount: memories?.filter(m => m.memoryTier === 'active').length || 0,
    hotCount: memories?.filter(m => m.memoryTier === 'hot').length || 0,
    coldCount: memories?.filter(m => m.memoryTier === 'cold').length || 0,
    averageImportance: memories?.length 
      ? memories.reduce((sum, m) => sum + (m.importance || 0), 0) / memories.length 
      : 0
  }
  
  return stats
} 