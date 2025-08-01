import { Effect, Context } from 'effect';
import { PersonaRepository, PersonaRepositoryLive } from '../database/persona-repository';
import { MemoryRepository, MemoryRepositoryLive } from '../database/memory-repository';
import { DatabaseService } from '../database/database-service';
import { PersonaData } from '../../shared/types/persona';
import { MemoryEntity } from '../../shared/types/memory';
import { events, reactiveEventEmitter } from '../../livestore/schema';

// Database service context
const DatabaseContext = Context.make(PersonaRepository, PersonaRepositoryLive).pipe(
  Context.add(MemoryRepository, MemoryRepositoryLive)
);

export class HybridDatabaseManager {
  private initialized = false;
  private effectSQL: DatabaseService;

  constructor() {
    this.effectSQL = DatabaseService;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize Effect SQL (existing system)
    await Effect.runPromise(
      DatabaseService.initialize.pipe(
        Effect.provide(DatabaseService)
      )
    );

    this.initialized = true;
    console.log('Hybrid database manager initialized');
  }

  // =============================================================================
  // PERSONA OPERATIONS
  // =============================================================================

  async createPersona(data: Omit<PersonaData, 'id'>): Promise<string> {
    const id = await Effect.runPromise(
      PersonaRepository.create(data).pipe(
        Effect.provide(DatabaseContext)
      )
    );

    // Trigger LiveStore event
    const personaData: PersonaData = { id, ...data };
    events.personaCreated(personaData);
    
    // Also trigger backward compatibility event
    reactiveEventEmitter.emit('personas:updated', personaData);
    
    return id;
  }

  async updatePersona(id: string, updates: Partial<PersonaData>): Promise<PersonaData | null> {
    const updatedPersona = await Effect.runPromise(
      PersonaRepository.update(id, updates).pipe(
        Effect.provide(DatabaseContext)
      )
    );

    if (updatedPersona) {
      // Trigger LiveStore event
      events.personaUpdated({ id, updates });
      
      // Also trigger backward compatibility event
      reactiveEventEmitter.emit('personas:updated', updatedPersona);
    }

    return updatedPersona;
  }

  async deletePersona(id: string): Promise<boolean> {
    const success = await Effect.runPromise(
      PersonaRepository.delete(id).pipe(
        Effect.provide(DatabaseContext)
      )
    );

    if (success) {
      // Trigger LiveStore event
      events.personaDeactivated({ id });
      
      // Also trigger backward compatibility event
      reactiveEventEmitter.emit('personas:updated', { id });
    }

    return success;
  }

  async activatePersona(id: string): Promise<boolean> {
    const success = await Effect.runPromise(
      PersonaRepository.update(id, { isActive: true }).pipe(
        Effect.provide(DatabaseContext)
      )
    );

    if (success) {
      // Trigger LiveStore event
      events.personaActivated({ id });
      
      // Also trigger backward compatibility event
      reactiveEventEmitter.emit('personas:updated', { id, isActive: true });
    }

    return success;
  }

  async deactivatePersona(id: string): Promise<boolean> {
    const success = await Effect.runPromise(
      PersonaRepository.update(id, { isActive: false }).pipe(
        Effect.provide(DatabaseContext)
      )
    );

    if (success) {
      // Trigger LiveStore event
      events.personaDeactivated({ id });
      
      // Also trigger backward compatibility event
      reactiveEventEmitter.emit('personas:updated', { id, isActive: false });
    }

    return success;
  }

  // =============================================================================
  // MEMORY OPERATIONS
  // =============================================================================

  async createMemory(data: Omit<MemoryEntity, 'id'>): Promise<string> {
    const id = await Effect.runPromise(
      MemoryRepository.create(data).pipe(
        Effect.provide(DatabaseContext)
      )
    );

    // Trigger LiveStore event
    const memoryData: MemoryEntity = { id, ...data };
    events.memoryEntityCreated(memoryData);

    // Also trigger backward compatibility event
    reactiveEventEmitter.emit('memoryEntities:updated', memoryData);

    return id;
  }

  async updateMemory(id: string, updates: Partial<MemoryEntity>): Promise<MemoryEntity | null> {
    const updatedMemory = await Effect.runPromise(
      MemoryRepository.update(id, updates).pipe(
        Effect.provide(DatabaseContext)
      )
    );

    if (updatedMemory) {
      // Trigger LiveStore event
      events.memoryEntityUpdated({ id, updates });
      
      // Also trigger backward compatibility event
      reactiveEventEmitter.emit('memoryEntities:updated', updatedMemory);
    }

    return updatedMemory;
  }

  async deleteMemory(id: string): Promise<boolean> {
    const success = await Effect.runPromise(
      MemoryRepository.delete(id).pipe(
        Effect.provide(DatabaseContext)
      )
    );

    if (success) {
      // Trigger LiveStore event
      events.memoryEntityDeleted({ id, deletedAt: new Date() });
      
      // Also trigger backward compatibility event
      reactiveEventEmitter.emit('memoryEntities:updated', { id });
    }

    return success;
  }

