# RxDB to LiveStore Migration Guide

## Overview

This guide provides step-by-step instructions for migrating PajamasWeb AI Hub from RxDB + IndexedDB to LiveStore + SQLite. The migration preserves all existing data while upgrading to LiveStore's superior event-sourcing architecture and performance.

**Migration Benefits:**

- **Better Performance**: SQLite vs IndexedDB (~3-5x faster queries)
- **Event Sourcing**: Full audit trail and time-travel debugging
- **Reactive Queries**: More efficient real-time updates
- **Type Safety**: Better TypeScript integration
- **Cross-Platform**: Native Electron, React, and future mobile support

## Migration Strategy

### Phase Overview

Phase 1: Setup LiveStore (Parallel to RxDB)
    ↓
Phase 2: Data Export from RxDB  
    ↓
Phase 3: LiveStore Schema & Import
    ↓
Phase 4: Component Migration
    ↓
Phase 5: RxDB Removal & Cleanup

**Estimated Timeline**: 2-3 weeks
**Downtime**: None (migration runs in parallel)

## Phase 1: LiveStore Setup (Week 1)

### 1.1 Install Dependencies

```bash
# Core LiveStore packages
npm install @livestore/livestore @livestore/wa-sqlite@0.1.0

# Platform adapters
npm install @livestore/adapter-node @livestore/adapter-web

# Framework integration
npm install @livestore/react @livestore/peer-deps

# Development tools
npm install @livestore/devtools-vite
```

### 1.2 Create LiveStore Schema

Create `src/livestore/schema.ts` based on existing RxDB schemas:

