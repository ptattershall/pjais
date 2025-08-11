import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, desc, asc, sql } from 'drizzle-orm';
import { initializeDatabase, getDatabase, closeDatabase, isDatabaseHealthy, getDatabaseStats } from './db';
import { 
  personas, 
  memoryEntities, 
  memoryRelationships, 
  plugins,
  type Persona,
  type PersonaInsert,
  type MemoryEntity,
  type MemoryEntityInsert,
  type Plugin,
  type PluginInsert
} from './schema';

export class SqliteDatabaseManager {
  private db: ReturnType<typeof drizzle> | null = null;
  private rawDb: ReturnType<typeof getDatabase> | null = null;

  /**
   * Initialize the database connection and run migrations
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing SQLite Database Manager...');
    
    try {
      // Initialize the raw database connection and run migrations
      this.rawDb = initializeDatabase();
      
      // Create Drizzle instance for type-safe queries
      this.db = drizzle(this.rawDb, {
        schema: {
          personas,
          memoryEntities,
          memoryRelationships,
          plugins,
        },
      });
      
      console.log('✅ SQLite Database Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SQLite Database Manager:', error);
      throw error;
    }
  }

  /**
   * Shutdown the database connection
   */
  async shutdown(): Promise<void> {
    console.log('🔒 Shutting down SQLite Database Manager...');
    
    try {
      this.db = null;
      this.rawDb = null;
      closeDatabase();
      console.log('✅ SQLite Database Manager shutdown complete');
    } catch (error) {
      console.error('❌ Error during SQLite Database Manager shutdown:', error);
    }
  }

  /**
   * Check if the database is healthy
   */
  isHealthy(): boolean {
    return isDatabaseHealthy();
  }

  /**
   * Get database statistics
   */
  getStats() {
    return getDatabaseStats();
  }

  /**
   * Get the Drizzle database instance
   */
  getDB() {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Get the raw SQLite database instance for advanced operations
   */
  getRawDB() {
    if (!this.rawDb) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.rawDb;
  }

  // Persona operations
  async getPersonas(): Promise<Persona[]> {
    const db = this.getDB();
    return await db.select().from(personas).orderBy(desc(personas.updated_at));
  }

  async getPersonaById(id: number): Promise<Persona | undefined> {
    const db = this.getDB();
    const result = await db.select().from(personas).where(eq(personas.id, id)).limit(1);
    return result[0];
  }

  async createPersona(data: PersonaInsert): Promise<Persona> {
    const db = this.getDB();
    const result = await db.insert(personas).values({
      ...data,
      updated_at: new Date().toISOString(),
    }).returning();
    return result[0];
  }

  async updatePersona(id: number, data: Partial<PersonaInsert>): Promise<Persona | undefined> {
    const db = this.getDB();
    const result = await db.update(personas)
      .set({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .where(eq(personas.id, id))
      .returning();
    return result[0];
  }

  async deletePersona(id: number): Promise<boolean> {
    const db = this.getDB();
    const result = await db.delete(personas).where(eq(personas.id, id));
    return result.changes > 0;
  }

  // Memory operations
  async getMemories(personaId?: number, limit: number = 100): Promise<MemoryEntity[]> {
    const db = this.getDB();
    
    if (personaId) {
      return await db.select()
        .from(memoryEntities)
        .where(eq(memoryEntities.persona_id, personaId))
        .orderBy(desc(memoryEntities.updated_at))
        .limit(limit);
    }
    
    return await db.select()
      .from(memoryEntities)
      .orderBy(desc(memoryEntities.updated_at))
      .limit(limit);
  }

  async getMemoryById(id: number): Promise<MemoryEntity | undefined> {
    const db = this.getDB();
    const result = await db.select().from(memoryEntities).where(eq(memoryEntities.id, id)).limit(1);
    return result[0];
  }

  async createMemory(data: MemoryEntityInsert): Promise<MemoryEntity> {
    const db = this.getDB();
    const result = await db.insert(memoryEntities).values({
      ...data,
      updated_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    }).returning();
    return result[0];
  }

  async updateMemory(id: number, data: Partial<MemoryEntityInsert>): Promise<MemoryEntity | undefined> {
    const db = this.getDB();
    const result = await db.update(memoryEntities)
      .set({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .where(eq(memoryEntities.id, id))
      .returning();
    return result[0];
  }

  async deleteMemory(id: number): Promise<boolean> {
    const db = this.getDB();
    const result = await db.delete(memoryEntities).where(eq(memoryEntities.id, id));
    return result.changes > 0;
  }

  async updateMemoryAccess(id: number): Promise<void> {
    const db = this.getDB();
    await db.update(memoryEntities)
      .set({
        last_accessed_at: new Date().toISOString(),
        access_count: sql`${memoryEntities.access_count} + 1`,
      })
      .where(eq(memoryEntities.id, id));
  }

  // Plugin operations
  async getPlugins(): Promise<Plugin[]> {
    const db = this.getDB();
    return await db.select().from(plugins).orderBy(asc(plugins.name));
  }

  async getPluginById(id: number): Promise<Plugin | undefined> {
    const db = this.getDB();
    const result = await db.select().from(plugins).where(eq(plugins.id, id)).limit(1);
    return result[0];
  }

  async getPluginByName(name: string): Promise<Plugin | undefined> {
    const db = this.getDB();
    const result = await db.select().from(plugins).where(eq(plugins.name, name)).limit(1);
    return result[0];
  }

  async createPlugin(data: PluginInsert): Promise<Plugin> {
    const db = this.getDB();
    const result = await db.insert(plugins).values({
      ...data,
      updated_at: new Date().toISOString(),
    }).returning();
    return result[0];
  }

  async updatePlugin(id: number, data: Partial<PluginInsert>): Promise<Plugin | undefined> {
    const db = this.getDB();
    const result = await db.update(plugins)
      .set({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .where(eq(plugins.id, id))
      .returning();
    return result[0];
  }

  async deletePlugin(id: number): Promise<boolean> {
    const db = this.getDB();
    const result = await db.delete(plugins).where(eq(plugins.id, id));
    return result.changes > 0;
  }

  async togglePlugin(id: number, enabled: boolean): Promise<Plugin | undefined> {
    const db = this.getDB();
    const result = await db.update(plugins)
      .set({
        enabled,
        updated_at: new Date().toISOString(),
      })
      .where(eq(plugins.id, id))
      .returning();
    return result[0];
  }

  // Transaction support
  async transaction<T>(callback: (tx: ReturnType<typeof drizzle>) => Promise<T>): Promise<T> {
    const rawDb = this.getRawDB();
    const db = this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = rawDb.transaction(() => {
        return callback(db);
      });
      
      try {
        const result = transaction();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Backup and restore
  async createBackup(backupPath: string): Promise<void> {
    const rawDb = this.getRawDB();
    await rawDb.backup(backupPath);
  }

  // Raw SQL execution for complex queries
  async executeRaw(sql: string, params: any[] = []): Promise<any> {
    const rawDb = this.getRawDB();
    const statement = rawDb.prepare(sql);
    return statement.all(...params);
  }
}

export default SqliteDatabaseManager;
