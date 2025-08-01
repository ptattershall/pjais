import { SqliteClient } from "@effect/sql-sqlite-node"
import { Effect, Layer, Context } from "effect"
import path from "path"
import fs from "fs"
import { ConnectionPool, ConnectionPoolLayerDefault } from "./connection-pool"
import { loggers } from "../utils/logger"

// Database service interface
export interface DatabaseService {
  readonly initialize: Effect.Effect<void, Error, never>
  readonly shutdown: Effect.Effect<void, Error, never>
  readonly getClient: Effect.Effect<SqliteClient.SqliteClient, Error, never>
  readonly executeSchema: Effect.Effect<void, Error, never>
  readonly withConnection: <A, E>(operation: (client: SqliteClient.SqliteClient) => Effect.Effect<A, E, never>) => Effect.Effect<A, E | Error, never>
  readonly getPoolStats: Effect.Effect<any, Error, never>
  readonly healthCheck: Effect.Effect<void, Error, never>
}

// Create database service tag
export const DatabaseService = Context.GenericTag<DatabaseService>("DatabaseService")

// Implementation with connection pooling
const DatabaseServiceLive = Layer.effect(
  DatabaseService,
  Effect.gen(function* (_) {
    const pool = yield* _(ConnectionPool)
    const schemaPath = path.join(__dirname, 'schema.sql')
    
    loggers.database.info('Database service initializing with connection pool')
    loggers.database.debug('Schema configuration')

    const initialize = Effect.sync(() => {
      loggers.database.info('Initializing Effect SQL database with connection pool')
      loggers.database.info('Database initialized successfully with connection pool')
    })

    const shutdown = Effect.gen(function* (_) {
      loggers.database.info('Shutting down database service')
      yield* _(pool.shutdown)
      loggers.database.info('Database service shutdown complete')
    })

    const getClient = Effect.gen(function* (_) {
      const connection = yield* _(pool.acquire)
      try {
        return connection.client
      } finally {
        yield* _(pool.release(connection))
      }
    })

    const executeSchema = Effect.gen(function* (_) {
      const dbOp = loggers.database.dbOperation('executeSchema', 'schema')
      try {
        if (fs.existsSync(schemaPath)) {
          const schema = fs.readFileSync(schemaPath, 'utf-8')
          const statements = schema.split(';').filter(stmt => stmt.trim().length > 0)
          loggers.database.info(`Executing database schema with ${statements.length} statements`)
          for (const statement of statements) {
            if (statement.trim()) {
              const connection = yield* _(pool.acquire)
              try {
                // Use the correct method for executing SQL on the client
                yield* _(connection.client`${statement}`)
              } finally {
                yield* _(pool.release(connection))
              }
            }
          }
          dbOp.success()
        } else {
          loggers.database.warn('Schema file not found')
          dbOp.end()
        }
      } catch (error) {
        dbOp.error(error as Error)
        throw error
      }
    })

    const withConnectionMethod = <A, E>(operation: (client: SqliteClient.SqliteClient) => Effect.Effect<A, E, never>) =>
      Effect.gen(function* (_) {
        const connection = yield* _(pool.acquire)
        try {
          return yield* _(operation(connection.client))
        } finally {
          yield* _(pool.release(connection))
        }
      })

    const getPoolStats = Effect.gen(function* (_) {
      return yield* _(pool.stats)
    })

    const healthCheck = Effect.gen(function* (_) {
      yield* _(pool.healthCheck)
    })

    return {
      initialize,
      shutdown,
      getClient,
      executeSchema,
      withConnection: withConnectionMethod,
      getPoolStats,
      healthCheck
    }
  })
).pipe(Layer.provide(ConnectionPoolLayerDefault))

// Export the layer
export const DatabaseServiceLayer = DatabaseServiceLive

// Helper function to get database client in effects with connection pooling
export const withDatabase = <A, E>(
  effect: (client: SqliteClient.SqliteClient) => Effect.Effect<A, E, never>
): Effect.Effect<A, E | Error, DatabaseService> =>
  Effect.gen(function* (_) {
    const service = yield* _(DatabaseService)
    return yield* _(service.withConnection(effect))
  }) 