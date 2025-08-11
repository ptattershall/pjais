import { Effect, Context, Layer } from "effect"
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
export const PersonaRepositoryLive = Layer.effect(
  PersonaRepository,
  Effect.succeed({
      create: (persona) =>
        withDatabase((client) =>
          Effect.gen(function* (_) {
            const id = `persona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            // Create JSON objects matching actual schema structure
            const personalityProfile = {
              traits: persona.personality?.traits || [],
              temperament: persona.personality?.temperament || 'balanced',
              communication_style: persona.personality?.communicationStyle || 'conversational'
            }

            const emotionalState = {
              current_mood: 'neutral',
              energy_level: 0.5,
              stress_level: 0.3,
              satisfaction_level: 0.7
            }

            const privacySettings = {
              data_sharing: persona.privacySettings?.dataCollection !== false,
              analytics_enabled: persona.privacySettings?.analyticsEnabled === true,
              memory_retention_days: 365,
              consent_given: true,
              consent_date: new Date().toISOString()
            }

            const memoryConfiguration = {
              max_hot_memories: persona.memoryConfiguration?.maxMemories || 100,
              max_warm_memories: 1000,
              max_cold_memories: 10000,
              auto_tier_enabled: persona.memoryConfiguration?.autoOptimize !== false,
              importance_threshold: (persona.memoryConfiguration?.memoryImportanceThreshold || 50) / 100
            }

            yield* _(client`
              INSERT INTO personas (
                name, personality_profile, emotional_state, privacy_settings, memory_configuration
              ) VALUES (
                ${persona.name},
                ${JSON.stringify(personalityProfile)}::json,
                ${JSON.stringify(emotionalState)}::json,
                ${JSON.stringify(privacySettings)}::json,
                ${JSON.stringify(memoryConfiguration)}::json
              )
            `)
            
            return id
          })
        ),

      update: (id, updates) =>
        withDatabase((client) =>
          Effect.gen(function* (_) {
            // Handle name updates
            if (updates.name !== undefined) {
              yield* _(client`
                UPDATE personas 
                SET name = ${updates.name}, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ${id}
              `)
            }

            // Handle personality updates by updating the JSON field
            if (updates.personality !== undefined) {
              // Get current personality profile first
              const currentRows = yield* _(client`SELECT personality_profile FROM personas WHERE id = ${id}`)
              if (currentRows.length > 0) {
                const currentProfile = JSON.parse(String(currentRows[0].personality_profile) || '{}')
                
                const updatedProfile = {
                  ...currentProfile,
                  traits: updates.personality.traits !== undefined ? updates.personality.traits : currentProfile.traits,
                  temperament: updates.personality.temperament !== undefined ? updates.personality.temperament : currentProfile.temperament,
                  communication_style: updates.personality.communicationStyle !== undefined ? updates.personality.communicationStyle : currentProfile.communication_style
                }
                
                yield* _(client`
                  UPDATE personas 
                  SET personality_profile = ${JSON.stringify(updatedProfile)}::json, updated_at = CURRENT_TIMESTAMP 
                  WHERE id = ${id}
                `)
              }
            }

            // Handle privacy settings updates
            if (updates.privacySettings !== undefined) {
              const currentRows = yield* _(client`SELECT privacy_settings FROM personas WHERE id = ${id}`)
              if (currentRows.length > 0) {
                const currentSettings = JSON.parse(String(currentRows[0].privacy_settings) || '{}')
                
                const updatedSettings = {
                  ...currentSettings,
                  data_sharing: updates.privacySettings.dataCollection !== undefined ? updates.privacySettings.dataCollection : currentSettings.data_sharing,
                  analytics_enabled: updates.privacySettings.analyticsEnabled !== undefined ? updates.privacySettings.analyticsEnabled : currentSettings.analytics_enabled
                }
                
                yield* _(client`
                  UPDATE personas 
                  SET privacy_settings = ${JSON.stringify(updatedSettings)}::json, updated_at = CURRENT_TIMESTAMP 
                  WHERE id = ${id}
                `)
              }
            }

            // Handle memory configuration updates
            if (updates.memoryConfiguration !== undefined) {
              const currentRows = yield* _(client`SELECT memory_configuration FROM personas WHERE id = ${id}`)
              if (currentRows.length > 0) {
                const currentConfig = JSON.parse(String(currentRows[0].memory_configuration) || '{}')
                
                const updatedConfig = {
                  ...currentConfig,
                  max_hot_memories: updates.memoryConfiguration.maxMemories !== undefined ? updates.memoryConfiguration.maxMemories : currentConfig.max_hot_memories,
                  auto_tier_enabled: updates.memoryConfiguration.autoOptimize !== undefined ? updates.memoryConfiguration.autoOptimize : currentConfig.auto_tier_enabled,
                  importance_threshold: updates.memoryConfiguration.memoryImportanceThreshold !== undefined ? 
                    updates.memoryConfiguration.memoryImportanceThreshold / 100 : currentConfig.importance_threshold
                }
                
                yield* _(client`
                  UPDATE personas 
                  SET memory_configuration = ${JSON.stringify(updatedConfig)}::json, updated_at = CURRENT_TIMESTAMP 
                  WHERE id = ${id}
                `)
              }
            }
          })
        ),

      activate: (id) =>
        withDatabase((client) =>
          Effect.gen(function* (_) {
            // Note: is_active column doesn't exist in current schema
            // This would need to be implemented differently, perhaps with a separate active_persona table
            // For now, just update the updated_at timestamp to indicate activity
            yield* _(client`UPDATE personas SET updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`)
          })
        ),

      deactivate: (id) =>
        withDatabase((client) =>
          Effect.gen(function* (_) {
            // Note: is_active column doesn't exist in current schema
            // This is a placeholder implementation
            yield* _(client`UPDATE personas SET updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`)
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
            // Note: is_active column doesn't exist in current schema
            // For now, return the most recently updated persona as "active"
            const rows = yield* _(client`SELECT * FROM personas ORDER BY updated_at DESC LIMIT 1`)
            if (rows.length === 0) {
              return null
            }
            return mapRowToPersona(rows[0] as unknown as PersonaRow)
          })
        )
    }
  )
)

// Database row type for persona entity - matches actual schema with JSON fields
interface PersonaRow {
  id: number;
  name: string;
  personality_profile: string; // JSON string
  emotional_state: string; // JSON string
  privacy_settings: string; // JSON string
  memory_configuration: string; // JSON string
  created_at: string;
  updated_at: string;
}

// Helper function to map database row to PersonaData
function mapRowToPersona(row: PersonaRow): PersonaData {
  // Parse JSON fields safely
  const personalityProfile = JSON.parse(row.personality_profile || '{}')
  // Note: emotional_state is stored but not currently used in PersonaData interface
  const privacySettings = JSON.parse(row.privacy_settings || '{}')
  const memoryConfiguration = JSON.parse(row.memory_configuration || '{}')

  return {
    id: row.id.toString(), // Convert to string for consistency
    name: row.name,
    description: '', // Not stored in this schema version
    
    // Extract personality data from JSON
    personality: {
      traits: personalityProfile.traits || [],
      temperament: personalityProfile.temperament || 'balanced',
      communicationStyle: personalityProfile.communication_style || 'conversational'
    },
    
    // Extract memory configuration from JSON
    memoryConfiguration: {
      maxMemories: memoryConfiguration.max_hot_memories || 100,
      memoryImportanceThreshold: (memoryConfiguration.importance_threshold || 0.5) * 100,
      autoOptimize: memoryConfiguration.auto_tier_enabled !== false,
      retentionPeriod: 90, // Default value
      memoryCategories: ['conversation', 'learning', 'preference', 'fact'], // Default categories
      compressionEnabled: true // Default value
    },
    
    // Extract privacy settings from JSON
    privacySettings: {
      dataCollection: privacySettings.data_sharing !== false,
      analyticsEnabled: privacySettings.analytics_enabled === true,
      shareWithResearchers: false, // Default safe value
      allowPersonalityAnalysis: true, // Default value
      memoryRetention: true, // Default value
      exportDataAllowed: true // Default value
    },
    
    // Required fields for PersonaData interface
    behaviorSettings: {},
    memories: [], // Empty array - memories stored separately
    
    // Status and metadata
    isActive: false, // Default value (not stored in current schema)
    version: '1.0', // Default version
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}
