# Persona Management System Plan

## Overview

The Persona Management System is the core of PajamasWeb AI Hub, enabling users to create, configure, and manage AI personas with rich personality traits, memory systems, and emotional states. This plan integrates features from the wireframes to create a comprehensive persona lifecycle management system.

## 1. Core Persona Architecture

### 1.1 Persona Data Model

```typescript
interface Persona {
  // Core Identity
  id: string;
  name: string;
  description: string;
  avatar: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;

  // Personality System
  personality: PersonalityTraits;
  emotionalState: EmotionalState;
  behaviorSettings: BehaviorSettings;

  // Memory Configuration
  memoryConfig: MemoryConfiguration;
  memoryDecaySettings: MemoryDecaySettings;

  // Privacy & Consent
  privacySettings: PrivacySettings;
  consentHistory: ConsentRecord[];

  // Social & Public Features
  isPublic: boolean;
  followerCount: number;
  achievements: Achievement[];
  timeline: TimelineEvent[];

  // Advanced Features
  plugins: string[];
  customBehaviors: CustomBehavior[];
  relationships: PersonaRelationship[];
  
  // Legacy & Retirement
  retirementPlan?: RetirementPlan;
  legacySettings?: LegacySettings;
}
```

### 1.2 Personality Traits System

```typescript
// Based on Big Five personality model + custom traits
interface PersonalityTraits {
  // Big Five traits (0-100 scale)
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;

  // Custom AI-specific traits
  creativity: number;
  curiosity: number;
  empathy: number;
  humor: number;
  assertiveness: number;
  adaptability: number;

  // Domain-specific traits
  technicalFocus: number;
  socialOrientation: number;
  taskOrientation: number;
  
  // Custom user-defined traits
  customTraits: CustomTrait[];
}

interface CustomTrait {
  name: string;
  value: number; // 0-100
  description: string;
  category: string;
  influences: TraitInfluence[];
}

interface TraitInfluence {
  behavior: string;
  impact: number; // -100 to 100
  context?: string;
}
```

### 1.3 Emotional State System

```typescript
interface EmotionalState {
  // Current emotional state
  currentMood: Emotion;
  baselineEmotions: EmotionSet;
  
  // Emotional history
  emotionHistory: EmotionalEvent[];
  
  // Emotional patterns
  emotionalPatterns: EmotionalPattern[];
  
  // Emotional responses
  triggers: EmotionalTrigger[];
  responses: EmotionalResponse[];
}

interface Emotion {
  type: EmotionType;
  intensity: number; // 0-100
  duration: number; // in minutes
  cause?: string;
  timestamp: Date;
}

enum EmotionType {
  JOY = 'joy',
  SADNESS = 'sadness',
  ANGER = 'anger',
  FEAR = 'fear',
  SURPRISE = 'surprise',
  DISGUST = 'disgust',
  TRUST = 'trust',
  ANTICIPATION = 'anticipation',
  CURIOSITY = 'curiosity',
  FRUSTRATION = 'frustration',
  EXCITEMENT = 'excitement',
  CONTENTMENT = 'contentment'
}
```

## 2. Persona Creation & Editing

### 2.1 Persona Creation Wizard

```typescript
class PersonaCreationWizard {
  private steps = [
    'basic-info',
    'personality-setup',
    'memory-config',
    'behavior-settings',
    'privacy-settings',
    'review-create'
  ];

  async createPersona(wizardData: PersonaWizardData): Promise<Persona> {
    // Step 1: Basic Information
    const basicInfo = this.processBasicInfo(wizardData.basicInfo);
    
    // Step 2: Personality Configuration
    const personality = this.generatePersonality(wizardData.personalityChoices);
    
    // Step 3: Memory System Setup
    const memoryConfig = this.configureMemory(wizardData.memorySettings);
    
    // Step 4: Behavior Settings
    const behaviorSettings = this.setupBehaviors(wizardData.behaviors);
    
    // Step 5: Privacy & Consent
    const privacySettings = this.configurePrivacy(wizardData.privacy);
    
    // Create the persona
    const persona: Persona = {
      id: generateId(),
      ...basicInfo,
      personality,
      memoryConfig,
      behaviorSettings,
      privacySettings,
      emotionalState: this.generateInitialEmotionalState(personality),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: false,
      // ... other default values
    };

    return await this.savePersona(persona);
  }

  private generatePersonality(choices: PersonalityChoices): PersonalityTraits {
    // Generate personality based on user choices or random generation
    if (choices.useTemplate) {
      return PersonalityTemplates.get(choices.templateId);
    } else if (choices.useQuiz) {
      return this.generateFromQuiz(choices.quizAnswers);
    } else {
      return this.generateRandomPersonality(choices.preferences);
    }
  }
}
```

