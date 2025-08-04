// Basic persona queries using LiveStore
import { useStore } from '@livestore/react'
import { queryDb } from '@livestore/livestore'
import { tables } from '../schema'

// Get the currently active persona
export const useActivePersona = () => {
  const { store } = useStore()
  const query$ = queryDb(
    tables.personas.where({ isActive: true }).first(),
    { label: 'activePersona' }
  )
  return store.useQuery(query$)
}

// Get all personas ordered by creation date
export const useAllPersonas = () => {
  const { store } = useStore()
  const query$ = queryDb(
    tables.personas.orderBy('createdAt', 'desc'),
    { label: 'allPersonas' }
  )
  return store.useQuery(query$)
}

// Get a specific persona by ID
export const usePersonaById = (id: string) => {
  const { store } = useStore()
  const query$ = queryDb(
    tables.personas.where({ id }).first(),
    { label: 'personaById', deps: [id] }
  )
  return store.useQuery(query$)
}

// Get recent personas (last 5 updated)
export const useRecentPersonas = () => {
  const { store } = useStore()
  const query$ = queryDb(
    tables.personas
      .orderBy('updatedAt', 'desc')
      .limit(5),
    { label: 'recentPersonas' }
  )
  return store.useQuery(query$)
} 