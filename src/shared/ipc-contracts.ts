import { z } from 'zod';
import { 
  PersonalityProfileSchema,
  EmotionalStateSchema,
  PrivacySettingsSchema,
  MemoryConfigurationSchema,
  PluginManifestSchema
} from '../main/database/schema';

// IPC Channel names
export const IPC_CHANNELS = {
  // Persona operations
  PERSONAS_LIST: 'personas:list',
  PERSONAS_GET: 'personas:get',
  PERSONAS_CREATE: 'personas:create',
  PERSONAS_UPDATE: 'personas:update',
  PERSONAS_DELETE: 'personas:delete',
  
  // Memory operations
  MEMORIES_LIST: 'memories:list',
  MEMORIES_GET: 'memories:get',
  MEMORIES_CREATE: 'memories:create',
  MEMORIES_UPDATE: 'memories:update',
  MEMORIES_DELETE: 'memories:delete',
  MEMORIES_UPDATE_ACCESS: 'memories:updateAccess',
  
  // Plugin operations
  PLUGINS_LIST: 'plugins:list',
  PLUGINS_GET: 'plugins:get',
  PLUGINS_CREATE: 'plugins:create',
  PLUGINS_UPDATE: 'plugins:update',
  PLUGINS_DELETE: 'plugins:delete',
  PLUGINS_TOGGLE: 'plugins:toggle',
  
  // Database operations
  DATABASE_HEALTH: 'database:health',
  DATABASE_STATS: 'database:stats',
  DATABASE_BACKUP: 'database:backup',
  
  // Event system operations
  EVENT_SUBSCRIBE: 'event:subscribe',
  EVENT_PUBLISH: 'event:publish',
  EVENT_UNSUBSCRIBE: 'event:unsubscribe',
  EVENT_GRANT_PLUGIN_ACCESS: 'event:grant-plugin-access',
  EVENT_REVOKE_PLUGIN_ACCESS: 'event:revoke-plugin-access',
  EVENT_GET_PERFORMANCE_METRICS: 'event:get-performance-metrics',
  EVENT_GET_SUBSCRIPTION_STATS: 'event:get-subscription-stats',
  EVENT_GET_EVENT_TYPES: 'event:get-event-types',
  EVENT_VALIDATE_PAYLOAD: 'event:validate-payload',
  EVENT_RECEIVED: 'event:received',
} as const;

// Request/Response schemas for Personas
export const PersonaCreateRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  personality_profile: PersonalityProfileSchema.optional(),
  emotional_state: EmotionalStateSchema.optional(),
  privacy_settings: PrivacySettingsSchema.optional(),
  memory_configuration: MemoryConfigurationSchema.optional(),
});

export const PersonaUpdateRequestSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Name is required').optional(),
  personality_profile: PersonalityProfileSchema.optional(),
  emotional_state: EmotionalStateSchema.optional(),
  privacy_settings: PrivacySettingsSchema.optional(),
  memory_configuration: MemoryConfigurationSchema.optional(),
});

export const PersonaResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  personality_profile: PersonalityProfileSchema.nullable(),
  emotional_state: EmotionalStateSchema.nullable(),
  privacy_settings: PrivacySettingsSchema.nullable(),
  memory_configuration: MemoryConfigurationSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Request/Response schemas for Memories
export const MemoryCreateRequestSchema = z.object({
  persona_id: z.number().optional(),
  content: z.string().min(1, 'Content is required'),
  type: z.string(),
  tier: z.enum(['hot', 'warm', 'cold']).default('warm'),
  embedding_vector: z.array(z.number()).optional(),
  metadata: z.record(z.any()).optional(),
  importance_score: z.number().min(0).max(1).default(0.5),
});

export const MemoryUpdateRequestSchema = z.object({
  id: z.number(),
  persona_id: z.number().optional(),
  content: z.string().min(1, 'Content is required').optional(),
  type: z.string().optional(),
  tier: z.enum(['hot', 'warm', 'cold']).optional(),
  embedding_vector: z.array(z.number()).optional(),
  metadata: z.record(z.any()).optional(),
  importance_score: z.number().min(0).max(1).optional(),
});

export const MemoryListRequestSchema = z.object({
  persona_id: z.number().optional(),
  limit: z.number().default(100),
});

export const MemoryResponseSchema = z.object({
  id: z.number(),
  persona_id: z.number().nullable(),
  content: z.string(),
  type: z.string(),
  tier: z.enum(['hot', 'warm', 'cold']),
  embedding_vector: z.array(z.number()).nullable(),
  metadata: z.record(z.any()).nullable(),
  importance_score: z.number(),
  last_accessed_at: z.string(),
  access_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Request/Response schemas for Plugins
export const PluginCreateRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  manifest: PluginManifestSchema,
  enabled: z.boolean().default(true),
  version: z.string().optional(),
  installation_path: z.string().optional(),
});

export const PluginUpdateRequestSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Name is required').optional(),
  manifest: PluginManifestSchema.optional(),
  enabled: z.boolean().optional(),
  version: z.string().optional(),
  installation_path: z.string().optional(),
});

