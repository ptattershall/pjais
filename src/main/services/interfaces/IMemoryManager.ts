import {
  MemoryEntity,
  MemorySearchResult,
  MemoryTier,
  MemoryScore,
  TierOptimizationResult,
  MemoryTierMetrics,
  SemanticSearchQuery,
  SemanticSearchResult,
  MemoryEmbedding,
  MemoryRelationship
} from '../../../shared/types/memory';
import { ServiceHealth } from '../../../shared/types/system';

export interface IMemoryManager {
  // Lifecycle management
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  isInitialized(): boolean;

  // Core memory operations
  createMemory(data: Partial<MemoryEntity>): Promise<MemoryEntity>;
  updateMemory(id: string, data: Partial<MemoryEntity>): Promise<MemoryEntity>;
  deleteMemory(id: string): Promise<void>;
  getMemory(id: string): Promise<MemoryEntity | null>;
  getAllMemories(): Promise<MemoryEntity[]>;

  // Search operations
  searchMemories(query: string, options?: {
    limit?: number;
    offset?: number;
    tier?: MemoryTier;
    includeEmbeddings?: boolean;
  }): Promise<MemorySearchResult[]>;

  semanticSearch(query: SemanticSearchQuery): Promise<SemanticSearchResult[]>;

  // Tier management
  optimizeMemoryTiers(): Promise<TierOptimizationResult>;
  getMemoryTierMetrics(): Promise<MemoryTierMetrics>;
  setMemoryTier(memoryId: string, tier: MemoryTier): Promise<void>;

  // Embedding operations
  generateEmbedding(text: string): Promise<MemoryEmbedding>;
  findSimilarMemories(embedding: MemoryEmbedding, limit?: number): Promise<MemoryEntity[]>;

  // Relationship management
  createRelationship(sourceId: string, targetId: string, type: string, metadata?: Record<string, unknown>): Promise<MemoryRelationship>;
  getRelationships(memoryId: string): Promise<MemoryRelationship[]>;
  removeRelationship(relationshipId: string): Promise<void>;

  // Scoring and analytics
  calculateMemoryScore(memory: MemoryEntity): Promise<MemoryScore>;
  getMemoryAnalytics(): Promise<{
    totalMemories: number;
    tierDistribution: Record<MemoryTier, number>;
    averageScore: number;
    recentActivity: number;
  }>;

  // Health monitoring
  getHealthStatus(): Promise<ServiceHealth>;
}