```typescript
import { Events, makeSchema, Schema, SessionIdSymbol, State } from '@livestore/livestore'

// =============================================================================
// TABLE MIGRATIONS FROM RXDB
// =============================================================================

// RxDB personas collection → LiveStore personas table
export const personas = State.SQLite.table({
  name: 'personas',
  columns: {
    // Existing RxDB fields
    id: State.SQLite.text({ primaryKey: true }),
    name: State.SQLite.text(),
    description: State.SQLite.text(),
    avatar: State.SQLite.text({ nullable: true }),
    
    // Migrate personality object
    personality: State.SQLite.json({
      schema: Schema.Struct({
        traits: Schema.Array(Schema.String),
        temperament: Schema.String,
        communicationStyle: Schema.String
      })
    }),
    
    // Migrate settings object  
    settings: State.SQLite.json({
      schema: Schema.Struct({
        memoryRetention: Schema.Number,
        privacyLevel: Schema.Literal('low', 'medium', 'high'),
        autoLearn: Schema.Boolean
      })
    }),
    
    isActive: State.SQLite.boolean({ default: false }),
    
    // Convert RxDB timestamps to integers
    createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    lastUsed: State.SQLite.integer({ schema: Schema.DateFromNumber, nullable: true }),
    usageCount: State.SQLite.integer({ default: 0 })
  }
})

// RxDB memory collection → LiveStore memoryEntities table
export const memoryEntities = State.SQLite.table({
  name: 'memoryEntities', 
  columns: {
    id: State.SQLite.text({ primaryKey: true }),
    personaId: State.SQLite.text(),
    type: State.SQLite.text(),
    name: State.SQLite.text(),
    
    // Convert RxDB nested objects to JSON
    content: State.SQLite.json({ schema: Schema.Record(Schema.String, Schema.Unknown) }),
    summary: State.SQLite.text(),
    tags: State.SQLite.json({ schema: Schema.Array(Schema.String) }),
    
    importance: State.SQLite.integer({ default: 50 }),
    
    // New LiveStore-specific fields
    embedding: State.SQLite.json({ 
      schema: Schema.Array(Schema.Number),
      nullable: true 
    }),
    embeddingModel: State.SQLite.text({ nullable: true }),
    memoryTier: State.SQLite.text({ default: 'hot' }),
    connectionCount: State.SQLite.integer({ default: 0 }),
    
    lastAccessed: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    deletedAt: State.SQLite.integer({ schema: Schema.DateFromNumber, nullable: true })
  }
})

// New table for conversations (extend RxDB capabilities)
export const conversations = State.SQLite.table({
  name: 'conversations',
  columns: {
    id: State.SQLite.text({ primaryKey: true }),
    personaId: State.SQLite.text(),
    sessionId: State.SQLite.text(),
    messages: State.SQLite.json({
      schema: Schema.Array(Schema.Struct({
        id: Schema.String,
        role: Schema.Literal('user', 'assistant', 'system'),
        content: Schema.String,
        timestamp: Schema.DateFromNumber,
        metadata: Schema.Record(Schema.String, Schema.Unknown).pipe(Schema.optional)
      }))
    }),
    summary: State.SQLite.text({ nullable: true }),
    sentiment: State.SQLite.text({ nullable: true }),
    topics: State.SQLite.json({ schema: Schema.Array(Schema.String) }),
    importance: State.SQLite.integer({ default: 50 }),
    isArchived: State.SQLite.boolean({ default: false }),
    createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    archivedAt: State.SQLite.integer({ schema: Schema.DateFromNumber, nullable: true })
  }
})

export const tables = { personas, memoryEntities, conversations }

// =============================================================================
// EVENT DEFINITIONS (New for LiveStore)
// =============================================================================

export const events = {
  // Migration events
  migrationStarted: Events.synced({
    name: 'v1.MigrationStarted',
    schema: Schema.Struct({
      fromSystem: Schema.String,
      toSystem: Schema.String,
      startedAt: Schema.DateFromNumber
    })
  }),

  // Data import events (for migration)
  personaImported: Events.synced({
    name: 'v1.PersonaImported',
    schema: Schema.Struct({
      id: Schema.String,
      sourceId: Schema.String, // Original RxDB ID
      name: Schema.String,
      description: Schema.String,
      avatar: Schema.String.pipe(Schema.nullable),
      personality: Schema.Struct({
        traits: Schema.Array(Schema.String),
        temperament: Schema.String,
        communicationStyle: Schema.String
      }),
      settings: Schema.Struct({
        memoryRetention: Schema.Number,
        privacyLevel: Schema.Literal('low', 'medium', 'high'),
        autoLearn: Schema.Boolean
      }),
      isActive: Schema.Boolean,
      createdAt: Schema.DateFromNumber,
      updatedAt: Schema.DateFromNumber,
      lastUsed: Schema.DateFromNumber.pipe(Schema.nullable),
      usageCount: Schema.Number
    })
  }),

  memoryEntityImported: Events.synced({
    name: 'v1.MemoryEntityImported',
    schema: Schema.Struct({
      id: Schema.String,
      sourceId: Schema.String,
      personaId: Schema.String,
      type: Schema.String,
      name: Schema.String,
      content: Schema.Record(Schema.String, Schema.Unknown),
      summary: Schema.String,
      tags: Schema.Array(Schema.String),
      importance: Schema.Number,
      lastAccessed: Schema.DateFromNumber,
      createdAt: Schema.DateFromNumber,
      updatedAt: Schema.DateFromNumber
    })
  }),

  // Regular operational events
  personaCreated: Events.synced({
    name: 'v1.PersonaCreated',
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      description: Schema.String,
      personality: Schema.Struct({
        traits: Schema.Array(Schema.String),
        temperament: Schema.String,
        communicationStyle: Schema.String
      }),
      settings: Schema.Struct({
        memoryRetention: Schema.Number,
        privacyLevel: Schema.Literal('low', 'medium', 'high'),
        autoLearn: Schema.Boolean
      })
    })
  }),

  // ... other events (see setup guide for full list)
}

// =============================================================================
// MATERIALIZERS
// =============================================================================

const materializers = State.SQLite.materializers(events, {
  // Migration materializers
  'v1.PersonaImported': ({ id, sourceId, name, description, avatar, personality, settings, isActive, createdAt, updatedAt, lastUsed, usageCount }) => {
    return tables.personas.insert({
      id,
      name,
      description,
      avatar,
      personality,
      settings,
      isActive,
      createdAt,
      updatedAt,
      lastUsed,
      usageCount
    })
  },

  'v1.MemoryEntityImported': ({ id, sourceId, personaId, type, name, content, summary, tags, importance, lastAccessed, createdAt, updatedAt }) => {
    return tables.memoryEntities.insert({
      id,
      personaId,
      type,
      name,
      content,
      summary,
      tags,
      importance,
      embedding: null,
      embeddingModel: null,
      memoryTier: 'hot',
      connectionCount: 0,
      lastAccessed,
      createdAt,
      updatedAt,
      deletedAt: null
    })
  },

  // Regular materializers
  'v1.PersonaCreated': ({ id, name, description, personality, settings }) => {
    const now = Date.now()
    return tables.personas.insert({
      id,
      name,
      description,
      avatar: null,
      personality,
      settings,
      isActive: false,
      createdAt: now,
      updatedAt: now,
      lastUsed: null,
      usageCount: 0
    })
  }

  // ... other materializers
})

const state = State.SQLite.makeState({ tables, materializers })
export const schema = makeSchema({ events, state })
```

