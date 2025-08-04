// Search queries using LiveStore
import { useStore } from '@livestore/react'
import { queryDb } from '@livestore/livestore'
import { tables } from '../schema'


// Search memories for a specific persona
export const useMemorySearch = (personaId: string, searchTerm: string) => {
  const { store } = useStore()
  
  // Get all memories for the persona
  const memories$ = queryDb(
    tables.memoryEntities.where({ personaId }),
    { label: 'personaMemoriesForSearch', deps: [personaId] }
  )
  
  const memories = store.useQuery(memories$)
  
  if (!memories || !searchTerm.trim()) {
    return memories || []
  }
  
  const searchLower = searchTerm.toLowerCase()
  const filteredMemories = memories.filter(memory => {
    return (
      memory.name?.toLowerCase().includes(searchLower) ||
      memory.content?.toLowerCase().includes(searchLower) ||
      memory.summary?.toLowerCase().includes(searchLower) ||
      (Array.isArray(memory.tags) && memory.tags.some((tag: string) => tag.toLowerCase().includes(searchLower)))
    )
  })
  
  // Sort by importance (descending)
  return filteredMemories.sort((a, b) => (b.importance || 0) - (a.importance || 0))
}

// Search personas by name or description
export const usePersonaSearch = (searchTerm: string) => {
  const { store } = useStore()
  
  // Get all personas
  const personas$ = queryDb(
    tables.personas,
    { label: 'allPersonasForSearch' }
  )
  
  const personas = store.useQuery(personas$)
  
  if (!personas || !searchTerm.trim()) {
    return personas || []
  }
  
  const searchLower = searchTerm.toLowerCase()
  const filteredPersonas = personas.filter(persona => {
    return (
      persona.name?.toLowerCase().includes(searchLower) ||
      persona.description?.toLowerCase().includes(searchLower)
    )
  })
  
  // Sort by updatedAt (descending)
  return filteredPersonas.sort((a, b) => {
    const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
    const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
    return bDate - aDate
  })
} 