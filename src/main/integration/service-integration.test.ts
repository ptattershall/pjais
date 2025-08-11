import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DependencyContainer, setupTestContainer } from '../services/DependencyContainer';
import { IMemoryManager, IPersonaManager, IDatabaseManager, ISecurityManager } from '../services/interfaces';

describe('Service Integration Tests', () => {
  let container: DependencyContainer;
  let memoryManager: IMemoryManager;
  let personaManager: IPersonaManager;
  let databaseManager: IDatabaseManager;
  let securityManager: ISecurityManager;

  beforeEach(async () => {
    container = setupTestContainer();
    await container.initializeAll();
    
    memoryManager = await container.get('memoryManager');
    personaManager = await container.get('personaManager');
    databaseManager = await container.get('databaseManager');
    securityManager = await container.get('securityManager');
  });

  afterEach(async () => {
    await container.shutdownAll();
  });

  describe('Memory-Persona Integration', () => {
    it('should create persona and associated memories', async () => {
      // Create a persona
      const persona = await personaManager.create({
        name: 'Test Assistant',
        description: 'A helpful assistant for testing',
        personality: {
          traits: ['helpful', 'analytical'],
          temperament: 'balanced'
        },
        isActive: true
      });

      expect(persona.id).toBeDefined();
      expect(persona.name).toBe('Test Assistant');

      // Create memories associated with the persona
      const memory1 = await memoryManager.createMemory({
        content: 'Remember user preferences for dark mode',
        type: 'text' as const,
        personaId: persona.id!,
        importance: 8,
        tags: ['ui', 'preferences']
      });

      const memory2 = await memoryManager.createMemory({
        content: 'User asked about JavaScript best practices',
        type: 'text' as const,
        personaId: persona.id!,
        importance: 6,
        tags: ['javascript', 'programming']
      });

      expect(memory1.personaId).toBe(persona.id);
      expect(memory2.personaId).toBe(persona.id);

      // Verify memories are retrievable
      const retrievedMemory1 = await memoryManager.getMemory(memory1.id!);
      const retrievedMemory2 = await memoryManager.getMemory(memory2.id!);

      expect(retrievedMemory1?.content).toBe('Remember user preferences for dark mode');
      expect(retrievedMemory2?.content).toBe('User asked about JavaScript best practices');
    });

    it('should handle persona deletion with associated memories', async () => {
      // Create persona and memory
      const persona = await personaManager.create({
        name: 'Temporary Assistant',
        description: 'Assistant that will be deleted',
        isActive: true
      });

      const memory = await memoryManager.createMemory({
        content: 'Temporary memory content',
        type: 'text' as const,
        personaId: persona.id!,
        importance: 5
      });

      // Delete the persona
      await personaManager.delete(persona.id!);

      // Verify persona is deleted
      const deletedPersona = await personaManager.get(persona.id!);
      expect(deletedPersona).toBeNull();

      // Memory should still exist but be orphaned or handled appropriately
      const orphanedMemory = await memoryManager.getMemory(memory.id!);
      expect(orphanedMemory).toBeDefined();
    });
  });

  describe('Database Transaction Integration', () => {
    it('should handle complex multi-service transactions', async () => {
      // This test would verify that operations across services maintain consistency
      const persona = await personaManager.create({
        name: 'Transaction Test',
        description: 'Testing transaction handling',
        isActive: true
      });

      const memories = await Promise.all([
        memoryManager.createMemory({
          content: 'Memory 1',
          type: 'text' as const,
          personaId: persona.id!,
          importance: 5
        }),
        memoryManager.createMemory({
          content: 'Memory 2',
          type: 'text' as const,
          personaId: persona.id!,
          importance: 7
        })
      ]);

      // Create relationships between memories
      await memoryManager.createRelationship(
        memories[0].id!,
        memories[1].id!,
        'related',
        { strength: 0.8 }
      );

      // Verify all data was created successfully
      const retrievedPersona = await personaManager.get(persona.id!);
      const retrievedMemories = await Promise.all(
        memories.map(m => memoryManager.getMemory(m.id!))
      );
      const relationships = await memoryManager.getRelationships(memories[0].id!);

      expect(retrievedPersona).toBeDefined();
      expect(retrievedMemories.every(m => m !== null)).toBe(true);
      expect(relationships.length).toBeGreaterThan(0);
    });
  });

  describe('Security Integration', () => {
    it('should enforce security policies across services', async () => {
      // Create a security policy
      await securityManager.createPolicy({
        name: 'Content Validation',
        description: 'Validate all content before storage',
        rules: [{
          id: 'content-validation',
          type: 'validation',
          condition: 'content.length > 0',
          action: 'allow',
          priority: 1
        }],
        enabled: true
      });

      // Test valid content
      const validMemory = await memoryManager.createMemory({
        content: 'Valid memory content',
        type: 'text' as const,
        importance: 5
      });

      expect(validMemory.content).toBe('Valid memory content');

      // Test content validation
      const validationResult = await securityManager.validateContent(
        'Test content for validation',
        'memory'
      );

      expect(validationResult.isValid).toBe(true);
    });

    it('should log security events across services', async () => {
      // Create a memory (this should generate security events)
      await memoryManager.createMemory({
        content: 'Security test memory',
        type: 'text' as const,
        importance: 5
      });

      // Get security events
      const events = await securityManager.getSecurityEvents({
        type: 'access',
        limit: 10
      });

      expect(events).toBeInstanceOf(Array);
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent operations across services', async () => {
      const startTime = Date.now();
      
      // Perform multiple operations concurrently
      const operations = await Promise.all([
        // Create multiple personas
        personaManager.create({
          name: 'Concurrent Test 1',
          description: 'First concurrent persona',
          isActive: true
        }),
        personaManager.create({
          name: 'Concurrent Test 2',
          description: 'Second concurrent persona',
          isActive: true
        }),
        // Create memories
        memoryManager.createMemory({
          content: 'Concurrent memory 1',
          type: 'text' as const,
          importance: 5
        }),
        memoryManager.createMemory({
          content: 'Concurrent memory 2',
          type: 'text' as const,
          importance: 7
        }),
        // Get health status
        memoryManager.getHealthStatus(),
        personaManager.getHealthStatus()
      ]);

      const duration = Date.now() - startTime;
      
      expect(operations.length).toBe(6);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      
      // Verify all operations completed successfully
      const [persona1, persona2, memory1, memory2, memoryHealth, personaHealth] = operations;
      
      expect(persona1.name).toBe('Concurrent Test 1');
      expect(persona2.name).toBe('Concurrent Test 2');
      expect(memory1.content).toBe('Concurrent memory 1');
      expect(memory2.content).toBe('Concurrent memory 2');
      expect(memoryHealth.status).toBe('healthy');
      expect(personaHealth.status).toBe('healthy');
    });

    it('should maintain performance under load', async () => {
      const batchSize = 50;
      const startTime = Date.now();

      // Create multiple personas and memories in batch
      const personas = await Promise.all(
        Array(batchSize).fill(null).map((_, i) =>
          personaManager.create({
            name: `Load Test Persona ${i}`,
            description: `Load test persona number ${i}`,
            isActive: true
          })
        )
      );

      const memories = await Promise.all(
        personas.map((persona, i) =>
          memoryManager.createMemory({
            content: `Load test memory ${i}`,
            type: 'text' as const,
            personaId: persona.id!,
            importance: Math.floor(Math.random() * 10) + 1
          })
        )
      );

      const duration = Date.now() - startTime;
      
      expect(personas.length).toBe(batchSize);
      expect(memories.length).toBe(batchSize);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle cascading failures gracefully', async () => {
      // Create a persona
      const persona = await personaManager.create({
        name: 'Error Test Persona',
        description: 'Testing error handling',
        isActive: true
      });

      // Create a memory
      const memory = await memoryManager.createMemory({
        content: 'Error test memory',
        type: 'text' as const,
        personaId: persona.id!,
        importance: 5
      });

      // Simulate database error during memory retrieval
      const mockDbManager = await container.get('databaseManager');
      vi.spyOn(mockDbManager, 'getMemory').mockRejectedValue(new Error('Database connection failed'));

      // Should handle the error gracefully
      await expect(memoryManager.getMemory(memory.id!)).rejects.toThrow('Database connection failed');
    });

    it('should maintain data integrity during partial failures', async () => {
      // Create a persona
      const persona = await personaManager.create({
        name: 'Integrity Test Persona',
        description: 'Testing data integrity',
        isActive: true
      });

      // Try to create memory with invalid data
      await expect(memoryManager.createMemory({
        content: '', // Invalid: empty content
        type: 'text' as const,
        personaId: persona.id!,
        importance: 5
      })).rejects.toThrow();

      // Persona should still exist
      const retrievedPersona = await personaManager.get(persona.id!);
      expect(retrievedPersona).toBeDefined();
      expect(retrievedPersona?.name).toBe('Integrity Test Persona');
    });
  });

  describe('Health Monitoring Integration', () => {
    it('should provide comprehensive system health across all services', async () => {
      const healthChecks = await Promise.all([
        memoryManager.getHealthStatus(),
        personaManager.getHealthStatus(),
        databaseManager.getHealthStatus(),
        securityManager.getHealthStatus()
      ]);

      healthChecks.forEach(health => {
        expect(health.status).toBe('healthy');
        expect(health.service).toBeDefined();
        expect(health.details).toBeDefined();
      });
    });

    it('should detect and report service degradation', async () => {
      // Create some load to potentially affect performance
      await Promise.all([
        memoryManager.createMemory({
          content: 'Performance test memory 1',
          type: 'text' as const,
          importance: 5
        }),
        memoryManager.createMemory({
          content: 'Performance test memory 2',
          type: 'text' as const,
          importance: 7
        }),
        personaManager.create({
          name: 'Performance Test Persona',
          description: 'Testing performance impact',
          isActive: true
        })
      ]);

      // Health should still be good
      const health = await memoryManager.getHealthStatus();
      expect(health.status).toBe('healthy');
    });
  });
});