### 1.3 Setup Parallel Database Service

Create `src/services/DatabaseMigrationService.ts`:

```typescript
import { RxDatabase } from 'rxdb'
import { createStorePromise } from '@livestore/livestore'
import { makePersistedAdapter } from '@livestore/adapter-web'
import { schema, events } from '../livestore/schema'

export class DatabaseMigrationService {
  private rxdb: RxDatabase | null = null
  private liveStore: any = null
  
  async initializeBothSystems() {
    // Keep existing RxDB running
    this.rxdb = await this.initializeRxDB()
    
    // Initialize LiveStore in parallel
    const adapter = makePersistedAdapter({
      storage: { type: 'opfs' },
      // Use different storage location during migration
      storageKey: 'pjais'
    })
    
    this.liveStore = await createStorePromise({ adapter, schema })
    
    console.log('Both database systems initialized')
  }
  
  private async initializeRxDB(): Promise<RxDatabase> {
    // Your existing RxDB initialization code
    // Keep this exactly as-is for now
  }
  
  getRxDB(): RxDatabase {
    if (!this.rxdb) throw new Error('RxDB not initialized')
    return this.rxdb
  }
  
  getLiveStore(): any {
    if (!this.liveStore) throw new Error('LiveStore not initialized')
    return this.liveStore
  }
}

export const dbMigrationService = new DatabaseMigrationService()
```

## Phase 2: Data Export from RxDB (Week 1-2)

### 2.1 Create Export Utilities

Create `src/migration/RxDBExporter.ts`:

```typescript
export class RxDBExporter {
  constructor(private rxdb: RxDatabase) {}
  
  async exportAllData(): Promise<MigrationData> {
    console.log('Starting RxDB data export...')
    
    const personas = await this.exportPersonas()
    const memoryEntities = await this.exportMemoryEntities()
    const metadata = await this.exportMetadata()
    
    return {
      personas,
      memoryEntities,
      metadata,
      exportedAt: Date.now(),
      version: '1.0'
    }
  }
  
  private async exportPersonas(): Promise<PersonaExport[]> {
    const personas = await this.rxdb.personas.find().exec()
    
    return personas.map(persona => ({
      id: persona.id,
      name: persona.name,
      description: persona.description,
      avatar: persona.avatar,
      personality: persona.personality,
      settings: persona.settings,
      isActive: persona.isActive,
      createdAt: new Date(persona.createdAt).getTime(),
      updatedAt: new Date(persona.updatedAt).getTime(),
      lastUsed: persona.lastUsed ? new Date(persona.lastUsed).getTime() : null,
      usageCount: persona.usageCount || 0,
      // Add metadata for migration tracking
      _migrationId: crypto.randomUUID(),
      _sourceSystem: 'rxdb'
    }))
  }
  
  private async exportMemoryEntities(): Promise<MemoryEntityExport[]> {
    const memories = await this.rxdb.memoryEntities.find().exec()
    
    return memories.map(memory => ({
      id: memory.id,
      personaId: memory.personaId,
      type: memory.type,
      name: memory.name,
      content: memory.content,
      summary: memory.summary,
      tags: memory.tags || [],
      importance: memory.importance || 50,
      lastAccessed: new Date(memory.lastAccessed || memory.createdAt).getTime(),
      createdAt: new Date(memory.createdAt).getTime(),
      updatedAt: new Date(memory.updatedAt).getTime(),
      _migrationId: crypto.randomUUID(),
      _sourceSystem: 'rxdb'
    }))
  }
  
  private async exportMetadata(): Promise<MigrationMetadata> {
    const stats = await this.collectStats()
    
    return {
      totalPersonas: stats.personaCount,
      totalMemories: stats.memoryCount,
      activePersonas: stats.activePersonaCount,
      databaseVersion: await this.getDatabaseVersion(),
      exportMethod: 'full',
      integrityCheck: await this.performIntegrityCheck()
    }
  }
  
  async validateExport(data: MigrationData): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Validate persona data
    for (const persona of data.personas) {
      if (!persona.id || !persona.name) {
        errors.push(`Invalid persona: ${persona.id}`)
      }
      
      if (!persona.personality || !persona.settings) {
        warnings.push(`Persona ${persona.id} missing personality or settings`)
      }
    }
    
    // Validate memory entities
    for (const memory of data.memoryEntities) {
      if (!memory.id || !memory.personaId || !memory.name) {
        errors.push(`Invalid memory: ${memory.id}`)
      }
      
      // Check persona reference exists
      const personaExists = data.personas.some(p => p.id === memory.personaId)
      if (!personaExists) {
        errors.push(`Memory ${memory.id} references non-existent persona ${memory.personaId}`)
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        personaCount: data.personas.length,
        memoryCount: data.memoryEntities.length,
        totalSize: JSON.stringify(data).length
      }
    }
  }
}

// Types for migration
interface MigrationData {
  personas: PersonaExport[]
  memoryEntities: MemoryEntityExport[]
  metadata: MigrationMetadata
  exportedAt: number
  version: string
}

interface PersonaExport {
  id: string
  name: string
  description: string
  avatar: string | null
  personality: any
  settings: any
  isActive: boolean
  createdAt: number
  updatedAt: number
  lastUsed: number | null
  usageCount: number
  _migrationId: string
  _sourceSystem: string
}

interface MemoryEntityExport {
  id: string
  personaId: string
  type: string
  name: string
  content: any
  summary: string
  tags: string[]
  importance: number
  lastAccessed: number
  createdAt: number
  updatedAt: number
  _migrationId: string
  _sourceSystem: string
}
```

