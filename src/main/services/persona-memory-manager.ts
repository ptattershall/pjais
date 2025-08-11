import { Effect, Context, Layer } from "effect"
import { MemoryRepository, MemoryRepositoryLive } from '../database/memory-repository'
import { DatabaseService } from '../database/database-service'
import { MemoryEntity, MemoryTier } from '../../shared/types/memory'
import { PersonaData } from '../../shared/types/persona'

export interface MemoryHealth {
  overall: number; // 0-100 health score
  distribution: {
    hot: number;
    warm: number;
    cold: number;
  };
  fragmentation: number;
  lastOptimization: Date | null;
  recommendations: MemoryRecommendation[];
  usage: {
    totalMemories: number;
    totalSize: number;
    capacityUsed: number; // percentage
  };
}

export interface MemoryRecommendation {
  id: string;
  type: 'optimization' | 'cleanup' | 'configuration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action: string;
  estimatedImpact: string;
  autoExecutable: boolean;
}

export interface MemoryOptimizationResult {
  memoriesProcessed: number;
  tiersRebalanced: {
    promoted: number;
    demoted: number;
  };
  spaceReclaimed: number; // bytes
  performanceImprovement: number; // percentage
  duration: number; // milliseconds
  recommendations: MemoryRecommendation[];
}

export interface PersonaMemoryAnalytics {
  memoryGrowthTrend: {
    period: 'daily' | 'weekly' | 'monthly';
    data: Array<{ date: Date; count: number; size: number }>;
  };
  importanceDistribution: {
    veryHigh: number; // 80-100
    high: number;     // 60-79
    medium: number;   // 40-59
    low: number;      // 20-39
    veryLow: number;  // 0-19
  };
  accessPatterns: {
    mostAccessed: MemoryEntity[];
    leastAccessed: MemoryEntity[];
    accessTrends: Array<{ date: Date; accessCount: number }>;
  };
  categoryBreakdown: Record<string, number>;
}

// Service interface
export interface PersonaMemoryManager {
  readonly getMemoryHealth: (personaId: string) => Effect.Effect<MemoryHealth, Error, DatabaseService>
  readonly optimizePersonaMemory: (personaId: string) => Effect.Effect<MemoryOptimizationResult, Error, DatabaseService>
  readonly getMemoryAnalytics: (personaId: string) => Effect.Effect<PersonaMemoryAnalytics, Error, DatabaseService>
}

// Create service tag
export const PersonaMemoryManager = Context.GenericTag<PersonaMemoryManager>("PersonaMemoryManager")

