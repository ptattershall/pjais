import { DatabaseManager } from './database-manager';
import { EmbeddingService } from './embedding-service';
import { SecurityEventLogger } from './security-event-logger';
import { 
  MemoryRelationship, 
  MemoryEntity
} from '../../shared/types/memory';
import { ServiceHealth } from '../../shared/types/system';

interface GraphConfig {
  maxRelationshipsPerMemory: number;
  minRelationshipStrength: number;
  strengthDecayRate: number; // per day
  confidenceThreshold: number;
  autoRelationshipThreshold: number; // similarity threshold for auto-creation
  maxTraversalDepth: number;
  relationshipTtl: number; // days before relationship expires
}

interface RelationshipCandidate {
  fromMemoryId: string;
  toMemoryId: string;
  type: MemoryRelationship['type'];
  strength: number;
  confidence: number;
  reason: string;
}

interface GraphTraversalOptions {
  maxDepth?: number;
  minStrength?: number;
  relationshipTypes?: MemoryRelationship['type'][];
  includeDecayed?: boolean;
  sortBy?: 'strength' | 'confidence' | 'recency';
}

interface GraphAnalytics {
  totalRelationships: number;
  averageStrength: number;
  mostConnectedMemory: { memoryId: string; connectionCount: number };
  relationshipsByType: Record<string, number>;
  graphDensity: number;
  clustersFound: number;
}

export class MemoryGraphService {
  private databaseManager: DatabaseManager;
  private embeddingService: EmbeddingService;
  private eventLogger: SecurityEventLogger;
  private config: GraphConfig;
  private relationshipCache: Map<string, MemoryRelationship[]> = new Map();
  private isInitialized = false;
  private lastDecayRun: Date | null = null;

  constructor(
    databaseManager: DatabaseManager, 
    embeddingService: EmbeddingService,
    eventLogger: SecurityEventLogger
  ) {
    this.databaseManager = databaseManager;
    this.embeddingService = embeddingService;
    this.eventLogger = eventLogger;
    this.config = this.getDefaultConfig();
  }