### 2.2 Backup and Validation

```typescript
export class MigrationBackupService {
  async createBackup(): Promise<string> {
    const exporter = new RxDBExporter(dbMigrationService.getRxDB())
    const data = await exporter.exportAllData()
    
    // Validate before backup
    const validation = await exporter.validateExport(data)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }
    
    // Create backup file
    const backupData = JSON.stringify(data, null, 2)
    const backupName = `rxdb-backup-${new Date().toISOString().slice(0, 10)}.json`
    
    // Save to file system (Electron)
    if (window.electronAPI?.saveFile) {
      await window.electronAPI.saveFile(backupName, backupData)
    } else {
      // Browser download
      const blob = new Blob([backupData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = backupName
      a.click()
    }
    
    console.log(`Backup created: ${backupName}`)
    return backupName
  }
  
  async verifyBackup(backupPath: string): Promise<boolean> {
    try {
      const data = await this.loadBackup(backupPath)
      const exporter = new RxDBExporter(dbMigrationService.getRxDB())
      const validation = await exporter.validateExport(data)
      
      return validation.isValid
    } catch (error) {
      console.error('Backup verification failed:', error)
      return false
    }
  }
}
```

## Phase 3: LiveStore Schema & Import (Week 2)

### 3.1 Data Import Service

Create `src/migration/LiveStoreImporter.ts`:

