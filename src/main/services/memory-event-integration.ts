import { EventBusFoundation } from './event-bus-foundation';
import { SecurityEventLogger } from './security-event-logger';
import { MemoryEntity } from '../../shared/types/memory';

// Integration layer between Memory Management and EventBus
export class MemoryEventIntegration {
  private isInitialized = false;
  private eventSubscriptions: string[] = [];
  private activePersonaId: string | null = null;

  constructor(
    private eventBus: EventBusFoundation,
    private eventLogger: SecurityEventLogger
  ) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('MemoryEventIntegration already initialized');
      return;
    }

    console.log('Initializing Memory Event Integration...');
    this.isInitialized = true;

    this.eventLogger.log({
      type: 'data_access',
      severity: 'low',
      description: 'Memory Event Integration initialized',
      timestamp: new Date(),
      details: {
        subscriptions: this.eventSubscriptions.length
      }
    });
  }

  // Event publishing methods for memory operations
  async publishMemoryAdded(memory: MemoryEntity): Promise<void> {
    try {
      await this.eventBus.publish('memory.added', {
        memory: {
          id: memory.id || 'unknown',
          personaId: memory.personaId,
          content: memory.content,
          importance: memory.importance || 50,
          createdAt: memory.createdAt || new Date()
        },
        timestamp: new Date(),
        triggeredBy: 'memory_event_integration'
      });

      this.eventLogger.log({
        type: 'data_access',
        severity: 'low',
        description: `Memory added event published: ${memory.id}`,
        timestamp: new Date(),
        details: {
          memoryId: memory.id,
          personaId: memory.personaId,
          contentLength: memory.content.length,
          importance: memory.importance
        }
      });
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'medium',
        description: 'Failed to publish memory added event',
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : String(error),
          memoryId: memory.id
        }
      });
      throw error;
    }
  }

  async publishMemoryUpdated(
    memoryId: string,
    personaId: string,
    changes: Partial<MemoryEntity>
  ): Promise<void> {
    try {
      await this.eventBus.publish('memory.updated', {
        memoryId,
        personaId,
        changes,
        timestamp: new Date(),
        triggeredBy: 'memory_event_integration'
      });

      this.eventLogger.log({
        type: 'data_access',
        severity: 'low',
        description: `Memory updated event published: ${memoryId}`,
        timestamp: new Date(),
        details: {
          memoryId,
          personaId,
          changedFields: Object.keys(changes)
        }
      });
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'medium',
        description: 'Failed to publish memory updated event',
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : String(error),
          memoryId
        }
      });
      throw error;
    }
  }

  async publishMemorySearched(
    query: string,
    results: Array<{ id: string; content: string; relevance: number }>,
    personaId: string
  ): Promise<void> {
    try {
      await this.eventBus.publish('memory.searched', {
        query,
        results,
        personaId,
        timestamp: new Date(),
        triggeredBy: 'memory_event_integration'
      });

      this.eventLogger.log({
        type: 'data_access',
        severity: 'low',
        description: `Memory search event published`,
        timestamp: new Date(),
        details: {
          query,
          personaId,
          resultCount: results.length
        }
      });
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'medium',
        description: 'Failed to publish memory search event',
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : String(error),
          query
        }
      });
      throw error;
    }
  }

  // Plugin subscription helpers for memory events
  async enablePluginMemoryAccess(
    pluginId: string,
    personaId: string,
    permissions: ('memory.read' | 'memory.write')[],
    expirationMinutes: number = 60
  ): Promise<string> {
    try {
      const accessToken = this.eventBus.grantPluginAccess(
        pluginId,
        personaId,
        permissions,
        expirationMinutes
      );

      this.eventLogger.log({
        type: 'security',
        severity: 'low',
        description: `Plugin memory access granted: ${pluginId} → ${personaId}`,
        timestamp: new Date(),
        details: {
          pluginId,
          personaId,
          permissions,
          expirationMinutes,
          accessToken: accessToken.substring(0, 10) + '...'
        }
      });

      // Publish access granted event
      await this.eventBus.publish('plugin.persona.permission.granted', {
        pluginId,
        personaId,
        permissions,
        accessToken,
        expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000),
        timestamp: new Date(),
        grantedBy: 'memory_event_integration'
      });

      return accessToken;
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'high',
        description: `Failed to grant plugin memory access: ${pluginId} → ${personaId}`,
        timestamp: new Date(),
        details: {
          pluginId,
          personaId,
          permissions,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  async revokePluginMemoryAccess(pluginId: string, personaId?: string): Promise<void> {
    try {
      this.eventBus.revokePluginAccess(pluginId, personaId);

      this.eventLogger.log({
        type: 'security',
        severity: 'medium',
        description: `Plugin memory access revoked: ${pluginId}${personaId ? ` → ${personaId}` : ' (all)'}`,
        timestamp: new Date(),
        details: { pluginId, personaId }
      });

      // Publish access denied event for audit trail
      if (personaId) {
        await this.eventBus.publish('plugin.persona.permission.denied', {
          pluginId,
          personaId,
          requestedPermissions: ['memory.read', 'memory.write'],
          reason: 'Memory access manually revoked',
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'high',
        description: `Failed to revoke plugin memory access: ${pluginId}`,
        timestamp: new Date(),
        details: {
          pluginId,
          personaId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  // Plugin subscription management for memory events
  subscribePluginToMemoryEvents<T extends 'memory.added' | 'memory.updated' | 'memory.searched'>(
    eventType: T,
    pluginId: string,
    handler: (payload: any) => Promise<void> | void,
    accessToken: string,
    requiredPermissions: string[] = ['memory.read']
  ): string {
    try {
      const subscriptionId = this.eventBus.subscribe(
        eventType,
        pluginId,
        handler,
        {
          accessToken,
          requiredPermissions
        }
      );

      this.eventSubscriptions.push(subscriptionId);

      this.eventLogger.log({
        type: 'data_access',
        severity: 'low',
        description: `Plugin subscribed to memory event: ${pluginId} → ${eventType}`,
        timestamp: new Date(),
        details: {
          pluginId,
          eventType,
          subscriptionId,
          requiredPermissions
        }
      });

      return subscriptionId;
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'high',
        description: `Plugin memory subscription failed: ${pluginId} → ${eventType}`,
        timestamp: new Date(),
        details: {
          pluginId,
          eventType,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  unsubscribePlugin(subscriptionId: string): boolean {
    try {
      const success = this.eventBus.unsubscribe(subscriptionId);
      
      if (success) {
        this.eventSubscriptions = this.eventSubscriptions.filter(id => id !== subscriptionId);
      }

      return success;
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'medium',
        description: 'Plugin memory unsubscription failed',
        timestamp: new Date(),
        details: {
          subscriptionId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return false;
    }
  }

  // Real-time memory updates for UI components
  subscribeToMemoryUpdates(
    personaId: string,
    onMemoryAdded: (memory: MemoryEntity) => void,
    onMemoryUpdated: (memoryId: string, changes: Partial<MemoryEntity>) => void,
    onMemorySearched: (query: string, results: Array<{ id: string; content: string; relevance: number }>) => void
  ): {
    unsubscribeAll: () => void;
    subscriptions: string[];
  } {
    const subscriptions: string[] = [];
    
    try {
      // Create a temporary access token for UI components
      const uiAccessToken = this.eventBus.grantPluginAccess(
        'ui_memory_component',
        personaId,
        ['memory.read', 'memory.write'],
        120 // 2 hours for UI components
      );

      // Subscribe to memory.added events
      const addedSubscription = this.eventBus.subscribe(
        'memory.added',
        'ui_memory_component',
        async (payload) => {
          if (payload.memory.personaId === personaId) {
            onMemoryAdded({
              id: payload.memory.id,
              personaId: payload.memory.personaId,
              content: payload.memory.content,
              importance: payload.memory.importance,
              createdAt: payload.memory.createdAt,
              memoryTier: 'warm' // default tier
            } as MemoryEntity);
          }
        },
        {
          accessToken: uiAccessToken,
          requiredPermissions: ['memory.read']
        }
      );
      subscriptions.push(addedSubscription);

      // Subscribe to memory.updated events
      const updatedSubscription = this.eventBus.subscribe(
        'memory.updated',
        'ui_memory_component',
        async (payload) => {
          if (payload.personaId === personaId) {
            onMemoryUpdated(payload.memoryId, payload.changes);
          }
        },
        {
          accessToken: uiAccessToken,
          requiredPermissions: ['memory.read']
        }
      );
      subscriptions.push(updatedSubscription);

      // Subscribe to memory.searched events
      const searchedSubscription = this.eventBus.subscribe(
        'memory.searched',
        'ui_memory_component',
        async (payload) => {
          if (payload.personaId === personaId) {
            onMemorySearched(payload.query, payload.results);
          }
        },
        {
          accessToken: uiAccessToken,
          requiredPermissions: ['memory.read']
        }
      );
      subscriptions.push(searchedSubscription);

      const unsubscribeAll = () => {
        subscriptions.forEach(subId => {
          this.eventBus.unsubscribe(subId);
        });
        this.eventBus.revokePluginAccess('ui_memory_component', personaId);
      };

      this.eventLogger.log({
        type: 'data_access',
        severity: 'low',
        description: `UI component subscribed to memory updates: ${personaId}`,
        timestamp: new Date(),
        details: {
          personaId,
          subscriptionCount: subscriptions.length
        }
      });

      return { unsubscribeAll, subscriptions };
      
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'high',
        description: 'Failed to set up UI memory subscriptions',
        timestamp: new Date(),
        details: {
          personaId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  // Testing and validation methods
  async testMemoryEventFlow(personaId: string): Promise<{
    success: boolean;
    eventsPublished: string[];
    errors: string[];
  }> {
    const eventsPublished: string[] = [];
    const errors: string[] = [];

    try {
      // Test memory.added event
      try {
        await this.publishMemoryAdded({
          id: 'test-memory-id',
          personaId,
          content: 'Test memory content',
          importance: 75,
          createdAt: new Date(),
          memoryTier: 'warm',
          type: 'text'
        } as MemoryEntity);
        eventsPublished.push('memory.added');
      } catch (error) {
        errors.push(`memory.added: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Test memory.updated event
      try {
        await this.publishMemoryUpdated(
          'test-memory-id',
          personaId,
          { importance: 85, content: 'Updated test content' }
        );
        eventsPublished.push('memory.updated');
      } catch (error) {
        errors.push(`memory.updated: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Test memory.searched event
      try {
        await this.publishMemorySearched(
          'test query',
          [{ id: 'test-memory-id', content: 'Test content', relevance: 0.95 }],
          personaId
        );
        eventsPublished.push('memory.searched');
      } catch (error) {
        errors.push(`memory.searched: ${error instanceof Error ? error.message : String(error)}`);
      }

      return {
        success: errors.length === 0,
        eventsPublished,
        errors
      };
    } catch (error) {
      return {
        success: false,
        eventsPublished,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  // Monitoring and statistics
  getIntegrationStats(): {
    isInitialized: boolean;
    subscriptionsCount: number;
    eventBusStats: any;
  } {
    return {
      isInitialized: this.isInitialized,
      subscriptionsCount: this.eventSubscriptions.length,
      eventBusStats: this.eventBus.getSubscriptionStats()
    };
  }

  getMemoryEventMetrics() {
    const memoryEventTypes = ['memory.added', 'memory.updated', 'memory.searched'] as const;
    
    const metrics: Record<string, any> = {};
    
    memoryEventTypes.forEach(eventType => {
      metrics[eventType] = this.eventBus.getPerformanceMetrics(eventType);
    });

    return metrics;
  }

  // Manual event triggers for testing
  async manuallyTriggerMemoryAdded(memory: MemoryEntity): Promise<void> {
    await this.publishMemoryAdded(memory);
  }

  async manuallyTriggerMemoryUpdated(
    memoryId: string,
    personaId: string,
    changes: Partial<MemoryEntity>
  ): Promise<void> {
    await this.publishMemoryUpdated(memoryId, personaId, changes);
  }

  async manuallyTriggerMemorySearched(
    query: string,
    results: Array<{ id: string; content: string; relevance: number }>,
    personaId: string
  ): Promise<void> {
    await this.publishMemorySearched(query, results, personaId);
  }

  // Set active persona for context
  setActivePersona(personaId: string): void {
    this.activePersonaId = personaId;
  }

  getActivePersonaId(): string | null {
    return this.activePersonaId;
  }

  // Cleanup and shutdown
  async shutdown(): Promise<void> {
    // Unsubscribe all subscriptions
    for (const subscriptionId of this.eventSubscriptions) {
      this.eventBus.unsubscribe(subscriptionId);
    }
    
    this.eventSubscriptions = [];
    this.isInitialized = false;

    this.eventLogger.log({
      type: 'data_access',
      severity: 'low',
      description: 'Memory Event Integration shutdown completed',
      timestamp: new Date(),
      details: {}
    });
  }

  // Utility method to create reactive memory hooks
  createReactiveMemoryHook(personaId: string) {
    const subscriptions = new Set<string>();
    
    return {
      subscribe: (
        eventType: 'memory.added' | 'memory.updated' | 'memory.searched',
        handler: (payload: any) => void
      ) => {
        const accessToken = this.eventBus.grantPluginAccess(
          `reactive_hook_${Date.now()}`,
          personaId,
          ['memory.read'],
          30 // 30 minutes for hooks
        );

        const subscriptionId = this.eventBus.subscribe(
          eventType,
          `reactive_hook_${Date.now()}`,
          handler,
          {
            accessToken,
            requiredPermissions: ['memory.read']
          }
        );

        subscriptions.add(subscriptionId);
        return subscriptionId;
      },
      
      unsubscribeAll: () => {
        subscriptions.forEach(subId => {
          this.eventBus.unsubscribe(subId);
        });
        subscriptions.clear();
      }
    };
  }
}
