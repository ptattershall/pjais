import { app } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import { z } from 'zod';
import log from 'electron-log';
import { SqliteDatabaseManager } from './sqlite-database-manager';
import { PersonaInsert, MemoryEntityInsert } from './schema';

// Validation schemas for migrating data
const LiveStorePersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  personality: z.record(z.unknown()).optional(),
  memoryConfiguration: z.record(z.unknown()).optional(),
  privacySettings: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(false),
  createdAt: z.union([z.date(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val) : val
  ),
  updatedAt: z.union([z.date(), z.number()]).transform(val => 
    typeof val === 'number' ? new Date(val) : val
  ),
});

interface MigrationResult {
  success: boolean;
  backupPath?: string;
  migratedPersonas: number;
  migratedMemories: number;
  migratedPlugins: number;
  errors: string[];
  warnings: string[];
}

export class DataMigrationManager {
  private userDataPath: string;
  private backupDir: string;
  private liveStorePaths: string[];

  constructor() {
    this.userDataPath = app.getPath('userData');
    this.backupDir = path.join(this.userDataPath, 'backups');
    this.liveStorePaths = [
      // Common LiveStore database locations
      path.join(this.userDataPath, 'livestore.db'),
      path.join(this.userDataPath, 'database.db'),
      path.join(this.userDataPath, 'db', 'livestore.db'),
      path.join(this.userDataPath, 'data', 'livestore.db'),
      // Development paths
      path.join(process.cwd(), 'livestore.db'),
      path.join(process.cwd(), 'data', 'livestore.db'),
    ];
  }

