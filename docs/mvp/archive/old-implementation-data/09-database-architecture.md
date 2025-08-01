# Database Architecture Implementation Plan

## Overview

This plan outlines the foundational database architecture for PajamasWeb AI Hub, focusing on LiveStore implementation with offline-first design, encryption, reactive queries, and performance optimization. The architecture supports real-time data synchronization, secure storage, and efficient querying patterns.

### Integration Points

- **Electron Main Process**: Secure database initialization and management
- **Memory System**: Vector embeddings and relationship storage
- **Memory Steward**: Query optimization and data lifecycle management
- **Security System**: End-to-end encryption and data protection

### User Stories

- As a user, I want my data to be stored securely and available offline
- As a developer, I want reactive queries that automatically update the UI
- As a power user, I want fast semantic search across all my data
- As a privacy-conscious user, I want encrypted storage with local control

## Architecture

### 1.1 LiveStore Foundation Setup

```typescript
// Core LiveStore configuration with encryption and offline-first design
import { LiveStore, createStore } from 'livestore';
import { SQLiteStorage } from 'livestore/storage/sqlite';
import { EncryptionPlugin } from 'livestore/plugins/encryption';

interface DatabaseConfiguration {
  name: string;
  storage: SQLiteStorage;
  encryptionKey: string;
  multiInstance: boolean;
  enableReactivity: boolean;
  cleanupPolicy: CleanupPolicy;
}

class DatabaseManager {
  private store: LiveStore | null = null;
  private encryptionKey: string | null = null;

  async initialize(): Promise<LiveStore> {
    // Generate or retrieve encryption key
    this.encryptionKey = await this.getOrGenerateEncryptionKey();
    
    // Configure encrypted storage
    const sqliteStorage = new SQLiteStorage({
      filename: 'pjais.db',
      encryption: {
        key: this.encryptionKey
      }
    });

    // Create store with security configuration
    this.store = await createStore({
      name: 'pjais',
      storage: sqliteStorage,
      plugins: [
        new EncryptionPlugin({
          key: this.encryptionKey
        })
      ],
      enableReactivity: true,
      cleanupPolicy: {
        minimumDeletedTime: 1000 * 60 * 60 * 24 * 7, // 7 days
        minimumTableAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        runEach: 1000 * 60 * 60 * 12 // every 12 hours
      }
    });

    // Initialize tables
    await this.initializeTables();
    
    // Set up database monitoring
    await this.setupDatabaseMonitoring();

    return this.store;
  }

  private async getOrGenerateEncryptionKey(): Promise<string> {
    // Check for existing key in secure storage
    const existingKey = await this.getStoredEncryptionKey();
    if (existingKey) return existingKey;

    // Generate new encryption key
    const newKey = await this.generateSecureKey();
    await this.storeEncryptionKey(newKey);
    return newKey;
  }

  private async generateSecureKey(): Promise<string> {
    // Use crypto.getRandomValues for secure key generation
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}
```

### 1.2 Collection Schemas

