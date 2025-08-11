import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { ServiceFactory } from '../services/ServiceFactory';
import { EventType } from '../services/event-bus-foundation';

// Event IPC Contracts
interface EventSubscriptionOptions {
  pluginId: string;
  accessToken: string;
  requiredPermissions?: string[];
}

interface EventPublishOptions {
  triggeredBy?: string;
  priority?: 'low' | 'normal' | 'high';
}

interface EventMetricsRequest {
  eventType?: EventType;
}

interface PluginAccessRequest {
  pluginId: string;
  personaId: string;
  permissions: string[];
  expirationMinutes?: number;
}

interface PluginAccessRevokeRequest {
  pluginId: string;
  personaId?: string;
}

// IPC Handlers for Event System
export class EventIpcHandlers {
  private serviceFactory: ServiceFactory;

  constructor(serviceFactory: ServiceFactory) {
    this.serviceFactory = serviceFactory;
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Event subscription
    ipcMain.handle('event:subscribe', this.handleEventSubscribe.bind(this));
    
    // Event publishing
    ipcMain.handle('event:publish', this.handleEventPublish.bind(this));
    
    // Event unsubscribe
    ipcMain.handle('event:unsubscribe', this.handleEventUnsubscribe.bind(this));
    
    // Plugin access management
    ipcMain.handle('event:grant-plugin-access', this.handleGrantPluginAccess.bind(this));
    ipcMain.handle('event:revoke-plugin-access', this.handleRevokePluginAccess.bind(this));
    
    // Performance metrics
    ipcMain.handle('event:get-performance-metrics', this.handleGetPerformanceMetrics.bind(this));
    
    // Subscription statistics
    ipcMain.handle('event:get-subscription-stats', this.handleGetSubscriptionStats.bind(this));
    
    // Event types
    ipcMain.handle('event:get-event-types', this.handleGetEventTypes.bind(this));
    
    // Event validation
    ipcMain.handle('event:validate-payload', this.handleValidateEventPayload.bind(this));
  }

  private async handleEventSubscribe(
    event: IpcMainInvokeEvent,
    eventType: EventType,
    options: EventSubscriptionOptions
  ): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      const eventBus = this.serviceFactory.getEventBus();
      if (!eventBus) {
        return { success: false, error: 'Event bus not available' };
      }

      const subscriptionId = (eventBus as any).subscribe(
        eventType,
        options.pluginId,
        async (payload: any) => {
          // Forward event to renderer process
          event.sender.send('event:received', {
            eventType,
            payload,
            subscriptionId,
            pluginId: options.pluginId,
            timestamp: new Date()
          });
        },
        {
          accessToken: options.accessToken,
          requiredPermissions: options.requiredPermissions
        }
      );

      return { success: true, subscriptionId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleEventPublish(
    event: IpcMainInvokeEvent,
    eventType: EventType,
    payload: any,
    options: EventPublishOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const eventBus = this.serviceFactory.getEventBus();
      if (!eventBus) {
        return { success: false, error: 'Event bus not available' };
      }

      await (eventBus as any).publish(eventType, payload, options);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleEventUnsubscribe(
    event: IpcMainInvokeEvent,
    subscriptionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const eventBus = this.serviceFactory.getEventBus();
      if (!eventBus) {
        return { success: false, error: 'Event bus not available' };
      }

      const result = (eventBus as any).unsubscribe(subscriptionId);
      return { success: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleGrantPluginAccess(
    event: IpcMainInvokeEvent,
    request: PluginAccessRequest
  ): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    try {
      const eventBus = this.serviceFactory.getEventBus();
      if (!eventBus) {
        return { success: false, error: 'Event bus not available' };
      }

      const accessToken = (eventBus as any).grantPluginAccess(
        request.pluginId,
        request.personaId,
        request.permissions,
        request.expirationMinutes
      );

      return { success: true, accessToken };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleRevokePluginAccess(
    event: IpcMainInvokeEvent,
    request: PluginAccessRevokeRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const eventBus = this.serviceFactory.getEventBus();
      if (!eventBus) {
        return { success: false, error: 'Event bus not available' };
      }

      (eventBus as any).revokePluginAccess(request.pluginId, request.personaId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleGetPerformanceMetrics(
    event: IpcMainInvokeEvent,
    request: EventMetricsRequest
  ): Promise<{ success: boolean; metrics?: any; error?: string }> {
    try {
      const eventBus = this.serviceFactory.getEventBus();
      if (!eventBus) {
        return { success: false, error: 'Event bus not available' };
      }

      const metrics = (eventBus as any).getPerformanceMetrics(request.eventType);
      return { success: true, metrics };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleGetSubscriptionStats(
    _event: IpcMainInvokeEvent
  ): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      const eventBus = this.serviceFactory.getEventBus();
      if (!eventBus) {
        return { success: false, error: 'Event bus not available' };
      }

      const stats = (eventBus as any).getSubscriptionStats();
      return { success: true, stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleGetEventTypes(
    _event: IpcMainInvokeEvent
  ): Promise<{ success: boolean; eventTypes?: EventType[]; error?: string }> {
    try {
      const eventBus = this.serviceFactory.getEventBus();
      if (!eventBus) {
        return { success: false, error: 'Event bus not available' };
      }

      const eventTypes = (eventBus as any).getEventTypes();
      return { success: true, eventTypes };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleValidateEventPayload(
    event: IpcMainInvokeEvent,
    eventType: EventType,
    payload: any
  ): Promise<{ success: boolean; validatedPayload?: any; error?: string }> {
    try {
      const eventBus = this.serviceFactory.getEventBus();
      if (!eventBus) {
        return { success: false, error: 'Event bus not available' };
      }

      const validatedPayload = (eventBus as any).validateEventPayload(eventType, payload);
      return { success: true, validatedPayload };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Clean up handlers
  unregisterHandlers(): void {
    const handlers = [
      'event:subscribe',
      'event:publish', 
      'event:unsubscribe',
      'event:grant-plugin-access',
      'event:revoke-plugin-access',
      'event:get-performance-metrics',
      'event:get-subscription-stats',
      'event:get-event-types',
      'event:validate-payload'
    ];

    handlers.forEach(handler => {
      ipcMain.removeAllListeners(handler);
    });
  }
}

// Export singleton instance
let eventIpcHandlers: EventIpcHandlers | null = null;

export function initializeEventIpcHandlers(serviceFactory: ServiceFactory): EventIpcHandlers {
  if (eventIpcHandlers) {
    eventIpcHandlers.unregisterHandlers();
  }
  
  eventIpcHandlers = new EventIpcHandlers(serviceFactory);
  return eventIpcHandlers;
}

export function getEventIpcHandlers(): EventIpcHandlers | null {
  return eventIpcHandlers;
}
