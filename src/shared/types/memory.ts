import { z } from 'zod';

// Memory system types and interfaces

export const MemoryEntitySchema = z.object({
  id: z.string().optional(),
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'audio', 'video', 'file']),
  importance: z.number().min(0).max(100),
  personaId: z.string(),
  tags: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
  lastAccessed: z.date().optional(),
  memoryTier: z.enum(['hot', 'warm', 'cold']).optional(),
});

export interface MemoryEntity extends z.infer<typeof MemoryEntitySchema> {}

export interface MemorySearchResult {
  memories: MemoryEntity[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MemoryHealthInfo {
  totalMemories: number;
  memoryByType: Record<string, number>;
  storageSize: number;
  lastOptimization: Date | null;
}

// =============================================================================
// MEMORY TIER SYSTEM TYPES
// =============================================================================

export type MemoryTier = 'hot' | 'warm' | 'cold';

export interface MemoryTierConfig {
  // Hot tier - Frequently accessed, recent memories
  hot: {
    maxSize: number;           // Maximum number of memories
    accessThreshold: number;   // Access count threshold for staying hot
    ageThreshold: number;      // Days threshold for staying hot
    importanceWeight: number;  // Weight for importance in scoring
  };
  // Warm tier - Moderately accessed, important memories  
  warm: {
    maxSize: number;           // Maximum number of memories
    accessThreshold: number;   // Access count threshold for staying warm
    ageThreshold: number;      // Days threshold for staying warm
    importanceWeight: number;  // Weight for importance in scoring
  };
  // Cold tier - Rarely accessed, archived memories
  cold: {
    compressionEnabled: boolean; // Enable compression for storage
    compressionLevel: number;    // Compression level (1-9)
    encryptionEnabled: boolean;  // Enable encryption at rest
  };
}

export interface MemoryTierMetrics {
  tier: MemoryTier;
  count: number;
  averageImportance: number;
  averageAccessCount: number;
  averageAge: number; // in days
  storageSize: number; // in bytes
  lastOptimized: Date;
}

export interface TierTransition {
  memoryId: string;
  fromTier: MemoryTier;
  toTier: MemoryTier;
  reason: 'access_pattern' | 'importance_change' | 'age_decay' | 'manual' | 'optimization';
  score: number;
  timestamp: Date;
}

export interface MemoryScore {
  memoryId: string;
  accessScore: number;    // Based on frequency and recency
  importanceScore: number; // Based on manual importance rating
  ageScore: number;       // Based on age and decay
  connectionScore: number; // Based on relationships to other memories
  totalScore: number;     // Weighted combination
  recommendedTier: MemoryTier;
}

export interface TierOptimizationResult {
  processed: number;
  transitions: TierTransition[];
  hotTier: MemoryTierMetrics;
  warmTier: MemoryTierMetrics;
  coldTier: MemoryTierMetrics;
  performance: {
    durationMs: number;
    memoryFreed: number;
    compressionRatio: number;
  };
}

// =============================================================================
// MEMORY RELATIONSHIP TYPES (for future relationship graph)
// =============================================================================

export interface MemoryRelationship {
  id: string;
  fromMemoryId: string;
  toMemoryId: string;
  type: 'references' | 'similar' | 'related' | 'causal' | 'temporal';
  strength: number; // 0-1, how strong the relationship is
  confidence: number; // 0-1, how confident we are in this relationship
  createdAt: Date;
  lastVerified: Date;
  decayRate: number; // rate at which relationship strength decays over time
  metadata?: {
    source: 'auto' | 'manual' | 'learned';
    algorithm?: string;
    similarity?: number;
    context?: string;
  };
}

export interface MemoryGraph {
  memories: MemoryEntity[];
  relationships: MemoryRelationship[];
  metadata: {
    totalMemories: number;
    totalRelationships: number;
    averageConnectionsPerMemory: number;
    strongestRelationship: {
      id: string;
      strength: number;
    };
    createdAt: Date;
    lastUpdated: Date;
  };
}

// =============================================================================
// EMBEDDING TYPES (for future vector embeddings)
// =============================================================================

export interface MemoryEmbedding {
  memoryId: string;
  embedding: number[];
  model: string;
  createdAt: Date;
  metadata?: {
    dimensions: number;
    processingTime: number;
    textLength: number;
  };
}

export interface SemanticSearchQuery {
  query: string;
  embedding?: number[];
  filters?: {
    personaId?: string;
    type?: string;
    tier?: MemoryTier;
    minImportance?: number;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  limit?: number;
  threshold?: number; // Similarity threshold
}

export interface SemanticSearchResult extends MemorySearchResult {
  queryEmbedding: number[];
  results: Array<MemoryEntity & {
    similarity: number;
    explanation: string;
  }>;
} 