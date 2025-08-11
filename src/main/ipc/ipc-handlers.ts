import { ipcMain } from 'electron';
import { z } from 'zod';
import SqliteDatabaseManager from '../database/sqlite-database-manager';
import {
  IPC_CHANNELS,
  PersonaCreateRequestSchema,
  PersonaUpdateRequestSchema,
  MemoryCreateRequestSchema,
  MemoryUpdateRequestSchema,
  MemoryListRequestSchema,
  PluginCreateRequestSchema,
  PluginUpdateRequestSchema,
  PluginToggleRequestSchema,
  IdRequestSchema,
  BackupRequestSchema,
  createSuccessResponse,
  createErrorResponse,
  type PersonaResponse,
  type MemoryResponse,
  type PluginResponse,
  type DatabaseStats,
} from '../../shared/ipc-contracts';

export class IPCHandlers {
  private databaseManager: SqliteDatabaseManager;

  constructor(databaseManager: SqliteDatabaseManager) {
    this.databaseManager = databaseManager;
  }

  /**
   * Register all IPC handlers
   */
  registerHandlers(): void {
    console.log('🔌 Registering IPC handlers...');

    // Persona handlers
    this.registerPersonaHandlers();
    
    // Memory handlers
    this.registerMemoryHandlers();
    
    // Plugin handlers
    this.registerPluginHandlers();
    
    // Database handlers
    this.registerDatabaseHandlers();

    console.log('✅ IPC handlers registered successfully');
  }

  /**
   * Unregister all IPC handlers
   */
  unregisterHandlers(): void {
    console.log('🔌 Unregistering IPC handlers...');

    // Remove all registered handlers
    Object.values(IPC_CHANNELS).forEach(channel => {
      ipcMain.removeAllListeners(channel);
    });

    console.log('✅ IPC handlers unregistered successfully');
  }

  /**
   * Generic error handler wrapper for IPC calls
   */
  private handleIPCCall<T, R>(
    schema: z.ZodSchema<T>,
    handler: (data: T) => Promise<R>
  ): (event: Electron.IpcMainInvokeEvent, data: unknown) => Promise<any> {
    return async (event: Electron.IpcMainInvokeEvent, data: unknown): Promise<any> => {
      try {
        // Validate input data
        const validatedData = schema.parse(data);
        
        // Execute handler
        const result = await handler(validatedData);
        
        // Return success response
        return createSuccessResponse(result);
        
      } catch (error) {
        console.error('IPC Handler Error:', error);
        
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
          const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          return createErrorResponse(`Validation error: ${errorMessage}`, 'VALIDATION_ERROR');
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return createErrorResponse(errorMessage, 'INTERNAL_ERROR');
      }
    };
  }

  /**
   * Register persona-related IPC handlers
   */
  private registerPersonaHandlers(): void {
    // List all personas
    ipcMain.handle(
      IPC_CHANNELS.PERSONAS_LIST,
      this.handleIPCCall(z.void(), async () => {
        const personas = await this.databaseManager.getPersonas();
        return personas as PersonaResponse[];
      })
    );

    // Get persona by ID
    ipcMain.handle(
      IPC_CHANNELS.PERSONAS_GET,
      this.handleIPCCall(IdRequestSchema, async (data) => {
        const persona = await this.databaseManager.getPersonaById(data.id);
        if (!persona) {
          throw new Error(`Persona with ID ${data.id} not found`);
        }
        return persona as PersonaResponse;
      })
    );

    // Create new persona
    ipcMain.handle(
      IPC_CHANNELS.PERSONAS_CREATE,
      this.handleIPCCall(PersonaCreateRequestSchema, async (data) => {
        const persona = await this.databaseManager.createPersona(data as any);
        return persona as PersonaResponse;
      })
    );

    // Update persona
    ipcMain.handle(
      IPC_CHANNELS.PERSONAS_UPDATE,
      this.handleIPCCall(PersonaUpdateRequestSchema, async (data) => {
        const { id, ...updateData } = data;
        const persona = await this.databaseManager.updatePersona(id, updateData as any);
        if (!persona) {
          throw new Error(`Persona with ID ${id} not found`);
        }
        return persona as PersonaResponse;
      })
    );

    // Delete persona
    ipcMain.handle(
      IPC_CHANNELS.PERSONAS_DELETE,
      this.handleIPCCall(IdRequestSchema, async (data) => {
        const deleted = await this.databaseManager.deletePersona(data.id);
        if (!deleted) {
          throw new Error(`Persona with ID ${data.id} not found`);
        }
        return deleted;
      })
    );
  }

