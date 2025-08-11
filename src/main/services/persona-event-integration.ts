import { EventBusFoundation } from './event-bus-foundation';
import { SecurityEventLogger } from './security-event-logger';
import { PersonaManager } from './persona-manager';
import { PersonaData } from '../../shared/types/persona';

// Integration layer between Persona Management and EventBus
export class PersonaEventIntegration {
  private isInitialized = false;
  private eventSubscriptions: string[] = [];
  private activePersonaId: string | null = null;

  constructor(
    private personaManager: PersonaManager,
    private eventBus: EventBusFoundation,
    private eventLogger: SecurityEventLogger
  ) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('PersonaEventIntegration already initialized');
      return;
    }

    console.log('Initializing Persona Event Integration...');
    this.isInitialized = true;

    this.eventLogger.log({
      type: 'data_access',
      severity: 'low',
      description: 'Persona Event Integration initialized',
      timestamp: new Date(),
      details: {
        subscriptions: this.eventSubscriptions.length
      }
    });
  }

  // Wrapper methods that publish events
  async createPersona(personaData: Omit<PersonaData, 'id' | 'createdAt' | 'updatedAt'>): Promise<PersonaData> {
    try {
      // Execute original create
      const createdPersona = await this.personaManager.create(personaData);
      
      // Publish persona.created event
      await this.eventBus.publish('persona.created', {
        persona: {
          id: createdPersona.id || 'unknown',
          name: createdPersona.name,
          personality: createdPersona.personality || {},
          createdAt: createdPersona.createdAt || new Date()
        },
        timestamp: new Date(),
        triggeredBy: 'persona_event_integration'
      });

      return createdPersona;
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'medium',
        description: 'Failed to create persona or publish event',
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : String(error),
          personaName: personaData.name
        }
      });
      throw error;
    }
  }

  async updatePersona(id: string, updates: Partial<PersonaData>): Promise<PersonaData> {
    try {
      // Get current persona for comparison
      const currentPersona = await this.personaManager.get(id);
      
      if (!currentPersona) {
        throw new Error(`Persona ${id} not found`);
      }

      // Execute original update
      const updatedPersona = await this.personaManager.update(id, updates);
      
      // Publish persona.updated event
      await this.eventBus.publish('persona.updated', {
        personaId: id,
        changes: updates,
        previousValues: {
          name: currentPersona.name,
          personality: currentPersona.personality
        },
        timestamp: new Date(),
        triggeredBy: 'persona_event_integration'
      });

      return updatedPersona;
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'medium',
        description: 'Failed to update persona or publish event',
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : String(error),
          personaId: id,
          updates: Object.keys(updates)
        }
      });
      throw error;
    }
  }

  async deletePersona(id: string): Promise<boolean> {
    try {
      // Get persona before deletion
      const persona = await this.personaManager.get(id);
      
      if (!persona) {
        throw new Error(`Persona ${id} not found`);
      }

      // Execute original delete
      const result = await this.personaManager.delete(id);
      
      // Publish persona.deleted event
      await this.eventBus.publish('persona.deleted', {
        personaId: id,
        persona: {
          name: persona.name,
          deletedAt: new Date()
        },
        timestamp: new Date(),
        triggeredBy: 'persona_event_integration'
      });

      return result;
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'medium',
        description: 'Failed to delete persona or publish event',
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : String(error),
          personaId: id
        }
      });
      throw error;
    }
  }

  async activatePersona(personaId: string): Promise<void> {
    try {
      const previousActivePersonaId = this.activePersonaId;
      
      // Set active persona
      this.activePersonaId = personaId;
      
      // Publish persona.activated event
      await this.eventBus.publish('persona.activated', {
        personaId: personaId,
        previousPersonaId: previousActivePersonaId || undefined,
        timestamp: new Date(),
        triggeredBy: 'persona_event_integration'
      });
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'medium',
        description: 'Failed to activate persona or publish event',
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : String(error),
          personaId: personaId
        }
      });
      throw error;
    }
  }

  // Delegate methods to PersonaManager
  async getPersona(id: string): Promise<PersonaData | null> {
    return this.personaManager.get(id);
  }

  async listPersonas(): Promise<PersonaData[]> {
    return this.personaManager.list();
  }

  getActivePersonaId(): string | null {
    return this.activePersonaId;
  }

  // Plugin subscription helpers
  async enablePluginPersonaAccess(
    pluginId: string,
    personaId: string,
    permissions: ('read' | 'write' | 'memory.read' | 'memory.write' | 'state.read')[],
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
        description: `Plugin persona access granted: ${pluginId} → ${personaId}`,
        timestamp: new Date(),
        details: {
          pluginId,
          personaId,
          permissions,
          expirationMinutes,
          accessToken: accessToken.substring(0, 10) + '...' // Log partial token for security
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
        grantedBy: 'persona_event_integration'
      });

      return accessToken;
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'high',
        description: `Failed to grant plugin persona access: ${pluginId} → ${personaId}`,
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

  async revokePluginPersonaAccess(pluginId: string, personaId?: string): Promise<void> {
    try {
      this.eventBus.revokePluginAccess(pluginId, personaId);

      this.eventLogger.log({
        type: 'security',
        severity: 'medium',
        description: `Plugin persona access revoked: ${pluginId}${personaId ? ` → ${personaId}` : ' (all)'}`,
        timestamp: new Date(),
        details: { pluginId, personaId }
      });

      // Publish access denied event for audit trail
      if (personaId) {
        await this.eventBus.publish('plugin.persona.permission.denied', {
          pluginId,
          personaId,
          requestedPermissions: [],
          reason: 'Access manually revoked',
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'high',
        description: `Failed to revoke plugin persona access: ${pluginId}`,
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

  // Plugin subscription management
  subscribePluginToPersonaEvents<T extends 'persona.created' | 'persona.updated' | 'persona.activated' | 'persona.deleted'>(
    eventType: T,
    pluginId: string,
    handler: (payload: any) => Promise<void> | void,
    accessToken: string,
    requiredPermissions: string[] = []
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
        description: `Plugin subscribed to persona event: ${pluginId} → ${eventType}`,
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
        description: `Plugin subscription failed: ${pluginId} → ${eventType}`,
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
        description: 'Plugin unsubscription failed',
        timestamp: new Date(),
        details: {
          subscriptionId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return false;
    }
  }

  // Testing and validation methods
  async testPersonaEventFlow(personaId: string): Promise<{
    success: boolean;
    eventsPublished: string[];
    errors: string[];
  }> {
    const eventsPublished: string[] = [];
    const errors: string[] = [];

    try {
      // Test persona.activated event
      try {
        await this.eventBus.publish('persona.activated', {
          personaId,
          timestamp: new Date(),
          triggeredBy: 'test_flow'
        });
        eventsPublished.push('persona.activated');
      } catch (error) {
        errors.push(`persona.activated: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Test persona.updated event
      try {
        await this.eventBus.publish('persona.updated', {
          personaId,
          changes: { name: 'Test Update' },
          timestamp: new Date(),
          triggeredBy: 'test_flow'
        });
        eventsPublished.push('persona.updated');
      } catch (error) {
        errors.push(`persona.updated: ${error instanceof Error ? error.message : String(error)}`);
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

  getPersonaEventMetrics() {
    const personaEventTypes = ['persona.created', 'persona.updated', 'persona.activated', 'persona.deleted'] as const;
    
    const metrics: Record<string, any> = {};
    
    personaEventTypes.forEach(eventType => {
      metrics[eventType] = this.eventBus.getPerformanceMetrics(eventType);
    });

    return metrics;
  }

  // Manual event triggers for testing
  async manuallyTriggerPersonaCreated(persona: PersonaData): Promise<void> {
    await this.eventBus.publish('persona.created', {
      persona: {
        id: persona.id || 'unknown',
        name: persona.name,
        personality: persona.personality || {},
        createdAt: persona.createdAt || new Date()
      },
      timestamp: new Date(),
      triggeredBy: 'manual_trigger'
    });
  }

  async manuallyTriggerPersonaActivated(personaId: string, previousPersonaId?: string): Promise<void> {
    await this.eventBus.publish('persona.activated', {
      personaId,
      previousPersonaId,
      timestamp: new Date(),
      triggeredBy: 'manual_trigger'
    });
  }

  async manuallyTriggerPersonaUpdated(
    personaId: string,
    changes: Record<string, any>,
    previousValues?: Record<string, any>
  ): Promise<void> {
    await this.eventBus.publish('persona.updated', {
      personaId,
      changes,
      previousValues,
      timestamp: new Date(),
      triggeredBy: 'manual_trigger'
    });
  }

  async manuallyTriggerPersonaDeleted(personaId: string, personaName: string): Promise<void> {
    await this.eventBus.publish('persona.deleted', {
      personaId,
      persona: {
        name: personaName,
        deletedAt: new Date()
      },
      timestamp: new Date(),
      triggeredBy: 'manual_trigger'
    });
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
      description: 'Persona Event Integration shutdown completed',
      timestamp: new Date(),
      details: {}
    });
  }
}
