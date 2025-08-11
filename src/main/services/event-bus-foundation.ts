import { EventEmitter } from 'events';
import { z } from 'zod';
import { SecurityEventLogger } from './security-event-logger';
import { HealthMonitor } from './health-monitor';

// Event Schema Definitions
export const PersonaEventSchemas = {
  'persona.created': z.object({
    persona: z.object({
      id: z.string(),
      name: z.string(),
      personality: z.record(z.any()),
      createdAt: z.date(),
    }),
    timestamp: z.date(),
    triggeredBy: z.string().optional(),
  }),
  'persona.updated': z.object({
    personaId: z.string(),
    changes: z.record(z.any()),
    previousValues: z.record(z.any()).optional(),
    timestamp: z.date(),
    triggeredBy: z.string().optional(),
  }),
  'persona.activated': z.object({
    personaId: z.string(),
    previousPersonaId: z.string().optional(),
    timestamp: z.date(),
    triggeredBy: z.string().optional(),
  }),
  'persona.deleted': z.object({
    personaId: z.string(),
    persona: z.object({
      name: z.string(),
      deletedAt: z.date(),
    }),
    timestamp: z.date(),
    triggeredBy: z.string().optional(),
  }),
};

export const MemoryEventSchemas = {
  'memory.added': z.object({
    memory: z.object({
      id: z.string(),
      personaId: z.string(),
      content: z.string(),
      importance: z.number(),
      createdAt: z.date(),
    }),
    timestamp: z.date(),
    triggeredBy: z.string().optional(),
  }),
  'memory.updated': z.object({
    memoryId: z.string(),
    personaId: z.string(),
    changes: z.record(z.any()),
    timestamp: z.date(),
    triggeredBy: z.string().optional(),
  }),
  'memory.searched': z.object({
    query: z.string(),
    results: z.array(z.object({
      id: z.string(),
      content: z.string(),
      relevance: z.number(),
    })),
    personaId: z.string(),
    timestamp: z.date(),
    triggeredBy: z.string().optional(),
  }),
};

export const SecurityEventSchemas = {
  'plugin.request.persona.access': z.object({
    pluginId: z.string(),
    personaId: z.string(),
    permissions: z.array(z.enum(['read', 'write', 'memory.read', 'memory.write', 'state.read'])),
    timestamp: z.date(),
    requestId: z.string(),
  }),
  'plugin.persona.permission.granted': z.object({
    pluginId: z.string(),
    personaId: z.string(),
    permissions: z.array(z.string()),
    accessToken: z.string(),
    expiresAt: z.date(),
    timestamp: z.date(),
    grantedBy: z.string(),
  }),
  'plugin.persona.permission.denied': z.object({
    pluginId: z.string(),
    personaId: z.string(),
    requestedPermissions: z.array(z.string()),
    reason: z.string(),
    timestamp: z.date(),
  }),
  'plugin.security.violation': z.object({
    pluginId: z.string(),
    violation: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    action: z.enum(['warn', 'suspend', 'revoke', 'terminate']),
    timestamp: z.date(),
    details: z.record(z.any()).optional(),
  }),
};

// All Event Schemas Combined
export const AllEventSchemas = {
  ...PersonaEventSchemas,
  ...MemoryEventSchemas,
  ...SecurityEventSchemas,
} as const;

// Event Types
export type EventType = keyof typeof AllEventSchemas;
export type EventPayload<T extends EventType> = z.infer<typeof AllEventSchemas[T]>;

// Plugin Access Control Matrix
export interface PluginPermissions {
  pluginId: string;
  personaId: string;
  permissions: Set<string>;
  accessToken: string;
  expiresAt: Date;
  grantedAt: Date;
}

// Event Subscription
export interface EventSubscription {
  id: string;
  pluginId: string;
  eventType: EventType;
  handler: (payload: any) => Promise<void> | void;
  security: {
    requiredPermissions: string[];
    accessToken: string;
  };
  performance: {
    subscriptionTime: Date;
    lastProcessed?: Date;
    totalProcessed: number;
    averageProcessingTime: number;
    errorCount: number;
  };
}

