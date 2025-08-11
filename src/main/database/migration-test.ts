import { DataMigrationManager } from './data-migration';
import { SqliteDatabaseManager } from './sqlite-database-manager';
import fs from 'fs-extra';
import path from 'path';
import log from 'electron-log';

/**
 * Test script for verifying database migration
 * This can be run independently to test the migration process
 */
export async function testMigration(): Promise<boolean> {
  log.info('🧪 Starting migration test...');
  
  try {
    // Initialize migration manager
    const migrationManager = new DataMigrationManager();
    
    // Check current migration status
    const status = await migrationManager.getMigrationStatus();
    log.info('📋 Current migration status:', status);
    
    // Run migration
    const result = await migrationManager.migrate();
    log.info('🔄 Migration result:', result);
    
    if (result.success) {
      log.info(`✅ Migration test completed successfully!`);
      log.info(`- Personas migrated: ${result.migratedPersonas}`);
      log.info(`- Memories migrated: ${result.migratedMemories}`);
      log.info(`- Plugins migrated: ${result.migratedPlugins}`);
      
      if (result.warnings.length > 0) {
        log.warn('⚠️ Migration warnings:', result.warnings);
      }
      
      // Test the new database
      await testNewDatabase();
      
      return true;
    } else {
      log.error('❌ Migration test failed:', result.errors);
      return false;
    }
    
  } catch (error) {
    log.error('❌ Migration test crashed:', error);
    return false;
  }
}

/**
 * Test the new SQLite database functionality
 */
async function testNewDatabase(): Promise<void> {
  log.info('🧪 Testing new SQLite database...');
  
  const dbManager = new SqliteDatabaseManager();
  await dbManager.initialize();
  
  try {
    // Test personas
    const personas = await dbManager.getPersonas();
    log.info(`📊 Found ${personas.length} personas in new database`);
    
    // Test memories
    const memories = await dbManager.getMemories();
    log.info(`📊 Found ${memories.length} memories in new database`);
    
    // Test plugins
    const plugins = await dbManager.getPlugins();
    log.info(`📊 Found ${plugins.length} plugins in new database`);
    
    // Create a test persona to verify write operations
    const testPersona = await dbManager.createPersona({
      name: 'Migration Test Persona',
      personality_profile: { traits: { test: 1.0 } },
      privacy_settings: { 
        data_sharing: false,
        analytics_enabled: false,
        memory_retention_days: 30,
        consent_given: true,
        consent_date: new Date().toISOString()
      },
    });
    
    log.info(`✅ Created test persona with ID: ${testPersona.id}`);
    
    // Create a test memory
    const testMemory = await dbManager.createMemory({
      persona_id: testPersona.id,
      content: 'This is a migration test memory',
      type: 'test',
      tier: 'hot',
      importance_score: 0.8,
    });
    
    log.info(`✅ Created test memory with ID: ${testMemory.id}`);
    
    // Clean up test data
    await dbManager.deleteMemory(testMemory.id);
    await dbManager.deletePersona(testPersona.id);
    
    log.info('✅ Database test completed successfully!');
    
  } finally {
    await dbManager.shutdown();
  }
}

/**
 * Reset migration state (for testing purposes)
 */
export async function resetMigration(): Promise<void> {
  const { app } = await import('electron');
  const userDataPath = app.getPath('userData');
  const migrationFlag = path.join(userDataPath, '.migration-completed');
  
  if (await fs.pathExists(migrationFlag)) {
    await fs.remove(migrationFlag);
    log.info('🔄 Migration state reset');
  }
}

// If this script is run directly
if (require.main === module) {
  (async () => {
    try {
      // Initialize minimal app for testing
      const { app } = await import('electron');
      
      app.whenReady().then(async () => {
        const success = await testMigration();
        process.exit(success ? 0 : 1);
      });
      
    } catch (error) {
      console.error('Failed to run migration test:', error);
      process.exit(1);
    }
  })();
}
