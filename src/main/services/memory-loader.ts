import { join } from 'path';
import { promises as fs } from 'fs';
import { MemoryEntity } from '../../shared/types/memory';
import { PlatformUtils } from '../utils/platform';

export class MemoryLoader {
  private readonly memoryPath: string;

  constructor() {
    this.memoryPath = PlatformUtils.getMemoryPath();
  }

  async loadMemories(): Promise<Map<string, MemoryEntity>> {
    const memories = new Map<string, MemoryEntity>();
    try {
      const files = await fs.readdir(this.memoryPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = join(this.memoryPath, file);
          try {
            const content = await fs.readFile(filePath, 'utf8');
            const memory: MemoryEntity = JSON.parse(content);
            if (memory.id) {
              // Dates are stored as ISO strings, convert them back
              if (memory.createdAt) memory.createdAt = new Date(memory.createdAt);
              if (memory.lastAccessed) memory.lastAccessed = new Date(memory.lastAccessed);
              memories.set(memory.id, memory);
            }
          } catch (error) {
            console.warn(`Failed to load memory from ${file}:`, error);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        console.error('Error loading memories:', error);
      }
    }
    return memories;
  }

  async saveMemory(memory: MemoryEntity): Promise<void> {
    if (!memory.id) {
      console.error('Cannot save memory without an ID.');
      return;
    }
    try {
      const filePath = join(this.memoryPath, `${memory.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(memory, null, 2), 'utf8');
    } catch (error) {
      console.error(`Failed to save memory ${memory.id}:`, error);
    }
  }

  async deleteMemory(memoryId: string): Promise<void> {
    try {
      const filePath = join(this.memoryPath, `${memoryId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        console.error(`Failed to delete memory file ${memoryId}:`, error);
      }
    }
  }
} 