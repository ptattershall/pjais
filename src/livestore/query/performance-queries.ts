// Performance monitoring queries using LiveStore
import { useStore } from '@livestore/react'
import { queryDb } from '@livestore/livestore'
import { tables } from '../schema'


// Get memory performance metrics for a persona
export const useMemoryPerformance = (personaId: string) => {
  const { store } = useStore()
  
  // Get all memories for the persona
  const memories$ = queryDb(
    tables.memoryEntities.where({ personaId }),
    { label: 'personaMemoriesForPerformance', deps: [personaId] }
  )
  
  const memories = store.useQuery(memories$)
  
  if (!memories || memories.length === 0) {
    return {
      highImportanceCount: 0,
      frequentlyAccessed: 0,
      recentAccesses: 0
    }
  }
  
  const highImportanceCount = memories.filter(m => (m.importance || 0) >= 80).length
  const frequentlyAccessed = memories.filter(m => (m.accessCount || 0) > 10).length
  
  const lastDay = new Date()
  lastDay.setDate(lastDay.getDate() - 1)
  const recentAccesses = memories.filter(m => {
    const lastAccessed = m.lastAccessed ? new Date(m.lastAccessed) : null
    return lastAccessed && lastAccessed >= lastDay
  }).length
  
  return {
    highImportanceCount,
    frequentlyAccessed,
    recentAccesses
  }
} 