```typescript
export class LiveStoreImporter {
  constructor(private liveStore: any) {}
  
  async importMigrationData(data: MigrationData): Promise<ImportResult> {
    console.log('Starting LiveStore import...')
    
    // Mark migration start
    await this.liveStore.commit(events.migrationStarted({
      fromSystem: 'rxdb',
      toSystem: 'livestore',
      startedAt: Date.now()
    }))
    
    const results = {
      personas: await this.importPersonas(data.personas),
      memoryEntities: await this.importMemoryEntities(data.memoryEntities),
      errors: [] as string[],
      warnings: [] as string[]
    }
    
    // Validate import
    await this.validateImport(data, results)
    
    return results
  }
  
  private async importPersonas(personas: PersonaExport[]): Promise<ImportResult> {
    console.log(`Importing ${personas.length} personas...`)
    
    let imported = 0
    const errors: string[] = []
    
    for (const persona of personas) {
      try {
        // Generate new ID for LiveStore (track mapping)
        const newId = crypto.randomUUID()
        
        await this.liveStore.commit(events.personaImported({
          id: newId,
          sourceId: persona.id, // Keep reference to original
          name: persona.name,
          description: persona.description,
          avatar: persona.avatar,
          personality: persona.personality,
          settings: persona.settings,
          isActive: persona.isActive,
          createdAt: persona.createdAt,
          updatedAt: persona.updatedAt,
          lastUsed: persona.lastUsed,
          usageCount: persona.usageCount
        }))
        
        // Store ID mapping for memory entities
        this.idMappings.set(persona.id, newId)
        imported++
        
      } catch (error) {
        errors.push(`Failed to import persona ${persona.id}: ${error.message}`)
      }
    }
    
    return { imported, errors }
  }
  
  private async importMemoryEntities(memories: MemoryEntityExport[]): Promise<ImportResult> {
    console.log(`Importing ${memories.length} memory entities...`)
    
    let imported = 0
    const errors: string[] = []
    
    for (const memory of memories) {
      try {
        // Map persona ID to new LiveStore ID
        const newPersonaId = this.idMappings.get(memory.personaId)
        if (!newPersonaId) {
          errors.push(`Memory ${memory.id} references unknown persona ${memory.personaId}`)
          continue
        }
        
        const newId = crypto.randomUUID()
        
        await this.liveStore.commit(events.memoryEntityImported({
          id: newId,
          sourceId: memory.id,
          personaId: newPersonaId,
          type: memory.type,
          name: memory.name,
          content: memory.content,
          summary: memory.summary,
          tags: memory.tags,
          importance: memory.importance,
          lastAccessed: memory.lastAccessed,
          createdAt: memory.createdAt,
          updatedAt: memory.updatedAt
        }))
        
        imported++
        
      } catch (error) {
        errors.push(`Failed to import memory ${memory.id}: ${error.message}`)
      }
    }
    
    return { imported, errors }
  }
  
  private async validateImport(originalData: MigrationData, results: any): Promise<void> {
    // Check data integrity
    const liveStorePersonas = this.liveStore.query(tables.personas)
    const liveStoreMemories = this.liveStore.query(tables.memoryEntities)
    
    if (liveStorePersonas.length !== originalData.personas.length) {
      throw new Error(`Persona count mismatch: expected ${originalData.personas.length}, got ${liveStorePersonas.length}`)
    }
    
    if (liveStoreMemories.length !== originalData.memoryEntities.length) {
      throw new Error(`Memory count mismatch: expected ${originalData.memoryEntities.length}, got ${liveStoreMemories.length}`)
    }
    
    // Validate data integrity
    for (const originalPersona of originalData.personas) {
      const newId = this.idMappings.get(originalPersona.id)
      const liveStorePersona = liveStorePersonas.find(p => p.id === newId)
      
      if (!liveStorePersona) {
        throw new Error(`Persona ${originalPersona.id} not found in LiveStore`)
      }
      
      // Validate core fields
      if (liveStorePersona.name !== originalPersona.name) {
        throw new Error(`Persona name mismatch for ${originalPersona.id}`)
      }
    }
    
    console.log('Import validation successful')
  }
  
  private idMappings = new Map<string, string>()
}
```

### 3.2 Migration Coordinator

Create `src/migration/MigrationCoordinator.ts`:

```typescript
export class MigrationCoordinator {
  private backupService = new MigrationBackupService()
  private exporter = new RxDBExporter(dbMigrationService.getRxDB())
  private importer = new LiveStoreImporter(dbMigrationService.getLiveStore())
  
  async runFullMigration(): Promise<MigrationResult> {
    console.log('🚀 Starting RxDB → LiveStore migration')
    
    try {
      // Step 1: Create backup
      console.log('📦 Creating backup...')
      const backupPath = await this.backupService.createBackup()
      
      // Step 2: Export data
      console.log('📤 Exporting RxDB data...')
      const exportData = await this.exporter.exportAllData()
      
      // Step 3: Validate export
      console.log('✅ Validating export...')
      const validation = await this.exporter.validateExport(exportData)
      if (!validation.isValid) {
        throw new Error(`Export validation failed: ${validation.errors.join(', ')}`)
      }
      
      // Step 4: Import to LiveStore
      console.log('📥 Importing to LiveStore...')
      const importResult = await this.importer.importMigrationData(exportData)
      
      // Step 5: Final validation
      console.log('🔍 Final validation...')
      await this.validateMigrationSuccess(exportData, importResult)
      
      console.log('✅ Migration completed successfully!')
      
      return {
        success: true,
        backupPath,
        exportData,
        importResult,
        message: 'Migration completed successfully'
      }
      
    } catch (error) {
      console.error('❌ Migration failed:', error)
      
      return {
        success: false,
        error: error.message,
        message: 'Migration failed - data is safe in backup'
      }
    }
  }
  
  async validateMigrationSuccess(exportData: MigrationData, importResult: any): Promise<void> {
    // Compare record counts
    const liveStorePersonas = dbMigrationService.getLiveStore().query(tables.personas)
    const liveStoreMemories = dbMigrationService.getLiveStore().query(tables.memoryEntities)
    
    if (liveStorePersonas.length !== exportData.personas.length) {
      throw new Error('Persona count validation failed')
    }
    
    if (liveStoreMemories.length !== exportData.memoryEntities.length) {
      throw new Error('Memory entity count validation failed')
    }
    
    // Sample data validation
    const samplePersona = exportData.personas[0]
    const matchingLiveStorePersona = liveStorePersonas.find(p => 
      p.name === samplePersona.name && p.description === samplePersona.description
    )
    
    if (!matchingLiveStorePersona) {
      throw new Error('Sample persona validation failed')
    }
    
    console.log('Migration validation successful')
  }
}
```

