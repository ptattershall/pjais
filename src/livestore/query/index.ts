// Main query index - exports all queries from organized modules
// This provides a clean API for importing queries throughout the application

// =============================================================================
// BASIC QUERIES
// =============================================================================

// Persona queries
export {
  useActivePersona,
  useAllPersonas,
  usePersonaById,
  useRecentPersonas
} from './basic-persona-queries'

// Memory queries
export {
  usePersonaMemories,
  useMemoriesByTier,
  useMemoryById,
  useMemoryStats
} from './basic-memory-queries'

// =============================================================================
// ADVANCED QUERIES
// =============================================================================

// Advanced memory queries
export {
  useMemoriesByType,
  useMemoriesByImportance,
  useMemoriesByDateRange,
  useMemoriesByTags
} from './advanced-memory-queries'

// Analytics queries
export {
  useMemoryAnalytics,
  usePersonaAnalytics
} from './analytics-queries'

// Search queries
export {
  useMemorySearch,
  usePersonaSearch
} from './search-queries'

// Performance queries
export {
  useMemoryPerformance
} from './performance-queries'

// =============================================================================
// BACKWARD COMPATIBILITY
// =============================================================================

// Legacy reactive queries for existing components
export {
  activePersona$,
  allPersonas$,
  personaById$,
  personaMemories$,
  memoryById$,
  personaConversations$,
  conversationById$,
  hotMemories$,
  activeMemories$,
  uiState$,
  memoriesByType$,
  archivedConversations$,
  recentPersonas$
} from './backward-compatibility'

// =============================================================================
// TYPES
// =============================================================================

// Export types for use in components
export type {
  ReactiveQuery,
  QueryOptions,
  DatabaseContext,
  MemoryAnalytics,
  PersonaAnalytics,
  MemoryPerformance,
  MemoryStats
} from './types' 