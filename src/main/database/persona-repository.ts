import { Effect, Context } from "effect"
import { PersonaData } from "../../shared/types/persona"
import { withDatabase, DatabaseService } from "./database-service"

// Persona repository interface
export interface PersonaRepository {
  readonly create: (persona: Omit<PersonaData, 'id' | 'createdAt' | 'updatedAt'>) => Effect.Effect<string, Error, DatabaseService>
  readonly update: (id: string, updates: Partial<PersonaData>) => Effect.Effect<void, Error, DatabaseService>
  readonly activate: (id: string) => Effect.Effect<void, Error, DatabaseService>
  readonly deactivate: (id: string) => Effect.Effect<void, Error, DatabaseService>
  readonly getById: (id: string) => Effect.Effect<PersonaData | null, Error, DatabaseService>
  readonly getAll: () => Effect.Effect<PersonaData[], Error, DatabaseService>
  readonly getActive: () => Effect.Effect<PersonaData | null, Error, DatabaseService>
}

// Create repository tag
export const PersonaRepository = Context.GenericTag<PersonaRepository>("PersonaRepository")

// Repository implementation
export const PersonaRepositoryLive = PersonaRepository.of({
  create: (persona) =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        const id = `persona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        yield* _(client`
          INSERT INTO personas (
            id, name, description,
            personality_traits, personality_temperament, personality_communication_style,
            memory_max_memories, memory_importance_threshold, memory_auto_optimize,
            memory_retention_period, memory_categories, memory_compression_enabled,
            privacy_data_collection, privacy_analytics_enabled, privacy_share_with_researchers,
            privacy_allow_personality_analysis, privacy_memory_retention, privacy_export_data_allowed,
            is_active
          ) VALUES (
            ${id}, ${persona.name}, ${persona.description || ''},
            ${JSON.stringify(persona.personality?.traits || [])}, ${persona.personality?.temperament || 'balanced'}, ${persona.personality?.communicationStyle || 'conversational'},
            ${persona.memoryConfiguration?.maxMemories || 1000}, ${persona.memoryConfiguration?.memoryImportanceThreshold || 50}, ${persona.memoryConfiguration?.autoOptimize !== false},
            ${persona.memoryConfiguration?.retentionPeriod || 30}, ${JSON.stringify(persona.memoryConfiguration?.memoryCategories || ['conversation', 'learning', 'preference', 'fact'])}, ${persona.memoryConfiguration?.compressionEnabled !== false},
            ${persona.privacySettings?.dataCollection !== false}, ${persona.privacySettings?.analyticsEnabled === true}, ${persona.privacySettings?.shareWithResearchers === true},
            ${persona.privacySettings?.allowPersonalityAnalysis !== false}, ${persona.privacySettings?.memoryRetention !== false}, ${persona.privacySettings?.exportDataAllowed !== false},
            ${false}
          )
        `)
        
        return id
      })
    ),

  update: (id, updates) =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        const setParts: string[] = []
        const values: (string | number | boolean)[] = []

        if (updates.name !== undefined) {
          setParts.push(`name = ?`)
          values.push(updates.name)
        }
        if (updates.description !== undefined) {
          setParts.push(`description = ?`)
          values.push(updates.description)
        }
        if (updates.personality !== undefined) {
          if (updates.personality.traits !== undefined) {
            setParts.push(`personality_traits = ?`)
            values.push(JSON.stringify(updates.personality.traits))
          }
          if (updates.personality.temperament !== undefined) {
            setParts.push(`personality_temperament = ?`)
            values.push(updates.personality.temperament)
          }
          if (updates.personality.communicationStyle !== undefined) {
            setParts.push(`personality_communication_style = ?`)
            values.push(updates.personality.communicationStyle)
          }
        }

        if (setParts.length > 0) {
          values.push(id)
          const sql = `UPDATE personas SET ${setParts.join(', ')} WHERE id = ?`
          yield* _(client.unsafe(sql, values))
        }
      })
    ),

  activate: (id) =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        // First deactivate all personas
        yield* _(client`UPDATE personas SET is_active = ${false}`)
        // Then activate the specified persona
        yield* _(client`UPDATE personas SET is_active = ${true} WHERE id = ${id}`)
      })
    ),

  deactivate: (id) =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        yield* _(client`UPDATE personas SET is_active = ${false} WHERE id = ${id}`)
      })
    ),

  getById: (id) =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        const rows = yield* _(client`SELECT * FROM personas WHERE id = ${id}`)
        if (rows.length === 0) {
          return null
        }
        return mapRowToPersona(rows[0] as unknown as PersonaRow)
      })
    ),

  getAll: () =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        const rows = yield* _(client`SELECT * FROM personas ORDER BY created_at DESC`)
        return rows.map((row) => mapRowToPersona(row as unknown as PersonaRow))
      })
    ),

  getActive: () =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        const rows = yield* _(client`SELECT * FROM personas WHERE is_active = ${true} LIMIT 1`)
        if (rows.length === 0) {
          return null
        }
        return mapRowToPersona(rows[0] as unknown as PersonaRow)
      })
    )
})

// Database row type for persona entity - updated to match actual schema
interface PersonaRow {
  id: string;
  name: string;
  description: string;
  personality_traits: string;
  personality_temperament: string;
  personality_communication_style: string;
  memory_max_memories: number;
  memory_importance_threshold: number;
  memory_auto_optimize: boolean;
  memory_retention_period: number;
  memory_categories: string;
  memory_compression_enabled: boolean;
  privacy_data_collection: boolean;
  privacy_analytics_enabled: boolean;
  privacy_share_with_researchers: boolean;
  privacy_allow_personality_analysis: boolean;
  privacy_memory_retention: boolean;
  privacy_export_data_allowed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Helper function to map database row to PersonaData
function mapRowToPersona(row: PersonaRow): PersonaData {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    
    // Legacy personality field (for backward compatibility)
    personality: {
      traits: JSON.parse(row.personality_traits || '[]'),
      temperament: row.personality_temperament,
      communicationStyle: row.personality_communication_style
    },
    
    // Memory configuration
    memoryConfiguration: {
      maxMemories: row.memory_max_memories || 1000,
      memoryImportanceThreshold: row.memory_importance_threshold || 50,
      autoOptimize: row.memory_auto_optimize !== false,
      retentionPeriod: row.memory_retention_period || 90,
      memoryCategories: JSON.parse(row.memory_categories || '["conversation","learning","preference","fact"]'),
      compressionEnabled: row.memory_compression_enabled !== false
    },
    
    // Privacy settings
    privacySettings: {
      dataCollection: row.privacy_data_collection !== false,
      analyticsEnabled: row.privacy_analytics_enabled === true,
      shareWithResearchers: row.privacy_share_with_researchers === true,
      allowPersonalityAnalysis: row.privacy_allow_personality_analysis !== false,
      memoryRetention: row.privacy_memory_retention !== false,
      exportDataAllowed: row.privacy_export_data_allowed !== false
    },
    
    // Required fields for new schema
    behaviorSettings: {},
    memories: [], // Empty array - memories stored separately
    
    // Status and metadata
    isActive: row.is_active || false,
    version: '1.0', // Default version
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
} 