// Performance Monitoring
export interface EventPerformanceMetrics {
  eventType: EventType;
  totalPublished: number;
  totalSubscriptions: number;
  averageProcessingTime: number;
  errorRate: number;
  lastPublished?: Date;
  frequencyPerMinute: number;
}

// Security Layer for Event Access Control
export class EventSecurityLayer {
  private pluginPermissions = new Map<string, PluginPermissions>();
  private accessTokens = new Map<string, PluginPermissions>();

  constructor(private eventLogger: SecurityEventLogger) {}

  // Grant permissions to plugin for specific persona
  grantPluginAccess(
    pluginId: string,
    personaId: string,
    permissions: string[],
    expirationMinutes: number = 60
  ): string {
    const accessToken = this.generateAccessToken();
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
    
    const pluginPermission: PluginPermissions = {
      pluginId,
      personaId,
      permissions: new Set(permissions),
      accessToken,
      expiresAt,
      grantedAt: new Date(),
    };

    const key = `${pluginId}:${personaId}`;
    this.pluginPermissions.set(key, pluginPermission);
    this.accessTokens.set(accessToken, pluginPermission);

    this.eventLogger.log({
      type: 'security',
      severity: 'low',
      description: `Plugin access granted: ${pluginId} → ${personaId}`,
      timestamp: new Date(),
      details: { pluginId, personaId, permissions, expiresAt }
    });

    return accessToken;
  }

  // Validate plugin access for specific event
  validateAccess(pluginId: string, eventType: EventType, accessToken: string): boolean {
    const permission = this.accessTokens.get(accessToken);
    
    if (!permission) {
      this.logSecurityViolation(pluginId, 'Invalid access token', 'medium');
      return false;
    }

    if (permission.pluginId !== pluginId) {
      this.logSecurityViolation(pluginId, 'Token mismatch', 'high');
      return false;
    }

    if (permission.expiresAt < new Date()) {
      this.logSecurityViolation(pluginId, 'Access token expired', 'low');
      return false;
    }

    // Check event-specific permissions
    const requiredPermission = this.getRequiredPermissionForEvent(eventType);
    if (requiredPermission && !permission.permissions.has(requiredPermission)) {
      this.logSecurityViolation(pluginId, `Missing permission: ${requiredPermission}`, 'medium');
      return false;
    }

    return true;
  }

  // Revoke plugin access
  revokeAccess(pluginId: string, personaId?: string): void {
    if (personaId) {
      const key = `${pluginId}:${personaId}`;
      const permission = this.pluginPermissions.get(key);
      if (permission) {
        this.pluginPermissions.delete(key);
        this.accessTokens.delete(permission.accessToken);
      }
    } else {
      // Revoke all access for plugin
      for (const [key, permission] of this.pluginPermissions) {
        if (permission.pluginId === pluginId) {
          this.pluginPermissions.delete(key);
          this.accessTokens.delete(permission.accessToken);
        }
      }
    }

    this.eventLogger.log({
      type: 'security',
      severity: 'medium',
      description: `Plugin access revoked: ${pluginId}${personaId ? ` → ${personaId}` : ' (all)'}`,
      timestamp: new Date(),
      details: { pluginId, personaId }
    });
  }

  private getRequiredPermissionForEvent(eventType: EventType): string | null {
    if (eventType.startsWith('persona.')) {
      return eventType.includes('updated') ? 'write' : 'read';
    }
    if (eventType.startsWith('memory.')) {
      return eventType.includes('added') || eventType.includes('updated') ? 'memory.write' : 'memory.read';
    }
    return null;
  }

  private generateAccessToken(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logSecurityViolation(pluginId: string, violation: string, severity: 'low' | 'medium' | 'high'): void {
    this.eventLogger.log({
      type: 'security',
      severity,
      description: `Security violation: ${violation}`,
      timestamp: new Date(),
      details: { pluginId, violation }
    });
  }
}

// Performance Monitoring for Events
export class EventPerformanceMonitor {
  private metrics = new Map<EventType, EventPerformanceMetrics>();
  private recentEvents = new Map<EventType, Date[]>(); // Track recent event times for frequency calculation

