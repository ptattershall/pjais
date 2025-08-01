import { pipeline, Pipeline, env } from '@xenova/transformers';
import { SecurityEventLogger } from './security-event-logger';
import { 
  MemoryEmbedding, 
  SemanticSearchQuery, 
  SemanticSearchResult,
  MemoryEntity 
} from '../../shared/types/memory';
import { ServiceHealth } from '../../shared/types/system';
import * as crypto from 'crypto';

// Configure transformers for local inference
env.allowLocalModels = true;
env.allowRemoteModels = false; // Privacy-first: no external API calls

interface EmbeddingConfig {
  model: string;
  dimensions: number;
  maxLength: number;
  batchSize: number;
  similarityThreshold: number;
  cacheEnabled: boolean;
  cacheTtl: number; // Time to live in milliseconds
}

interface EmbeddingCache {
  [textHash: string]: {
    embedding: number[];
    timestamp: number;
    model: string;
  };
}

export class EmbeddingService {
  private pipeline: Pipeline | null = null;
  private eventLogger: SecurityEventLogger;
  private config: EmbeddingConfig;
  private isInitialized = false;
  private cache: EmbeddingCache = {};
  private modelVersion = '1.0.0';

  constructor(eventLogger: SecurityEventLogger) {
    this.eventLogger = eventLogger;
    this.config = this.getDefaultConfig();
  }

