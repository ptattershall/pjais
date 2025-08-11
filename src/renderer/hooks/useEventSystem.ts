import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Event System Types
export interface EventType {
  'persona.created': any;
  'persona.updated': any;
  'persona.activated': any;
  'persona.deleted': any;
  'memory.added': any;
  'memory.updated': any;
  'memory.deleted': any;
  'memory.searched': any;
  'plugin.request.persona.access': any;
  'plugin.persona.permission.granted': any;
  'plugin.persona.permission.denied': any;
  'plugin.security.violation': any;
}

export type EventTypeKey = keyof EventType;

interface EventSubscriptionOptions {
  pluginId: string;
  accessToken: string;
  requiredPermissions?: string[];
}

interface EventPublishOptions {
  triggeredBy?: string;
  priority?: 'low' | 'normal' | 'high';
}

interface EventSubscription {
  subscriptionId: string;
  eventType: EventTypeKey;
  pluginId: string;
  isActive: boolean;
}

export interface ReceivedEvent {
  eventType: EventTypeKey;
  payload: any;
  subscriptionId: string;
  pluginId: string;
  timestamp: Date;
}

interface PerformanceMetrics {
  eventType: EventTypeKey;
  totalPublished: number;
  totalSubscriptions: number;
  averageProcessingTime: number;
  errorRate: number;
  lastPublished?: Date;
  frequencyPerMinute: number;
}

interface SubscriptionStats {
  totalSubscriptions: number;
  subscriptionsByPlugin: Record<string, number>;
  subscriptionsByEvent: Record<EventTypeKey, number>;
  activePlugins: string[];
}