  constructor(private healthMonitor: HealthMonitor) {}

  recordEventPublished(eventType: EventType): void {
    let metric = this.metrics.get(eventType);
    if (!metric) {
      metric = {
        eventType,
        totalPublished: 0,
        totalSubscriptions: 0,
        averageProcessingTime: 0,
        errorRate: 0,
        frequencyPerMinute: 0,
      };
      this.metrics.set(eventType, metric);
    }

    metric.totalPublished++;
    metric.lastPublished = new Date();
    
    // Update frequency tracking
    this.updateFrequency(eventType);
  }

  recordEventProcessed(eventType: EventType, processingTime: number, success: boolean): void {
    const metric = this.metrics.get(eventType);
    if (!metric) return;

    // Update average processing time
    const totalTime = metric.averageProcessingTime * metric.totalSubscriptions + processingTime;
    metric.totalSubscriptions++;
    metric.averageProcessingTime = totalTime / metric.totalSubscriptions;

    // Update error rate
    if (!success) {
      const totalErrors = metric.errorRate * (metric.totalSubscriptions - 1) + 1;
      metric.errorRate = totalErrors / metric.totalSubscriptions;
    } else {
      metric.errorRate = (metric.errorRate * (metric.totalSubscriptions - 1)) / metric.totalSubscriptions;
    }
  }

  private updateFrequency(eventType: EventType): void {
    const now = new Date();
    const recentTimes = this.recentEvents.get(eventType) || [];
    
    // Keep only events from last minute
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const filteredTimes = recentTimes.filter(time => time > oneMinuteAgo);
    filteredTimes.push(now);
    
    this.recentEvents.set(eventType, filteredTimes);
    
    // Update frequency
    const metric = this.metrics.get(eventType);
    if (metric) {
      metric.frequencyPerMinute = filteredTimes.length;
    }
  }

  getMetrics(eventType: EventType): EventPerformanceMetrics | undefined {
    return this.metrics.get(eventType);
  }

  getAllMetrics(): Map<EventType, EventPerformanceMetrics> {
    return new Map(this.metrics);
  }

  getHighFrequencyEvents(threshold: number = 10): EventType[] {
    return Array.from(this.metrics.entries())
      .filter(([_, metric]) => metric.frequencyPerMinute > threshold)
      .map(([eventType]) => eventType);
  }

  getSlowEvents(thresholdMs: number = 100): EventType[] {
    return Array.from(this.metrics.entries())
      .filter(([_, metric]) => metric.averageProcessingTime > thresholdMs)
      .map(([eventType]) => eventType);
  }
}

// Main EventBus Foundation Class
export class EventBusFoundation extends EventEmitter {
  private subscriptions = new Map<string, EventSubscription>();
  private eventSchemaValidator: typeof AllEventSchemas;
  private securityLayer: EventSecurityLayer;
  private performanceMonitor: EventPerformanceMonitor;
  private subscriptionCounter = 0;

  constructor(
    private eventLogger: SecurityEventLogger,
    private healthMonitor: HealthMonitor
  ) {
    super();
    this.eventSchemaValidator = AllEventSchemas;
    this.securityLayer = new EventSecurityLayer(eventLogger);
    this.performanceMonitor = new EventPerformanceMonitor(healthMonitor);
    this.setupHealthMonitoring();
  }

