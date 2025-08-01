# Memory System Implementation Plan

## Overview

This plan outlines the hybrid memory architecture for PajamasWeb AI Hub, featuring a three-tier memory system, vector embedding integration for semantic search, and a sophisticated relationship graph for memory connections. The system provides intelligent memory management with automatic optimization.

### Integration Points

- **Database Architecture**: LiveStore tables and schemas for memory storage
- **Memory Steward**: Automated optimization and lifecycle management
- **Vector Search**: Semantic search across memory entities
- **UI Components**: Memory explorer and visualization interfaces

### User Stories

- As a user, I want my AI to remember important information and retrieve it contextually
- As a power user, I want to explore memory relationships and discover hidden connections
- As a researcher, I want semantic search to find relevant memories across different topics
- As a privacy user, I want control over memory retention and deletion policies

## Architecture

### 1.1 Three-Tier Memory Architecture

```typescript
// Hybrid memory system with hot, warm, and cold tiers
interface MemoryArchitecture {
  // Tier 1: Hot Memory (SQLite) - Frequently accessed, always available
  hotMemory: {
    recentConversations: ConversationDocument[];
    activePersonaState: PersonaStateDocument[];
    currentWorkflows: WorkflowDocument[];
    frequentlyAccessedEntities: MemoryEntityDocument[];
    activeRelationships: RelationshipDocument[];
  };
  
  // Tier 2: Warm Memory (Compressed) - Occasionally accessed, quick retrieval
  warmMemory: {
    historicalConversations: CompressedConversationDocument[];
    entityRelationships: RelationshipDocument[];
    memorySnapshots: MemorySnapshotDocument[];
    seasonalKnowledge: SeasonalKnowledgeDocument[];
    projectArchives: ProjectArchiveDocument[];
  };
  
  // Tier 3: Cold Memory (Archived) - Rarely accessed, long-term storage
  coldMemory: {
    archivedSessions: ArchivedSessionDocument[];
    deletedEntities: DeletedEntityDocument[];
    optimizationLogs: OptimizationLogDocument[];
    historicalSnapshots: HistoricalSnapshotDocument[];
    backupArchives: BackupArchiveDocument[];
  };
}

class MemoryTierManager {
  constructor(private db: RxDatabase) {}

  async promoteToHot(entityId: string): Promise<void> {
    const entity = await this.db.memoryEntities.findOne(entityId).exec();
    if (entity) {
      await entity.update({
        $set: {
          memoryTier: 'hot',
          lastAccessed: new Date().toISOString(),
          promotedAt: new Date().toISOString()
        },
        $inc: { accessCount: 1 }
      });
    }
  }

  async demoteToWarm(entityId: string): Promise<void> {
    const entity = await this.db.memoryEntities.findOne(entityId).exec();
    if (entity && entity.memoryTier === 'hot') {
      // Compress content before moving to warm tier
      const compressedContent = await this.compressContent(entity.content);
      
      await entity.update({
        $set: {
          memoryTier: 'warm',
          content: compressedContent,
          compressionApplied: true,
          demotedAt: new Date().toISOString()
        }
      });
    }
  }

  async archiveToCold(entityId: string): Promise<void> {
    const entity = await this.db.memoryEntities.findOne(entityId).exec();
    if (entity) {
      // Create archive record
      await this.db.archivedEntities.insert({
        ...entity.toJSON(),
        originalId: entity.id,
        archivedAt: new Date().toISOString(),
        archiveReason: 'automatic_lifecycle'
      });

      // Remove from active memory
      await entity.remove();
    }
  }

  private async compressContent(content: any): Promise<string> {
    // Use compression algorithm (e.g., LZ-string or similar)
    return JSON.stringify(content); // Simplified for demo
  }
}
```

### 1.2 Vector Embedding Integration

