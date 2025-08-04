import { SqliteClient } from "@effect/sql-sqlite-node"
import { Effect, Layer, Context, Queue, Ref, Schedule, Duration } from "effect"
import * as Scope from "effect/Scope"
import { app } from "electron"
import * as path from "path"
import * as fs from "fs"
import { loggers } from "../utils/logger"

export interface ConnectionPoolConfig {
  maxConnections: number
  minConnections: number
  acquireTimeout: number
  idleTimeout: number
  enableWAL: boolean
  busyTimeout: number
  cacheSize: number
}

export interface PooledConnection {
  readonly client: SqliteClient.SqliteClient
  readonly id: string
  readonly createdAt: Date
  readonly lastUsed: Date
  readonly inUse: boolean
  readonly queryCount: number
}

export interface ConnectionPool {
  readonly acquire: Effect.Effect<PooledConnection, Error, Scope.Scope>
  readonly release: (connection: PooledConnection) => Effect.Effect<void, Error, never>
  readonly stats: Effect.Effect<ConnectionPoolStats, Error, never>
  readonly shutdown: Effect.Effect<void, Error, never>
  readonly healthCheck: Effect.Effect<void, Error, never>
}

export interface ConnectionPoolStats {
  totalConnections: number
  activeConnections: number
  idleConnections: number
  waitingRequests: number
  totalQueries: number
  avgQueryTime: number
  poolUtilization: number
}

// Create connection pool service tag
export const ConnectionPool = Context.GenericTag<ConnectionPool>("ConnectionPool")

// Default configuration
const defaultConfig: ConnectionPoolConfig = {
  maxConnections: 10,
  minConnections: 2,
  acquireTimeout: 30000, // 30 seconds
  idleTimeout: 300000, // 5 minutes
  enableWAL: true,
  busyTimeout: 30000, // 30 seconds
  cacheSize: 2000 // 2000 pages
}