  /**
   * Main migration entry point
   */
  async migrate(): Promise<MigrationResult> {
    log.info('🔄 Starting LiveStore to better-sqlite3 migration...');

    const result: MigrationResult = {
      success: false,
      migratedPersonas: 0,
      migratedMemories: 0,
      migratedPlugins: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Step 1: Check if migration is needed
      const migrationFlag = path.join(this.userDataPath, '.migration-completed');
      if (await fs.pathExists(migrationFlag)) {
        log.info('📋 Migration already completed, skipping...');
        result.success = true;
        return result;
      }

      // Step 2: Detect existing LiveStore data
      const liveStoreDbPath = await this.detectLiveStoreDatabase();
      if (!liveStoreDbPath) {
        log.info('📋 No existing LiveStore database found, creating fresh database...');
        await this.markMigrationComplete();
        result.success = true;
        return result;
      }

      log.info(`📋 Found LiveStore database at: ${liveStoreDbPath}`);

      // Step 3: Create backup
      const backupPath = await this.createBackup(liveStoreDbPath);
      result.backupPath = backupPath;
      log.info(`💾 Created backup at: ${backupPath}`);

      // Step 4: Initialize new SQLite database
      const dbManager = new SqliteDatabaseManager();
      await dbManager.initialize();

      // Step 5: Migrate data
      await this.migrateData(liveStoreDbPath, dbManager, result);

      // Step 6: Mark migration as complete
      await this.markMigrationComplete();

      // Step 7: Clean up old database (optional, commented out for safety)
      // await this.cleanupOldDatabase(liveStoreDbPath);

      await dbManager.shutdown();

      result.success = true;
      log.info(`✅ Migration completed successfully! Migrated ${result.migratedPersonas} personas, ${result.migratedMemories} memories, ${result.migratedPlugins} plugins`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      log.error('❌ Migration failed:', error);
      
      // Attempt rollback if backup exists
      if (result.backupPath) {
        await this.rollback(result.backupPath).catch(rollbackError => {
          const rollbackMessage = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
          result.errors.push(`Rollback failed: ${rollbackMessage}`);
          log.error('❌ Rollback failed:', rollbackError);
        });
      }
    }

    return result;
  }

  /**
   * Detect existing LiveStore database
   */
  private async detectLiveStoreDatabase(): Promise<string | null> {
    for (const dbPath of this.liveStorePaths) {
      try {
        if (await fs.pathExists(dbPath)) {
          const stats = await fs.stat(dbPath);
          if (stats.isFile() && stats.size > 0) {
            log.info(`🔍 Found potential LiveStore database: ${dbPath} (${stats.size} bytes)`);
            return dbPath;
          }
        }
      } catch (error) {
        log.debug(`Skipping path ${dbPath}: ${error}`);
      }
    }

    // Also check for JSON-based LiveStore data
    const jsonDataPath = path.join(this.userDataPath, 'data.json');
    if (await fs.pathExists(jsonDataPath)) {
      log.info(`🔍 Found JSON-based LiveStore data: ${jsonDataPath}`);
      return jsonDataPath;
    }

    return null;
  }

  /**
   * Create backup of existing data
   */
  private async createBackup(sourcePath: string): Promise<string> {
    await fs.ensureDir(this.backupDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `livestore-backup-${timestamp}${path.extname(sourcePath)}`;
    const backupPath = path.join(this.backupDir, backupFileName);

    await fs.copy(sourcePath, backupPath);
    
    // Also backup any related files
    const sourceDir = path.dirname(sourcePath);
    const relatedFiles = [
      path.join(sourceDir, 'livestore.db-wal'),
      path.join(sourceDir, 'livestore.db-shm'),
      path.join(sourceDir, 'database.db-wal'),
      path.join(sourceDir, 'database.db-shm'),
    ];

    for (const relatedFile of relatedFiles) {
      if (await fs.pathExists(relatedFile)) {
        const relatedBackupPath = path.join(this.backupDir, `${path.basename(relatedFile)}-${timestamp}`);
        await fs.copy(relatedFile, relatedBackupPath);
      }
    }

    return backupPath;
  }

  /**
   * Migrate data from LiveStore to new SQLite database
   */
  private async migrateData(sourcePath: string, dbManager: SqliteDatabaseManager, result: MigrationResult): Promise<void> {
    log.info('📦 Starting data migration...');

    if (sourcePath.endsWith('.json')) {
      await this.migrateFromJSON(sourcePath, dbManager, result);
    } else {
      await this.migrateFromSQLite(sourcePath, dbManager, result);
    }
  }

  /**
   * Migrate from JSON-based LiveStore data
   */
  private async migrateFromJSON(jsonPath: string, dbManager: SqliteDatabaseManager, result: MigrationResult): Promise<void> {
    try {
      const jsonData = await fs.readJson(jsonPath);
      
      // Migrate personas
      if (jsonData.personas && Array.isArray(jsonData.personas)) {
        for (const personaData of jsonData.personas) {
          try {
            const validatedPersona = LiveStorePersonaSchema.parse(personaData);
        const newPersona: PersonaInsert = {
          name: validatedPersona.name,
          personality_profile: validatedPersona.personality as any || null,
          memory_configuration: validatedPersona.memoryConfiguration as any || null,
          privacy_settings: validatedPersona.privacySettings as any || null,
        };

            await dbManager.createPersona(newPersona);
            result.migratedPersonas++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push(`Failed to migrate persona ${personaData.id || 'unknown'}: ${errorMessage}`);
          }
        }
      }

      // Migrate memories
      if (jsonData.memories && Array.isArray(jsonData.memories)) {
        await this.migrateMemoriesFromArray(jsonData.memories, dbManager, result);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to migrate from JSON: ${errorMessage}`);
    }
  }

  /**
   * Migrate from SQLite-based LiveStore data
   */
  private async migrateFromSQLite(dbPath: string, dbManager: SqliteDatabaseManager, result: MigrationResult): Promise<void> {
    const Database = (await import('better-sqlite3')).default;
    const sourceDb = new Database(dbPath, { readonly: true });

    try {
      // Check if personas table exists
      const personasTableExists = sourceDb.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='personas'
      `).get();

      if (personasTableExists) {
        await this.migratePersonasFromSQLite(sourceDb, dbManager, result);
      }

      // Check if memory_entities table exists
      const memoriesTableExists = sourceDb.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='memory_entities'
      `).get();

      if (memoriesTableExists) {
        await this.migrateMemoriesFromSQLite(sourceDb, dbManager, result);
      }

      // Look for other potential memory tables
      const memoryTables = sourceDb.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND (name LIKE '%memory%' OR name LIKE '%memories%')
      `).all() as Array<{ name: string }>;

      for (const table of memoryTables) {
        if (table.name !== 'memory_entities') {
          try {
            const memories = sourceDb.prepare(`SELECT * FROM "${table.name}"`).all();
            await this.migrateMemoriesFromArray(memories, dbManager, result);
          } catch (error) {
            result.warnings.push(`Could not migrate table ${table.name}: ${error}`);
          }
        }
      }

    } finally {
      sourceDb.close();
    }
  }

  /**
   * Migrate personas from SQLite
   */
  private async migratePersonasFromSQLite(sourceDb: any, dbManager: SqliteDatabaseManager, result: MigrationResult): Promise<void> {
    const personas = sourceDb.prepare('SELECT * FROM personas WHERE deletedAt IS NULL OR deletedAt = ""').all();
    
    for (const personaData of personas) {
      try {
        // Parse JSON fields
        let personality = null;
        let memoryConfiguration = null;
        let privacySettings = null;

        try {
          personality = personaData.personality ? JSON.parse(personaData.personality) : null;
        } catch {
          personality = personaData.personality;
        }

        try {
          memoryConfiguration = personaData.memoryConfiguration ? JSON.parse(personaData.memoryConfiguration) : null;
        } catch {
          memoryConfiguration = personaData.memoryConfiguration;
        }

        try {
          privacySettings = personaData.privacySettings ? JSON.parse(personaData.privacySettings) : null;
        } catch {
          privacySettings = personaData.privacySettings;
        }

        const newPersona: PersonaInsert = {
          name: personaData.name || 'Unnamed Persona',
          personality_profile: personality as any,
          memory_configuration: memoryConfiguration as any,
          privacy_settings: privacySettings as any,
        };

        await dbManager.createPersona(newPersona);
        result.migratedPersonas++;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to migrate persona ${personaData.id || 'unknown'}: ${errorMessage}`);
      }
    }
  }

  /**
   * Migrate memories from SQLite
   */
  private async migrateMemoriesFromSQLite(sourceDb: any, dbManager: SqliteDatabaseManager, result: MigrationResult): Promise<void> {
    const memories = sourceDb.prepare('SELECT * FROM memory_entities WHERE deletedAt IS NULL OR deletedAt = ""').all();
    await this.migrateMemoriesFromArray(memories, dbManager, result);
  }

  /**
   * Migrate memories from array
   */
  private async migrateMemoriesFromArray(memories: any[], dbManager: SqliteDatabaseManager, result: MigrationResult): Promise<void> {
    // Get all personas to map old IDs to new IDs
    const personas = await dbManager.getPersonas();

    for (const memoryData of memories) {
      try {
        // Try to find matching persona by ID or name
        let personaId: number | null = null;
        
        if (memoryData.personaId) {
          // First try to find by name if personaId looks like a string
          const matchingPersona = personas.find(p => 
            p.name === memoryData.personaId || 
            p.id.toString() === memoryData.personaId
          );
          personaId = matchingPersona?.id || null;
        }

        // Parse JSON fields
        let embedding: number[] | null = null;

        try {
          embedding = Array.isArray(memoryData.embedding) ? memoryData.embedding : 
                      typeof memoryData.embedding === 'string' ? JSON.parse(memoryData.embedding) : null;
        } catch {
          embedding = null;
        }

        const newMemory: MemoryEntityInsert = {
          persona_id: personaId,
          content: memoryData.content || memoryData.name || 'No content',
          type: memoryData.type || 'memory',
          tier: memoryData.memoryTier === 'active' ? 'hot' : (memoryData.memoryTier || 'hot') as 'hot' | 'warm' | 'cold',
          importance_score: Math.max(0, Math.min(1, (memoryData.importance || 50) / 100)),
          metadata: {
            name: memoryData.name,
            summary: memoryData.summary,
            embeddingModel: memoryData.embeddingModel,
            originalId: memoryData.id,
            tags: memoryData.tags || [],
          },
          embedding_vector: embedding,
          access_count: Math.max(0, memoryData.accessCount || 0),
          last_accessed_at: memoryData.lastAccessed ? new Date(memoryData.lastAccessed).toISOString() : null,
        };

        await dbManager.createMemory(newMemory);
        result.migratedMemories++;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.warnings.push(`Failed to migrate memory ${memoryData.id || 'unknown'}: ${errorMessage}`);
      }
    }
  }

  /**
   * Mark migration as complete
   */
  private async markMigrationComplete(): Promise<void> {
    const migrationFlag = path.join(this.userDataPath, '.migration-completed');
    const migrationInfo = {
      completed: true,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'livestore',
      target: 'better-sqlite3',
    };
    
    await fs.writeJson(migrationFlag, migrationInfo, { spaces: 2 });
  }

  /**
   * Rollback migration
   */
  async rollback(backupPath: string): Promise<void> {
    log.info(`🔄 Rolling back migration using backup: ${backupPath}`);

    // Remove new database
    const newDbPath = path.join(this.userDataPath, 'db', 'pjais.db');
    await fs.remove(newDbPath).catch(() => {});

    // Restore backup
    const originalPath = this.liveStorePaths[0]; // Use first path as default
    await fs.copy(backupPath, originalPath);

    // Remove migration flag
    const migrationFlag = path.join(this.userDataPath, '.migration-completed');
    await fs.remove(migrationFlag).catch(() => {});

    log.info('✅ Migration rollback completed');
  }

  /**
   * Check if migration has been completed
   */
  async isMigrationCompleted(): Promise<boolean> {
    const migrationFlag = path.join(this.userDataPath, '.migration-completed');
    return await fs.pathExists(migrationFlag);
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{ completed: boolean; info?: any }> {
    const migrationFlag = path.join(this.userDataPath, '.migration-completed');
    
    if (await fs.pathExists(migrationFlag)) {
      try {
        const info = await fs.readJson(migrationFlag);
        return { completed: true, info };
      } catch {
        return { completed: true };
      }
    }
    
    return { completed: false };
  }
}

export default DataMigrationManager;