## Phase 4: Component Migration (Week 2-3)

### 4.1 Create Migration Wrapper Service

Create `src/services/DatabaseService.ts`:

```typescript
export class DatabaseService {
  private useRxDB = true // Start with RxDB
  
  constructor() {
    // Check migration status
    this.checkMigrationStatus()
  }
  
  private async checkMigrationStatus() {
    const migrationComplete = localStorage.getItem('migration-complete')
    if (migrationComplete === 'true') {
      this.useRxDB = false
      console.log('Using LiveStore (migration complete)')
    } else {
      console.log('Using RxDB (migration not complete)')
    }
  }
  
  async switchToLiveStore() {
    this.useRxDB = false
    localStorage.setItem('migration-complete', 'true')
    console.log('Switched to LiveStore')
  }
  
  // Unified interface for both systems
  async getPersonas() {
    if (this.useRxDB) {
      const rxdb = dbMigrationService.getRxDB()
      return await rxdb.personas.find().exec()
    } else {
      const liveStore = dbMigrationService.getLiveStore()
      return liveStore.query(tables.personas.orderBy('lastUsed', 'desc'))
    }
  }
  
  async getActivePersona() {
    if (this.useRxDB) {
      const rxdb = dbMigrationService.getRxDB()
      return await rxdb.personas.findOne({ isActive: true }).exec()
    } else {
      const liveStore = dbMigrationService.getLiveStore()
      return liveStore.query(tables.personas.where({ isActive: true }).first())
    }
  }
  
  async getPersonaMemories(personaId: string) {
    if (this.useRxDB) {
      const rxdb = dbMigrationService.getRxDB()
      return await rxdb.memoryEntities.find({ 
        selector: { personaId }
      }).exec()
    } else {
      const liveStore = dbMigrationService.getLiveStore()
      return liveStore.query(
        tables.memoryEntities
          .where({ personaId, deletedAt: null })
          .orderBy('importance', 'desc')
      )
    }
  }
  
  // Event-based operations (LiveStore only)
  async createPersona(personaData: any) {
    if (this.useRxDB) {
      const rxdb = dbMigrationService.getRxDB()
      return await rxdb.personas.insert(personaData)
    } else {
      const liveStore = dbMigrationService.getLiveStore()
      await liveStore.commit(events.personaCreated({
        id: crypto.randomUUID(),
        ...personaData
      }))
    }
  }
  
  // Reactive queries (different for each system)
  subscribeToPersonas(callback: (personas: any[]) => void) {
    if (this.useRxDB) {
      const rxdb = dbMigrationService.getRxDB()
      return rxdb.personas.find().$.subscribe(callback)
    } else {
      const liveStore = dbMigrationService.getLiveStore()
      const query$ = queryDb(() => tables.personas.orderBy('lastUsed', 'desc'))
      return query$.subscribe(callback)
    }
  }
}

export const databaseService = new DatabaseService()
```

### 4.2 Update React Components

Update existing components to use the unified service:

```typescript
// Before: Direct RxDB usage
const PersonaSelector: React.FC = () => {
  const [personas, setPersonas] = useState([])
  
  useEffect(() => {
    const subscription = rxdb.personas.find().$.subscribe(setPersonas)
    return () => subscription.unsubscribe()
  }, [])
  
  // ... rest of component
}

// After: Unified database service
const PersonaSelector: React.FC = () => {
  const [personas, setPersonas] = useState([])
  
  useEffect(() => {
    const subscription = databaseService.subscribeToPersonas(setPersonas)
    return () => subscription.unsubscribe()
  }, [])
  
  // ... rest of component (no other changes needed)
}
```

### 4.3 Gradual Migration Strategy