  /**
   * Register memory-related IPC handlers
   */
  private registerMemoryHandlers(): void {
    // List memories
    ipcMain.handle(
      IPC_CHANNELS.MEMORIES_LIST,
      this.handleIPCCall(MemoryListRequestSchema.optional(), async (data) => {
        const params = data || {};
        const memories = await this.databaseManager.getMemories(params.persona_id, params.limit);
        return memories as MemoryResponse[];
      })
    );

    // Get memory by ID
    ipcMain.handle(
      IPC_CHANNELS.MEMORIES_GET,
      this.handleIPCCall(IdRequestSchema, async (data) => {
        const memory = await this.databaseManager.getMemoryById(data.id);
        if (!memory) {
          throw new Error(`Memory with ID ${data.id} not found`);
        }
        
        // Update access tracking
        await this.databaseManager.updateMemoryAccess(data.id);
        
        return memory as MemoryResponse;
      })
    );

    // Create new memory
    ipcMain.handle(
      IPC_CHANNELS.MEMORIES_CREATE,
      this.handleIPCCall(MemoryCreateRequestSchema, async (data) => {
        const memory = await this.databaseManager.createMemory(data);
        return memory as MemoryResponse;
      })
    );

    // Update memory
    ipcMain.handle(
      IPC_CHANNELS.MEMORIES_UPDATE,
      this.handleIPCCall(MemoryUpdateRequestSchema, async (data) => {
        const { id, ...updateData } = data;
        const memory = await this.databaseManager.updateMemory(id, updateData);
        if (!memory) {
          throw new Error(`Memory with ID ${id} not found`);
        }
        return memory as MemoryResponse;
      })
    );

    // Delete memory
    ipcMain.handle(
      IPC_CHANNELS.MEMORIES_DELETE,
      this.handleIPCCall(IdRequestSchema, async (data) => {
        const deleted = await this.databaseManager.deleteMemory(data.id);
        if (!deleted) {
          throw new Error(`Memory with ID ${data.id} not found`);
        }
        return deleted;
      })
    );

    // Update memory access (explicit call)
    ipcMain.handle(
      IPC_CHANNELS.MEMORIES_UPDATE_ACCESS,
      this.handleIPCCall(IdRequestSchema, async (data) => {
        await this.databaseManager.updateMemoryAccess(data.id);
        return undefined;
      })
    );
  }

  /**
   * Register plugin-related IPC handlers
   */
  private registerPluginHandlers(): void {
    // List all plugins
    ipcMain.handle(
      IPC_CHANNELS.PLUGINS_LIST,
      this.handleIPCCall(z.void(), async () => {
        const plugins = await this.databaseManager.getPlugins();
        return plugins as PluginResponse[];
      })
    );

    // Get plugin by ID
    ipcMain.handle(
      IPC_CHANNELS.PLUGINS_GET,
      this.handleIPCCall(IdRequestSchema, async (data) => {
        const plugin = await this.databaseManager.getPluginById(data.id);
        if (!plugin) {
          throw new Error(`Plugin with ID ${data.id} not found`);
        }
        return plugin as PluginResponse;
      })
    );

    // Create new plugin
    ipcMain.handle(
      IPC_CHANNELS.PLUGINS_CREATE,
      this.handleIPCCall(PluginCreateRequestSchema, async (data) => {
        const plugin = await this.databaseManager.createPlugin(data as any);
        return plugin as PluginResponse;
      })
    );

    // Update plugin
    ipcMain.handle(
      IPC_CHANNELS.PLUGINS_UPDATE,
      this.handleIPCCall(PluginUpdateRequestSchema, async (data) => {
        const { id, ...updateData } = data;
        const plugin = await this.databaseManager.updatePlugin(id, updateData as any);
        if (!plugin) {
          throw new Error(`Plugin with ID ${id} not found`);
        }
        return plugin as PluginResponse;
      })
    );

    // Delete plugin
    ipcMain.handle(
      IPC_CHANNELS.PLUGINS_DELETE,
      this.handleIPCCall(IdRequestSchema, async (data) => {
        const deleted = await this.databaseManager.deletePlugin(data.id);
        if (!deleted) {
          throw new Error(`Plugin with ID ${data.id} not found`);
        }
        return deleted;
      })
    );

    // Toggle plugin enabled/disabled
    ipcMain.handle(
      IPC_CHANNELS.PLUGINS_TOGGLE,
      this.handleIPCCall(PluginToggleRequestSchema, async (data) => {
        const plugin = await this.databaseManager.togglePlugin(data.id, data.enabled);
        if (!plugin) {
          throw new Error(`Plugin with ID ${data.id} not found`);
        }
        return plugin as PluginResponse;
      })
    );
  }

  /**
   * Register database-related IPC handlers
   */
  private registerDatabaseHandlers(): void {
    // Check database health
    ipcMain.handle(
      IPC_CHANNELS.DATABASE_HEALTH,
      this.handleIPCCall(z.void(), async () => {
        return this.databaseManager.isHealthy();
      })
    );

    // Get database statistics
    ipcMain.handle(
      IPC_CHANNELS.DATABASE_STATS,
      this.handleIPCCall(z.void(), async () => {
        const stats = this.databaseManager.getStats();
        return stats as DatabaseStats | null;
      })
    );

    // Create database backup
    ipcMain.handle(
      IPC_CHANNELS.DATABASE_BACKUP,
      this.handleIPCCall(BackupRequestSchema, async (data) => {
        await this.databaseManager.createBackup(data.path);
        return undefined;
      })
    );
  }
}

export default IPCHandlers;
