import { IMemoryManager } from '../interfaces/IMemoryManager';
import { MemoryManager } from '../memory-manager';
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

/**
 * Adapter that wraps the existing MemoryManager to implement IMemoryManager interface
 * This allows gradual migration to the new interface-based architecture
 */
export class MemoryManagerAdapter implements IMemoryManager {
  private memoryManager: MemoryManager;

  constructor(memoryManager: MemoryManager) {
    this.memoryManager = memoryManager;
  }

  // Lifecycle management
  async initialize(): Promise<void> {
    return this.memoryManager.initialize();
  }

  async shutdown(): Promise<void> {
    return this.memoryManager.shutdown();
  }

  isInitialized(): boolean {
    return this.memoryManager.isInitialized();
  }

  // Core memory operations
  async createMemory(data: Partial<MemoryEntity>): Promise<MemoryEntity> {
    return this.memoryManager.createMemory(data);
  }

  async updateMemory(id: string, data: Partial<MemoryEntity>): Promise<MemoryEntity> {
    return this.memoryManager.updateMemory(id, data);
  }

  async deleteMemory(id: string): Promise<void> {
    return this.memoryManager.deleteMemory(id);
  }

  async getMemory(id: string): Promise<MemoryEntity | null> {
    return this.memoryManager.getMemory(id);
  }

  async getAllMemories(): Promise<MemoryEntity[]> {
    return this.memoryManager.getAllMemories();
  }

  // Search operations
  async searchMemories(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
      tier?: MemoryTier;
      includeEmbeddings?: boolean;
    }
  ): Promise<MemorySearchResult[]> {
    return this.memoryManager.searchMemories(query, options);
  }

  async semanticSearch(query: SemanticSearchQuery): Promise<SemanticSearchResult[]> {
    return this.memoryManager.semanticSearch(query);
  }

  // Tier management
  async optimizeMemoryTiers(): Promise<TierOptimizationResult> {
    return this.memoryManager.optimizeMemoryTiers();
  }

  async getMemoryTierMetrics(): Promise<MemoryTierMetrics> {
    return this.memoryManager.getMemoryTierMetrics();
  }

  async setMemoryTier(memoryId: string, tier: MemoryTier): Promise<void> {
    return this.memoryManager.setMemoryTier(memoryId, tier);
  }

  // Embedding operations
  async generateEmbedding(text: string): Promise<MemoryEmbedding> {
    return this.memoryManager.generateEmbedding(text);
  }

  async findSimilarMemories(embedding: MemoryEmbedding, limit?: number): Promise<MemoryEntity[]> {
    return this.memoryManager.findSimilarMemories(embedding, limit);
  }

  // Relationship management
  async createRelationship(
    sourceId: string,
    targetId: string,
    type: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryRelationship> {
    return this.memoryManager.createRelationship(sourceId, targetId, type, metadata);
  }

  async getRelationships(memoryId: string): Promise<MemoryRelationship[]> {
    return this.memoryManager.getRelationships(memoryId);
  }

  async removeRelationship(relationshipId: string): Promise<void> {
    return this.memoryManager.removeRelationship(relationshipId);
  }

  // Scoring and analytics
  async calculateMemoryScore(memory: MemoryEntity): Promise<MemoryScore> {
    return this.memoryManager.calculateMemoryScore(memory);
  }

  async getMemoryAnalytics(): Promise<{
    totalMemories: number;
    tierDistribution: Record<MemoryTier, number>;
    averageScore: number;
    recentActivity: number;
  }> {
    return this.memoryManager.getMemoryAnalytics();
  }

  // Health monitoring
  async getHealthStatus(): Promise<ServiceHealth> {
    return this.memoryManager.getHealthStatus();
  }
}