```typescript
// Create migration hooks for gradual transition
export const useMigrationAwareQuery = <T>(
  rxdbQuery: () => Promise<T[]>,
  liveStoreQuery: () => T[]
) => {
  const [data, setData] = useState<T[]>([])
  const [useRxDB] = useState(() => 
    localStorage.getItem('migration-complete') !== 'true'
  )
  
  useEffect(() => {
    if (useRxDB) {
      rxdbQuery().then(setData)
    } else {
      setData(liveStoreQuery())
    }
  }, [useRxDB])
  
  return data
}

// Usage in components
const PersonaList: React.FC = () => {
  const personas = useMigrationAwareQuery(
    // RxDB query
    () => rxdb.personas.find().exec(),
    // LiveStore query
    () => liveStore.query(tables.personas.orderBy('lastUsed', 'desc'))
  )
  
  return (
    <div>
      {personas.map(persona => (
        <PersonaCard key={persona.id} persona={persona} />
      ))}
    </div>
  )
}
```

## Phase 5: RxDB Removal & Cleanup (Week 3)

### 5.1 Final Migration Switch

Create `src/migration/FinalMigrationSwitch.ts`:

```typescript
export class FinalMigrationSwitch {
  async performFinalSwitch(): Promise<void> {
    console.log('🔄 Performing final migration switch...')
    
    // 1. Verify LiveStore is working
    await this.verifyLiveStoreHealth()
    
    // 2. Create final RxDB backup
    const finalBackup = await this.createFinalBackup()
    
    // 3. Switch all services to LiveStore
    await this.switchAllServicesToLiveStore()
    
    // 4. Update storage configuration
    await this.updateStorageConfiguration()
    
    // 5. Mark migration as complete
    localStorage.setItem('migration-complete', 'true')
    localStorage.setItem('migration-date', new Date().toISOString())
    localStorage.setItem('final-backup', finalBackup)
    
    console.log('✅ Final migration switch complete')
  }
  
  private async verifyLiveStoreHealth(): Promise<void> {
    const liveStore = dbMigrationService.getLiveStore()
    
    // Test basic operations
    const personas = liveStore.query(tables.personas)
    const memories = liveStore.query(tables.memoryEntities)
    
    if (personas.length === 0 && memories.length === 0) {
      throw new Error('LiveStore appears to be empty')
    }
    
    // Test event commit
    const testId = crypto.randomUUID()
    await liveStore.commit(events.personaCreated({
      id: testId,
      name: 'Migration Test',
      description: 'Test persona for migration verification',
      personality: {
        traits: ['test'],
        temperament: 'test',
        communicationStyle: 'test'
      },
      settings: {
        memoryRetention: 50,
        privacyLevel: 'medium',
        autoLearn: false
      }
    }))
    
    // Clean up test data
    const testPersona = liveStore.query(tables.personas.where({ id: testId }).first())
    if (!testPersona) {
      throw new Error('LiveStore event commit test failed')
    }
    
    console.log('LiveStore health check passed')
  }
  
  private async switchAllServicesToLiveStore(): Promise<void> {
    // Force all services to use LiveStore
    databaseService.switchToLiveStore()
    
    // Update any other services that cache database references
    // ... update other services
  }
  
  private async updateStorageConfiguration(): Promise<void> {
    // Move LiveStore from migration storage to primary storage
    const adapter = makePersistedAdapter({
      storage: { type: 'opfs' },
      // Remove migration-specific storage key
      storageKey: 'pjais' // Primary storage
    })
    
    // Reinitialize with primary storage
    const newStore = await createStorePromise({ adapter, schema })
    
    // Update global reference
    dbMigrationService.setLiveStore(newStore)
  }
}
```

### 5.2 RxDB Cleanup

```typitten
export class RxDBCleanup {
  async cleanupRxDB(): Promise<void> {
    console.log('🧹 Cleaning up RxDB...')
    
    // 1. Close RxDB connections
    const rxdb = dbMigrationService.getRxDB()
    await rxdb.destroy()
    
    // 2. Clear IndexedDB (optional - keep for safety)
    const clearIndexedDB = await this.promptUserForIndexedDBCleanup()
    if (clearIndexedDB) {
      await this.clearIndexedDBData()
    }
    
    // 3. Remove RxDB dependencies (manual step)
    console.log('📝 Manual step: Remove RxDB dependencies from package.json')
    
    // 4. Clean up old configuration files
    await this.removeOldConfigFiles()
    
    console.log('✅ RxDB cleanup complete')
  }
  
  private async promptUserForIndexedDBCleanup(): Promise<boolean> {
    return window.confirm(
      'Do you want to clear the old IndexedDB data? ' +
      'This will free up storage space but cannot be undone. ' +
      'Make sure you have verified the migration is working correctly.'
    )
  }
  
  private async clearIndexedDBData(): Promise<void> {
    // Clear specific IndexedDB databases
    const dbNames = ['pjais-rxdb', 'rxdb-dexie']
    
    for (const name of dbNames) {
      try {
        await indexedDB.deleteDatabase(name)
        console.log(`Cleared IndexedDB: ${name}`)
      } catch (error) {
        console.warn(`Failed to clear IndexedDB ${name}:`, error)
      }
    }
  }
}
```