```typescript
// Persona schema with encrypted fields
const personaSchema = {
  title: 'persona schema',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    description: { type: 'string', maxLength: 1000 },
    avatar: { type: 'string' },
    personality: { type: 'object' },
    settings: { type: 'object' },
    memoryConfig: { type: 'object' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    isActive: { type: 'boolean', default: false },
    // Encrypted sensitive data
    privateMemory: { type: 'string' },
    apiKeys: { type: 'string' },
    // Performance optimization
    lastUsed: { type: 'string', format: 'date-time' },
    usageCount: { type: 'number', minimum: 0, default: 0 }
  },
  required: ['id', 'name', 'createdAt'],
  encrypted: ['privateMemory', 'apiKeys'],
  indexes: ['isActive', 'lastUsed', 'createdAt']
};

// Memory entities schema with vector support
const memoryEntitySchema = {
  title: 'memory entity schema',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 100 },
    personaId: { type: 'string', maxLength: 100 },
    type: { 
      type: 'string', 
      enum: ['person', 'concept', 'event', 'task', 'conversation', 'knowledge'] 
    },
    name: { type: 'string', maxLength: 500 },
    content: { type: 'object' },
    summary: { type: 'string', maxLength: 1000 },
    tags: { type: 'array', items: { type: 'string' } },
    importance: { type: 'number', minimum: 0, maximum: 100 },
    lastAccessed: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    // Vector embedding for semantic search
    embedding: { type: 'array', items: { type: 'number' } },
    embeddingModel: { type: 'string' },
    // Memory tier for optimization
    memoryTier: { 
      type: 'string', 
      enum: ['hot', 'warm', 'cold'], 
      default: 'hot' 
    },
    compressionApplied: { type: 'boolean', default: false },
    // Relationship tracking
    connectionCount: { type: 'number', minimum: 0, default: 0 },
    metadata: { type: 'object' }
  },
  required: ['id', 'personaId', 'type', 'name', 'createdAt'],
  indexes: [
    'personaId', 
    'type', 
    'importance', 
    'lastAccessed', 
    'memoryTier',
    ['personaId', 'type'],
    ['personaId', 'importance'],
    ['type', 'lastAccessed']
  ]
};

// Conversation schema for chat history
const conversationSchema = {
  title: 'conversation schema',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 100 },
    personaId: { type: 'string', maxLength: 100 },
    sessionId: { type: 'string', maxLength: 100 },
    messages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          role: { type: 'string', enum: ['user', 'assistant', 'system'] },
          content: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          metadata: { type: 'object' }
        },
        required: ['id', 'role', 'content', 'timestamp']
      }
    },
    summary: { type: 'string' },
    sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
    topics: { type: 'array', items: { type: 'string' } },
    importance: { type: 'number', minimum: 0, maximum: 100 },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    // Archive management
    isArchived: { type: 'boolean', default: false },
    archivedAt: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'personaId', 'sessionId', 'messages', 'createdAt'],
  indexes: [
    'personaId', 
    'sessionId', 
    'createdAt', 
    'importance',
    'isArchived',
    ['personaId', 'createdAt'],
    ['personaId', 'importance']
  ]
};

// Workflow schema for saved workflows
const workflowSchema = {
  title: 'workflow schema',
  version: 0,
  type: 'object',
  primaryKey: 'id',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    description: { type: 'string' },
    personaId: { type: 'string', maxLength: 100 },
    definition: { type: 'object' },
    isTemplate: { type: 'boolean', default: false },
    isPublic: { type: 'boolean', default: false },
    tags: { type: 'array', items: { type: 'string' } },
    executionCount: { type: 'number', minimum: 0, default: 0 },
    lastExecuted: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'name', 'definition', 'createdAt'],
  indexes: ['personaId', 'isTemplate', 'isPublic', 'createdAt', 'lastExecuted']
};
```

### 1.3 Reactive Query Patterns

```typescript
// Service layer with reactive query patterns
class PersonaService {
  constructor(private store: LiveStore) {}

  // Get active personas with real-time updates
  getActivePersonas$() {
    return this.store.table('personas')
      .where({ isActive: true })
      .orderBy('lastUsed', 'desc')
      .watch(); // Returns Observable<PersonaRecord[]>
  }

  // Memory entities for a persona with filtering
  getPersonaMemory$(
    personaId: string, 
    filters: MemoryFilters = {}
  ) {
    let query = this.store.table('memoryEntities')
      .where({ personaId });
    
    if (filters.type) query = query.where({ type: filters.type });
    if (filters.minImportance) query = query.where('importance', '>=', filters.minImportance);
    if (filters.memoryTier) query = query.where({ memoryTier: filters.memoryTier });
    if (filters.dateRange) {
      query = query
        .where('createdAt', '>=', filters.dateRange.start)
        .where('createdAt', '<=', filters.dateRange.end);
    }

    return query
      .orderBy('importance', 'desc')
      .orderBy('lastAccessed', 'desc')
      .limit(filters.limit || 100)
      .watch();
  }

  // Recent conversations with pagination
  getRecentConversations$(
    personaId: string, 
    page = 0, 
    limit = 50
  ) {
    return this.store.table('conversations')
      .where({ 
        personaId,
        isArchived: false
      })
      .orderBy('createdAt', 'desc')
      .offset(page * limit)
      .limit(limit)
      .watch();
  }

  // Search across all content
  searchContent$(query: string, personaId?: string) {
    let searchQuery = this.store.table('memoryEntities')
      .where(row => 
        row.name.toLowerCase().includes(query.toLowerCase()) ||
        row.summary.toLowerCase().includes(query.toLowerCase()) ||
        row.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );

    if (personaId) {
      searchQuery = searchQuery.where({ personaId });
    }

    return searchQuery
      .orderBy('importance', 'desc')
      .limit(50)
      .watch();
  }
}
```

## Implementation Details

### 2.1 Database Initialization & Management