// Connection pool implementation
const ConnectionPoolLive = (config: ConnectionPoolConfig = defaultConfig) => 
  Layer.effect(
    ConnectionPool,
    Effect.gen(function* (_) {
      const dataPath = path.join(app.getPath('userData'), 'pjais.db')
      
      // Ensure directory exists
      yield* _(Effect.tryPromise({
        try: () => {
          const dir = path.dirname(dataPath)
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
          }
          return Promise.resolve()
        },
        catch: (error) => new Error(`Failed to create database directory: ${error}`)
      }))

      // Connection pool state
      const availableConnections = yield* _(Queue.unbounded<PooledConnection>())
      const activeConnections = yield* _(Ref.make(new Map<string, PooledConnection>()))
      const waitingRequests = yield* _(Ref.make(0))
      const queryStats = yield* _(Ref.make({
        totalQueries: 0,
        totalQueryTime: 0
      }))
      
      let connectionIdCounter = 0

      // Create a new connection
      const createConnection = Effect.gen(function* (_) {
        const connectionId = `conn_${++connectionIdCounter}`
        loggers.database.info(`Creating database connection: ${connectionId}`)
        
        const client = yield* _(SqliteClient.make({
          filename: dataPath,
          transformResultNames: (str) => str.replace(/_([a-z])/g, (_, char) => char.toUpperCase())
        }))

        // Configure SQLite connection
        if (config.enableWAL) {
          yield* _(client`PRAGMA journal_mode = WAL`)
        }

        // Set busy timeout
        yield* _(client`PRAGMA busy_timeout = ${config.busyTimeout}`)

        // Set cache size
        yield* _(client`PRAGMA cache_size = ${config.cacheSize}`)

        // Enable foreign keys
        yield* _(client`PRAGMA foreign_keys = ON`)

        const connection: PooledConnection = {
          client,
          id: connectionId,
          createdAt: new Date(),
          lastUsed: new Date(),
          inUse: false,
          queryCount: 0
        }

        loggers.database.info(`Database connection created: ${connectionId}`)
        return connection
      })

      // Initialize minimum connections
      const initializePool = Effect.gen(function* (_) {
        loggers.database.info(`Initializing connection pool, minConnections: ${config.minConnections}`)
        
        for (let i = 0; i < config.minConnections; i++) {
          const connection = yield* _(createConnection)
          yield* _(Queue.offer(availableConnections, connection))
        }
        
        loggers.database.info(`Connection pool initialized, connections: ${config.minConnections}`)
      })

      // Acquire connection from pool
      const acquire = Effect.gen(function* (_) {
        yield* _(Ref.update(waitingRequests, (n) => n + 1))

        try {
          // Try to get available connection
          const maybeConnection = yield* _(Queue.poll(availableConnections))
          
          if (maybeConnection._tag === "Some") {
            const connection = maybeConnection.value
            const updatedConnection = {
              ...connection,
              lastUsed: new Date(),
              inUse: true,
              queryCount: connection.queryCount + 1
            }
            
            yield* _(Ref.update(activeConnections, (map) => 
              map.set(connection.id, updatedConnection)
            ))
            
            yield* _(Ref.update(waitingRequests, (n) => n - 1))
            return updatedConnection
          }

          // Check if we can create a new connection
          const active = yield* _(Ref.get(activeConnections))
          const totalConnections = active.size + (yield* _(Queue.size(availableConnections)))
          
          if (totalConnections < config.maxConnections) {
            const newConnection = yield* _(createConnection)
            const activeConnection = {
              ...newConnection,
              inUse: true,
              queryCount: 1
            }
            
            yield* _(Ref.update(activeConnections, (map) => 
              map.set(newConnection.id, activeConnection)
            ))
            
            yield* _(Ref.update(waitingRequests, (n) => n - 1))
            return activeConnection
          }

          // Wait for connection to become available
          const connection = yield* _(Queue.take(availableConnections))
          const updatedConnection = {
            ...connection,
            lastUsed: new Date(),
            inUse: true,
            queryCount: connection.queryCount + 1
          }
          
          yield* _(Ref.update(activeConnections, (map) => 
            map.set(connection.id, updatedConnection)
          ))
          
          yield* _(Ref.update(waitingRequests, (n) => n - 1))
          return updatedConnection
          
        } catch (error) {
          yield* _(Ref.update(waitingRequests, (n) => n - 1))
          throw error
        }
      }).pipe(
        Effect.timeout(Duration.millis(config.acquireTimeout)),
        Effect.mapError((error) => new Error(`Failed to acquire connection: ${error}`))
      )

      // Release connection back to pool
      const release = (connection: PooledConnection) => Effect.gen(function* (_) {
        yield* _(Ref.update(activeConnections, (map) => {
          map.delete(connection.id)
          return map
        }))

        const releasedConnection = {
          ...connection,
          inUse: false,
          lastUsed: new Date()
        }

        yield* _(Queue.offer(availableConnections, releasedConnection))
        loggers.database.debug(`Connection released back to pool: ${connection.id}`)
      })

      // Get pool statistics
      const stats = Effect.gen(function* (_) {
        const active = yield* _(Ref.get(activeConnections))
        const availableSize = yield* _(Queue.size(availableConnections))
        const waiting = yield* _(Ref.get(waitingRequests))
        const queryData = yield* _(Ref.get(queryStats))
        
        const totalConnections = active.size + availableSize
        const poolUtilization = totalConnections > 0 ? (active.size / totalConnections) * 100 : 0
        const avgQueryTime = queryData.totalQueries > 0 ? queryData.totalQueryTime / queryData.totalQueries : 0

        return {
          totalConnections,
          activeConnections: active.size,
          idleConnections: availableSize,
          waitingRequests: waiting,
          totalQueries: queryData.totalQueries,
          avgQueryTime,
          poolUtilization
        }
      })

      // Health check - remove idle connections
      const healthCheck = Effect.gen(function* (_) {
        const now = new Date()
        const idle: PooledConnection[] = []
        
        // Check available connections for idle timeout
        let connection = yield* _(Queue.poll(availableConnections))
        while (connection._tag === "Some") {
          const conn = connection.value
          const idleTime = now.getTime() - conn.lastUsed.getTime()
          
          if (idleTime > config.idleTimeout) {
            loggers.database.debug(`Removing idle connection: ${conn.id}, idleTime: ${idleTime}`)
            // Don't put it back in the pool - let it be garbage collected
          } else {
            idle.push(conn)
          }
          
          connection = yield* _(Queue.poll(availableConnections))
        }
        
        // Put non-idle connections back
        for (const conn of idle) {
          yield* _(Queue.offer(availableConnections, conn))
        }
        
        // Ensure minimum connections
        const currentSize = idle.length
        if (currentSize < config.minConnections) {
          const needed = config.minConnections - currentSize
          loggers.database.info(`Creating connections to maintain minimum pool size: needed=${needed}, currentSize=${currentSize}, minConnections=${config.minConnections}`)
          
          for (let i = 0; i < needed; i++) {
            const newConnection = yield* _(createConnection)
            yield* _(Queue.offer(availableConnections, newConnection))
          }
        }
      })

      // Shutdown pool
      const shutdown = Effect.gen(function* (_) {
        loggers.database.info('Shutting down connection pool')
        
        // Close all available connections
        let connection = yield* _(Queue.poll(availableConnections))
        while (connection._tag === "Some") {
          loggers.database.debug(`Closing connection: ${connection.value.id}`)
          connection = yield* _(Queue.poll(availableConnections))
        }
        
        // Close active connections
        const active = yield* _(Ref.get(activeConnections))
        for (const [id] of active) {
          loggers.database.debug(`Closing active connection: ${id}`)
        }
        
        yield* _(Ref.set(activeConnections, new Map()))
        loggers.database.info('Connection pool shutdown complete')
      })

      // Initialize the pool
      yield* _(initializePool)

      // Start health check background task
      const healthCheckTask = Effect.gen(function* (_) {
        yield* _(Effect.sleep(Duration.minutes(1)))
        yield* _(healthCheck)
      }).pipe(
        Effect.repeat(Schedule.fixed(Duration.minutes(1))),
        Effect.fork
      )

      yield* _(healthCheckTask)

      return {
        acquire,
        release,
        stats,
        shutdown,
        healthCheck
      } as unknown as ConnectionPool
    })
  )

// Utility function to run a query with automatic connection management
export const withConnection = <R, E, A>(
  operation: (connection: PooledConnection) => Effect.Effect<A, E, R>
) => Effect.gen(function* (_) {
  const pool = yield* _(ConnectionPool)
  const connection = yield* _(pool.acquire)
  
  try {
    const result = yield* _(operation(connection))
    return result
  } finally {
    yield* _(pool.release(connection))
  }
})

// Export the layer
export const ConnectionPoolLayer = ConnectionPoolLive()

// Export configured layers
export const ConnectionPoolLayerDefault = ConnectionPoolLive(defaultConfig)
export const ConnectionPoolLayerHighPerformance = ConnectionPoolLive({
  ...defaultConfig,
  maxConnections: 20,
  minConnections: 5,
  cacheSize: 5000,
  enableWAL: true
})

export const ConnectionPoolLayerLowMemory = ConnectionPoolLive({
  ...defaultConfig,
  maxConnections: 5,
  minConnections: 1,
  cacheSize: 1000,
  enableWAL: false
})