// Service implementation
export const PersonaMemoryManagerLive = Layer.effect(
  PersonaMemoryManager,
  Effect.gen(function* () {
    const memoryRepository = yield* MemoryRepository

    const calculateFragmentation = (tiers: Record<string, number>, totalMemories: number): number => {
      if (totalMemories === 0) return 0;

      // Ideal distribution: 20% hot, 30% warm, 50% cold
      const hotRatio = tiers.hot / totalMemories;
      const warmRatio = tiers.warm / totalMemories;
      const coldRatio = tiers.cold / totalMemories;

      const hotDiff = Math.abs(hotRatio - 0.2);
      const warmDiff = Math.abs(warmRatio - 0.3);
      const coldDiff = Math.abs(coldRatio - 0.5);

      const totalDiff = hotDiff + warmDiff + coldDiff;
      return Math.min(100, totalDiff * 100);
    }

    const calculateOverallHealth = (
      tiers: Record<string, number>, 
      fragmentation: number, 
      capacityUsed: number
    ): number => {
      // Health score based on fragmentation and capacity usage
      const fragmentationScore = Math.max(0, 100 - fragmentation);
      const capacityScore = capacityUsed > 90 ? Math.max(0, 100 - (capacityUsed - 90) * 5) : 100;
      
      return Math.round((fragmentationScore * 0.6 + capacityScore * 0.4));
    }

    const generateRecommendations = (
      persona: PersonaData,
      memories: MemoryEntity[],
      stats: {
        tiers: Record<string, number>;
        fragmentation: number;
        capacityUsed: number;
        totalMemories: number;
        totalSize: number;
      }
    ): MemoryRecommendation[] => {
      const recommendations: MemoryRecommendation[] = [];

      // High capacity usage
      if (stats.capacityUsed > 85) {
        recommendations.push({
          id: 'high-capacity',
          type: 'cleanup',
          priority: stats.capacityUsed > 95 ? 'critical' : 'high',
          title: 'High Memory Usage',
          description: `Memory usage at ${stats.capacityUsed.toFixed(1)}% of capacity`,
          action: 'Clean up low-importance memories or increase capacity',
          estimatedImpact: 'Improve performance and prevent memory overflow',
          autoExecutable: persona.memoryConfiguration?.autoOptimize || false
        });
      }

      // High fragmentation
      if (stats.fragmentation > 40) {
        recommendations.push({
          id: 'high-fragmentation',
          type: 'optimization',
          priority: stats.fragmentation > 60 ? 'high' : 'medium',
          title: 'Memory Fragmentation',
          description: `Memory tiers are poorly distributed (${stats.fragmentation.toFixed(1)}% fragmentation)`,
          action: 'Rebalance memory tiers based on access patterns',
          estimatedImpact: 'Improve memory access speed by 15-30%',
          autoExecutable: true
        });
      }

      // Configuration optimization
      if ((persona.memoryConfiguration?.memoryImportanceThreshold || 50) < 30) {
        recommendations.push({
          id: 'low-threshold',
          type: 'configuration',
          priority: 'medium',
          title: 'Low Importance Threshold',
          description: 'Current threshold may retain too many low-quality memories',
          action: 'Consider increasing importance threshold to 40-60',
          estimatedImpact: 'Better memory quality and reduced noise',
          autoExecutable: false
        });
      }

      return recommendations;
    }

    const calculateOptimalTier = (memory: MemoryEntity, _config: PersonaData['memoryConfiguration']): MemoryTier => {
      const importance = memory.importance || 0;
      const lastAccessed = memory.lastAccessed ? new Date(memory.lastAccessed) : new Date(0);
      const daysSinceAccess = (Date.now() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24);

      // High importance or recently accessed -> hot
      if (importance >= 80 || daysSinceAccess <= 1) {
        return 'hot';
      }

      // Medium importance or moderately recent -> warm
      if (importance >= 50 || daysSinceAccess <= 7) {
        return 'warm';
      }

      // Everything else -> cold
      return 'cold';
    }

    const isPromotion = (currentTier: MemoryTier | undefined, newTier: MemoryTier): boolean => {
      const tierHierarchy = { 'cold': 0, 'warm': 1, 'hot': 2 };
      const current = tierHierarchy[currentTier || 'cold'];
      const target = tierHierarchy[newTier];
      return target > current;
    }

    const estimatePerformanceImprovement = (promoted: number, demoted: number, spaceReclaimed: number): number => {
      // Simple heuristic for performance improvement estimation
      const rebalanceImpact = (promoted + demoted) * 0.5; // 0.5% per rebalanced memory
      const spaceImpact = (spaceReclaimed / (1024 * 1024)) * 2; // 2% per MB reclaimed
      
      return Math.min(50, rebalanceImpact + spaceImpact); // Cap at 50%
    }

    return {
      getMemoryHealth: (personaId: string) =>
        Effect.gen(function* () {
          const memories = yield* memoryRepository.getByPersonaId(personaId)
          
          // Default persona configuration if not available
          const config = {
            maxMemories: 1000,
            memoryImportanceThreshold: 30,
            autoOptimize: false,
            retentionPeriod: 90,
            memoryCategories: ['interaction', 'learning', 'preference'],
            compressionEnabled: true
          };

          // Calculate tier distribution
          const tiers = { hot: 0, warm: 0, cold: 0 };
          let totalSize = 0;

          memories.forEach(memory => {
            const tier = memory.memoryTier || 'cold';
            tiers[tier]++;
            
            // Estimate memory size
            const contentSize = typeof memory.content === 'string' 
              ? memory.content.length 
              : JSON.stringify(memory.content).length;
            totalSize += contentSize;
          });

          const totalMemories = memories.length;
          const capacityUsed = (totalMemories / config.maxMemories) * 100;

          // Calculate fragmentation score
          const fragmentation = calculateFragmentation(tiers, totalMemories);

          // Calculate overall health
          const overall = calculateOverallHealth(tiers, fragmentation, capacityUsed);

          // Generate recommendations with default persona config
          const defaultPersona: PersonaData = {
            id: personaId,
            name: 'Default',
            memoryConfiguration: config
          } as PersonaData;

          const recommendations = generateRecommendations(defaultPersona, memories, {
            tiers,
            fragmentation,
            capacityUsed,
            totalMemories,
            totalSize
          });

          return {
            overall,
            distribution: {
              hot: totalMemories > 0 ? (tiers.hot / totalMemories) * 100 : 0,
              warm: totalMemories > 0 ? (tiers.warm / totalMemories) * 100 : 0,
              cold: totalMemories > 0 ? (tiers.cold / totalMemories) * 100 : 0
            },
            fragmentation,
            lastOptimization: null, // TODO: Track optimization history
            recommendations,
            usage: {
              totalMemories,
              totalSize,
              capacityUsed
            }
          };
        }),

      optimizePersonaMemory: (personaId: string) =>
        Effect.gen(function* () {
          const startTime = Date.now();
          const memories = yield* memoryRepository.getByPersonaId(personaId)

          // Default configuration - fixed to match expected interface
          const _config = {
            maxMemories: 1000,
            memoryImportanceThreshold: 30,
            autoOptimize: false,
            retentionPeriod: 90,
            memoryCategories: ['interaction', 'learning', 'preference'],
            compressionEnabled: true
          };

          let promoted = 0;
          let demoted = 0;
          let spaceReclaimed = 0;

          // Rebalance memory tiers based on configuration
          for (const memory of memories) {
            const optimalTier = calculateOptimalTier(memory, _config);
            
            if (memory.memoryTier !== optimalTier) {
              if (isPromotion(memory.memoryTier, optimalTier)) {
                promoted++;
              } else {
                demoted++;
              }
              
              yield* memoryRepository.updateTier(memory.id || '', optimalTier, memory.content);
            }
          }

          // Clean up low-importance memories if over capacity
          if (memories.length > _config.maxMemories) {
            const lowImportanceMemories = memories
              .filter((m: MemoryEntity) => (m.importance || 0) < _config.memoryImportanceThreshold)
              .sort((a: MemoryEntity, b: MemoryEntity) => (a.importance || 0) - (b.importance || 0))
              .slice(0, memories.length - _config.maxMemories);

            for (const memory of lowImportanceMemories) {
              const contentSize = typeof memory.content === 'string' 
                ? memory.content.length 
                : JSON.stringify(memory.content).length;
              spaceReclaimed += contentSize;
              
              if (memory.id) {
                yield* memoryRepository.delete(memory.id);
              }
            }
          }

          const duration = Date.now() - startTime;
          const performanceImprovement = estimatePerformanceImprovement(promoted, demoted, spaceReclaimed);

          // Generate basic recommendations (simplified without calling this.getMemoryHealth)
          const recommendations: MemoryRecommendation[] = [];

          return {
            memoriesProcessed: memories.length,
            tiersRebalanced: { promoted, demoted },
            spaceReclaimed,
            performanceImprovement,
            duration,
            recommendations
          };
        }),

      getMemoryAnalytics: (personaId: string) =>
        Effect.gen(function* () {
          const memories = yield* memoryRepository.getByPersonaId(personaId)
          
          // Calculate importance distribution
          const importanceDistribution = {
            veryHigh: 0, high: 0, medium: 0, low: 0, veryLow: 0
          };

          memories.forEach((memory: MemoryEntity) => {
            const importance = memory.importance || 0;
            if (importance >= 80) importanceDistribution.veryHigh++;
            else if (importance >= 60) importanceDistribution.high++;
            else if (importance >= 40) importanceDistribution.medium++;
            else if (importance >= 20) importanceDistribution.low++;
            else importanceDistribution.veryLow++;
          });

          // Sort by access frequency
          const sortedByAccess = [...memories].sort((a: MemoryEntity, b: MemoryEntity) => {
            const aAccessed = a.lastAccessed ? new Date(a.lastAccessed).getTime() : 0;
            const bAccessed = b.lastAccessed ? new Date(b.lastAccessed).getTime() : 0;
            return bAccessed - aAccessed;
          });

          const mostAccessed = sortedByAccess.slice(0, 10);
          const leastAccessed = sortedByAccess.slice(-10).reverse();

          // Category breakdown
          const categoryBreakdown: Record<string, number> = {};
          memories.forEach((memory: MemoryEntity) => {
            const category = memory.type || 'uncategorized';
            categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
          });

          return {
            memoryGrowthTrend: {
              period: 'weekly' as const,
              data: [] // TODO: Implement growth tracking
            },
            importanceDistribution,
            accessPatterns: {
              mostAccessed,
              leastAccessed,
              accessTrends: [] // TODO: Implement access trend tracking
            },
            categoryBreakdown
          };
        })
    }
  })
).pipe(Layer.provide(MemoryRepositoryLive))