  // Subscribe to events with security validation
  subscribe<T extends EventType>(
    eventType: T,
    pluginId: string,
    handler: (payload: EventPayload<T>) => Promise<void> | void,
    options: {
      accessToken: string;
      requiredPermissions?: string[];
    }
  ): string {
    // Validate access
    if (!this.securityLayer.validateAccess(pluginId, eventType, options.accessToken)) {
      throw new Error(`Access denied for plugin ${pluginId} to event ${eventType}`);
    }

    const subscriptionId = `sub_${++this.subscriptionCounter}_${Date.now()}`;
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      pluginId,
      eventType,
      handler: handler as any,
      security: {
        requiredPermissions: options.requiredPermissions || [],
        accessToken: options.accessToken,
      },
      performance: {
        subscriptionTime: new Date(),
        totalProcessed: 0,
        averageProcessingTime: 0,
        errorCount: 0,
      },
    };

    this.subscriptions.set(subscriptionId, subscription);

    this.eventLogger.log({
      type: 'data_access',
      severity: 'low',
      description: `Plugin subscribed to event: ${pluginId} → ${eventType}`,
      timestamp: new Date(),
      details: { pluginId, eventType, subscriptionId }
    });

    return subscriptionId;
  }

  // Publish events with validation and performance monitoring
  async publish<T extends EventType>(
    eventType: T,
    payload: EventPayload<T>,
    options: {
      triggeredBy?: string;
      priority?: 'low' | 'normal' | 'high';
    } = {}
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate event payload
      const schema = this.eventSchemaValidator[eventType];
      if (!schema) {
        throw new Error(`Unknown event type: ${eventType}`);
      }

      const validatedPayload = schema.parse(payload);
      
      // Record event published
      this.performanceMonitor.recordEventPublished(eventType);

      // Get relevant subscriptions
      const relevantSubscriptions = Array.from(this.subscriptions.values())
        .filter(sub => sub.eventType === eventType);

      // Process subscriptions
      const promises = relevantSubscriptions.map(async (subscription) => {
        const handlerStartTime = Date.now();
        let success = true;

        try {
          // Validate access before processing
          if (!this.securityLayer.validateAccess(
            subscription.pluginId,
            eventType,
            subscription.security.accessToken
          )) {
            throw new Error(`Access revoked for plugin ${subscription.pluginId}`);
          }

          // Execute handler
          await subscription.handler(validatedPayload);

          // Update subscription performance
          subscription.performance.totalProcessed++;
          subscription.performance.lastProcessed = new Date();

        } catch (error) {
          success = false;
          subscription.performance.errorCount++;

          this.eventLogger.log({
            type: 'security',
            severity: 'medium',
            description: `Event handler error: ${subscription.pluginId}`,
            timestamp: new Date(),
            details: {
              pluginId: subscription.pluginId,
              eventType,
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }

        const handlerTime = Date.now() - handlerStartTime;
        
        // Update performance metrics
        this.performanceMonitor.recordEventProcessed(eventType, handlerTime, success);

        // Update subscription average processing time
        const totalTime = subscription.performance.averageProcessingTime * 
                         (subscription.performance.totalProcessed - 1) + handlerTime;
        subscription.performance.averageProcessingTime = 
          totalTime / subscription.performance.totalProcessed;
      });

      // Wait for all handlers to complete
      await Promise.allSettled(promises);

      const totalTime = Date.now() - startTime;
      
      this.eventLogger.log({
        type: 'data_access',
        severity: 'low',
        description: `Event published: ${eventType}`,
        timestamp: new Date(),
        details: {
          eventType,
          subscriberCount: relevantSubscriptions.length,
          processingTime: totalTime,
          triggeredBy: options.triggeredBy
        }
      });

    } catch (error) {
      this.eventLogger.log({
        type: 'security',
        severity: 'high',
        description: `Event publication failed: ${eventType}`,
        timestamp: new Date(),
        details: {
          eventType,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  // Unsubscribe from events
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    this.subscriptions.delete(subscriptionId);

    this.eventLogger.log({
      type: 'data_access',
      severity: 'low',
      description: `Plugin unsubscribed: ${subscription.pluginId}`,
      timestamp: new Date(),
      details: {
        pluginId: subscription.pluginId,
        eventType: subscription.eventType,
        subscriptionId
      }
    });

    return true;
  }

  // Grant plugin access to persona events
  grantPluginAccess(
    pluginId: string,
    personaId: string,
    permissions: string[],
    expirationMinutes: number = 60
  ): string {
    return this.securityLayer.grantPluginAccess(pluginId, personaId, permissions, expirationMinutes);
  }

  // Revoke plugin access
  revokePluginAccess(pluginId: string, personaId?: string): void {
    this.securityLayer.revokeAccess(pluginId, personaId);
    
    // Remove subscriptions for revoked plugin
    const subscriptionsToRemove = Array.from(this.subscriptions.entries())
      .filter(([_, sub]) => 
        sub.pluginId === pluginId && 
        (!personaId || sub.eventType.includes(personaId))
      );

    subscriptionsToRemove.forEach(([subId]) => {
      this.subscriptions.delete(subId);
    });
  }

  // Get performance metrics
  getPerformanceMetrics(eventType?: EventType): EventPerformanceMetrics | Map<EventType, EventPerformanceMetrics> | undefined {
    if (eventType) {
      return this.performanceMonitor.getMetrics(eventType);
    }
    return this.performanceMonitor.getAllMetrics();
  }

  // Get subscription statistics
  getSubscriptionStats(): {
    totalSubscriptions: number;
    subscriptionsByPlugin: Map<string, number>;
    subscriptionsByEvent: Map<EventType, number>;
    activePlugins: string[];
  } {
    const subscriptionsByPlugin = new Map<string, number>();
    const subscriptionsByEvent = new Map<EventType, number>();
    const activePlugins = new Set<string>();

    for (const subscription of this.subscriptions.values()) {
      // Count by plugin
      subscriptionsByPlugin.set(
        subscription.pluginId,
        (subscriptionsByPlugin.get(subscription.pluginId) || 0) + 1
      );

      // Count by event
      subscriptionsByEvent.set(
        subscription.eventType,
        (subscriptionsByEvent.get(subscription.eventType) || 0) + 1
      );

      activePlugins.add(subscription.pluginId);
    }

    return {
      totalSubscriptions: this.subscriptions.size,
      subscriptionsByPlugin,
      subscriptionsByEvent,
      activePlugins: Array.from(activePlugins),
    };
  }

  // Health monitoring setup
  private setupHealthMonitoring(): void {
    // Monitor high-frequency events
    setInterval(() => {
      const highFrequencyEvents = this.performanceMonitor.getHighFrequencyEvents(20);
      if (highFrequencyEvents.length > 0) {
        this.eventLogger.log({
          type: 'data_access',
          severity: 'medium',
          description: 'High frequency events detected',
          timestamp: new Date(),
          details: { events: highFrequencyEvents }
        });
      }

      // Monitor slow events
      const slowEvents = this.performanceMonitor.getSlowEvents(500);
      if (slowEvents.length > 0) {
        this.eventLogger.log({
          type: 'data_access',
          severity: 'medium',
          description: 'Slow events detected',
          timestamp: new Date(),
          details: { events: slowEvents }
        });
      }
    }, 60000); // Check every minute
  }

  // Shutdown and cleanup
  async shutdown(): Promise<void> {
    // Clear all subscriptions
    this.subscriptions.clear();

    this.eventLogger.log({
      type: 'data_access',
      severity: 'low',
      description: 'EventBus Foundation shutdown completed',
      timestamp: new Date(),
      details: {}
    });
  }

  // Debug and monitoring methods
  listSubscriptions(pluginId?: string): EventSubscription[] {
    const subs = Array.from(this.subscriptions.values());
    return pluginId ? subs.filter(sub => sub.pluginId === pluginId) : subs;
  }

  getEventTypes(): EventType[] {
    return Object.keys(AllEventSchemas) as EventType[];
  }

  validateEventPayload<T extends EventType>(eventType: T, payload: any): EventPayload<T> {
    const schema = this.eventSchemaValidator[eventType];
    if (!schema) {
      throw new Error(`Unknown event type: ${eventType}`);
    }
    return schema.parse(payload);
  }
}