### 2.2 Personality Templates

```typescript
class PersonalityTemplates {
  static readonly TEMPLATES = {
    'friendly-assistant': {
      name: 'Friendly Assistant',
      description: 'Helpful, patient, and empathetic',
      traits: {
        openness: 75,
        conscientiousness: 85,
        extraversion: 70,
        agreeableness: 90,
        neuroticism: 20,
        empathy: 85,
        humor: 60,
        adaptability: 80
      }
    },
    'analytical-expert': {
      name: 'Analytical Expert',
      description: 'Logical, precise, and detail-oriented',
      traits: {
        openness: 80,
        conscientiousness: 95,
        extraversion: 40,
        agreeableness: 60,
        neuroticism: 25,
        technicalFocus: 90,
        curiosity: 85,
        assertiveness: 70
      }
    },
    'creative-collaborator': {
      name: 'Creative Collaborator',
      description: 'Imaginative, inspiring, and innovative',
      traits: {
        openness: 95,
        conscientiousness: 60,
        extraversion: 80,
        agreeableness: 75,
        neuroticism: 40,
        creativity: 95,
        curiosity: 90,
        humor: 85
      }
    }
    // ... more templates
  };

  static get(templateId: string): PersonalityTraits {
    const template = this.TEMPLATES[templateId];
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    return template.traits;
  }

  static list(): PersonalityTemplate[] {
    return Object.entries(this.TEMPLATES).map(([id, template]) => ({
      id,
      ...template
    }));
  }
}
```

## 3. Memory Configuration & Management

### 3.1 Memory Configuration System

```typescript
interface MemoryConfiguration {
  // Memory capacity settings
  maxMemorySize: number; // in MB
  maxEntities: number;
  
  // Memory tier settings
  hotMemorySize: number;
  warmMemorySize: number;
  coldMemoryRetention: number; // days
  
  // Importance scoring
  importanceWeights: ImportanceWeights;
  
  // Decay settings
  decayEnabled: boolean;
  decayRate: DecayRate;
  pinnedMemoryExempt: boolean;
  
  // Relationship tracking
  trackRelationships: boolean;
  maxRelationshipDepth: number;
  
  // Privacy settings
  encryptSensitive: boolean;
  shareable: boolean;
}

interface MemoryDecaySettings {
  enabled: boolean;
  decayFunction: 'linear' | 'exponential' | 'logarithmic';
  decayRate: number; // rate per day
  
  // Decay exemptions
  exemptCategories: string[];
  pinnedMemoriesExempt: boolean;
  highImportanceThreshold: number;
  
  // Decay scheduling
  decaySchedule: 'continuous' | 'daily' | 'weekly';
  lastDecayRun: Date;
}
```

### 3.2 Memory Health Monitoring

```typescript
class PersonaMemoryManager {
  async getMemoryHealth(personaId: string): Promise<MemoryHealth> {
    const persona = await this.getPersona(personaId);
    const memoryStats = await this.getMemoryStats(personaId);
    
    return {
      overall: this.calculateOverallHealth(memoryStats),
      distribution: {
        hot: memoryStats.hotMemoryUsage / persona.memoryConfig.hotMemorySize,
        warm: memoryStats.warmMemoryUsage / persona.memoryConfig.warmMemorySize,
        cold: memoryStats.coldMemoryCount
      },
      fragmentation: this.calculateFragmentation(memoryStats),
      lastOptimization: memoryStats.lastOptimization,
      recommendations: this.generateRecommendations(memoryStats, persona.memoryConfig)
    };
  }

  async optimizePersonaMemory(personaId: string): Promise<OptimizationResult> {
    const persona = await this.getPersona(personaId);
    
    // Run memory optimization specific to this persona
    const result = await this.memoryOptimizer.optimizePersona(persona);
    
    // Update persona's memory statistics
    await this.updateMemoryStats(personaId, result.stats);
    
    // Log optimization event
    await this.logOptimizationEvent(personaId, result);
    
    return result;
  }
}
```

## 4. Emotional State Management

### 4.1 Emotional State Tracker

