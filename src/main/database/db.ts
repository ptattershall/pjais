import Database from 'better-sqlite3';
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

// Database configuration schema
const DBConfigSchema = z.object({
  journalMode: z.enum(['DELETE', 'TRUNCATE', 'PERSIST', 'MEMORY', 'WAL']).default('WAL'),
  synchronous: z.enum(['OFF', 'NORMAL', 'FULL']).default('NORMAL'),
  foreignKeys: z.boolean().default(true),
  busyTimeout: z.number().default(5000),
});

type DBConfig = z.infer<typeof DBConfigSchema>;

// Database instance
let db: Database.Database | null = null;

/**
 * Get the database directory path
 */
function getDatabaseDirectory(): string {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'database');
  
  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  return dbDir;
}

/**
 * Get the database file path
 */
function getDatabasePath(): string {
  const dbDir = getDatabaseDirectory();
  return path.join(dbDir, 'pjais.db');
}

/**
 * Configure database pragmas for optimal performance and safety
 */
function configurePragmas(database: Database.Database, config: DBConfig): void {
  console.log('🔧 Configuring database pragmas...');
  
  try {
    // Enable WAL mode for better concurrency
    database.pragma(`journal_mode = ${config.journalMode}`);
    console.log(`✅ Journal mode set to: ${config.journalMode}`);
    
    // Set synchronous mode
    database.pragma(`synchronous = ${config.synchronous}`);
    console.log(`✅ Synchronous mode set to: ${config.synchronous}`);
    
    // Enable foreign key constraints
    if (config.foreignKeys) {
      database.pragma('foreign_keys = ON');
      console.log('✅ Foreign keys enabled');
    }
    
    // Set busy timeout
    database.pragma(`busy_timeout = ${config.busyTimeout}`);
    console.log(`✅ Busy timeout set to: ${config.busyTimeout}ms`);
    
    // Additional pragmas for performance
    database.pragma('cache_size = -64000'); // 64MB cache
    database.pragma('temp_store = memory');
    database.pragma('mmap_size = 268435456'); // 256MB mmap
    
    console.log('✅ Database pragmas configured successfully');
  } catch (error) {
    console.error('❌ Failed to configure database pragmas:', error);
    throw error;
  }
}

/**
 * Run database migrations
 */
export function runMigrations(): void {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  
  console.log('🔄 Running database migrations...');
  
  try {
    // Determine migrations directory
    const migrationsDir = getMigrationsDirectory();
    
    if (!fs.existsSync(migrationsDir)) {
      console.warn(`⚠️ Migrations directory not found: ${migrationsDir}`);
      return;
    }
    
    // Get list of migration files
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure migrations run in order
    
    if (migrationFiles.length === 0) {
      console.log('ℹ️ No migration files found');
      return;
    }
    
    // Get already applied migrations
    const appliedMigrations = new Set<string>();
    try {
      const applied = db.prepare('SELECT id FROM _migrations').all() as { id: string }[];
      applied.forEach(migration => appliedMigrations.add(migration.id));
    } catch (error) {
      // _migrations table doesn't exist yet, will be created by first migration
      console.log('ℹ️ Migrations table not found, will be created');
    }
    
    // Run migrations in a transaction
    const transaction = db.transaction(() => {
      let migrationsApplied = 0;
      
      for (const migrationFile of migrationFiles) {
        if (appliedMigrations.has(migrationFile)) {
          console.log(`⏭️ Skipping already applied migration: ${migrationFile}`);
          continue;
        }
        
        console.log(`🔄 Applying migration: ${migrationFile}`);
        
        try {
          // Read and execute migration SQL
          const migrationPath = path.join(migrationsDir, migrationFile);
          const sql = fs.readFileSync(migrationPath, 'utf8');
          
          // Execute the migration SQL (may contain multiple statements)
          db!.exec(sql);
          
          // Record the migration (if not already done by the migration itself)
          try {
            db!.prepare('INSERT OR IGNORE INTO _migrations (id) VALUES (?)').run(migrationFile);
          } catch (error) {
            // Migration might have already inserted itself
          }
          
          migrationsApplied++;
          console.log(`✅ Applied migration: ${migrationFile}`);
          
        } catch (error) {
          console.error(`❌ Failed to apply migration ${migrationFile}:`, error);
          throw error;
        }
      }
      
      console.log(`✅ Applied ${migrationsApplied} migrations successfully`);
    });
    
    transaction();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Get migrations directory path
 */
function getMigrationsDirectory(): string {
  // In production, migrations are in extraResources
  const resourcesPath = process.resourcesPath;
  if (resourcesPath && fs.existsSync(path.join(resourcesPath, 'src', 'migrations'))) {
    return path.join(resourcesPath, 'src', 'migrations');
  }
  
  // In development, migrations are in the source directory
  const devPath = path.join(__dirname, '../../migrations');
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  
  // Fallback: relative to current directory
  const fallbackPath = path.join(process.cwd(), 'src', 'migrations');
  return fallbackPath;
}

/**
 * Initialize the database connection
 */
export function initializeDatabase(config: Partial<DBConfig> = {}): Database.Database {
  if (db) {
    console.log('ℹ️ Database already initialized');
    return db;
  }
  
  console.log('🚀 Initializing SQLite database...');
  
  try {
    // Validate and merge configuration
    const dbConfig = DBConfigSchema.parse(config);
    
    // Get database path
    const dbPath = getDatabasePath();
    console.log(`📁 Database path: ${dbPath}`);
    
    // Create database connection
    db = new Database(dbPath);
    
    // Configure database pragmas
    configurePragmas(db, dbConfig);
    
    // Run migrations
    runMigrations();
    
    console.log('✅ Database initialized successfully');
    
    return db;
    
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    console.log('🔒 Closing database connection...');
    try {
      db.close();
      db = null;
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database:', error);
    }
  }
}

/**
 * Check if database is healthy
 */
export function isDatabaseHealthy(): boolean {
  if (!db) {
    return false;
  }
  
  try {
    // Simple health check query
    const result = db.prepare('SELECT 1 as health').get() as { health: number } | undefined;
    return result?.health === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Get database statistics
 */
export function getDatabaseStats() {
  if (!db) {
    return null;
  }
  
  try {
    const stats = {
      path: getDatabasePath(),
      size: fs.statSync(getDatabasePath()).size,
      pageCount: db.pragma('page_count', { simple: true }) as number,
      pageSize: db.pragma('page_size', { simple: true }) as number,
      journalMode: db.pragma('journal_mode', { simple: true }) as string,
      foreignKeys: db.pragma('foreign_keys', { simple: true }) as number,
    };
    
    return stats;
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return null;
  }
}

// Export the database instance for direct access if needed
export { db };
