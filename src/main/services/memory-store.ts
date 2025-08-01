import { MemoryEntity } from '../../shared/types/memory';

export class MemoryStore {
  private memories: Map<string, MemoryEntity> = new Map();

  get(id: string): MemoryEntity | undefined {
    return this.memories.get(id);
  }

  set(memory: MemoryEntity): void {
    if (!memory.id) {
      throw new Error('MemoryEntity must have an id to be stored.');
    }
    this.memories.set(memory.id, memory);
  }

  delete(id: string): boolean {
    return this.memories.delete(id);
  }

  list(): MemoryEntity[] {
    return Array.from(this.memories.values());
  }

  clear(): void {
    this.memories.clear();
  }

  get size(): number {
    return this.memories.size;
  }
} 