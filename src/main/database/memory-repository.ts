import { Effect, Context } from "effect"
import { MemoryEntity } from "../../shared/types/memory"
import { withDatabase, DatabaseService } from "./database-service"

// Memory repository interface
export interface MemoryRepository {
  readonly create: (memory: Omit<MemoryEntity, 'id' | 'createdAt'>) => Effect.Effect<string, Error, DatabaseService>
  readonly update: (id: string, updates: Partial<MemoryEntity>) => Effect.Effect<void, Error, DatabaseService>
  readonly getById: (id: string) => Effect.Effect<MemoryEntity | null, Error, DatabaseService>
  readonly getByPersonaId: (personaId: string) => Effect.Effect<MemoryEntity[], Error, DatabaseService>
  readonly getByTier: (tier: string) => Effect.Effect<MemoryEntity[], Error, DatabaseService>
  readonly getAllActive: () => Effect.Effect<MemoryEntity[], Error, DatabaseService>
  readonly updateTier: (memoryId: string, newTier: string, newContent?: unknown) => Effect.Effect<void, Error, DatabaseService>
  readonly updateEmbedding: (memoryId: string, embedding: number[], model: string) => Effect.Effect<void, Error, DatabaseService>
  readonly markAccessed: (id: string) => Effect.Effect<void, Error, DatabaseService>
  readonly delete: (id: string) => Effect.Effect<void, Error, DatabaseService>
}

// Create repository tag
export const MemoryRepository = Context.GenericTag<MemoryRepository>("MemoryRepository")

// Repository implementation
export const MemoryRepositoryLive = MemoryRepository.of({
  create: (memory) =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        const id = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        yield* _(client`
          INSERT INTO memory_entities (
            id, persona_id, type, content, tags, importance, memory_tier
          ) VALUES (
            ${id}, ${memory.personaId}, ${memory.type}, ${memory.content}, 
            ${JSON.stringify(memory.tags || [])}, ${memory.importance || 50}, ${memory.memoryTier || 'hot'}
          )
        `)
        
        return id
      })
    ),

  update: (id, updates) =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        const setParts: string[] = []
        const values: unknown[] = []

        if (updates.type !== undefined) {
          setParts.push(`type = ?`)
          values.push(updates.type)
        }
        if (updates.content !== undefined) {
          setParts.push(`content = ?`)
          values.push(updates.content)
        }

        if (updates.tags !== undefined) {
          setParts.push(`tags = ?`)
          values.push(JSON.stringify(updates.tags))
        }
        if (updates.importance !== undefined) {
          setParts.push(`importance = ?`)
          values.push(updates.importance)
        }

        if (setParts.length > 0) {
          values.push(id)
          const sql = `UPDATE memory_entities SET ${setParts.join(', ')} WHERE id = ?`
          yield* _(client.unsafe(sql, values))
        }
      })
    ),

  getById: (id) =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        const rows = yield* _(client`SELECT * FROM memory_entities WHERE id = ${id} AND deleted_at IS NULL`)
        if (rows.length === 0) {
          return null
        }
        return mapRowToMemory(rows[0])
      })
    ),

  getByPersonaId: (personaId) =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        const rows = yield* _(client`
          SELECT * FROM memory_entities 
          WHERE persona_id = ${personaId} AND deleted_at IS NULL 
          ORDER BY created_at DESC
        `)
        return rows.map(mapRowToMemory)
      })
    ),

  getByTier: (tier) =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        const rows = yield* _(client`
          SELECT * FROM memory_entities 
          WHERE memory_tier = ${tier} AND deleted_at IS NULL 
          ORDER BY created_at DESC
        `)
        return rows.map(mapRowToMemory)
      })
    ),

  getAllActive: () =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        const rows = yield* _(client`
          SELECT * FROM memory_entities 
          WHERE deleted_at IS NULL 
          ORDER BY created_at DESC
        `)
        return rows.map(mapRowToMemory)
      })
    ),

  updateTier: (memoryId, newTier, newContent) =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        if (newContent !== undefined) {
          yield* _(client`
            UPDATE memory_entities 
            SET memory_tier = ${newTier}, content = ${JSON.stringify(newContent)}
            WHERE id = ${memoryId}
          `)
        } else {
          yield* _(client`
            UPDATE memory_entities 
            SET memory_tier = ${newTier}
            WHERE id = ${memoryId}
          `)
        }
      })
    ),

  updateEmbedding: (memoryId, embedding, model) =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        yield* _(client`
          UPDATE memory_entities 
          SET embedding = ${JSON.stringify(embedding)}, embedding_model = ${model}
          WHERE id = ${memoryId}
        `)
      })
    ),

  markAccessed: (id) =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        yield* _(client`
          UPDATE memory_entities 
          SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP
          WHERE id = ${id}
        `)
      })
    ),

  delete: (id) =>
    withDatabase((client) =>
      Effect.gen(function* (_) {
        yield* _(client`
          UPDATE memory_entities 
          SET deleted_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
        `)
      })
    )
})

// Database row type for memory entity
interface MemoryRow {
  id: string;
  personaId: string;
  type: string;
  content: string;
  memoryTier: string;
  importance: number;
  tags: string;
  metadata: string;
  embedding: string;
  embeddingModel: string;
  createdAt: string;
  lastAccessed: string;
  deleted_at: string | null;
}

// Helper function to map database row to MemoryEntity
function mapRowToMemory(row: MemoryRow): MemoryEntity {
  return {
    id: row.id,
    personaId: row.personaId,
    type: row.type,
    content: row.content,
    tags: JSON.parse(row.tags || '[]'),
    importance: row.importance,
    memoryTier: row.memoryTier,
    lastAccessed: row.lastAccessed ? new Date(row.lastAccessed) : undefined,
    createdAt: new Date(row.createdAt)
  }
} 