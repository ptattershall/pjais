import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// Validation schemas for JSON fields
export const PersonalityProfileSchema = z.object({
  traits: z.record(z.number()).optional(),
  preferences: z.record(z.any()).optional(),
  behavioral_patterns: z.array(z.string()).optional(),
});

export const EmotionalStateSchema = z.object({
  current_mood: z.string().optional(),
  energy_level: z.number().min(0).max(1).optional(),
  stress_level: z.number().min(0).max(1).optional(),
  satisfaction_level: z.number().min(0).max(1).optional(),
});

export const PrivacySettingsSchema = z.object({
  data_sharing: z.boolean().default(false),
  analytics_enabled: z.boolean().default(true),
  memory_retention_days: z.number().default(365),
  consent_given: z.boolean().default(false),
  consent_date: z.string().optional(),
});

export const MemoryConfigurationSchema = z.object({
  max_hot_memories: z.number().default(100),
  max_warm_memories: z.number().default(1000),
  max_cold_memories: z.number().default(10000),
  auto_tier_enabled: z.boolean().default(true),
  importance_threshold: z.number().default(0.5),
});

export const PluginManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  author: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  entry_point: z.string().optional(),
});

// Personas table
export const personas = sqliteTable('personas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  personality_profile: text('personality_profile', { mode: 'json' }).$type<z.infer<typeof PersonalityProfileSchema>>(),
  emotional_state: text('emotional_state', { mode: 'json' }).$type<z.infer<typeof EmotionalStateSchema>>(),
  privacy_settings: text('privacy_settings', { mode: 'json' }).$type<z.infer<typeof PrivacySettingsSchema>>(),
  memory_configuration: text('memory_configuration', { mode: 'json' }).$type<z.infer<typeof MemoryConfigurationSchema>>(),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// Memory entities table
export const memoryEntities = sqliteTable('memory_entities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  persona_id: integer('persona_id').references(() => personas.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  type: text('type').notNull(),
  tier: text('tier', { enum: ['hot', 'warm', 'cold'] }).default('warm'),
  embedding_vector: text('embedding_vector', { mode: 'json' }).$type<number[]>(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, any>>(),
  importance_score: real('importance_score').default(0.5),
  last_accessed_at: text('last_accessed_at').default('CURRENT_TIMESTAMP'),
  access_count: integer('access_count').default(0),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// Memory relationships table
export const memoryRelationships = sqliteTable('memory_relationships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  from_memory_id: integer('from_memory_id').notNull().references(() => memoryEntities.id, { onDelete: 'cascade' }),
  to_memory_id: integer('to_memory_id').notNull().references(() => memoryEntities.id, { onDelete: 'cascade' }),
  relationship_type: text('relationship_type').notNull(),
  strength: real('strength').default(1.0),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// Plugins table
export const plugins = sqliteTable('plugins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  manifest: text('manifest', { mode: 'json' }).$type<z.infer<typeof PluginManifestSchema>>().notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  version: text('version'),
  installation_path: text('installation_path'),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// Define relationships
export const personasRelations = relations(personas, ({ many }) => ({
  memories: many(memoryEntities),
}));

export const memoryEntitiesRelations = relations(memoryEntities, ({ one, many }) => ({
  persona: one(personas, {
    fields: [memoryEntities.persona_id],
    references: [personas.id],
  }),
  outgoingRelationships: many(memoryRelationships, {
    relationName: 'outgoing',
  }),
  incomingRelationships: many(memoryRelationships, {
    relationName: 'incoming',
  }),
}));

export const memoryRelationshipsRelations = relations(memoryRelationships, ({ one }) => ({
  fromMemory: one(memoryEntities, {
    fields: [memoryRelationships.from_memory_id],
    references: [memoryEntities.id],
    relationName: 'outgoing',
  }),
  toMemory: one(memoryEntities, {
    fields: [memoryRelationships.to_memory_id],
    references: [memoryEntities.id],
    relationName: 'incoming',
  }),
}));

// TypeScript types derived from schema
export type Persona = typeof personas.$inferSelect;
export type PersonaInsert = typeof personas.$inferInsert;

export type MemoryEntity = typeof memoryEntities.$inferSelect;
export type MemoryEntityInsert = typeof memoryEntities.$inferInsert;

export type MemoryRelationship = typeof memoryRelationships.$inferSelect;
export type MemoryRelationshipInsert = typeof memoryRelationships.$inferInsert;

export type Plugin = typeof plugins.$inferSelect;
export type PluginInsert = typeof plugins.$inferInsert;
