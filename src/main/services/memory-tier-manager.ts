import { Effect, Context, Layer } from "effect"
import { MemoryRepository } from '../database/memory-repository'
import { DatabaseService } from '../database/database-service'
import { 
  MemoryTier, 
  MemoryTierConfig, 
  MemoryTierMetrics, 
  TierTransition, 
  MemoryScore,
  TierOptimizationResult,
  MemoryEntity 
} from '../../shared/types/memory'
import { ServiceHealth } from '../../shared/types/system'
import * as zlib from 'zlib'
import { promisify } from 'util'

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

// Memory Tier Manager interface
export interface MemoryTierManager {
  readonly initialize: () => Effect.Effect<void, Error, DatabaseService>
  readonly shutdown: () => Effect.Effect<void, never, never>
  readonly promoteMemory: (memoryId: string, targetTier: MemoryTier, reason?: string) => Effect.Effect<TierTransition, Error, DatabaseService>
  readonly demoteMemory: (memoryId: string, targetTier: MemoryTier, reason?: string) => Effect.Effect<TierTransition, Error, DatabaseService>
  readonly optimizeMemoryTiers: () => Effect.Effect<TierOptimizationResult, Error, DatabaseService>
  readonly calculateMemoryScore: (memoryId: string) => Effect.Effect<MemoryScore, Error, DatabaseService>
  readonly collectTierMetrics: () => Effect.Effect<{ hot: MemoryTierMetrics; warm: MemoryTierMetrics; cold: MemoryTierMetrics }, Error, DatabaseService>
  readonly getHealth: () => Effect.Effect<ServiceHealth, Error, DatabaseService>
  readonly updateConfig: (config: Partial<MemoryTierConfig>) => Effect.Effect<void, never, never>
  readonly getConfig: () => Effect.Effect<MemoryTierConfig, never, never>
}

// Create service tag
export const MemoryTierManager = Context.GenericTag<MemoryTierManager>("MemoryTierManager")