```typescript
// Vector embedding service for semantic search and memory relationships
class EmbeddingService {
  private embeddingModel: EmbeddingModel;
  private embeddingDimensions = 384; // Sentence-transformers dimension

  constructor() {
    this.initializeEmbeddingModel();
  }

  private async initializeEmbeddingModel(): Promise<void> {
    // Initialize local embedding model (sentence-transformers via WASM or ONNX)
    this.embeddingModel = await loadSentenceTransformer({
      model: 'all-MiniLM-L6-v2',
      runtime: 'wasm'
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Generate vector embedding for text content
    const embedding = await this.embeddingModel.encode(text);
    return Array.from(embedding);
  }

  async generateEmbeddingForEntity(entity: MemoryEntity): Promise<number[]> {
    // Combine entity fields for comprehensive embedding
    const combinedText = [
      entity.name,
      entity.summary || '',
      entity.content?.text || '',
      entity.tags?.join(' ') || ''
    ].filter(Boolean).join('. ');

    return await this.generateEmbedding(combinedText);
  }

  async semanticSearch(
    query: string, 
    collection: string, 
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const {
      limit = 10,
      threshold = 0.7,
      personaId,
      memoryTier,
      includeRelated = false
    } = options;

    // Build search selector
    const selector: any = {};
    if (personaId) selector.personaId = personaId;
    if (memoryTier) selector.memoryTier = memoryTier;

    // Perform vector similarity search
    const entities = await this.db[collection]
      .find({ selector })
      .exec();

    // Calculate cosine similarity for each entity
    const results = entities
      .map(entity => ({
        entity,
        similarity: this.cosineSimilarity(queryEmbedding, entity.embedding || [])
      }))
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Include related entities if requested
    if (includeRelated) {
      for (const result of results) {
        result.relatedEntities = await this.findRelatedEntities(
          result.entity.id, 
          2 // max depth
        );
      }
    }

    return results;
  }

  async findSimilarMemories(
    entityId: string, 
    limit = 5
  ): Promise<SimilarMemoryResult[]> {
    const sourceEntity = await this.db.memoryEntities.findOne(entityId).exec();
    if (!sourceEntity || !sourceEntity.embedding) {
      return [];
    }

    return await this.semanticSearch(
      sourceEntity.summary || sourceEntity.name,
      'memoryEntities',
      { 
        limit: limit + 1, // +1 to exclude source entity
        personaId: sourceEntity.personaId 
      }
    ).then(results => 
      results
        .filter(r => r.entity.id !== entityId)
        .slice(0, limit)
    );
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
```

### 1.3 Memory Relationship Graph

