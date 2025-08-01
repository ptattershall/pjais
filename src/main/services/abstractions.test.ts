import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DependencyContainer, setupTestContainer } from './DependencyContainer';
import { ServiceFactory } from './ServiceFactory';
import { MockMemoryManager } from './mocks/MockMemoryManager';
import { IMemoryManager, IPersonaManager } from './interfaces';

describe('Service Abstractions', () => {
  let container: DependencyContainer;

  beforeEach(() => {
    container = setupTestContainer();
  });

  afterEach(async () => {
    await container.shutdownAll();
  });

  describe('DependencyContainer', () => {
    it('should register and resolve services', async () => {
      const memoryManager = await container.get('memoryManager');
      expect(memoryManager).toBeDefined();
      expect(memoryManager.isInitialized()).toBe(true);
    });

    it('should handle dependencies correctly', async () => {
      const personaManager = await container.get('personaManager');
      expect(personaManager).toBeDefined();
      
      // PersonaManager depends on MemoryManager
      const memoryManager = await container.get('memoryManager');
      expect(memoryManager).toBeDefined();
    });

    it('should create singletons correctly', async () => {
      const memoryManager1 = await container.get('memoryManager');
      const memoryManager2 = await container.get('memoryManager');
      expect(memoryManager1).toBe(memoryManager2);
    });

    it('should detect circular dependencies', async () => {
      const circularContainer = new DependencyContainer();
      
      circularContainer.register({
        key: 'memoryManager',
        factory: () => container.get('personaManager') as any,
        dependencies: ['personaManager']
      });

      circularContainer.register({
        key: 'personaManager',
        factory: () => container.get('memoryManager') as any,
        dependencies: ['memoryManager']
      });

      await expect(circularContainer.get('memoryManager')).rejects.toThrow('Circular dependency');
    });
  });

  describe('MockMemoryManager', () => {
    let memoryManager: IMemoryManager;

    beforeEach(async () => {
      memoryManager = new MockMemoryManager();
      await memoryManager.initialize();
    });

    afterEach(async () => {
      await memoryManager.shutdown();
    });

    it('should create and retrieve memories', async () => {
      const memory = await memoryManager.createMemory({
        content: 'Test memory content',
        type: 'text'
      });

      expect(memory.id).toBeDefined();
      expect(memory.content).toBe('Test memory content');

      const retrieved = await memoryManager.getMemory(memory.id);
      expect(retrieved).toEqual(memory);
    });

    it('should update memories', async () => {
      const memory = await memoryManager.createMemory({
        content: 'Original content',
        type: 'text'
      });

      const updated = await memoryManager.updateMemory(memory.id, {
        content: 'Updated content'
      });

      expect(updated.content).toBe('Updated content');
      expect(updated.id).toBe(memory.id);
    });

    it('should delete memories', async () => {
      const memory = await memoryManager.createMemory({
        content: 'To be deleted',
        type: 'text'
      });

      await memoryManager.deleteMemory(memory.id);
      const retrieved = await memoryManager.getMemory(memory.id);
      expect(retrieved).toBeNull();
    });

    it('should search memories', async () => {
      await memoryManager.createMemory({
        content: 'JavaScript programming',
        type: 'text'
      });

      await memoryManager.createMemory({
        content: 'Python development',
        type: 'text'
      });

      const results = await memoryManager.searchMemories('JavaScript');
      expect(results).toHaveLength(1);
      expect(results[0].memory.content).toBe('JavaScript programming');
    });

    it('should handle memory relationships', async () => {
      const memory1 = await memoryManager.createMemory({
        content: 'Memory 1',
        type: 'text'
      });

      const memory2 = await memoryManager.createMemory({
        content: 'Memory 2',
        type: 'text'
      });

      const relationship = await memoryManager.createRelationship(
        memory1.id,
        memory2.id,
        'related'
      );

      expect(relationship.sourceId).toBe(memory1.id);
      expect(relationship.targetId).toBe(memory2.id);
      expect(relationship.type).toBe('related');

      const relationships = await memoryManager.getRelationships(memory1.id);
      expect(relationships).toHaveLength(1);
      expect(relationships[0].id).toBe(relationship.id);
    });

    it('should provide health status', async () => {
      const health = await memoryManager.getHealthStatus();
      expect(health.status).toBe('healthy');
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('ServiceFactory', () => {
    it('should create mock factory for testing', () => {
      const factory = ServiceFactory.createMockFactory();
      expect(factory).toBeDefined();
    });

    it('should handle initialization lifecycle', async () => {
      const factory = ServiceFactory.createMockFactory();
      
      // Should be able to initialize
      await expect(factory.initialize()).resolves.not.toThrow();
      
      // Should be able to shutdown
      await expect(factory.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Interface compliance', () => {
    it('should ensure MockMemoryManager implements IMemoryManager', () => {
      const mock = new MockMemoryManager();
      
      // This test ensures type compatibility
      const memoryManager: IMemoryManager = mock;
      expect(memoryManager).toBeDefined();
      expect(typeof memoryManager.initialize).toBe('function');
      expect(typeof memoryManager.createMemory).toBe('function');
      expect(typeof memoryManager.searchMemories).toBe('function');
    });

    it('should provide consistent API across implementations', async () => {
      const mock = new MockMemoryManager();
      await mock.initialize();

      // Test that all required methods exist and have correct signatures
      expect(typeof mock.createMemory).toBe('function');
      expect(typeof mock.updateMemory).toBe('function');
      expect(typeof mock.deleteMemory).toBe('function');
      expect(typeof mock.getMemory).toBe('function');
      expect(typeof mock.getAllMemories).toBe('function');
      expect(typeof mock.searchMemories).toBe('function');
      expect(typeof mock.semanticSearch).toBe('function');
      expect(typeof mock.getHealthStatus).toBe('function');

      await mock.shutdown();
    });
  });
});