// Service implementation
export const MemoryTierManagerLive = Layer.effect(
  MemoryTierManager,
  Effect.gen(function* () {
    let config = getDefaultConfig()
    let isInitialized = false
    let optimizationRunning = false
    let lastOptimization: Date | null = null

    const memoryRepository = yield* MemoryRepository

    const ensureInitialized = (): Effect.Effect<void, Error, never> =>
      isInitialized 
        ? Effect.succeed(void 0)
        : Effect.fail(new Error('MemoryTierManager not initialized'))

    const calculateMemoryScoreInternal = (memory: MemoryEntity): MemoryScore => {
      const now = Date.now()
      const createdMs = memory.createdAt?.getTime() || now
      const lastAccessedMs = memory.lastAccessed?.getTime() || createdMs
      
      // Age score (newer is better, decays over time)
      const ageInDays = (now - createdMs) / (1000 * 60 * 60 * 24)
      const ageScore = Math.max(0, 100 - (ageInDays * 2)) // Decay 2 points per day
      
      // Access pattern score (more recent access is better)
      const daysSinceAccess = (now - lastAccessedMs) / (1000 * 60 * 60 * 24)
      const accessScore = Math.max(0, 100 - (daysSinceAccess * 5)) // Decay 5 points per day
      
      // Importance score (directly from memory importance)
      const importanceScore = memory.importance || 50
      
      // Connection score (placeholder - could be enhanced with relationship data)
      const connectionScore = 50
      
      // Calculate weighted total
      const totalScore = (
        accessScore * 0.3 + 
        importanceScore * 0.3 + 
        ageScore * 0.25 + 
        connectionScore * 0.15
      )
      
      // Determine recommended tier based on score and thresholds
      let recommendedTier: MemoryTier
      if (totalScore >= 70) {
        recommendedTier = 'hot'
      } else if (totalScore >= 40) {
        recommendedTier = 'warm'
      } else {
        recommendedTier = 'cold'
      }
      
      return {
        memoryId: memory.id || '',
        accessScore,
        importanceScore,
        ageScore,
        connectionScore,
        totalScore,
        recommendedTier
      }
    }

    const compressMemoryContent = async (content: any): Promise<string> => {
      if (!config.cold.compressionEnabled) {
        return JSON.stringify(content)
      }

      try {
        const jsonString = JSON.stringify(content)
        const compressed = await gzip(Buffer.from(jsonString))
        return compressed.toString('base64')
      } catch (error) {
        console.warn('Failed to compress memory content, storing uncompressed:', error)
        return JSON.stringify(content)
      }
    }

    const decompressMemoryContent = async (compressedContent: string): Promise<any> => {
      try {
        const buffer = Buffer.from(compressedContent, 'base64')
        const decompressed = await gunzip(buffer)
        return JSON.parse(decompressed.toString())
      } catch (error) {
        // Try parsing as regular JSON (fallback for uncompressed data)
        try {
          return JSON.parse(compressedContent)
        } catch {
          throw new Error('Unable to decompress memory content')
        }
      }
    }

    const applyTierTransition = (transition: TierTransition): Effect.Effect<void, Error, DatabaseService> =>
      Effect.gen(function* () {
        const memory = yield* memoryRepository.getById(transition.memoryId)
        
        if (!memory) {
          return yield* Effect.fail(new Error(`Memory not found: ${transition.memoryId}`))
        }

        let updatedContent = memory.content

        // Handle compression for cold tier
        if (transition.toTier === 'cold') {
          updatedContent = yield* Effect.tryPromise(() => compressMemoryContent(memory.content))
        } else if (transition.fromTier === 'cold') {
          // Decompress when moving out of cold tier
          updatedContent = yield* Effect.tryPromise(() => decompressMemoryContent(memory.content as string))
        }

        // Update memory tier in database
        yield* memoryRepository.updateTier(transition.memoryId, transition.toTier, updatedContent)
      })

    const optimizeTierMemories = (
      memories: MemoryEntity[], 
      scores: MemoryScore[], 
      tier: MemoryTier
      ): Effect.Effect<TierTransition[], never, never> =>
      Effect.succeed((() => {
        const transitions: TierTransition[] = []
        const tierScores = scores.filter(score => 
          memories.some(memory => memory.id === score.memoryId)
        )

        // Sort by score descending
        tierScores.sort((a, b) => b.totalScore - a.totalScore)

        if (tier === 'hot') {
          const maxHotSize = config.hot.maxSize
          
          // Demote excess memories from hot tier
          const toDemoteFromHot = tierScores.slice(maxHotSize)
          
          for (const score of toDemoteFromHot) {
            if (score.totalScore >= 40) {
              transitions.push({
                memoryId: score.memoryId,
                fromTier: 'hot',
                toTier: 'warm',
                reason: 'optimization',
                score: score.totalScore,
                timestamp: new Date()
              })
            } else {
              transitions.push({
                memoryId: score.memoryId,
                fromTier: 'hot',
                toTier: 'cold',
                reason: 'age_decay',
                score: score.totalScore,
                timestamp: new Date()
              })
            }
          }
        } else if (tier === 'warm') {
          const maxWarmSize = config.warm.maxSize
          
          // Demote excess or low-scoring memories from warm tier
          const toDemoteFromWarm = tierScores.filter((score, index) => 
            index >= maxWarmSize || score.totalScore < 25
          )

          for (const score of toDemoteFromWarm) {
            transitions.push({
              memoryId: score.memoryId,
              fromTier: 'warm',
              toTier: 'cold',
              reason: score.totalScore < 25 ? 'age_decay' : 'optimization',
              score: score.totalScore,
              timestamp: new Date()
            })
          }
        }

        return transitions
      })())

    const calculateTierMetrics = (tier: MemoryTier): Effect.Effect<MemoryTierMetrics, Error, DatabaseService> =>
      Effect.gen(function* () {
        const memories = yield* memoryRepository.getByTier(tier)

        const count = memories.length
        const averageImportance = count > 0 
          ? memories.reduce((sum, m) => sum + (m.importance || 50), 0) / count 
          : 0
        const averageAccessCount = count > 0 
          ? memories.reduce((sum, _m) => sum + 1, 0) / count  // Simplified access count
          : 0
        
        const now = Date.now()
        const averageAge = count > 0 
          ? memories.reduce((sum, m) => sum + ((now - (m.createdAt?.getTime() || now)) / (1000 * 60 * 60 * 24)), 0) / count 
          : 0

        // Estimate storage size (simplified)
        const storageSize = memories.reduce((sum, m) => {
          const contentSize = JSON.stringify(m.content).length
          return sum + contentSize
        }, 0)

        return {
          tier,
          count,
          averageImportance,
          averageAccessCount,
          averageAge,
          storageSize,
          lastOptimized: lastOptimization || new Date()
        }
      })

    return {
      initialize: () =>
        Effect.gen(function* () {
          // Set initialized flag
          isInitialized = true
          
          // Run initial optimization to organize existing memories (fire and forget)
          yield* optimizeMemoryTiersInternal().pipe(
            Effect.catchAll(() => Effect.succeed({} as TierOptimizationResult))
          )
        }),

      shutdown: () =>
        Effect.sync(() => {
          isInitialized = false
        }),

      promoteMemory: (memoryId, targetTier, reason = 'manual') =>
        Effect.gen(function* () {
          yield* ensureInitialized()
          
          const currentMemory = yield* memoryRepository.getById(memoryId)
          if (!currentMemory) {
            return yield* Effect.fail(new Error(`Memory not found: ${memoryId}`))
          }

          const currentTier = currentMemory.memoryTier as MemoryTier || 'warm'
          if (currentTier === targetTier) {
            return yield* Effect.fail(new Error(`Memory is already in ${targetTier} tier`))
          }

          const score = calculateMemoryScoreInternal(currentMemory)
          
          const transition: TierTransition = {
            memoryId,
            fromTier: currentTier,
            toTier: targetTier,
            reason: reason as any,
            score: score.totalScore,
            timestamp: new Date()
          }

          yield* applyTierTransition(transition)
          
          return transition
        }),

      demoteMemory: (memoryId, targetTier, reason = 'manual') =>
        Effect.gen(function* () {
          yield* ensureInitialized()
          
          const currentMemory = yield* memoryRepository.getById(memoryId)
          if (!currentMemory) {
            return yield* Effect.fail(new Error(`Memory not found: ${memoryId}`))
          }

          const currentTier = currentMemory.memoryTier as MemoryTier || 'warm'
          if (currentTier === targetTier) {
            return yield* Effect.fail(new Error(`Memory is already in ${targetTier} tier`))
          }

          const score = calculateMemoryScoreInternal(currentMemory)
          
          const transition: TierTransition = {
            memoryId,
            fromTier: currentTier,
            toTier: targetTier,
            reason: reason as any,
            score: score.totalScore,
            timestamp: new Date()
          }

          yield* applyTierTransition(transition)
          
          return transition
        }),

      optimizeMemoryTiers: () => optimizeMemoryTiersInternal(),

      calculateMemoryScore: (memoryId) =>
        Effect.gen(function* () {
          const memory = yield* memoryRepository.getById(memoryId)
          if (!memory) {
            return yield* Effect.fail(new Error(`Memory not found: ${memoryId}`))
          }
          
          return calculateMemoryScoreInternal(memory)
        }),

      collectTierMetrics: () =>
        Effect.gen(function* () {
          const hot = yield* calculateTierMetrics('hot')
          const warm = yield* calculateTierMetrics('warm')
          const cold = yield* calculateTierMetrics('cold')
          
          return { hot, warm, cold }
        }),

      getHealth: () =>
        Effect.gen(function* () {
          yield* ensureInitialized()
          
          const metrics = yield* Effect.gen(function* () {
            const hot = yield* calculateTierMetrics('hot')
            const warm = yield* calculateTierMetrics('warm')
            const cold = yield* calculateTierMetrics('cold')
            return { hot, warm, cold }
          })
          
          const totalMemories = metrics.hot.count + metrics.warm.count + metrics.cold.count

          return {
            service: 'MemoryTierManager',
            status: isInitialized ? 'ok' : 'initializing',
            details: {
              totalMemories,
              tierDistribution: {
                hot: metrics.hot.count,
                warm: metrics.warm.count,
                cold: metrics.cold.count
              },
              lastOptimization,
              optimizationRunning,
              configuration: config
            }
          }
        }),

      updateConfig: (newConfig) =>
        Effect.sync(() => {
          config = { ...config, ...newConfig }
        }),

      getConfig: () =>
        Effect.succeed({ ...config })
    }

    function optimizeMemoryTiersInternal(): Effect.Effect<TierOptimizationResult, Error, DatabaseService> {
      return Effect.gen(function* () {
        yield* ensureInitialized()
        
        if (optimizationRunning) {
          return yield* Effect.fail(new Error('Memory tier optimization is already running'))
        }

        optimizationRunning = true
        const startTime = Date.now()
        const transitions: TierTransition[] = []

        try {
          const allMemories = yield* memoryRepository.getAllActive()

          // Calculate scores for all memories
          const memoryScores = allMemories.map(calculateMemoryScoreInternal)

          // Get memories by tier
          const hotMemories = allMemories.filter(m => (m.memoryTier || 'warm') === 'hot')
          const warmMemories = allMemories.filter(m => (m.memoryTier || 'warm') === 'warm')

          // Optimize each tier
          const hotTransitions = yield* optimizeTierMemories(hotMemories, memoryScores, 'hot')
          const warmTransitions = yield* optimizeTierMemories(warmMemories, memoryScores, 'warm')
          
          // Check for promotions from other tiers
          const promotionCandidates = memoryScores.filter(score => 
            score.recommendedTier === 'hot' && 
            !hotMemories.some(memory => memory.id === score.memoryId)
          )

          const availableHotSlots = Math.max(0, config.hot.maxSize - (hotMemories.length - hotTransitions.length))
          const toPromoteToHot = promotionCandidates
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, availableHotSlots)

          for (const score of toPromoteToHot) {
            const currentMemory = allMemories.find(m => m.id === score.memoryId)
            if (currentMemory && (currentMemory.memoryTier || 'warm') !== 'hot') {
              hotTransitions.push({
                memoryId: score.memoryId,
                fromTier: (currentMemory.memoryTier || 'warm') as MemoryTier,
                toTier: 'hot',
                reason: 'access_pattern',
                score: score.totalScore,
                timestamp: new Date()
              })
            }
          }

          transitions.push(...hotTransitions, ...warmTransitions)

          // Apply all transitions
          for (const transition of transitions) {
            yield* applyTierTransition(transition)
          }

          // Collect post-optimization metrics
          const metrics = yield* Effect.gen(function* () {
            const hot = yield* calculateTierMetrics('hot')
            const warm = yield* calculateTierMetrics('warm')
            const cold = yield* calculateTierMetrics('cold')
            return { hot, warm, cold }
          })
          
          const endTime = Date.now()
          lastOptimization = new Date()

          const result: TierOptimizationResult = {
            processed: allMemories.length,
            transitions,
            hotTier: metrics.hot,
            warmTier: metrics.warm,
            coldTier: metrics.cold,
            performance: {
              durationMs: endTime - startTime,
              memoryFreed: 0,
              compressionRatio: 0
            }
          }

          return result
        } finally {
          optimizationRunning = false
        }
      })
    }
  })
)

function getDefaultConfig(): MemoryTierConfig {
  return {
    hot: {
      maxSize: 100,           // 100 hot memories max
      accessThreshold: 5,     // 5+ accesses to stay hot
      ageThreshold: 7,        // 7 days max age for hot
      importanceWeight: 0.3   // 30% weight for importance
    },
    warm: {
      maxSize: 500,           // 500 warm memories max
      accessThreshold: 2,     // 2+ accesses to stay warm
      ageThreshold: 30,       // 30 days max age for warm
      importanceWeight: 0.4   // 40% weight for importance
    },
    cold: {
      compressionEnabled: true,  // Enable compression
      compressionLevel: 6,       // Medium compression
      encryptionEnabled: false   // Disable encryption for now (can be added later)
    }
  }
}