  async initialize(): Promise<void> {
    console.log('Initializing EmbeddingService with local transformers...');
    
    try {
      // Initialize the sentence transformer pipeline
      this.pipeline = await pipeline(
        'feature-extraction',
        this.config.model,
        { 
          device: 'cpu', // Use CPU for compatibility
          dtype: 'fp32'   // Use float32 for better compatibility
        }
      );

      this.isInitialized = true;
      
      this.eventLogger.log({
        type: 'embedding',
        severity: 'low',
        description: 'EmbeddingService initialized successfully',
        timestamp: new Date(),
        details: { 
          model: this.config.model,
          dimensions: this.config.dimensions,
          cacheEnabled: this.config.cacheEnabled
        }
      });
      
      console.log(`EmbeddingService initialized with model: ${this.config.model}`);
    } catch (error) {
      this.eventLogger.log({
        type: 'embedding',
        severity: 'critical',
        description: 'Failed to initialize EmbeddingService',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down EmbeddingService...');
    this.pipeline = null;
    this.cache = {};
    this.isInitialized = false;
  }

  // =============================================================================
  // TEXT PREPROCESSING
  // =============================================================================

  preprocessText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters but keep punctuation
      .replace(/[^\w\s.,!?;:()\-"']/g, '')
      // Trim whitespace
      .trim()
      // Limit length
      .substring(0, this.config.maxLength);
  }

  private extractTextFromContent(content: any): string {
    if (typeof content === 'string') {
      return content;
    }
    
    if (typeof content === 'object') {
      // Handle different content structures
      if (content.text) return content.text;
      if (content.data) return content.data;
      if (content.content) return content.content;
      
      // Fallback to JSON serialization
      return JSON.stringify(content);
    }
    
    return String(content);
  }

  // =============================================================================
  // EMBEDDING GENERATION
  // =============================================================================

  async generateEmbedding(text: string): Promise<number[]> {
    this.ensureInitialized();
    
    const preprocessedText = this.preprocessText(text);
    if (!preprocessedText) {
      throw new Error('Cannot generate embedding for empty text');
    }

    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = this.getCachedEmbedding(preprocessedText);
      if (cached) {
        this.eventLogger.log({
          type: 'embedding',
          severity: 'low',
          description: 'Embedding retrieved from cache',
          timestamp: new Date(),
          details: { textLength: preprocessedText.length, cached: true }
        });
        return cached;
      }
    }

    try {
      // Generate embedding using the local model
      const output = await this.pipeline!(preprocessedText, {
        pooling: 'mean',
        normalize: true
      });

      // Extract the embedding vector
      let embedding: number[];
      if (Array.isArray(output.data)) {
        embedding = Array.from(output.data);
      } else {
        // Handle different output formats
        embedding = Array.from(output);
      }

      // Validate embedding dimensions
      if (embedding.length !== this.config.dimensions) {
        console.warn(`Expected ${this.config.dimensions} dimensions, got ${embedding.length}`);
      }

      // Cache the result
      if (this.config.cacheEnabled) {
        this.setCachedEmbedding(preprocessedText, embedding);
      }

      this.eventLogger.log({
        type: 'embedding',
        severity: 'low',
        description: 'Embedding generated successfully',
        timestamp: new Date(),
        details: { 
          textLength: preprocessedText.length,
          dimensions: embedding.length,
          cached: false
        }
      });

      return embedding;
    } catch (error) {
      this.eventLogger.log({
        type: 'embedding',
        severity: 'high',
        description: 'Failed to generate embedding',
        timestamp: new Date(),
        details: { 
          textLength: preprocessedText.length,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateMemoryEmbedding(memory: MemoryEntity): Promise<MemoryEmbedding> {
    this.ensureInitialized();
    
    // Extract text from memory content
    const text = this.extractTextFromContent(memory.content);
    const combinedText = `${text} ${memory.tags?.join(' ') || ''}`.trim();
    
    const embedding = await this.generateEmbedding(combinedText);
    
    return {
      memoryId: memory.id!,
      embedding,
      model: this.config.model,
      dimensions: embedding.length,
      createdAt: new Date(),
      version: this.modelVersion
    };
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    this.ensureInitialized();
    
    const embeddings: number[][] = [];
    const batchSize = this.config.batchSize;
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      const batchEmbeddings = await Promise.all(batchPromises);
      embeddings.push(...batchEmbeddings);
    }
    
    return embeddings;
  }

  // =============================================================================
  // SEMANTIC SEARCH
  // =============================================================================

  calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return Math.max(-1, Math.min(1, similarity)); // Clamp to [-1, 1]
  }

  async findSimilarMemories(
    queryEmbedding: number[],
    memories: MemoryEntity[],
    limit: number = 10,
    threshold: number = this.config.similarityThreshold
  ): Promise<Array<MemoryEntity & { similarity: number; explanation: string }>> {
    this.ensureInitialized();
    
    const results: Array<MemoryEntity & { similarity: number; explanation: string }> = [];

    for (const memory of memories) {
      try {
        // Generate embedding for memory if needed
        const memoryText = this.extractTextFromContent(memory.content);
        const memoryEmbedding = await this.generateEmbedding(memoryText);
        
        // Calculate similarity
        const similarity = this.calculateCosineSimilarity(queryEmbedding, memoryEmbedding);
        
        if (similarity >= threshold) {
          results.push({
            ...memory,
            similarity,
            explanation: this.generateSimilarityExplanation(similarity)
          });
        }
      } catch (error) {
        console.warn(`Failed to process memory ${memory.id} for similarity:`, error);
      }
    }

    // Sort by similarity descending and limit results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async performSemanticSearch(
    query: SemanticSearchQuery,
    memories: MemoryEntity[]
  ): Promise<SemanticSearchResult> {
    this.ensureInitialized();
    
    // Generate query embedding if not provided
    let queryEmbedding = query.embedding;
    if (!queryEmbedding) {
      queryEmbedding = await this.generateEmbedding(query.query);
    }

    // Apply filters
    let filteredMemories = memories;
    if (query.filters) {
      filteredMemories = this.applySearchFilters(memories, query.filters);
    }

    // Find similar memories
    const similarMemories = await this.findSimilarMemories(
      queryEmbedding,
      filteredMemories,
      query.limit || 10,
      query.threshold || this.config.similarityThreshold
    );

    this.eventLogger.log({
      type: 'embedding',
      severity: 'low',
      description: 'Semantic search completed',
      timestamp: new Date(),
      details: { 
        queryLength: query.query.length,
        memoryCount: memories.length,
        filteredCount: filteredMemories.length,
        resultsCount: similarMemories.length
      }
    });

    return {
      memories: similarMemories,
      total: similarMemories.length,
      page: 1,
      pageSize: query.limit || 10,
      queryEmbedding,
      results: similarMemories
    };
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private applySearchFilters(
    memories: MemoryEntity[], 
    filters: SemanticSearchQuery['filters']
  ): MemoryEntity[] {
    if (!filters) return memories;

    return memories.filter(memory => {
      if (filters.personaId && memory.personaId !== filters.personaId) {
        return false;
      }
      
      if (filters.type && memory.type !== filters.type) {
        return false;
      }
      
      if (filters.minImportance && memory.importance < filters.minImportance) {
        return false;
      }
      
      if (filters.dateRange) {
        const memoryDate = memory.createdAt || new Date();
        if (filters.dateRange.start && memoryDate < filters.dateRange.start) {
          return false;
        }
        if (filters.dateRange.end && memoryDate > filters.dateRange.end) {
          return false;
        }
      }
      
      return true;
    });
  }

  private generateSimilarityExplanation(similarity: number): string {
    if (similarity >= 0.9) {
      return 'Highly similar content and concepts';
    } else if (similarity >= 0.7) {
      return 'Similar content with related concepts';
    } else if (similarity >= 0.5) {
      return 'Moderately related content';
    } else if (similarity >= 0.3) {
      return 'Loosely related content';
    } else {
      return 'Low similarity';
    }
  }

  // =============================================================================
  // CACHING
  // =============================================================================

  private getCachedEmbedding(text: string): number[] | null {
    const hash = this.hashText(text);
    const cached = this.cache[hash];
    
    if (cached && 
        cached.model === this.config.model &&
        (Date.now() - cached.timestamp) < this.config.cacheTtl) {
      return cached.embedding;
    }
    
    return null;
  }

  private setCachedEmbedding(text: string, embedding: number[]): void {
    const hash = this.hashText(text);
    this.cache[hash] = {
      embedding,
      timestamp: Date.now(),
      model: this.config.model
    };
    
    // Clean old cache entries periodically
    this.cleanCache();
  }

  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  private cleanCache(): void {
    const now = Date.now();
    const expiredKeys = Object.keys(this.cache).filter(
      key => (now - this.cache[key].timestamp) > this.config.cacheTtl
    );
    
    expiredKeys.forEach(key => delete this.cache[key]);
  }

  // =============================================================================
  // CONFIGURATION AND HEALTH
  // =============================================================================

  updateConfig(config: Partial<EmbeddingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  async getHealth(): Promise<ServiceHealth> {
    return {
      service: 'EmbeddingService',
      status: this.isInitialized ? 'ok' : 'initializing',
      details: {
        model: this.config.model,
        dimensions: this.config.dimensions,
        cacheSize: Object.keys(this.cache).length,
        cacheEnabled: this.config.cacheEnabled,
        modelLoaded: this.pipeline !== null,
        version: this.modelVersion
      }
    };
  }

  private getDefaultConfig(): EmbeddingConfig {
    return {
      model: 'Xenova/all-MiniLM-L6-v2', // Lightweight, fast, good quality
      dimensions: 384, // Output dimensions for all-MiniLM-L6-v2
      maxLength: 512,  // Maximum input text length
      batchSize: 16,   // Batch size for processing multiple texts
      similarityThreshold: 0.3, // Minimum similarity for results
      cacheEnabled: true,
      cacheTtl: 1000 * 60 * 60 * 24 // 24 hours cache TTL
    };
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.pipeline) {
      throw new Error('EmbeddingService not initialized');
    }
  }
} 