```typescript
// Relationship graph system for memory connections
const relationshipSchema = {
  title: 'relationship schema',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 100 },
    fromEntityId: { type: 'string', maxLength: 100 },
    toEntityId: { type: 'string', maxLength: 100 },
    relationshipType: { 
      type: 'string', 
      enum: [
        'caused_by', 'related_to', 'derived_from', 'mentions', 
        'contradicts', 'supports', 'follows', 'precedes',
        'contains', 'part_of', 'similar_to', 'depends_on'
      ]
    },
    strength: { type: 'number', minimum: 0, maximum: 1 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    createdAt: { type: 'string', format: 'date-time' },
    lastReinforced: { type: 'string', format: 'date-time' },
    reinforcementCount: { type: 'number', minimum: 0, default: 1 },
    metadata: { type: 'object' },
    // Automatic decay
    decayRate: { type: 'number', minimum: 0, maximum: 1, default: 0.01 },
    isActive: { type: 'boolean', default: true }
  },
  required: ['id', 'fromEntityId', 'toEntityId', 'relationshipType', 'createdAt'],
  indexes: [
    'fromEntityId', 
    'toEntityId', 
    'relationshipType', 
    'strength',
    ['fromEntityId', 'relationshipType'],
    ['toEntityId', 'relationshipType']
  ]
};

class MemoryGraphService {
  constructor(private db: RxDatabase, private embeddingService: EmbeddingService) {}

  async createRelationship(
    fromId: string, 
    toId: string, 
    type: RelationshipType, 
    strength = 0.5,
    metadata: any = {}
  ): Promise<RelationshipDocument> {
    // Check if relationship already exists
    const existing = await this.db.relationships
      .findOne({
        selector: {
          fromEntityId: fromId,
          toEntityId: toId,
          relationshipType: type
        }
      })
      .exec();

    if (existing) {
      // Reinforce existing relationship
      return await this.reinforceRelationship(existing.id);
    }

    // Create new relationship
    return await this.db.relationships.insert({
      id: generateId(),
      fromEntityId: fromId,
      toEntityId: toId,
      relationshipType: type,
      strength,
      confidence: this.calculateConfidence(fromId, toId, type),
      createdAt: new Date().toISOString(),
      lastReinforced: new Date().toISOString(),
      reinforcementCount: 1,
      metadata,
      decayRate: this.calculateDecayRate(type),
      isActive: true
    });
  }

  async reinforceRelationship(relationshipId: string): Promise<RelationshipDocument> {
    const relationship = await this.db.relationships.findOne(relationshipId).exec();
    if (!relationship) throw new Error('Relationship not found');

    const newStrength = Math.min(1.0, relationship.strength + 0.1);
    
    return await relationship.update({
      $set: {
        strength: newStrength,
        lastReinforced: new Date().toISOString()
      },
      $inc: { reinforcementCount: 1 }
    });
  }

  async getRelatedEntities(
    entityId: string, 
    options: RelationshipTraversalOptions = {}
  ): Promise<RelatedEntityResult[]> {
    const {
      maxDepth = 2,
      minStrength = 0.3,
      relationshipTypes,
      excludeEntityIds = []
    } = options;

    const visited = new Set<string>();
    const queue: TraversalNode[] = [{ id: entityId, depth: 0, path: [] }];
    const related: RelatedEntityResult[] = [];

    while (queue.length > 0) {
      const { id, depth, path } = queue.shift()!;

      if (visited.has(id) || depth >= maxDepth) continue;
      visited.add(id);

      // Find relationships from this entity
      const relationshipSelector: any = {
        $or: [
          { fromEntityId: id },
          { toEntityId: id }
        ],
        strength: { $gte: minStrength },
        isActive: true
      };

      if (relationshipTypes?.length) {
        relationshipSelector.relationshipType = { $in: relationshipTypes };
      }

      const relationships = await this.db.relationships
        .find({ selector: relationshipSelector })
        .exec();

      for (const rel of relationships) {
        const relatedId = rel.fromEntityId === id ? rel.toEntityId : rel.fromEntityId;
        
        if (!visited.has(relatedId) && !excludeEntityIds.includes(relatedId)) {
          // Get the related entity
          const relatedEntity = await this.db.memoryEntities
            .findOne(relatedId)
            .exec();

          if (relatedEntity) {
            queue.push({ 
              id: relatedId, 
              depth: depth + 1, 
              path: [...path, rel.id] 
            });

            related.push({
              entity: relatedEntity,
              relationship: rel,
              depth: depth + 1,
              pathLength: path.length + 1,
              strengthPath: this.calculatePathStrength([...path, rel.id])
            });
          }
        }
      }
    }

    // Sort by relevance (combination of strength and inverse depth)
    return related.sort((a, b) => {
      const scoreA = a.relationship.strength / (a.depth + 1);
      const scoreB = b.relationship.strength / (b.depth + 1);
      return scoreB - scoreA;
    });
  }

  async discoverImplicitRelationships(personaId: string): Promise<ImplicitRelationship[]> {
    // Find entities that are semantically similar but not explicitly connected
    const entities = await this.db.memoryEntities
      .find({
        selector: { personaId, memoryTier: { $in: ['hot', 'warm'] } }
      })
      .exec();

    const implicitRelationships: ImplicitRelationship[] = [];

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entityA = entities[i];
        const entityB = entities[j];

        // Check if explicit relationship already exists
        const hasExplicitRelation = await this.hasRelationship(entityA.id, entityB.id);
        if (hasExplicitRelation) continue;

        // Calculate semantic similarity
        const similarity = this.embeddingService.cosineSimilarity(
          entityA.embedding || [],
          entityB.embedding || []
        );

        if (similarity > 0.8) { // High similarity threshold
          implicitRelationships.push({
            fromEntity: entityA,
            toEntity: entityB,
            similarity,
            suggestedType: this.suggestRelationshipType(entityA, entityB, similarity),
            confidence: similarity
          });
        }
      }
    }

    return implicitRelationships.sort((a, b) => b.similarity - a.similarity);
  }

  private async hasRelationship(entityA: string, entityB: string): Promise<boolean> {
    const count = await this.db.relationships
      .count({
        selector: {
          $or: [
            { fromEntityId: entityA, toEntityId: entityB },
            { fromEntityId: entityB, toEntityId: entityA }
          ],
          isActive: true
        }
      })
      .exec();

    return count > 0;
  }

  private calculateConfidence(fromId: string, toId: string, type: string): number {
    // Calculate confidence based on entity types and relationship type
    // This would be enhanced with ML models in a full implementation
    const baseConfidence = 0.7;
    const typeModifier = this.getTypeConfidenceModifier(type);
    return Math.min(1.0, baseConfidence * typeModifier);
  }

  private calculateDecayRate(type: RelationshipType): number {
    // Different relationship types decay at different rates
    const decayRates = {
      'caused_by': 0.005,    // Very stable
      'related_to': 0.01,    // Moderate decay
      'mentions': 0.02,      // Faster decay
      'similar_to': 0.015,   // Moderate decay
      'contradicts': 0.008,  // Fairly stable
      'supports': 0.008,     // Fairly stable
      'follows': 0.01,       // Moderate decay
      'precedes': 0.01,      // Moderate decay
      'contains': 0.005,     // Very stable
      'part_of': 0.005,      // Very stable
      'depends_on': 0.007,   // Fairly stable
      'derived_from': 0.006  // Stable
    };

    return decayRates[type] || 0.01;
  }
}
```