// Event Subscription Hook
export const useEventSubscription = (
  eventType: EventTypeKey,
  options: EventSubscriptionOptions,
  onEvent?: (event: ReceivedEvent) => void
) => {
  const [subscription, setSubscription] = useState<EventSubscription | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventHandlerRef = useRef(onEvent);

  // Update handler ref when it changes
  useEffect(() => {
    eventHandlerRef.current = onEvent;
  }, [onEvent]);

  // Subscribe to events
  const subscribe = useCallback(async () => {
    try {
      const result = await window.api.events.subscribe(eventType, options);
      
      if (result.success && result.subscriptionId) {
        const newSubscription: EventSubscription = {
          subscriptionId: result.subscriptionId,
          eventType,
          pluginId: options.pluginId,
          isActive: true
        };
        
        setSubscription(newSubscription);
        setIsSubscribed(true);
        setError(null);

        // Listen for events from main process
        const handleEvent = (event: ReceivedEvent) => {
          if (event.subscriptionId === result.subscriptionId && eventHandlerRef.current) {
            eventHandlerRef.current(event);
          }
        };

        const unsubscribeHandler = window.api.events.onEventReceived(handleEvent);
        
        // Store the unsubscribe handler for later use
        (newSubscription as any).unsubscribeHandler = unsubscribeHandler;

        return newSubscription;
      } else {
        setError(result.error || 'Failed to subscribe to event');
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      return null;
    }
  }, [eventType, options]);

  // Unsubscribe from events
  const unsubscribe = useCallback(async () => {
    if (!subscription) return;

    try {
      const result = await window.api.events.unsubscribe(subscription.subscriptionId);
      
      if (result.success) {
        setSubscription(null);
        setIsSubscribed(false);
        setError(null);

        // Call the stored unsubscribe handler
        if ((subscription as any).unsubscribeHandler) {
          (subscription as any).unsubscribeHandler();
        }
      } else {
        setError(result.error || 'Failed to unsubscribe from event');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
    }
  }, [subscription]);

  // Auto-unsubscribe on unmount
  useEffect(() => {
    return () => {
      if (subscription) {
        unsubscribe();
      }
    };
  }, [subscription, unsubscribe]);

  return {
    subscription,
    isSubscribed,
    error,
    subscribe,
    unsubscribe
  };
};

// Event Publishing Hook
export const useEventPublisher = () => {
  const publishMutation = useMutation({
    mutationFn: async ({
      eventType,
      payload,
      options = {}
    }: {
      eventType: EventTypeKey;
      payload: any;
      options?: EventPublishOptions;
    }) => {
      const result = await window.api.events.publish(eventType, payload, options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to publish event');
      }
      return result;
    }
  });

  const publish = useCallback(
    (eventType: EventTypeKey, payload: any, options?: EventPublishOptions) => {
      return publishMutation.mutateAsync({ eventType, payload, options });
    },
    [publishMutation]
  );

  return {
    publish,
    isPublishing: publishMutation.isPending,
    error: publishMutation.error,
    reset: publishMutation.reset
  };
};

// Plugin Access Management Hook
export const usePluginAccessManager = () => {
  const queryClient = useQueryClient();

  const grantAccessMutation = useMutation({
    mutationFn: async ({
      pluginId,
      personaId,
      permissions,
      expirationMinutes
    }: {
      pluginId: string;
      personaId: string;
      permissions: string[];
      expirationMinutes?: number;
    }) => {
      const result = await window.api.events.grantPluginAccess({
        pluginId,
        personaId,
        permissions,
        expirationMinutes
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to grant plugin access');
      }
      
      return result.accessToken;
    },
    onSuccess: () => {
      // Invalidate subscription stats to reflect changes
      queryClient.invalidateQueries({ queryKey: ['event-subscription-stats'] });
    }
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async ({
      pluginId,
      personaId
    }: {
      pluginId: string;
      personaId?: string;
    }) => {
      const result = await window.api.events.revokePluginAccess({
        pluginId,
        personaId
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to revoke plugin access');
      }
      
      return result;
    },
    onSuccess: () => {
      // Invalidate subscription stats to reflect changes
      queryClient.invalidateQueries({ queryKey: ['event-subscription-stats'] });
    }
  });

  return {
    grantAccess: grantAccessMutation.mutateAsync,
    revokeAccess: revokeAccessMutation.mutateAsync,
    isGranting: grantAccessMutation.isPending,
    isRevoking: revokeAccessMutation.isPending,
    grantError: grantAccessMutation.error,
    revokeError: revokeAccessMutation.error
  };
};

// Performance Metrics Hook
export const useEventPerformanceMetrics = (eventType?: EventTypeKey) => {
  return useQuery({
    queryKey: ['event-performance-metrics', eventType],
    queryFn: async () => {
      const result = await window.api.events.getPerformanceMetrics({ eventType });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get performance metrics');
      }
      
      return result.metrics as PerformanceMetrics | Map<EventTypeKey, PerformanceMetrics>;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000 // Consider stale after 25 seconds
  });
};

// Subscription Statistics Hook
export const useSubscriptionStats = () => {
  return useQuery({
    queryKey: ['event-subscription-stats'],
    queryFn: async () => {
      const result = await window.api.events.getSubscriptionStats();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get subscription stats');
      }
      
      return result.stats as SubscriptionStats;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000 // Consider stale after 25 seconds
  });
};

// Event Types Hook
export const useEventTypes = () => {
  return useQuery({
    queryKey: ['event-types'],
    queryFn: async () => {
      const result = await window.api.events.getEventTypes();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get event types');
      }
      
      return result.eventTypes as EventTypeKey[];
    },
    staleTime: Infinity, // Event types rarely change
    gcTime: Infinity
  });
};

// Event Validation Hook
export const useEventValidator = () => {
  const validateMutation = useMutation({
    mutationFn: async ({
      eventType,
      payload
    }: {
      eventType: EventTypeKey;
      payload: any;
    }) => {
      const result = await window.api.events.validatePayload(eventType, payload);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to validate event payload');
      }
      
      return result.validatedPayload;
    }
  });

  const validate = useCallback(
    (eventType: EventTypeKey, payload: any) => {
      return validateMutation.mutateAsync({ eventType, payload });
    },
    [validateMutation]
  );

  return {
    validate,
    isValidating: validateMutation.isPending,
    error: validateMutation.error,
    reset: validateMutation.reset
  };
};

// Combined Event System Hook (convenience hook)
export const useEventSystem = () => {
  const publisher = useEventPublisher();
  const accessManager = usePluginAccessManager();
  const validator = useEventValidator();
  const { data: eventTypes } = useEventTypes();
  const { data: subscriptionStats } = useSubscriptionStats();
  const { data: performanceMetrics } = useEventPerformanceMetrics();

  return {
    // Publishing
    publish: publisher.publish,
    isPublishing: publisher.isPublishing,
    publishError: publisher.error,

    // Access Management
    grantAccess: accessManager.grantAccess,
    revokeAccess: accessManager.revokeAccess,
    isGrantingAccess: accessManager.isGranting,
    isRevokingAccess: accessManager.isRevoking,
    grantAccessError: accessManager.grantError,
    revokeAccessError: accessManager.revokeError,

    // Validation
    validate: validator.validate,
    isValidating: validator.isValidating,
    validationError: validator.error,

    // Data
    eventTypes,
    subscriptionStats,
    performanceMetrics,

    // Note: To create a subscription, use the useEventSubscription hook directly in your component
    useEventSubscription,
    
    resetErrors: () => {
      publisher.reset();
      validator.reset();
    }
  };
};

// Event History Hook (for debugging and monitoring)
export const useEventHistory = (maxEvents: number = 100) => {
  const [eventHistory, setEventHistory] = useState<ReceivedEvent[]>([]);

  const addEvent = useCallback((event: ReceivedEvent) => {
    setEventHistory(prev => {
      const newHistory = [event, ...prev];
      return newHistory.slice(0, maxEvents);
    });
  }, [maxEvents]);

  const clearHistory = useCallback(() => {
    setEventHistory([]);
  }, []);

  const getEventsByType = useCallback((eventType: EventTypeKey) => {
    return eventHistory.filter(event => event.eventType === eventType);
  }, [eventHistory]);

  const getEventsByPlugin = useCallback((pluginId: string) => {
    return eventHistory.filter(event => event.pluginId === pluginId);
  }, [eventHistory]);

  return {
    eventHistory,
    addEvent,
    clearHistory,
    getEventsByType,
    getEventsByPlugin,
    totalEvents: eventHistory.length
  };
};
