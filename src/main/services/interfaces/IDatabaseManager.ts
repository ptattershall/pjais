import { MemoryEntity } from '../../../shared/types/memory';
import { PersonaData } from '../../../shared/types/persona';
import { ServiceHealth } from '../../../shared/types/system';

export interface DatabaseConfig {
  dataPath?: string;
  encryptionKey?: string;
  enableEncryption?: boolean;
}

export interface DatabaseQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

export interface DatabaseTransaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  execute<T>(query: string, params?: unknown[]): Promise<T>;
}

export interface IDatabaseManager {
  // Lifecycle management
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  isInitialized(): boolean;

  // Connection management
  getConnection(): Promise<unknown>;
  closeConnection(): Promise<void>;
  testConnection(): Promise<boolean>;

  // Transaction management
  beginTransaction(): Promise<DatabaseTransaction>;
  executeInTransaction<T>(operation: (transaction: DatabaseTransaction) => Promise<T>): Promise<T>;

  // Memory operations
  createMemory(memory: MemoryEntity): Promise<MemoryEntity>;
  updateMemory(id: string, updates: Partial<MemoryEntity>): Promise<MemoryEntity>;
  deleteMemory(id: string): Promise<void>;
  getMemory(id: string): Promise<MemoryEntity | null>;
  getAllMemories(options?: DatabaseQueryOptions): Promise<MemoryEntity[]>;
  searchMemories(query: string, options?: DatabaseQueryOptions): Promise<MemoryEntity[]>;

  // Persona operations
  createPersona(persona: PersonaData): Promise<PersonaData>;
  updatePersona(id: string, updates: Partial<PersonaData>): Promise<PersonaData>;
  deletePersona(id: string): Promise<void>;
  getPersona(id: string): Promise<PersonaData | null>;
  getAllPersonas(options?: DatabaseQueryOptions): Promise<PersonaData[]>;
  searchPersonas(query: string, options?: DatabaseQueryOptions): Promise<PersonaData[]>;

  // Database maintenance
  vacuum(): Promise<void>;
  analyze(): Promise<void>;
  backup(path: string): Promise<void>;
  restore(path: string): Promise<void>;

  // Database statistics
  getTableStats(): Promise<{
    memories: { count: number; size: number };
    personas: { count: number; size: number };
    relationships: { count: number; size: number };
  }>;

  getDatabaseSize(): Promise<number>;
  getIndexUsage(): Promise<Array<{
    table: string;
    index: string;
    usage: number;
  }>>;

  // Schema management
  migrateSchema(version: number): Promise<void>;
  getCurrentSchemaVersion(): Promise<number>;
  validateSchema(): Promise<boolean>;

  // Health monitoring
  getHealthStatus(): Promise<ServiceHealth>;
}