```typescript
class DatabaseService {
  private store: LiveStore | null = null;
  private tables: string[] = [];

  async initializeTables(): Promise<void> {
    if (!this.store) throw new Error('Database not initialized');

    // Create personas table
    await this.store.createTable('personas', {
      schema: personaSchema,
      methods: {
        incrementUsage: function(this: PersonaRecord) {
          return this.update({
            usageCount: this.usageCount + 1,
            lastUsed: new Date().toISOString()
          });
        },
        
        activate: function(this: PersonaRecord) {
          return this.update({ isActive: true });
        },
        
        deactivate: function(this: PersonaRecord) {
          return this.update({ isActive: false });
        }
      }
    });

    // Create memory entities table
    await this.store.createTable('memoryEntities', {
      schema: memoryEntitySchema,
      methods: {
        updateAccess: function(this: MemoryEntityRecord) {
          return this.update({
            lastAccessed: new Date().toISOString()
          });
        },
        
        updateImportance: function(this: MemoryEntityRecord, importance: number) {
          return this.update({ importance });
        },
        
        addConnection: function(this: MemoryEntityRecord) {
          return this.update({ 
            connectionCount: this.connectionCount + 1 
          });
        }
      }
    });

    // Create conversations table
    await this.store.createTable('conversations', {
      schema: conversationSchema,
      methods: {
        addMessage: function(this: ConversationRecord, message: Message) {
          return this.update({
            messages: [...this.messages, message],
            updatedAt: new Date().toISOString()
          });
        },
        
        archive: function(this: ConversationRecord) {
          return this.update({
            isArchived: true,
            archivedAt: new Date().toISOString()
          });
        }
      }
    });

    // Create workflows table
    await this.store.createTable('workflows', {
      schema: workflowSchema,
      methods: {
        execute: function(this: WorkflowRecord) {
          return this.update({
            executionCount: this.executionCount + 1,
            lastExecuted: new Date().toISOString()
          });
        }
      }
    });

    this.tables = ['personas', 'memoryEntities', 'conversations', 'workflows'];
  }

  async setupDatabaseMonitoring(): Promise<void> {
    if (!this.store) return;

    // Monitor table changes
    this.store.onEvent((event) => {
      console.log('Database change:', event);
      
      // Track performance metrics
      this.trackDatabaseMetrics(event);
      
      // Handle cleanup if needed
      if (event.type === 'INSERT') {
        this.scheduleCleanupIfNeeded();
      }
    });

    // Monitor storage usage
    setInterval(async () => {
      await this.checkStorageUsage();
    }, 60000); // Check every minute
  }

  private async trackDatabaseMetrics(event: any): Promise<void> {
    // Implementation for performance tracking
    const metrics = {
      timestamp: new Date().toISOString(),
      operation: event.type,
      table: event.table,
      recordCount: await this.store?.table(event.table)?.count(),
      storageSize: await this.getStorageSize()
    };

    // Store metrics for analysis
    await this.storeMetrics(metrics);
  }
}
```

### 2.2 Query Optimization & Indexing

```typescript
class QueryOptimizer {
  private queryPatterns = new Map<string, QueryPattern>();
  
  constructor(private store: LiveStore) {
    this.startQueryAnalysis();
  }

  async optimizeIndexes(): Promise<void> {
    // Analyze query patterns and create optimal indexes
    const patterns = await this.analyzeQueryPatterns();
    
    for (const pattern of patterns) {
      if (pattern.frequency > 100 && !pattern.hasOptimalIndex) {
        await this.createOptimizedIndex(pattern);
      }
    }
  }

  private async analyzeQueryPatterns(): Promise<QueryPattern[]> {
    // Analyze common query patterns from metrics
    const patterns: QueryPattern[] = [];
    
    // Common persona queries
    patterns.push({
      table: 'personas',
      conditions: { isActive: true },
      frequency: 1000,
      averageTime: 5,
      hasOptimalIndex: true
    });

    patterns.push({
      table: 'memoryEntities',
      conditions: { personaId: '$personaId', type: '$type' },
      frequency: 500,
      averageTime: 15,
      hasOptimalIndex: false
    });

    return patterns;
  }

  // Implement intelligent query caching
  private queryCache = new Map<string, CachedQuery>();

  async cachedQuery<T>(
    table: string, 
    query: any, 
    ttl = 300000 // 5 minutes default
  ): Promise<T[]> {
    const cacheKey = this.generateCacheKey(table, query);
    
    // Check cache first
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < ttl) {
        return cached.result as T[];
      }
    }

    // Execute query
    const result = await this.store.table(table).where(query).exec();
    
    // Cache result
    this.queryCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl
    });

    // Clean up expired cache entries
    this.cleanupExpiredCache();

    return result;
  }

  private generateCacheKey(table: string, query: any): string {
    return `${table}:${JSON.stringify(query)}`;
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.queryCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.queryCache.delete(key);
      }
    }
  }
}
```

