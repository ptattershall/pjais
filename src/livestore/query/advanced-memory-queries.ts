// Advanced memory queries using LiveStore
import { useStore } from '@livestore/react'
import { queryDb } from '@livestore/livestore'
import { tables } from '../schema'


// Get memories by type for a specific persona
export const useMemoriesByType = (personaId: string, type: string) => {
  const { store } = useStore()
  const query$ = queryDb(
    tables.memoryEntities
      .where({ personaId, type })
      .orderBy('createdAt', 'desc'),
    { label: 'memoriesByType', deps: [personaId, type] }
  )
  return store.useQuery(query$)
}

// Get memories by importance threshold
export const useMemoriesByImportance = (personaId: string, minImportance: number) => {
  const { store } = useStore()
  
  // Get all memories for the persona
  const memories$ = queryDb(
    tables.memoryEntities.where({ personaId }),
    { label: 'personaMemoriesForImportance', deps: [personaId] }
  )
  
  const memories = store.useQuery(memories$)
  
  if (!memories) return []
  
  // Filter and sort by importance
  return memories
    .filter(memory => (memory.importance || 0) >= minImportance)
    .sort((a, b) => (b.importance || 0) - (a.importance || 0))
}

// Get memories within a date range
export const useMemoriesByDateRange = (personaId: string, startDate: Date, endDate: Date) => {
  const { store } = useStore()
  
  // Get all memories for the persona
  const memories$ = queryDb(
    tables.memoryEntities.where({ personaId }),
    { label: 'personaMemoriesForDateRange', deps: [personaId] }
  )
  
  const memories = store.useQuery(memories$)
  
  if (!memories) return []
  
  // Filter by date range and sort by creation date
  return memories
    .filter(memory => {
      const memoryDate = new Date(memory.createdAt)
      return memoryDate >= startDate && memoryDate <= endDate
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// Get memories by tags
export const useMemoriesByTags = (personaId: string, tags: string[]) => {
  const { store } = useStore()
  
  // Get all memories for the persona
  const memories$ = queryDb(
    tables.memoryEntities.where({ personaId }),
    { label: 'personaMemoriesForTags', deps: [personaId] }
  )
  
  const memories = store.useQuery(memories$)
  
  if (!memories || tags.length === 0) return []
  
  // Filter by tags and sort by creation date
  return memories
    .filter(memory => {
      return tags.some(tag => 
        Array.isArray(memory.tags) && memory.tags.includes(tag)
      )
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
} 