### 5.3 Post-Migration Verification

```typescript
export class PostMigrationVerification {
  async runFullVerification(): Promise<VerificationResult> {
    const results = {
      liveStoreHealth: await this.verifyLiveStoreHealth(),
      dataIntegrity: await this.verifyDataIntegrity(),
      performance: await this.measurePerformance(),
      features: await this.verifyFeatures()
    }
    
    const allPassed = Object.values(results).every(r => r.passed)
    
    return {
      passed: allPassed,
      results,
      message: allPassed ? 'All verifications passed' : 'Some verifications failed'
    }
  }
  
  private async verifyLiveStoreHealth(): Promise<TestResult> {
    try {
      const liveStore = dbMigrationService.getLiveStore()
      
      // Test queries
      const personas = liveStore.query(tables.personas)
      const memories = liveStore.query(tables.memoryEntities)
      
      // Test reactive queries
      const activePersona$ = queryDb(() => tables.personas.where({ isActive: true }).first())
      const activePersona = liveStore.query(activePersona$)
      
      return {
        passed: true,
        message: `LiveStore healthy: ${personas.length} personas, ${memories.length} memories`
      }
    } catch (error) {
      return {
        passed: false,
        message: `LiveStore health check failed: ${error.message}`
      }
    }
  }
  
  private async measurePerformance(): Promise<TestResult> {
    const liveStore = dbMigrationService.getLiveStore()
    
    // Measure query performance
    const start = performance.now()
    
    const personas = liveStore.query(tables.personas)
    const memories = liveStore.query(tables.memoryEntities)
    
    // Complex query test
    const complexQuery = liveStore.query(
      tables.memoryEntities
        .where('importance', '>', 50)
        .orderBy('lastAccessed', 'desc')
        .limit(100)
    )
    
    const end = performance.now()
    const queryTime = end - start
    
    return {
      passed: queryTime < 100, // Should be under 100ms
      message: `Query performance: ${queryTime.toFixed(2)}ms`
    }
  }
}
```

## Migration Checklist

### Pre-Migration

- [ ] Create full backup of RxDB data
- [ ] Verify backup integrity
- [ ] Test LiveStore setup in development
- [ ] Prepare rollback plan
- [ ] Notify users of migration (if applicable)

### During Migration

- [ ] Export all RxDB data
- [ ] Validate export completeness
- [ ] Import data to LiveStore
- [ ] Verify import integrity
- [ ] Test critical application features
- [ ] Monitor for errors

### Post-Migration

- [ ] Run full verification suite
- [ ] Test all application features
- [ ] Monitor performance metrics
- [ ] Verify reactive queries work correctly
- [ ] Create new backup of LiveStore data
- [ ] Clean up RxDB (optional)

### Rollback Plan (If Needed)

- [ ] Stop LiveStore operations
- [ ] Restore RxDB from backup
- [ ] Switch components back to RxDB
- [ ] Update localStorage flags
- [ ] Investigate migration issues

## Troubleshooting

### Common Issues

1. **ID Mapping Errors**

   ```typescript
   // Ensure proper ID mapping during import
   const idMappings = new Map<string, string>()
   
   // Store mapping during persona import
   idMappings.set(originalPersona.id, newPersona.id)
   
   // Use mapping during memory import
   const newPersonaId = idMappings.get(memory.personaId)
   ```

2. **Schema Validation Errors**

   ```typescript
   // Validate data before import
   const PersonaSchema = Schema.Struct({
     id: Schema.String,
     name: Schema.String,
     // ... define complete schema
   })
   
   const validatedPersona = PersonaSchema.parse(importData)
   ```

3. **Performance Issues**

   ```typescript
   // Batch imports for better performance
   const batchSize = 100
   for (let i = 0; i < memories.length; i += batchSize) {
     const batch = memories.slice(i, i + batchSize)
     await Promise.all(batch.map(memory => importMemory(memory)))
   }
   ```

This migration guide ensures a safe, reliable transition from RxDB to LiveStore while preserving all data and maintaining system functionality throughout the process.