### 2.3 Data Migration & Schema Evolution

```typescript
class SchemaMigrationService {
  private migrations = new Map<number, Migration>();

  constructor(private store: LiveStore) {
    this.registerMigrations();
  }

  private registerMigrations(): void {
    // Migration from v0 to v1 - Add lastUsed field to personas
    this.migrations.set(1, {
      version: 1,
      description: 'Add lastUsed and usageCount fields to personas',
      up: async () => {
        const personas = await this.store.table('personas').all();
        for (const persona of personas) {
          await this.store.table('personas').update(persona.id, {
            lastUsed: persona.createdAt,
            usageCount: 0
          });
        }
      },
      down: async () => {
        const personas = await this.store.table('personas').all();
        for (const persona of personas) {
          await this.store.table('personas').update(persona.id, {
            lastUsed: undefined,
            usageCount: undefined
          });
        }
      }
    });

    // Migration v1 to v2 - Add memory tiers
    this.migrations.set(2, {
      version: 2,
      description: 'Add memory tier management',
      up: async () => {
        const memories = await this.store.table('memoryEntities').all();
        for (const memory of memories) {
          const tier = this.calculateInitialTier(memory);
          await this.store.table('memoryEntities').update(memory.id, {
            memoryTier: tier,
            compressionApplied: false
          });
        }
      },
      down: async () => {
        const memories = await this.store.table('memoryEntities').all();
        for (const memory of memories) {
          await this.store.table('memoryEntities').update(memory.id, {
            memoryTier: undefined,
            compressionApplied: undefined
          });
        }
      }
    });
  }

  async migrateSchema(fromVersion: number, toVersion: number): Promise<void> {
    console.log(`Migrating schema from v${fromVersion} to v${toVersion}`);
    
    // Create backup before migration
    await this.createPreMigrationBackup();

    try {
      for (let version = fromVersion + 1; version <= toVersion; version++) {
        const migration = this.migrations.get(version);
        if (migration) {
          console.log(`Running migration v${version}: ${migration.description}`);
          await migration.up();
          await this.updateSchemaVersion(version);
        }
      }
      
      console.log('Schema migration completed successfully');
    } catch (error) {
      console.error('Migration failed, attempting rollback:', error);
      await this.rollbackMigration(fromVersion);
      throw error;
    }
  }

  private async createPreMigrationBackup(): Promise<void> {
    // Create backup before running migrations
    const backup = await this.exportDatabaseData();
    await this.saveBackup(`pre-migration-${Date.now()}.json`, backup);
  }
}
```

## Performance Requirements

### 3.1 Query Performance Targets

| Operation | Target Time | Measurement |
|-----------|-------------|-------------|
| Persona Load | <100ms | Active personas query |
| Memory Search | <200ms | Full-text search across 1000+ items |
| Conversation Load | <150ms | Recent conversations (50 items) |
| Database Init | <2 seconds | Cold start with encryption |

### 3.2 Storage Efficiency

| Metric | Target | Notes |
|--------|--------|-------|
| Storage Growth | <10MB/month | Per active persona |
| Index Overhead | <20% | Of total storage |
| Compression Ratio | >60% | For warm/cold memory |
| Cache Hit Rate | >80% | For frequent queries |

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)

- LiveStore setup with encryption
- Basic schema definitions
- Table initialization
- Security implementation

### Phase 2: Reactive Queries (Weeks 3-4)

- Service layer implementation
- Real-time query patterns
- Caching mechanisms
- Performance optimization

### Phase 3: Advanced Features (Weeks 5-6)

- Query optimization system
- Migration framework
- Monitoring and metrics
- Error handling

### Phase 4: Testing & Validation (Weeks 7-8)

- Performance testing
- Data integrity validation
- Migration testing
- Security auditing

## Testing & Validation

### Database Testing Strategy

- **Unit Tests**: Schema validation, query correctness
- **Integration Tests**: Service layer and reactive patterns
- **Performance Tests**: Query speed and storage efficiency
- **Security Tests**: Encryption and data protection

### Success Metrics

- All performance targets met across operations
- Zero data loss in migration testing
- >99.9% uptime during normal operations
- Full encryption of sensitive data

This comprehensive database architecture provides a solid foundation for PajamasWeb AI Hub's data management needs while ensuring performance, security, and scalability.
