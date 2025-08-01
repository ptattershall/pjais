import { SecurityManager } from './security-manager';
import { PersonaManager } from './persona-manager';
import { MemoryManager } from './memory-manager';
import { MemoryGraphService } from './memory-graph-service';
import { MemoryStore } from './memory-store';
// import { MemoryLoader } from './memory-loader'; // Temporarily disabled for testing
import { PluginManager } from './plugin-manager';
import { ServiceManager } from './service-manager';
import { EffectDatabaseManager } from '../database/effect-database-manager';
import { PrivacyController } from './privacy-controller';
import { PersonaMemoryManager } from './persona-memory-manager';
import { EmotionalStateTracker } from './emotional-state-tracker';
import { PersonaBehaviorManager } from './persona-behavior-manager';
import { testDatabase } from '../test-database';
import { healthMonitor } from './health-monitor';
import { IpcMain } from 'electron';

// Export the services for use by other modules
export { 
  SecurityManager,
  PersonaManager,
  MemoryManager,
  MemoryGraphService,
  MemoryStore,
  MemoryLoader,
  PluginManager,
  ServiceManager,
  DatabaseManager,
  PrivacyController,
  PersonaMemoryManager,
  EmotionalStateTracker,
  PersonaBehaviorManager,
  healthMonitor
};

export interface Services {
  databaseManager: EffectDatabaseManager;
  securityManager: SecurityManager;
  personaManager: PersonaManager;
  memoryManager: MemoryManager;
  pluginManager: PluginManager;
  serviceManager: ServiceManager;
  privacyController: PrivacyController;
}

/**
 * Initialize all core services
 */
export async function initializeServices(ipcMain: IpcMain, securityPassphrase?: string): Promise<Services> {
  console.log('Initializing core services with Phase 3 privacy controls...');

  try {
    // Initialize database first
    const databaseManager = new EffectDatabaseManager();
    await databaseManager.initialize();

    const securityManager = new SecurityManager();
    const memoryStore = new MemoryStore();
    // const memoryLoader = new MemoryLoader(); // Temporarily disabled for testing
    const memoryManager = new MemoryManager(memoryStore, null, databaseManager, securityManager); // Pass null instead of memoryLoader
    const personaManager = new PersonaManager(memoryManager);
    const pluginManager = new PluginManager(securityManager);

    // Initialize SecurityManager with optional passphrase for encryption
    await securityManager.initialize(securityPassphrase);
    await memoryManager.initialize();
    await personaManager.initialize();
    await pluginManager.initialize();

    // Initialize Privacy Controller with comprehensive privacy & consent management
    const privacyController = new PrivacyController(
      securityManager.getSecurityEventLogger(),
      securityManager.getEncryptionService(),
      databaseManager,
      {
        defaultComplianceFramework: 'GDPR',
        enableDataMinimization: true,
        requireExplicitConsent: true,
        dataRetentionDays: 365,
        consentReminderDays: 90
      }
    );
    await privacyController.initialize();

    const serviceManager = new ServiceManager(
      personaManager,
      memoryManager,
      pluginManager,
      securityManager
    );

    const services: Services = {
      databaseManager,
      securityManager,
      personaManager,
      memoryManager,
      pluginManager,
      serviceManager,
      privacyController,
    };

    // Initialize health monitoring
    healthMonitor.registerService('database', databaseManager);
    healthMonitor.registerService('security', securityManager);
    healthMonitor.registerService('memory', memoryManager);
    healthMonitor.registerService('plugins', pluginManager);
    healthMonitor.start(); // Start monitoring with 30s interval

    console.log('All core services initialized successfully with LiveStore database, Phase 1 security framework, and Phase 3 privacy controls');
    
    // Run database test if in development mode
    if (process.env.NODE_ENV === 'development' || process.env.PJAIS_TEST_DB === 'true') {
      console.log('🧪 Running database validation test...');
      const testPassed = await testDatabase();
      if (testPassed) {
        console.log('✅ Database validation completed successfully');
      } else {
        console.warn('⚠️ Database validation had issues - check logs above');
      }
    }
    
    return services;

  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw new Error(`Service initialization failed: ${error}`);
  }
}

/**
 * Shutdown all services gracefully
 */
export async function shutdownServices(services: Services): Promise<void> {
  console.log('Shutting down services...');

  try {
    // Stop health monitoring
    healthMonitor.stop();
    
    // Shutdown in reverse order
    await services.pluginManager.shutdown();
    await services.personaManager.shutdown();
    await services.memoryManager.shutdown();
    await services.securityManager.shutdown();
    await services.databaseManager.shutdown();
    // ServiceManager and PrivacyController do not have explicit shutdown methods

    console.log('All services shut down successfully');
  } catch (error) {
    console.error('Error during service shutdown:', error);
  }
} 