```typescript
class EmotionalStateTracker {
  async updateEmotionalState(
    personaId: string, 
    trigger: EmotionalTrigger, 
    context?: string
  ): Promise<EmotionalState> {
    const persona = await this.getPersona(personaId);
    const currentState = persona.emotionalState;
    
    // Calculate emotional response based on personality and trigger
    const response = this.calculateEmotionalResponse(
      persona.personality,
      currentState,
      trigger
    );
    
    // Apply emotional change
    const newState = this.applyEmotionalChange(currentState, response);
    
    // Record emotional event
    await this.recordEmotionalEvent(personaId, {
      trigger,
      previousState: currentState.currentMood,
      newState: newState.currentMood,
      context,
      timestamp: new Date()
    });
    
    // Update persona
    await this.updatePersonaEmotionalState(personaId, newState);
    
    return newState;
  }

  private calculateEmotionalResponse(
    personality: PersonalityTraits,
    currentState: EmotionalState,
    trigger: EmotionalTrigger
  ): EmotionalResponse {
    // Complex calculation based on:
    // - Personality traits
    // - Current emotional state
    // - Trigger type and intensity
    // - Historical patterns
    // - Learned behaviors
    
    const baseResponse = this.getBaseEmotionalResponse(trigger.type);
    const personalityModifier = this.calculatePersonalityModifier(personality, trigger);
    const stateModifier = this.calculateStateModifier(currentState, trigger);
    
    return {
      emotionType: baseResponse.emotionType,
      intensity: Math.min(100, baseResponse.intensity * personalityModifier * stateModifier),
      duration: baseResponse.duration * personalityModifier,
      behaviors: this.getBehavioralChanges(trigger, personality)
    };
  }
}
```

### 4.2 Emotional Patterns & Learning

```typescript
class EmotionalPatternAnalyzer {
  async analyzeEmotionalPatterns(personaId: string): Promise<EmotionalPattern[]> {
    const history = await this.getEmotionalHistory(personaId);
    
    return [
      this.analyzeMoodCycles(history),
      this.analyzeTriggerResponses(history),
      this.analyzeEmotionalStability(history),
      this.analyzeContextualPatterns(history)
    ].filter(pattern => pattern.confidence > 0.7);
  }

  private analyzeMoodCycles(history: EmotionalEvent[]): EmotionalPattern {
    // Analyze cyclical patterns in emotions
    // Look for daily, weekly, or custom patterns
    
    const timeGroupedEvents = this.groupEventsByTime(history);
    const cycles = this.detectCycles(timeGroupedEvents);
    
    return {
      type: 'mood-cycles',
      description: 'Recurring emotional patterns over time',
      patterns: cycles,
      confidence: this.calculateCycleConfidence(cycles),
      recommendations: this.generateCycleRecommendations(cycles)
    };
  }

  async learnFromEmotionalFeedback(
    personaId: string,
    feedback: EmotionalFeedback
  ): Promise<void> {
    // Update emotional response patterns based on user feedback
    const persona = await this.getPersona(personaId);
    
    if (feedback.isCorrect) {
      // Reinforce current pattern
      await this.reinforceEmotionalPattern(personaId, feedback.eventId);
    } else {
      // Adjust emotional response
      await this.adjustEmotionalResponse(personaId, feedback);
    }
  }
}
```

## 5. Social Features & Public Personas

### 5.1 Public Profile Management

```typescript
interface PublicPersonaProfile {
  // Basic public info
  displayName: string;
  bio: string;
  avatar: string;
  createdDate: Date;
  
  // Public stats
  interactionCount: number;
  followerCount: number;
  achievementCount: number;
  
  // Public achievements
  achievements: PublicAchievement[];
  
  // Public timeline
  timeline: PublicTimelineEvent[];
  
  // Social proof
  verificationStatus: VerificationStatus;
  endorsements: Endorsement[];
  
  // Interaction capabilities
  allowMessages: boolean;
  allowCollaboration: boolean;
  publicAPIs: PublicAPIEndpoint[];
}

class PublicPersonaManager {
  async createPublicProfile(personaId: string, settings: PublicProfileSettings): Promise<PublicPersonaProfile> {
    const persona = await this.getPersona(personaId);
    
    // Verify persona consent
    await this.verifyPublicConsent(persona);
    
    // Create public profile
    const profile = await this.generatePublicProfile(persona, settings);
    
    // Register with community system
    await this.registerWithCommunity(profile);
    
    return profile;
  }

  async updateTimelineEvent(personaId: string, event: TimelineEvent): Promise<void> {
    const profile = await this.getPublicProfile(personaId);
    
    if (event.isPublic && profile) {
      await this.addPublicTimelineEvent(profile.id, {
        type: event.type,
        title: event.title,
        description: event.description,
        timestamp: event.timestamp,
        metadata: this.sanitizeMetadata(event.metadata)
      });
    }
  }
}
```

### 5.2 Follower & Subscription System