  async initialize(): Promise<void> {
    console.log('Initializing MemoryGraphService...');
    
    try {
      // Run initial relationship decay
      await this.runRelationshipDecay();
      
      // Build initial relationship cache
      await this.rebuildRelationshipCache();
      
      this.isInitialized = true;
      
      this.eventLogger.log({
        type: 'embedding', // Using embedding type since we don't have graph type yet
        severity: 'low',
        description: 'MemoryGraphService initialized successfully',
        timestamp: new Date(),
        details: { 
          totalRelationships: this.getTotalRelationships(),
          config: this.config
        }
      });
      
      console.log('MemoryGraphService initialized successfully');
    } catch (error) {
      this.eventLogger.log({
        type: 'embedding',
        severity: 'critical',
        description: 'Failed to initialize MemoryGraphService',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down MemoryGraphService...');
    this.relationshipCache.clear();
    this.isInitialized = false;
  }

  // =============================================================================
  // RELATIONSHIP MANAGEMENT
  // =============================================================================

  async createRelationship(
    fromMemoryId: string,
    toMemoryId: string,
    type: MemoryRelationship['type'],
    strength: number = 0.5,
    confidence: number = 0.8
  ): Promise<MemoryRelationship> {
    this.ensureInitialized();

    if (fromMemoryId === toMemoryId) {
      throw new Error('Cannot create relationship to self');
    }

    // Validate memories exist
    const fromMemory = await this.databaseManager.getMemoryEntity(fromMemoryId);
    const toMemory = await this.databaseManager.getMemoryEntity(toMemoryId);
    
    if (!fromMemory || !toMemory) {
      throw new Error('One or both memories not found');
    }

    // Check if relationship already exists
    const existingRelationship = await this.getRelationship(fromMemoryId, toMemoryId, type);
    if (existingRelationship) {
      // Update existing relationship
      return await this.updateRelationshipStrength(existingRelationship.id, strength, confidence);
    }

    // Create new relationship
    const relationship: MemoryRelationship = {
      id: this.generateRelationshipId(),
      fromMemoryId,
      toMemoryId,
      type,
      strength: Math.max(0, Math.min(1, strength)), // Clamp to [0, 1]
      confidence: Math.max(0, Math.min(1, confidence)), // Clamp to [0, 1]
      createdAt: new Date(),
      lastVerified: new Date(),
      decayRate: this.calculateDecayRate(type, strength)
    };

    // Store relationship (in a real implementation, this would go to database)
    await this.storeRelationship(relationship);
    
    // Update cache
    this.addRelationshipToCache(relationship);

    this.eventLogger.log({
      type: 'embedding',
      severity: 'low',
      description: 'Memory relationship created',
      timestamp: new Date(),
      details: { 
        fromMemoryId,
        toMemoryId,
        type,
        strength,
        confidence
      }
    });

    return relationship;
  }

  async updateRelationshipStrength(
    relationshipId: string, 
    newStrength: number,
    newConfidence?: number
  ): Promise<MemoryRelationship> {
    this.ensureInitialized();

    const relationship = await this.getRelationshipById(relationshipId);
    if (!relationship) {
      throw new Error(`Relationship not found: ${relationshipId}`);
    }

    // Update strength and confidence
    relationship.strength = Math.max(0, Math.min(1, newStrength));
    if (newConfidence !== undefined) {
      relationship.confidence = Math.max(0, Math.min(1, newConfidence));
    }
    relationship.lastVerified = new Date();

    // Recalculate decay rate
    relationship.decayRate = this.calculateDecayRate(relationship.type, relationship.strength);

    // Update storage and cache
    await this.storeRelationship(relationship);
    this.updateRelationshipInCache(relationship);

    this.eventLogger.log({
      type: 'embedding',
      severity: 'low',
      description: 'Memory relationship strength updated',
      timestamp: new Date(),
      details: { 
        relationshipId,
        newStrength,
        newConfidence: newConfidence || relationship.confidence
      }
    });

    return relationship;
  }

  async deleteRelationship(relationshipId: string): Promise<boolean> {
    this.ensureInitialized();

    const relationship = await this.getRelationshipById(relationshipId);
    if (!relationship) {
      return false;
    }

    // Remove from storage and cache
    await this.removeRelationshipFromStorage(relationshipId);
    this.removeRelationshipFromCache(relationshipId);

    this.eventLogger.log({
      type: 'embedding',
      severity: 'low',
      description: 'Memory relationship deleted',
      timestamp: new Date(),
      details: { relationshipId }
    });

    return true;
  }

  // =============================================================================
  // AUTOMATIC RELATIONSHIP DISCOVERY
  // =============================================================================

  async discoverRelationships(memoryId: string): Promise<RelationshipCandidate[]> {
    this.ensureInitialized();

    const memory = await this.databaseManager.getMemoryEntity(memoryId);
    if (!memory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    const candidates: RelationshipCandidate[] = [];

    // Get all other memories
    const allMemories = await this.databaseManager.getAllActiveMemories();
    const otherMemories = allMemories.filter(m => m.id !== memoryId);

    // Generate embedding for target memory
    const memoryEmbedding = await this.embeddingService.generateMemoryEmbedding(memory);

    for (const otherMemory of otherMemories) {
      try {
        // Check if relationship already exists
        const existingRelationship = await this.getRelationship(memoryId, otherMemory.id);
        if (existingRelationship) {
          continue; // Skip if relationship already exists
        }

        // Generate embedding for comparison
        const otherEmbedding = await this.embeddingService.generateMemoryEmbedding(otherMemory);
        
        // Calculate semantic similarity
        const similarity = this.embeddingService.calculateCosineSimilarity(
          memoryEmbedding.embedding,
          otherEmbedding.embedding
        );

        if (similarity >= this.config.autoRelationshipThreshold) {
          // Determine relationship type based on analysis
          const relationshipType = this.determineRelationshipType(memory, otherMemory, similarity);
          
          candidates.push({
            fromMemoryId: memoryId,
            toMemoryId: otherMemory.id,
            type: relationshipType,
            strength: similarity,
            confidence: this.calculateConfidence(memory, otherMemory, similarity),
            reason: `Semantic similarity: ${(similarity * 100).toFixed(1)}%`
          });
        }
      } catch (error) {
        console.warn(`Failed to analyze relationship candidate ${otherMemory.id}:`, error);
      }
    }

    // Sort by strength descending
    candidates.sort((a, b) => b.strength - a.strength);

    // Limit to max relationships per memory
    const limitedCandidates = candidates.slice(0, this.config.maxRelationshipsPerMemory);

    this.eventLogger.log({
      type: 'embedding',
      severity: 'low',
      description: 'Relationship discovery completed',
      timestamp: new Date(),
      details: { 
        memoryId,
        candidatesFound: candidates.length,
        candidatesReturned: limitedCandidates.length
      }
    });

    return limitedCandidates;
  }

  async autoCreateRelationships(memoryId: string): Promise<MemoryRelationship[]> {
    this.ensureInitialized();

    const candidates = await this.discoverRelationships(memoryId);
    const createdRelationships: MemoryRelationship[] = [];

    for (const candidate of candidates) {
      if (candidate.confidence >= this.config.confidenceThreshold) {
        try {
          const relationship = await this.createRelationship(
            candidate.fromMemoryId,
            candidate.toMemoryId,
            candidate.type,
            candidate.strength,
            candidate.confidence
          );
          createdRelationships.push(relationship);
        } catch (error) {
          console.warn(`Failed to create auto-relationship:`, error);
        }
      }
    }

    return createdRelationships;
  }

  // =============================================================================
  // GRAPH TRAVERSAL
  // =============================================================================

  async getRelatedMemories(
    memoryId: string, 
    options: GraphTraversalOptions = {}
  ): Promise<Array<{ memory: MemoryEntity; relationship: MemoryRelationship; distance: number }>> {
    this.ensureInitialized();

    const {
      maxDepth = this.config.maxTraversalDepth,
      minStrength = this.config.minRelationshipStrength,
      relationshipTypes,
      includeDecayed = false,
      sortBy = 'strength'
    } = options;

    const visited = new Set<string>();
    const results: Array<{ memory: MemoryEntity; relationship: MemoryRelationship; distance: number }> = [];
    const queue: Array<{ memoryId: string; distance: number; path: MemoryRelationship[] }> = [];

    // Start traversal
    queue.push({ memoryId, distance: 0, path: [] });
    visited.add(memoryId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current.distance >= maxDepth) {
        continue;
      }

      // Get relationships from current memory
      const relationships = await this.getMemoryRelationships(current.memoryId);
      
      for (const relationship of relationships) {
        // Apply filters
        if (relationship.strength < minStrength) continue;
        if (!includeDecayed && this.isRelationshipDecayed(relationship)) continue;
        if (relationshipTypes && !relationshipTypes.includes(relationship.type)) continue;

        const targetMemoryId = relationship.fromMemoryId === current.memoryId 
          ? relationship.toMemoryId 
          : relationship.fromMemoryId;

        if (!visited.has(targetMemoryId)) {
          visited.add(targetMemoryId);
          
          // Get target memory
          const targetMemory = await this.databaseManager.getMemoryEntity(targetMemoryId);
          if (targetMemory) {
            results.push({
              memory: targetMemory,
              relationship,
              distance: current.distance + 1
            });

            // Add to queue for further traversal
            if (current.distance + 1 < maxDepth) {
              queue.push({
                memoryId: targetMemoryId,
                distance: current.distance + 1,
                path: [...current.path, relationship]
              });
            }
          }
        }
      }
    }

    // Sort results
    this.sortTraversalResults(results, sortBy);

    return results;
  }

  async findShortestPath(
    fromMemoryId: string, 
    toMemoryId: string
  ): Promise<MemoryRelationship[] | null> {
    this.ensureInitialized();

    if (fromMemoryId === toMemoryId) {
      return [];
    }

    const visited = new Set<string>();
    const queue: Array<{ memoryId: string; path: MemoryRelationship[] }> = [];
    
    queue.push({ memoryId: fromMemoryId, path: [] });
    visited.add(fromMemoryId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Get relationships from current memory
      const relationships = await this.getMemoryRelationships(current.memoryId);
      
      for (const relationship of relationships) {
        const nextMemoryId = relationship.fromMemoryId === current.memoryId 
          ? relationship.toMemoryId 
          : relationship.fromMemoryId;

        if (nextMemoryId === toMemoryId) {
          // Found the target!
          return [...current.path, relationship];
        }

        if (!visited.has(nextMemoryId)) {
          visited.add(nextMemoryId);
          queue.push({
            memoryId: nextMemoryId,
            path: [...current.path, relationship]
          });
        }
      }
    }

    return null; // No path found
  }

  // =============================================================================
  // DECAY MECHANISMS
  // =============================================================================

  async runRelationshipDecay(): Promise<void> {
    this.ensureInitialized();

    const now = new Date();
    const daysSinceLastRun = this.lastDecayRun 
      ? (now.getTime() - this.lastDecayRun.getTime()) / (1000 * 60 * 60 * 24)
      : 1;

    let updatedCount = 0;
    let removedCount = 0;

    // Get all relationships
    const allRelationships = await this.getAllRelationships();

    for (const relationship of allRelationships) {
      const daysSinceLastVerified = (now.getTime() - relationship.lastVerified.getTime()) / (1000 * 60 * 60 * 24);
      
      // Calculate decay
      const decayAmount = relationship.decayRate * daysSinceLastVerified;
      const newStrength = Math.max(0, relationship.strength - decayAmount);

      if (newStrength < this.config.minRelationshipStrength) {
        // Remove weak relationships
        await this.deleteRelationship(relationship.id);
        removedCount++;
      } else if (newStrength !== relationship.strength) {
        // Update decayed strength
        await this.updateRelationshipStrength(relationship.id, newStrength);
        updatedCount++;
      }
    }

    this.lastDecayRun = now;

    this.eventLogger.log({
      type: 'embedding',
      severity: 'low',
      description: 'Relationship decay completed',
      timestamp: new Date(),
      details: { 
        updatedCount,
        removedCount,
        daysSinceLastRun
      }
    });
  }

  // =============================================================================
  // GRAPH ANALYTICS
  // =============================================================================

  async generateGraphAnalytics(): Promise<GraphAnalytics> {
    this.ensureInitialized();

    const allRelationships = await this.getAllRelationships();
    const allMemories = await this.databaseManager.getAllActiveMemories();

    // Calculate basic metrics
    const totalRelationships = allRelationships.length;
    const averageStrength = allRelationships.length > 0
      ? allRelationships.reduce((sum, r) => sum + r.strength, 0) / allRelationships.length
      : 0;

    // Find most connected memory
    const connectionCounts = new Map<string, number>();
    allRelationships.forEach(r => {
      connectionCounts.set(r.fromMemoryId, (connectionCounts.get(r.fromMemoryId) || 0) + 1);
      connectionCounts.set(r.toMemoryId, (connectionCounts.get(r.toMemoryId) || 0) + 1);
    });

    const mostConnected = Array.from(connectionCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    const mostConnectedMemory = mostConnected 
      ? { memoryId: mostConnected[0], connectionCount: mostConnected[1] }
      : { memoryId: '', connectionCount: 0 };

    // Count relationships by type
    const relationshipsByType: Record<string, number> = {};
    allRelationships.forEach(r => {
      relationshipsByType[r.type] = (relationshipsByType[r.type] || 0) + 1;
    });

    // Calculate graph density
    const maxPossibleRelationships = allMemories.length * (allMemories.length - 1) / 2;
    const graphDensity = maxPossibleRelationships > 0 
      ? totalRelationships / maxPossibleRelationships 
      : 0;

    // Simple cluster detection (connected components)
    const clustersFound = await this.countConnectedComponents();

    return {
      totalRelationships,
      averageStrength,
      mostConnectedMemory,
      relationshipsByType,
      graphDensity,
      clustersFound
    };
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private async getRelationship(
    fromMemoryId: string, 
    toMemoryId: string, 
    type?: MemoryRelationship['type']
  ): Promise<MemoryRelationship | null> {
    // In a real implementation, this would query the database
    // For now, check the cache
    const relationships = this.relationshipCache.get(fromMemoryId) || [];
    return relationships.find(r => 
      r.toMemoryId === toMemoryId && 
      (!type || r.type === type)
    ) || null;
  }

  private async getRelationshipById(relationshipId: string): Promise<MemoryRelationship | null> {
    // In a real implementation, this would query the database
    for (const relationships of this.relationshipCache.values()) {
      const found = relationships.find(r => r.id === relationshipId);
      if (found) return found;
    }
    return null;
  }

  private async getMemoryRelationships(memoryId: string): Promise<MemoryRelationship[]> {
    // Get relationships where memory is either source or target
    const outgoing = this.relationshipCache.get(memoryId) || [];
    const incoming: MemoryRelationship[] = [];
    
    for (const [sourceId, relationships] of this.relationshipCache.entries()) {
      if (sourceId !== memoryId) {
        incoming.push(...relationships.filter(r => r.toMemoryId === memoryId));
      }
    }
    
    return [...outgoing, ...incoming];
  }

  private async getAllRelationships(): Promise<MemoryRelationship[]> {
    const allRelationships: MemoryRelationship[] = [];
    for (const relationships of this.relationshipCache.values()) {
      allRelationships.push(...relationships);
    }
    return allRelationships;
  }

  private determineRelationshipType(
    memory1: MemoryEntity, 
    memory2: MemoryEntity, 
    similarity: number
  ): MemoryRelationship['type'] {
    // Simple heuristics for relationship type determination
    const timeDiff = Math.abs(
      (memory1.createdAt?.getTime() || 0) - (memory2.createdAt?.getTime() || 0)
    ) / (1000 * 60 * 60); // hours

    if (timeDiff < 24) { // Within 24 hours
      return 'temporal';
    } else if (similarity > 0.8) {
      return 'similar';
    } else if (similarity > 0.6) {
      return 'related';
    } else {
      return 'references';
    }
  }

  private calculateConfidence(memory1: MemoryEntity, memory2: MemoryEntity, similarity: number): number {
    // Base confidence on similarity and other factors
    let confidence = similarity;
    
    // Boost confidence if memories are from same persona
    if (memory1.personaId === memory2.personaId) {
      confidence = Math.min(1, confidence + 0.1);
    }
    
    // Boost confidence if memories have overlapping tags
    const tags1 = new Set(memory1.tags || []);
    const tags2 = new Set(memory2.tags || []);
    const commonTags = [...tags1].filter(tag => tags2.has(tag));
    
    if (commonTags.length > 0) {
      confidence = Math.min(1, confidence + (commonTags.length * 0.05));
    }
    
    return confidence;
  }

  private calculateDecayRate(type: MemoryRelationship['type'], strength: number): number {
    // Different relationship types have different decay rates
    const baseDecayRates = {
      'references': 0.01,
      'similar': 0.005,
      'related': 0.007,
      'causal': 0.003,
      'temporal': 0.02
    };
    
    const baseRate = baseDecayRates[type] || 0.01;
    // Stronger relationships decay slower
    return baseRate * (1 - strength * 0.5);
  }

  private isRelationshipDecayed(relationship: MemoryRelationship): boolean {
    const daysSinceCreation = (Date.now() - relationship.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation > this.config.relationshipTtl;
  }

  private sortTraversalResults(
    results: Array<{ memory: MemoryEntity; relationship: MemoryRelationship; distance: number }>,
    sortBy: 'strength' | 'confidence' | 'recency'
  ): void {
    results.sort((a, b) => {
      switch (sortBy) {
        case 'strength':
          return b.relationship.strength - a.relationship.strength;
        case 'confidence':
          return b.relationship.confidence - a.relationship.confidence;
        case 'recency':
          return b.relationship.lastVerified.getTime() - a.relationship.lastVerified.getTime();
        default:
          return 0;
      }
    });
  }

  private async countConnectedComponents(): Promise<number> {
    // Simple connected components algorithm
    const allMemories = await this.databaseManager.getAllActiveMemories();
    const visited = new Set<string>();
    let components = 0;

    for (const memory of allMemories) {
      if (!visited.has(memory.id)) {
        // Start DFS from this memory
        await this.dfsComponent(memory.id, visited);
        components++;
      }
    }

    return components;
  }

  private async dfsComponent(memoryId: string, visited: Set<string>): Promise<void> {
    visited.add(memoryId);
    const relationships = await this.getMemoryRelationships(memoryId);
    
    for (const relationship of relationships) {
      const nextMemoryId = relationship.fromMemoryId === memoryId 
        ? relationship.toMemoryId 
        : relationship.fromMemoryId;
        
      if (!visited.has(nextMemoryId)) {
        await this.dfsComponent(nextMemoryId, visited);
      }
    }
  }

  // Cache management methods
  private addRelationshipToCache(relationship: MemoryRelationship): void {
    const relationships = this.relationshipCache.get(relationship.fromMemoryId) || [];
    relationships.push(relationship);
    this.relationshipCache.set(relationship.fromMemoryId, relationships);
  }

  private updateRelationshipInCache(relationship: MemoryRelationship): void {
    const relationships = this.relationshipCache.get(relationship.fromMemoryId) || [];
    const index = relationships.findIndex(r => r.id === relationship.id);
    if (index >= 0) {
      relationships[index] = relationship;
    }
  }

  private removeRelationshipFromCache(relationshipId: string): void {
    for (const [memoryId, relationships] of this.relationshipCache.entries()) {
      const index = relationships.findIndex(r => r.id === relationshipId);
      if (index >= 0) {
        relationships.splice(index, 1);
        if (relationships.length === 0) {
          this.relationshipCache.delete(memoryId);
        }
        break;
      }
    }
  }

  private async rebuildRelationshipCache(): Promise<void> {
    this.relationshipCache.clear();
    // In a real implementation, this would load from database
    console.log('Relationship cache rebuilt');
  }

  private generateRelationshipId(): string {
    return `rel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getTotalRelationships(): number {
    let total = 0;
    for (const relationships of this.relationshipCache.values()) {
      total += relationships.length;
    }
    return total;
  }

  // Storage methods (placeholders for database integration)
  private async storeRelationship(relationship: MemoryRelationship): Promise<void> {
    // In a real implementation, this would store to database
    console.log(`Storing relationship: ${relationship.id}`);
  }

  private async removeRelationshipFromStorage(relationshipId: string): Promise<void> {
    // In a real implementation, this would remove from database
    console.log(`Removing relationship: ${relationshipId}`);
  }

  async getHealth(): Promise<ServiceHealth> {
    return {
      service: 'MemoryGraphService',
      status: this.isInitialized ? 'ok' : 'initializing',
      details: {
        totalRelationships: this.getTotalRelationships(),
        cacheSize: this.relationshipCache.size,
        lastDecayRun: this.lastDecayRun,
        config: this.config
      }
    };
  }

  private getDefaultConfig(): GraphConfig {
    return {
      maxRelationshipsPerMemory: 20,
      minRelationshipStrength: 0.1,
      strengthDecayRate: 0.01, // 1% per day
      confidenceThreshold: 0.6,
      autoRelationshipThreshold: 0.5, // 50% similarity for auto-creation
      maxTraversalDepth: 5,
      relationshipTtl: 365 // 1 year
    };
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('MemoryGraphService not initialized');
    }
  }
} 