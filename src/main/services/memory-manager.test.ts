import { describe, it, expect, vi, beforeEach, MockedClass, Mock } from 'vitest';
import { MemoryManager } from './memory-manager';
import { MemoryStore } from './memory-store';
import { MemoryLoader } from './memory-loader';
import { MemoryEntity } from '../../shared/types/memory';

vi.mock('./memory-store');
vi.mock('./memory-loader');

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;
  let mockMemoryStore: InstanceType<MockedClass<typeof MemoryStore>>;
  let mockMemoryLoader: InstanceType<MockedClass<typeof MemoryLoader>>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMemoryStore = new (MemoryStore as MockedClass<typeof MemoryStore>)();
    mockMemoryLoader = new (MemoryLoader as MockedClass<typeof MemoryLoader>)();
    
    // Default mock implementations
    (mockMemoryLoader.loadMemories as Mock).mockResolvedValue(new Map<string, MemoryEntity>());
    
    // Mock MemoryStore methods and properties properly
    Object.defineProperty(mockMemoryStore, 'size', {
      get: vi.fn(() => 0),
      configurable: true
    });
    
    (mockMemoryStore.set as Mock).mockImplementation(() => {});
    (mockMemoryStore.get as Mock).mockImplementation(() => undefined);
    (mockMemoryStore.delete as Mock).mockImplementation(() => false);
    (mockMemoryStore.list as Mock).mockImplementation(() => []);
    (mockMemoryStore.clear as Mock).mockImplementation(() => {});
    
    // Mock MemoryLoader methods
    (mockMemoryLoader.saveMemory as Mock).mockResolvedValue(undefined);
    (mockMemoryLoader.deleteMemory as Mock).mockResolvedValue(undefined);

    memoryManager = new MemoryManager(mockMemoryStore, mockMemoryLoader);
  });

  it('should initialize and load existing memories', async () => {
    const testMemory: MemoryEntity = { 
      id: '1', 
      content: 'test', 
      type: 'text', 
      importance: 50, 
      personaId: 'p1', 
      createdAt: new Date(), 
      lastAccessed: new Date() 
    };
    const memoryMap = new Map([['1', testMemory]]);
    (mockMemoryLoader.loadMemories as Mock).mockResolvedValue(memoryMap);
    
    // Mock size to return 1 after loading
    Object.defineProperty(mockMemoryStore, 'size', {
      get: vi.fn(() => 1),
      configurable: true
    });

    await memoryManager.initialize();

    expect(mockMemoryLoader.loadMemories).toHaveBeenCalledOnce();
    expect(mockMemoryStore.set).toHaveBeenCalledWith(testMemory);
    expect(mockMemoryStore.set).toHaveBeenCalledTimes(1);
  });

  it('should create a new memory entity', async () => {
    // Mock store size to return 0 initially 
    Object.defineProperty(mockMemoryStore, 'size', {
      get: vi.fn(() => 0),
      configurable: true
    });
    
    await memoryManager.initialize();

    const newMemoryData = {
      content: 'New memory content',
      type: 'text' as const,
      importance: 75,
      personaId: 'persona1',
    };
    
    const createdMemory = await memoryManager.create(newMemoryData);

    expect(createdMemory.id).toBeDefined();
    expect(createdMemory.content).toBe(newMemoryData.content);
    expect(mockMemoryStore.set).toHaveBeenCalledWith(createdMemory);
    expect(mockMemoryLoader.saveMemory).toHaveBeenCalledWith(createdMemory);
  });

  it('should retrieve an existing memory and update lastAccessed', async () => {
    // Use fake timers to control time precisely
    vi.useFakeTimers();
    const startTime = new Date('2024-01-01T00:00:00.000Z');
    vi.setSystemTime(startTime);
    
    await memoryManager.initialize();
    
    const testMemory: MemoryEntity = { 
      id: '1', 
      content: 'test', 
      type: 'text', 
      importance: 50, 
      personaId: 'p1', 
      createdAt: new Date(), 
      lastAccessed: new Date(startTime) 
    };
    (mockMemoryStore.get as Mock).mockReturnValue(testMemory);

    // Advance time by 1 second
    vi.advanceTimersByTime(1000);
    
    const retrieved = await memoryManager.retrieve('1');
    
    expect(retrieved).not.toBeNull();
    if (!retrieved) return;

    expect(mockMemoryStore.get).toHaveBeenCalledWith('1');
    expect(retrieved.lastAccessed).toBeDefined();
    expect(retrieved.lastAccessed!.getTime()).toBeGreaterThan(startTime.getTime());
    expect(mockMemoryStore.set).toHaveBeenCalledWith(retrieved);
    expect(mockMemoryLoader.saveMemory).toHaveBeenCalledWith(retrieved);
    
    // Restore real timers
    vi.useRealTimers();
  });

  it('should return null for a non-existent memory', async () => {
    await memoryManager.initialize();
    (mockMemoryStore.get as Mock).mockReturnValue(undefined);

    const retrieved = await memoryManager.retrieve('non-existent');
    expect(retrieved).toBeNull();
  });

  it('should delete an existing memory', async () => {
    await memoryManager.initialize();
    
    const testMemory: MemoryEntity = { 
      id: '1', 
      content: 'test', 
      type: 'text', 
      importance: 50, 
      personaId: 'p1', 
      createdAt: new Date(), 
      lastAccessed: new Date() 
    };
    (mockMemoryStore.get as Mock).mockReturnValue(testMemory);
    (mockMemoryStore.delete as Mock).mockReturnValue(true);

    const result = await memoryManager.delete('1');

    expect(result).toBe(true);
    expect(mockMemoryStore.delete).toHaveBeenCalledWith('1');
    expect(mockMemoryLoader.deleteMemory).toHaveBeenCalledWith('1');
  });

  it('should return false when deleting a non-existent memory', async () => {
    await memoryManager.initialize();
    (mockMemoryStore.get as Mock).mockReturnValue(undefined);

    const result = await memoryManager.delete('non-existent');

    expect(result).toBe(false);
    expect(mockMemoryStore.delete).not.toHaveBeenCalled();
    expect(mockMemoryLoader.deleteMemory).not.toHaveBeenCalled();
  });

  it('should search memories by query and personaId', async () => {
    await memoryManager.initialize();
    
    const memories: MemoryEntity[] = [
      { id: '1', content: 'apple banana', type: 'text', importance: 50, personaId: 'p1', createdAt: new Date(), lastAccessed: new Date() },
      { id: '2', content: 'banana cherry', type: 'text', importance: 50, personaId: 'p1', createdAt: new Date(), lastAccessed: new Date() },
      { id: '3', content: 'apple pie', type: 'text', importance: 50, personaId: 'p2', createdAt: new Date(), lastAccessed: new Date() },
    ];
    (mockMemoryStore.list as Mock).mockReturnValue(memories);

    const results = await memoryManager.search('banana', 'p1');

    expect(results.total).toBe(2);
    expect(results.memories.map(m => m.id)).toEqual(['1', '2']);
  });
}); 