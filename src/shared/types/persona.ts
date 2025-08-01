import { z } from 'zod';

// Enhanced Persona system types and interfaces

// Big Five personality traits + custom traits
export const PersonalityTraitSchema = z.object({
  name: z.string(),
  value: z.number().min(0).max(100), // 0-100 scale
  description: z.string().optional(),
  category: z.enum(['bigFive', 'custom']).default('custom'),
});

export const BigFiveTraitsSchema = z.object({
  openness: z.number().min(0).max(100).default(50),
  conscientiousness: z.number().min(0).max(100).default(50),
  extraversion: z.number().min(0).max(100).default(50),
  agreeableness: z.number().min(0).max(100).default(50),
  neuroticism: z.number().min(0).max(100).default(50),
});

export const CustomTraitsSchema = z.record(z.string(), z.number().min(0).max(100));

export const PersonalityProfileSchema = z.object({
  bigFive: BigFiveTraitsSchema,
  customTraits: CustomTraitsSchema.default({}),
  dominantTraits: z.array(z.string()).default([]),
  personalityType: z.string().optional(), // MBTI, Enneagram, etc.
});

// Emotional State System
export const EmotionalStateSchema = z.object({
  primaryEmotion: z.enum(['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral']).default('neutral'),
  intensity: z.number().min(0).max(100).default(50),
  confidence: z.number().min(0).max(100).default(50),
  context: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
});

export const EmotionalPatternSchema = z.object({
  averageIntensity: z.number().min(0).max(100).default(50),
  emotionalRange: z.number().min(0).max(100).default(50),
  stabilityScore: z.number().min(0).max(100).default(50),
  dominantEmotions: z.array(z.string()).default([]),
  triggers: z.record(z.string(), z.string()).default({}),
});

// Memory Configuration
export const MemoryConfigurationSchema = z.object({
  maxMemories: z.number().min(100).max(10000).default(1000),
  memoryImportanceThreshold: z.number().min(0).max(100).default(50),
  autoOptimize: z.boolean().default(true),
  retentionPeriod: z.number().min(1).max(365).default(90), // days
  memoryCategories: z.array(z.string()).default(['conversation', 'learning', 'preference', 'fact']),
  compressionEnabled: z.boolean().default(true),
});

// Privacy and Consent Settings
export const PrivacySettingsSchema = z.object({
  dataCollection: z.boolean().default(true),
  analyticsEnabled: z.boolean().default(false),
  shareWithResearchers: z.boolean().default(false),
  allowPersonalityAnalysis: z.boolean().default(true),
  memoryRetention: z.boolean().default(true),
  exportDataAllowed: z.boolean().default(true),
});

export const ConsentRecordSchema = z.object({
  version: z.string(),
  agreedAt: z.date(),
  ipAddress: z.string().optional(),
  consentType: z.enum(['full', 'partial', 'minimal']),
  specificConsents: z.record(z.string(), z.boolean()).default({}),
});

// Enhanced Persona Data Schema
export const PersonaDataSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  
  // Enhanced personality system
  personalityProfile: PersonalityProfileSchema.optional(),
  currentEmotionalState: EmotionalStateSchema.optional(),
  emotionalPattern: EmotionalPatternSchema.optional(),
  
  // Memory and behavior configuration
  memoryConfiguration: MemoryConfigurationSchema.default(() => ({})),
  behaviorSettings: z.record(z.string(), z.any()).default({}),
  
  // Privacy and consent
  privacySettings: PrivacySettingsSchema.default(() => ({})),
  consentRecord: ConsentRecordSchema.optional(),
  
  // Legacy fields (maintained for backward compatibility)
  personality: z.record(z.any()).optional(),
  memories: z.array(z.string()).default([]),
  
  // Status and metadata
  isActive: z.boolean().default(true),
  version: z.string().default('1.0'),
  templateId: z.string().optional(), // Reference to personality template
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Type exports
export interface PersonaData extends z.infer<typeof PersonaDataSchema> {}
export interface PersonalityTrait extends z.infer<typeof PersonalityTraitSchema> {}
export interface PersonalityProfile extends z.infer<typeof PersonalityProfileSchema> {}
export interface EmotionalState extends z.infer<typeof EmotionalStateSchema> {}
export interface EmotionalPattern extends z.infer<typeof EmotionalPatternSchema> {}
export interface MemoryConfiguration extends z.infer<typeof MemoryConfigurationSchema> {}
export interface PrivacySettings extends z.infer<typeof PrivacySettingsSchema> {}
export interface ConsentRecord extends z.infer<typeof ConsentRecordSchema> {}

// Legacy interface (maintained for backward compatibility)
export interface PersonaConfig {
  maxMemories: number;
  memoryImportanceThreshold: number;
  autoOptimize: boolean;
} 