## Implementation Details

### 2.1 Memory Lifecycle Management

Memory entities progress through a managed lifecycle with automatic tier management, importance calculation, and relationship discovery.

### 2.2 Memory Compression & Storage

Different compression strategies optimize storage for various memory types while preserving essential information and maintaining search capabilities.

### 2.3 Performance Optimization

Access pattern tracking and intelligent caching ensure optimal performance for frequently accessed memories while efficiently managing storage resources.

## Performance Requirements

### Memory System Performance Targets

| Operation | Target Time | Measurement |
|-----------|-------------|-------------|
| Memory Search | <200ms | Semantic search across 1000+ items |
| Relationship Traversal | <100ms | 3-hop graph traversal |
| Tier Promotion | <50ms | Memory tier movement |
| Compression | <500ms | Memory entity compression |

### Storage Efficiency Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Compression Ratio | >60% | For warm/cold memory |
| Search Accuracy | >85% | Semantic search relevance |
| Relationship Precision | >80% | Meaningful connections |
| Storage Growth | <5MB/week | Per active persona |

## Implementation Timeline

### Phase 1: Core Memory System (Weeks 1-2)

- Three-tier memory architecture
- Basic memory entity management
- Tier promotion/demotion logic
- Memory lifecycle foundation

### Phase 2: Vector Integration (Weeks 3-4)

- Embedding service implementation
- Semantic search functionality
- Similarity calculation
- Vector storage optimization

### Phase 3: Relationship Graph (Weeks 5-6)

- Relationship schema and management
- Graph traversal algorithms
- Implicit relationship discovery
- Relationship decay mechanisms

### Phase 4: Advanced Features (Weeks 7-8)

- Memory compression system
- Access pattern optimization
- Performance monitoring
- Integration testing

## Testing & Validation

### Memory System Testing

- **Unit Tests**: Memory operations, vector calculations, relationship logic
- **Integration Tests**: Cross-tier operations, search functionality
- **Performance Tests**: Large-scale memory operations, search speed
- **Memory Tests**: Memory usage patterns, garbage collection

### Success Metrics

- Semantic search accuracy >85% relevance
- Memory tier operations <50ms average
- Relationship traversal <100ms for 3-hop queries
- Storage efficiency >60% compression ratio

This comprehensive memory system provides intelligent, scalable memory management with semantic understanding and relationship awareness for enhanced AI interactions.
