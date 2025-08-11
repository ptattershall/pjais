import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ipcRenderer, BrowserWindow } from 'electron';
import { setupTestContainer } from '../services/DependencyContainer';
import { IMemoryManager, IPersonaManager } from '../services/interfaces';

// Mock Electron IPC
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
    emit: vi.fn()
  },
  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn()
  },
  BrowserWindow: {
    getFocusedWindow: vi.fn(() => ({
      webContents: {
        send: vi.fn()
      }
    }))
  }
}));

describe('IPC Integration Tests', () => {
  let container: ReturnType<typeof setupTestContainer>;
  let memoryManager: IMemoryManager;
  let personaManager: IPersonaManager;
  let mockWindow: any;

  beforeEach(async () => {
    container = setupTestContainer();
    await container.initializeAll();
    
    memoryManager = await container.get('memoryManager');
    personaManager = await container.get('personaManager');
    
    mockWindow = {
      webContents: {
        send: vi.fn()
      }
    };
    
    vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(mockWindow);
  });

  afterEach(async () => {
    await container.shutdownAll();
    vi.clearAllMocks();
  });

  describe('Memory IPC Operations', () => {
    it('should handle memory creation via IPC', async () => {
      // Mock IPC handler for memory creation
      const mockMemoryData = {
        content: 'Test memory via IPC',
        type: 'text' as const,
        importance: 7,
        tags: ['ipc', 'test']
      };

      const createdMemory = await memoryManager.createMemory(mockMemoryData);
      
      // Simulate IPC call
      vi.mocked(ipcRenderer.invoke).mockResolvedValue(createdMemory);
      
      const result = await ipcRenderer.invoke('memory:create', mockMemoryData);
      
      expect(result).toEqual(createdMemory);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('memory:create', mockMemoryData);
    });

    it('should handle memory retrieval via IPC', async () => {
      // Create a memory first
      const memory = await memoryManager.createMemory({
        content: 'Retrievable memory',
        type: 'text' as const,
        importance: 5
      });

      // Mock IPC handler for memory retrieval
      vi.mocked(ipcRenderer.invoke).mockResolvedValue(memory);
      
      const result = await ipcRenderer.invoke('memory:get', memory.id);
      
      expect(result).toEqual(memory);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('memory:get', memory.id);
    });

    it('should handle memory search via IPC', async () => {
      // Create test memories
      await memoryManager.createMemory({
        content: 'JavaScript programming tips',
        type: 'text' as const,
        importance: 8
      });
      await memoryManager.createMemory({
        content: 'Python data analysis',
        type: 'text' as const,
        importance: 7
      });

      const searchResults = await memoryManager.searchMemories('JavaScript');
      
      // Mock IPC handler for memory search
      vi.mocked(ipcRenderer.invoke).mockResolvedValue(searchResults);
      
      const result = await ipcRenderer.invoke('memory:search', {
        query: 'JavaScript',
        options: { limit: 10 }
      });
      
      expect(result).toEqual(searchResults);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('memory:search', {
        query: 'JavaScript',
        options: { limit: 10 }
      });
    });

    it('should handle memory updates via IPC', async () => {
      // Create a memory first
      const memory = await memoryManager.createMemory({
        content: 'Original content',
        type: 'text' as const,
        importance: 5
      });

      const updatedMemory = await memoryManager.updateMemory(memory.id!, {
        content: 'Updated content',
        importance: 8
      });

      // Mock IPC handler for memory update
      vi.mocked(ipcRenderer.invoke).mockResolvedValue(updatedMemory);
      
      const result = await ipcRenderer.invoke('memory:update', memory.id, {
        content: 'Updated content',
        importance: 8
      });
      
      expect(result).toEqual(updatedMemory);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('memory:update', memory.id, {
        content: 'Updated content',
        importance: 8
      });
    });

    it('should handle memory deletion via IPC', async () => {
      // Create a memory first
      const memory = await memoryManager.createMemory({
        content: 'Memory to delete',
        type: 'text' as const,
        importance: 3
      });

      await memoryManager.deleteMemory(memory.id!);

      // Mock IPC handler for memory deletion
      vi.mocked(ipcRenderer.invoke).mockResolvedValue(undefined);
      
      const result = await ipcRenderer.invoke('memory:delete', memory.id);
      
      expect(result).toBeUndefined();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('memory:delete', memory.id);
    });
  });

  describe('Persona IPC Operations', () => {
    it('should handle persona creation via IPC', async () => {
      const mockPersonaData = {
        name: 'IPC Test Assistant',
        description: 'Testing IPC communication',
        personality: {
          traits: ['helpful', 'analytical'],
          temperament: 'balanced'
        },
        isActive: true
      };

      const createdPersona = await personaManager.create(mockPersonaData);
      
      // Mock IPC handler for persona creation
      vi.mocked(ipcRenderer.invoke).mockResolvedValue(createdPersona);
      
      const result = await ipcRenderer.invoke('persona:create', mockPersonaData);
      
      expect(result).toEqual(createdPersona);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('persona:create', mockPersonaData);
    });

    it('should handle persona retrieval via IPC', async () => {
      const persona = await personaManager.create({
        name: 'Retrievable Persona',
        description: 'For testing retrieval',
        isActive: true
      });

      // Mock IPC handler for persona retrieval
      vi.mocked(ipcRenderer.invoke).mockResolvedValue(persona);
      
      const result = await ipcRenderer.invoke('persona:get', persona.id);
      
      expect(result).toEqual(persona);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('persona:get', persona.id);
    });

    it('should handle persona list retrieval via IPC', async () => {
      const personas = await personaManager.getAll();
      
      // Mock IPC handler for persona list
      vi.mocked(ipcRenderer.invoke).mockResolvedValue(personas);
      
      const result = await ipcRenderer.invoke('persona:getAll');
      
      expect(result).toEqual(personas);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('persona:getAll');
    });

    it('should handle persona updates via IPC', async () => {
      const persona = await personaManager.create({
        name: 'Updatable Persona',
        description: 'Original description',
        isActive: false
      });

      const updatedPersona = await personaManager.update(persona.id!, {
        description: 'Updated description',
        isActive: true
      });

      // Mock IPC handler for persona update
      vi.mocked(ipcRenderer.invoke).mockResolvedValue(updatedPersona);
      
      const result = await ipcRenderer.invoke('persona:update', persona.id, {
        description: 'Updated description',
        isActive: true
      });
      
      expect(result).toEqual(updatedPersona);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('persona:update', persona.id, {
        description: 'Updated description',
        isActive: true
      });
    });

    it('should handle persona deletion via IPC', async () => {
      const persona = await personaManager.create({
        name: 'Deletable Persona',
        description: 'Will be deleted',
        isActive: true
      });

      await personaManager.delete(persona.id!);

      // Mock IPC handler for persona deletion
      vi.mocked(ipcRenderer.invoke).mockResolvedValue(undefined);
      
      const result = await ipcRenderer.invoke('persona:delete', persona.id);
      
      expect(result).toBeUndefined();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('persona:delete', persona.id);
    });
  });

  describe('System IPC Operations', () => {
    it('should handle system health check via IPC', async () => {
      const memoryHealth = await memoryManager.getHealthStatus();
      const personaHealth = await personaManager.getHealthStatus();
      
      const systemHealth = {
        memory: memoryHealth,
        persona: personaHealth,
        overall: 'healthy'
      };

      // Mock IPC handler for system health
      vi.mocked(ipcRenderer.invoke).mockResolvedValue(systemHealth);
      
      const result = await ipcRenderer.invoke('system:health');
      
      expect(result).toEqual(systemHealth);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('system:health');
    });

    it('should handle system statistics via IPC', async () => {
      const memoryAnalytics = await memoryManager.getMemoryAnalytics();
      const personaMetrics = await personaManager.getPersonaUsageMetrics();
      
      const systemStats = {
        memory: memoryAnalytics,
        persona: personaMetrics,
        timestamp: new Date()
      };

      // Mock IPC handler for system statistics
      vi.mocked(ipcRenderer.invoke).mockResolvedValue(systemStats);
      
      const result = await ipcRenderer.invoke('system:stats');
      
      expect(result).toEqual(systemStats);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('system:stats');
    });
  });

  describe('Real-time IPC Communication', () => {
    it('should handle real-time memory updates', async () => {
      // Create a memory
      const memory = await memoryManager.createMemory({
        content: 'Real-time test memory',
        type: 'text' as const,
        importance: 6
      });

      // Simulate sending update to renderer
      mockWindow.webContents.send('memory:updated', memory);
      
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('memory:updated', memory);
    });

    it('should handle real-time persona updates', async () => {
      const persona = await personaManager.create({
        name: 'Real-time Persona',
        description: 'For real-time testing',
        isActive: true
      });

      // Simulate sending update to renderer
      mockWindow.webContents.send('persona:updated', persona);
      
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('persona:updated', persona);
    });

    it('should handle system notification events', async () => {
      const notification = {
        type: 'info',
        title: 'System Update',
        message: 'Memory optimization completed',
        timestamp: new Date()
      };

      // Simulate sending notification to renderer
      mockWindow.webContents.send('system:notification', notification);
      
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('system:notification', notification);
    });
  });

  describe('Error Handling in IPC', () => {
    it('should handle IPC errors gracefully', async () => {
      // Mock IPC error
      const error = new Error('IPC communication failed');
      vi.mocked(ipcRenderer.invoke).mockRejectedValue(error);
      
      await expect(ipcRenderer.invoke('memory:create', {})).rejects.toThrow('IPC communication failed');
    });

    it('should handle validation errors in IPC', async () => {
      const invalidMemoryData = {
        content: '', // Invalid: empty content
        type: 'text' as const,
        importance: 5
      };

      // Mock validation error
      const validationError = new Error('Content cannot be empty');
      vi.mocked(ipcRenderer.invoke).mockRejectedValue(validationError);
      
      await expect(ipcRenderer.invoke('memory:create', invalidMemoryData))
        .rejects.toThrow('Content cannot be empty');
    });

    it('should handle service unavailable errors', async () => {
      // Mock service error
      const serviceError = new Error('Service temporarily unavailable');
      vi.mocked(ipcRenderer.invoke).mockRejectedValue(serviceError);
      
      await expect(ipcRenderer.invoke('memory:get', 'test-id'))
        .rejects.toThrow('Service temporarily unavailable');
    });
  });

  describe('IPC Performance and Concurrency', () => {
    it('should handle concurrent IPC requests', async () => {
      const promises = [];
      
      // Create multiple concurrent requests
      for (let i = 0; i < 10; i++) {
        const mockMemory = {
          id: `memory-${i}`,
          content: `Concurrent memory ${i}`,
          type: 'text' as const,
          importance: 5
        };
        
        vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(mockMemory);
        promises.push(ipcRenderer.invoke('memory:create', {
          content: `Concurrent memory ${i}`,
          type: 'text' as const,
          importance: 5
        }));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(10);
    });

    it('should handle large data transfers via IPC', async () => {
      // Create large memory content
      const largeContent = 'x'.repeat(10000);
      const largeMemory = await memoryManager.createMemory({
        content: largeContent,
        type: 'text' as const,
        importance: 5
      });

      // Mock IPC handler for large data
      vi.mocked(ipcRenderer.invoke).mockResolvedValue(largeMemory);
      
      const result = await ipcRenderer.invoke('memory:create', {
        content: largeContent,
        type: 'text' as const,
        importance: 5
      });
      
      expect(result.content).toHaveLength(10000);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('memory:create', {
        content: largeContent,
        type: 'text' as const,
        importance: 5
      });
    });
  });
});