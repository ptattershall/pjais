// Analytics queries using LiveStore
import { useStore } from '@livestore/react'
import { queryDb } from '@livestore/livestore'
import { tables } from '../schema'


// Get comprehensive memory analytics for a persona
export const useMemoryAnalytics = (personaId: string) => {
  const { store } = useStore()
  
  // Get all memories for the persona
  const memories$ = queryDb(
    tables.memoryEntities.where({ personaId }),
    { label: 'personaMemoriesForAnalytics', deps: [personaId] }
  )
  
  const memories = store.useQuery(memories$)
  
  if (!memories || memories.length === 0) {
    return {
      totalCount: 0,
      totalSize: 0,
      averageImportance: 0,
      maxImportance: 0,
      minImportance: 0,
      tierDistribution: { hot: 0, active: 0, cold: 0 },
      typeDistribution: {},
      recentActivity: 0
    }
  }
  
  // Calculate analytics from the memories array
  const totalSize = memories.reduce((sum, m) => sum + (m.content?.length || 0), 0)
  const importanceValues = memories.map(m => m.importance || 0).filter(i => i > 0)
  const averageImportance = importanceValues.length > 0 
    ? importanceValues.reduce((sum, i) => sum + i, 0) / importanceValues.length 
    : 0
  const maxImportance = Math.max(...importanceValues, 0)
  const minImportance = Math.min(...importanceValues, 0)
  
  const tierDistribution = {
    hot: memories.filter(m => m.memoryTier === 'hot').length,
    active: memories.filter(m => m.memoryTier === 'active').length,
    cold: memories.filter(m => m.memoryTier === 'cold').length
  }
  
  const typeDistribution = memories.reduce((acc, m) => {
    const type = m.type || 'unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const lastWeek = new Date()
  lastWeek.setDate(lastWeek.getDate() - 7)
  const recentActivity = memories.filter(m => {
    const updatedAt = m.updatedAt ? new Date(m.updatedAt) : null
    return updatedAt && updatedAt >= lastWeek
  }).length
  
  return {
    totalCount: memories.length,
    totalSize,
    averageImportance,
    maxImportance,
    minImportance,
    tierDistribution,
    typeDistribution,
    recentActivity
  }
}

// Get persona analytics across all personas
export const usePersonaAnalytics = () => {
  const { store } = useStore()
  
  // Get all personas
  const personas$ = queryDb(
    tables.personas,
    { label: 'allPersonasForAnalytics' }
  )
  
  // Get all memories
  const memories$ = queryDb(
    tables.memoryEntities,
    { label: 'allMemoriesForAnalytics' }
  )
  
  const personas = store.useQuery(personas$)
  const memories = store.useQuery(memories$)
  
  if (!personas || personas.length === 0) {
    return {
      totalPersonas: 0,
      activePersonas: 0,
      averageMemoriesPerPersona: 0,
      recentPersonas: 0
    }
  }
  
  const activePersonas = personas.filter(p => p.isActive).length
  const averageMemoriesPerPersona = memories?.length 
    ? memories.length / personas.length 
    : 0
  
  const lastMonth = new Date()
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  const recentPersonas = personas.filter(p => {
    const updatedAt = p.updatedAt ? new Date(p.updatedAt) : null
    return updatedAt && updatedAt >= lastMonth
  }).length
  
  return {
    totalPersonas: personas.length,
    activePersonas,
    averageMemoriesPerPersona,
    recentPersonas
  }
} 