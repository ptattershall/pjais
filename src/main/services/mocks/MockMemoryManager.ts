import { IMemoryManager } from '../interfaces/IMemoryManager';
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

export class MockMemoryManager implements IMemoryManager {
  private memories: Map<string, MemoryEntity> = new Map();
  private relationships: Map<string, MemoryRelationship> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.memories.clear();
    this.relationships.clear();
    this.initialized = false;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async createMemory(data: Partial<MemoryEntity>): Promise<MemoryEntity> {
    const memory: MemoryEntity = {
      id: data.id || `memory-${Date.now()}`,
      type: data.type || 'text',
      content: data.content || '',
      memoryTier: data.memoryTier || 'cold',
      importance: data.importance || 0,
      tags: data.tags || [],
      createdAt: data.createdAt || new Date().toISOString(),
      lastAccessed: data.lastAccessed || new Date().toISOString(),
      ...data
    };

    this.memories.set(memory.id, memory);
    return memory;
  }

  async updateMemory(id: string, data: Partial<MemoryEntity>): Promise<MemoryEntity> {
    const existing = this.memories.get(id);
    if (!existing) {
      throw new Error(`Memory not found: ${id}`);
    }

    const updated = { ...existing, ...data };
    this.memories.set(id, updated);
    return updated;
  }

  async deleteMemory(id: string): Promise<void> {
    this.memories.delete(id);
  }

  async getMemory(id: string): Promise<MemoryEntity | null> {
    return this.memories.get(id) || null;
  }

  async getAllMemories(): Promise<MemoryEntity[]> {
    return Array.from(this.memories.values());
  }

  async searchMemories(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
      tier?: MemoryTier;
      includeEmbeddings?: boolean;
    }
  ): Promise<MemorySearchResult[]> {
    const memories = Array.from(this.memories.values());
    const filtered = memories.filter(memory => {
      const matchesQuery = typeof memory.content === 'string' && 
        memory.content.toLowerCase().includes(query.toLowerCase());
      const matchesTier = !options?.tier || memory.memoryTier === options.tier;
      return matchesQuery && matchesTier;
    });

    const results: MemorySearchResult[] = filtered.map(memory => ({
      memory,
      score: Math.random(), // Mock score
      relevance: Math.random() // Mock relevance
    }));

    const offset = options?.offset || 0;
    const limit = options?.limit || results.length;
    return results.slice(offset, offset + limit);
  }

  async semanticSearch(query: SemanticSearchQuery): Promise<SemanticSearchResult[]> {
    const memories = Array.from(this.memories.values());
    return memories.slice(0, query.limit || 10).map(memory => ({
      memory,
      similarity: Math.random(),
      embedding: [Math.random(), Math.random(), Math.random()] // Mock embedding
    }));
  }

  async optimizeMemoryTiers(): Promise<TierOptimizationResult> {
    return {
      optimizedCount: 0,
      movedToActive: 0,
      movedToArchived: 0,
      movedToCold: 0,
      executionTime: 100
    };
  }

  async getMemoryTierMetrics(): Promise<MemoryTierMetrics> {
    const memories = Array.from(this.memories.values());
    return {
      active: memories.filter(m => m.memoryTier === 'active').length,
      archived: memories.filter(m => m.memoryTier === 'archived').length,
      cold: memories.filter(m => m.memoryTier === 'cold').length,
      totalSize: memories.length * 1024, // Mock size
      averageAccessTime: {
        active: 10,
        archived: 50,
        cold: 200
      }
    };
  }

  async setMemoryTier(memoryId: string, tier: MemoryTier): Promise<void> {
    const memory = this.memories.get(memoryId);
    if (memory) {
      memory.memoryTier = tier;
      this.memories.set(memoryId, memory);
    }
  }

  async generateEmbedding(text: string): Promise<MemoryEmbedding> {
    // Mock embedding generation
    return Array.from({ length: 384 }, () => Math.random() - 0.5);
  }

  async findSimilarMemories(embedding: MemoryEmbedding, limit = 5): Promise<MemoryEntity[]> {
    return Array.from(this.memories.values()).slice(0, limit);
  }

  async createRelationship(
    sourceId: string,
    targetId: string,
    type: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryRelationship> {
    const relationship: MemoryRelationship = {
      id: `rel-${Date.now()}`,
      sourceId,
      targetId,
      type,
      strength: Math.random(),
      metadata,
      createdAt: new Date().toISOString()
    };

    this.relationships.set(relationship.id, relationship);
    return relationship;
  }

  async getRelationships(memoryId: string): Promise<MemoryRelationship[]> {
    return Array.from(this.relationships.values()).filter(
      rel => rel.sourceId === memoryId || rel.targetId === memoryId
    );
  }

  async removeRelationship(relationshipId: string): Promise<void> {
    this.relationships.delete(relationshipId);
  }

  async calculateMemoryScore(memory: MemoryEntity): Promise<MemoryScore> {
    return {
      overall: Math.random(),
      importance: memory.importance || 0,
      recency: Math.random(),
      frequency: Math.random(),
      relevance: Math.random()
    };
  }

  async getMemoryAnalytics(): Promise<{
    totalMemories: number;
    tierDistribution: Record<MemoryTier, number>;
    averageScore: number;
    recentActivity: number;
  }> {
    const memories = Array.from(this.memories.values());
    return {
      totalMemories: memories.length,
      tierDistribution: {
        active: memories.filter(m => m.memoryTier === 'active').length,
        archived: memories.filter(m => m.memoryTier === 'archived').length,
        cold: memories.filter(m => m.memoryTier === 'cold').length
      },
      averageScore: Math.random(),
      recentActivity: Math.floor(Math.random() * 100)
    };
  }

  async getHealthStatus(): Promise<ServiceHealth> {
    return {
      status: 'healthy',
      uptime: Date.now(),
      memoryUsage: 1024 * 1024 * 50, // 50MB
      errors: []
    };
  }
}