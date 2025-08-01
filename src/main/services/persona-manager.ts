import { MemoryManager } from './memory-manager';
import { PlatformUtils } from '../utils/platform';
import { join } from 'path';
import { PersonaData, PersonaDataSchema } from '../../shared/types/persona';
import { ServiceHealth } from '../../shared/types/system';

export class PersonaManager {
  private personas: Map<string, PersonaData> = new Map();
  private memoryManager: MemoryManager;
  private personasPath: string;
  private isInitialized = false;

  constructor(memoryManager: MemoryManager) {
    this.memoryManager = memoryManager;
    this.personasPath = PlatformUtils.getPersonasPath();
  }

  async initialize(): Promise<void> {
    console.log('Initializing PersonaManager...');
    
    try {
      await this.loadPersonas();
      console.log(`Loaded ${this.personas.size} personas`);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize PersonaManager:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down PersonaManager...');
    
    try {
      await this.saveAllPersonas();
      this.personas.clear();
      this.isInitialized = false;
    } catch (error) {
      console.error('Error during PersonaManager shutdown:', error);
    }
  }

  async create(data: unknown): Promise<PersonaData> {
    const validatedData = PersonaDataSchema.omit({ id: true }).parse(data);
    
    const id = this.generatePersonaId();
    
    const persona: PersonaData = {
      ...validatedData,
      id,
      isActive: validatedData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      memories: []
    };

    this.personas.set(id, persona);
    await this.savePersona(persona);
    
    console.log(`Created persona: ${persona.name} (${id})`);
    return persona;
  }

  async update(id: string, updates: unknown): Promise<PersonaData> {
    const validatedUpdates = PersonaDataSchema.partial().parse(updates);

    const persona = this.personas.get(id);
    if (!persona) {
      throw new Error(`Persona not found: ${id}`);
    }

    const updatedPersona: PersonaData = {
      ...persona,
      ...validatedUpdates,
      id,
      updatedAt: new Date()
    };

    this.personas.set(id, updatedPersona);
    await this.savePersona(updatedPersona);
    
    console.log(`Updated persona: ${updatedPersona.name} (${id})`);
    return updatedPersona;
  }

  async delete(id: string): Promise<boolean> {
    const persona = this.personas.get(id);
    if (!persona) {
      return false;
    }

    this.personas.delete(id);
    await this.deletePersonaFile(id);
    
    console.log(`Deleted persona: ${persona.name} (${id})`);
    return true;
  }

  async get(id: string): Promise<PersonaData | null> {
    return this.personas.get(id) || null;
  }

  async list(): Promise<PersonaData[]> {
    return Array.from(this.personas.values());
  }

  async getHealth(): Promise<ServiceHealth> {
    return {
      service: 'PersonaManager',
      status: this.isInitialized ? 'ok' : 'initializing',
      details: {
        personaCount: this.personas.size,
      },
    };
  }

  private generatePersonaId(): string {
    return `persona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadPersonas(): Promise<void> {
    try {
      const { promises: fs } = await import('fs');
      const files = await fs.readdir(this.personasPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = join(this.personasPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          const persona: PersonaData = JSON.parse(content);
          
          if (persona.createdAt) persona.createdAt = new Date(persona.createdAt);
          if (persona.updatedAt) persona.updatedAt = new Date(persona.updatedAt);
          
          this.personas.set(persona.id!, persona);
        }
      }
    } catch (error) {
      console.log('No existing personas found:', error);
    }
  }

  private async savePersona(persona: PersonaData): Promise<void> {
    try {
      const { promises: fs } = await import('fs');
      const filePath = join(this.personasPath, `${persona.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(persona, null, 2), 'utf8');
    } catch (error) {
      console.error(`Failed to save persona ${persona.id}:`, error);
      throw error;
    }
  }

  private async saveAllPersonas(): Promise<void> {
    const promises = Array.from(this.personas.values()).map(persona => 
      this.savePersona(persona)
    );
    await Promise.all(promises);
  }

  private async deletePersonaFile(id: string): Promise<void> {
    try {
      const { promises: fs } = await import('fs');
      const filePath = join(this.personasPath, `${id}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete persona file ${id}:`, error);
    }
  }
} 