export const PluginToggleRequestSchema = z.object({
  id: z.number(),
  enabled: z.boolean(),
});

export const PluginResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  manifest: PluginManifestSchema,
  enabled: z.boolean(),
  version: z.string().nullable(),
  installation_path: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Common schemas
export const IdRequestSchema = z.object({
  id: z.number(),
});

export const BackupRequestSchema = z.object({
  path: z.string(),
});

export const DatabaseStatsSchema = z.object({
  path: z.string(),
  size: z.number(),
  pageCount: z.number(),
  pageSize: z.number(),
  journalMode: z.string(),
  foreignKeys: z.number(),
});

// Success/Error response wrappers
export const SuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
});

export const ResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.union([SuccessResponseSchema(dataSchema), ErrorResponseSchema]);

// Type exports
export type PersonaCreateRequest = z.infer<typeof PersonaCreateRequestSchema>;
export type PersonaUpdateRequest = z.infer<typeof PersonaUpdateRequestSchema>;
export type PersonaResponse = z.infer<typeof PersonaResponseSchema>;

export type MemoryCreateRequest = z.infer<typeof MemoryCreateRequestSchema>;
export type MemoryUpdateRequest = z.infer<typeof MemoryUpdateRequestSchema>;
export type MemoryListRequest = z.infer<typeof MemoryListRequestSchema>;
export type MemoryResponse = z.infer<typeof MemoryResponseSchema>;

export type PluginCreateRequest = z.infer<typeof PluginCreateRequestSchema>;
export type PluginUpdateRequest = z.infer<typeof PluginUpdateRequestSchema>;
export type PluginToggleRequest = z.infer<typeof PluginToggleRequestSchema>;
export type PluginResponse = z.infer<typeof PluginResponseSchema>;

export type IdRequest = z.infer<typeof IdRequestSchema>;
export type BackupRequest = z.infer<typeof BackupRequestSchema>;
export type DatabaseStats = z.infer<typeof DatabaseStatsSchema>;

export type SuccessResponse<T> = z.infer<ReturnType<typeof SuccessResponseSchema<z.ZodType<T>>>>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// IPC API interface for the renderer
export interface RendererAPI {
  // Personas
  personas: {
    list(): Promise<ApiResponse<PersonaResponse[]>>;
    get(id: number): Promise<ApiResponse<PersonaResponse>>;
    create(data: PersonaCreateRequest): Promise<ApiResponse<PersonaResponse>>;
    update(data: PersonaUpdateRequest): Promise<ApiResponse<PersonaResponse>>;
    delete(id: number): Promise<ApiResponse<boolean>>;
  };
  
  // Memories
  memories: {
    list(params?: MemoryListRequest): Promise<ApiResponse<MemoryResponse[]>>;
    get(id: number): Promise<ApiResponse<MemoryResponse>>;
    create(data: MemoryCreateRequest): Promise<ApiResponse<MemoryResponse>>;
    update(data: MemoryUpdateRequest): Promise<ApiResponse<MemoryResponse>>;
    delete(id: number): Promise<ApiResponse<boolean>>;
    updateAccess(id: number): Promise<ApiResponse<void>>;
  };
  
  // Plugins
  plugins: {
    list(): Promise<ApiResponse<PluginResponse[]>>;
    get(id: number): Promise<ApiResponse<PluginResponse>>;
    create(data: PluginCreateRequest): Promise<ApiResponse<PluginResponse>>;
    update(data: PluginUpdateRequest): Promise<ApiResponse<PluginResponse>>;
    delete(id: number): Promise<ApiResponse<boolean>>;
    toggle(data: PluginToggleRequest): Promise<ApiResponse<PluginResponse>>;
  };
  
  // Database
  database: {
    health(): Promise<ApiResponse<boolean>>;
    stats(): Promise<ApiResponse<DatabaseStats | null>>;
    backup(path: string): Promise<ApiResponse<void>>;
  };

  // Events
  events: {
    subscribe(eventType: string, options: any): Promise<{ success: boolean; subscriptionId?: string; error?: string }>;
    publish(eventType: string, payload: any, options?: any): Promise<{ success: boolean; error?: string }>;
    unsubscribe(subscriptionId: string): Promise<{ success: boolean; error?: string }>;
    grantPluginAccess(request: any): Promise<{ success: boolean; accessToken?: string; error?: string }>;
    revokePluginAccess(request: any): Promise<{ success: boolean; error?: string }>;
    getPerformanceMetrics(request?: any): Promise<{ success: boolean; metrics?: any; error?: string }>;
    getSubscriptionStats(): Promise<{ success: boolean; stats?: any; error?: string }>;
    getEventTypes(): Promise<{ success: boolean; eventTypes?: string[]; error?: string }>;
    validatePayload(eventType: string, payload: any): Promise<{ success: boolean; validatedPayload?: any; error?: string }>;
    onEventReceived(callback: (event: any) => void): () => void;
  };
}

// Utility function to create success response
export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return { success: true, data };
}

// Utility function to create error response
export function createErrorResponse(error: string, code?: string): ErrorResponse {
  return { success: false, error, code };
}