  async accessMemory(id: string): Promise<MemoryEntity | null> {
    const memory = await Effect.runPromise(
      MemoryRepository.getById(id).pipe(
        Effect.provide(DatabaseContext)
      )
    );

    if (memory) {
      // Update access count and last accessed
      await this.updateMemory(id, {
        accessCount: (memory.accessCount || 0) + 1,
        lastAccessed: new Date()
      });

      // Trigger LiveStore event
      events.memoryEntityAccessed({ id, accessedAt: new Date() });
      
      // Also trigger backward compatibility event
      reactiveEventEmitter.emit('memoryEntities:updated', memory);
    }

    return memory;
  }

  // =============================================================================
  // QUERY OPERATIONS (Effect SQL)
  // =============================================================================

  async getActivePersona(): Promise<PersonaData | null> {
    return Effect.runPromise(
      PersonaRepository.getActive().pipe(
        Effect.provide(DatabaseContext)
      )
    ).catch(() => null);
  }

  async getAllPersonas(): Promise<PersonaData[]> {
    return Effect.runPromise(
      PersonaRepository.getAll().pipe(
        Effect.provide(DatabaseContext)
      )
    ).catch(() => []);
  }

  async getPersonaById(id: string): Promise<PersonaData | null> {
    return Effect.runPromise(
      PersonaRepository.getById(id).pipe(
        Effect.provide(DatabaseContext)
      )
    ).catch(() => null);
  }

  async getMemoriesByPersonaId(personaId: string): Promise<MemoryEntity[]> {
    return Effect.runPromise(
      MemoryRepository.getByPersonaId(personaId).pipe(
        Effect.provide(DatabaseContext)
      )
    ).catch(() => []);
  }

  async getMemoryById(id: string): Promise<MemoryEntity | null> {
    return Effect.runPromise(
      MemoryRepository.getById(id).pipe(
        Effect.provide(DatabaseContext)
      )
    ).catch(() => null);
  }

  async getMemoriesByTier(personaId: string, tier: string): Promise<MemoryEntity[]> {
    return Effect.runPromise(
      MemoryRepository.getByPersonaId(personaId).pipe(
        Effect.map(memories => memories.filter(m => m.memoryTier === tier)),
        Effect.provide(DatabaseContext)
      )
    ).catch(() => []);
  }

  // =============================================================================
  // REACTIVE QUERY HELPERS (Backward Compatibility)
  // =============================================================================

  getActivePersona$() {
    return {
      subscribe: (callback: (data: PersonaData | null) => void) => {
        const handler = () => {
          this.getActivePersona().then(callback);
        };

        reactiveEventEmitter.on('personas:updated', handler);
        handler(); // Initial call

        return () => {
          reactiveEventEmitter.off('personas:updated', handler);
        };
      }
    };
  }

  getAllPersonas$() {
    return {
      subscribe: (callback: (data: PersonaData[]) => void) => {
        const handler = () => {
          this.getAllPersonas().then(callback);
        };

        reactiveEventEmitter.on('personas:updated', handler);
        handler(); // Initial call

        return () => {
          reactiveEventEmitter.off('personas:updated', handler);
        };
      }
    };
  }

  getPersonaById$(id: string) {
    return {
      subscribe: (callback: (data: PersonaData | null) => void) => {
        const handler = () => {
          this.getPersonaById(id).then(callback);
        };

        reactiveEventEmitter.on('personas:updated', handler);
        handler(); // Initial call

        return () => {
          reactiveEventEmitter.off('personas:updated', handler);
        };
      }
    };
  }

  getMemoriesByPersonaId$(personaId: string) {
    return {
      subscribe: (callback: (data: MemoryEntity[]) => void) => {
        const handler = () => {
          this.getMemoriesByPersonaId(personaId).then(callback);
        };

        reactiveEventEmitter.on('memoryEntities:updated', handler);
        handler(); // Initial call

        return () => {
          reactiveEventEmitter.off('memoryEntities:updated', handler);
        };
      }
    };
  }

  getMemoriesByTier$(personaId: string, tier: string) {
    return {
      subscribe: (callback: (data: MemoryEntity[]) => void) => {
        const handler = () => {
          this.getMemoriesByTier(personaId, tier).then(callback);
        };

        reactiveEventEmitter.on('memoryEntities:updated', handler);
        handler(); // Initial call

        return () => {
          reactiveEventEmitter.off('memoryEntities:updated', handler);
        };
      }
    };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  isInitialized(): boolean {
    return this.initialized;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.getActivePersona();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // =============================================================================
  // EVENT EMITTER ACCESS (for backward compatibility)
  // =============================================================================

  getEventEmitter() {
    return reactiveEventEmitter;
  }
}

// Export singleton instance
export const hybridDatabaseManager = new HybridDatabaseManager(); 