import { PersonaData } from '../../../shared/types/persona';
import { ServiceHealth } from '../../../shared/types/system';

export interface IPersonaManager {
  // Lifecycle management
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  isInitialized(): boolean;

  // Core persona operations
  create(data: unknown): Promise<PersonaData>;
  update(id: string, data: Partial<PersonaData>): Promise<PersonaData>;
  delete(id: string): Promise<void>;
  get(id: string): Promise<PersonaData | null>;
  getAll(): Promise<PersonaData[]>;

  // Persona state management
  activate(id: string): Promise<void>;
  deactivate(id: string): Promise<void>;
  getActivePersonas(): Promise<PersonaData[]>;

  // Search and filtering
  search(query: string, options?: {
    limit?: number;
    includeInactive?: boolean;
  }): Promise<PersonaData[]>;

  findByTags(tags: string[]): Promise<PersonaData[]>;

  // Persona analytics
  getPersonaStats(id: string): Promise<{
    memoryCount: number;
    lastInteraction: Date;
    averageImportance: number;
    totalInteractions: number;
  }>;

  getPersonaUsageMetrics(): Promise<{
    totalPersonas: number;
    activePersonas: number;
    averageMemoryCount: number;
    mostUsedPersona: PersonaData | null;
  }>;

  // Validation and backup
  validatePersona(data: unknown): Promise<PersonaData>;
  exportPersona(id: string): Promise<string>;
  importPersona(data: string): Promise<PersonaData>;

  // Health monitoring
  getHealthStatus(): Promise<ServiceHealth>;
}