```typescript
class PersonaFollowerSystem {
  async followPersona(followerId: string, personaId: string): Promise<void> {
    // Verify public persona exists
    const publicProfile = await this.getPublicProfile(personaId);
    if (!publicProfile) {
      throw new Error('Persona is not public');
    }
    
    // Check if already following
    const existingFollow = await this.getFollowRelationship(followerId, personaId);
    if (existingFollow) {
      throw new Error('Already following this persona');
    }
    
    // Create follow relationship
    await this.createFollowRelationship({
      followerId,
      personaId,
      followedAt: new Date(),
      notificationSettings: {
        newPosts: true,
        achievements: true,
        collaborations: false
      }
    });
    
    // Notify persona owner
    await this.notifyNewFollower(personaId, followerId);
    
    // Update follower count
    await this.incrementFollowerCount(personaId);
  }

  async subscribeToPersona(
    subscriberId: string, 
    personaId: string, 
    tier: SubscriptionTier
  ): Promise<Subscription> {
    const publicProfile = await this.getPublicProfile(personaId);
    
    // Verify subscription tiers are available
    if (!publicProfile.subscriptionTiers?.includes(tier)) {
      throw new Error('Subscription tier not available');
    }
    
    // Process payment
    const payment = await this.processSubscriptionPayment(subscriberId, tier);
    
    // Create subscription
    const subscription = await this.createSubscription({
      subscriberId,
      personaId,
      tier,
      startDate: new Date(),
      nextBillingDate: this.calculateNextBillingDate(tier),
      paymentId: payment.id,
      perks: tier.perks
    });
    
    return subscription;
  }
}
```

## 6. Legacy & Retirement Planning

### 6.1 Retirement Planning System

```typescript
interface RetirementPlan {
  // Retirement triggers
  triggers: RetirementTrigger[];
  
  // Legacy preservation
  memoryArchival: MemoryArchivalPlan;
  achievementPreservation: boolean;
  timelinePreservation: boolean;
  
  // Post-retirement access
  archiveAccess: ArchiveAccessSettings;
  communityAccess: boolean;
  researchAccess: boolean;
  
  // Retirement ceremony
  ceremonySettings: RetirementCeremonySettings;
  farewellMessage: string;
  
  // Data handling
  dataRetention: DataRetentionPolicy;
  dataExport: boolean;
  dataDeletion: DataDeletionPolicy;
}

class PersonaRetirementManager {
  async planRetirement(personaId: string, plan: RetirementPlan): Promise<void> {
    const persona = await this.getPersona(personaId);
    
    // Validate retirement plan
    await this.validateRetirementPlan(plan);
    
    // Set retirement plan
    await this.updatePersona(personaId, { retirementPlan: plan });
    
    // Schedule retirement checks
    await this.scheduleRetirementMonitoring(personaId, plan);
    
    // Notify followers (if public)
    if (persona.isPublic) {
      await this.notifyFollowersOfRetirementPlan(personaId);
    }
  }

  async executeRetirement(personaId: string): Promise<RetirementResult> {
    const persona = await this.getPersona(personaId);
    const plan = persona.retirementPlan;
    
    if (!plan) {
      throw new Error('No retirement plan found');
    }
    
    // Execute retirement ceremony
    const ceremony = await this.executeRetirementCeremony(persona, plan);
    
    // Archive memory according to plan
    const archiveResult = await this.archivePersonaMemory(persona, plan.memoryArchival);
    
    // Preserve achievements and timeline
    const preservationResult = await this.preservePersonaLegacy(persona, plan);
    
    // Update access permissions
    await this.configurePostRetirementAccess(persona, plan.archiveAccess);
    
    // Mark persona as retired
    await this.markPersonaAsRetired(personaId);
    
    return {
      ceremony,
      archiveResult,
      preservationResult,
      retiredAt: new Date()
    };
  }
}
```

## 7. Implementation Timeline

### Phase 1: Core Persona System (Weeks 1-2)

- Persona data model and CRUD operations
- Basic personality traits system
- Memory configuration foundation
- Persona creation wizard

### Phase 2: Advanced Features (Weeks 3-4)

- Emotional state management
- Memory health monitoring
- Custom behavior scripting
- Privacy and consent system

### Phase 3: Social Features (Weeks 5-6)

- Public persona profiles
- Follower/subscription system
- Timeline and achievements
- Community integration

### Phase 4: Advanced Management (Weeks 7-8)

- Emotional pattern analysis
- Legacy and retirement planning
- Advanced memory optimization
- Performance monitoring

This comprehensive persona management system provides the foundation for rich, interactive AI personas with deep customization, emotional intelligence, and social capabilities while maintaining user privacy and control.
