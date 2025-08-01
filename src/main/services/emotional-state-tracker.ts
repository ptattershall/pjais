import { PersonaData, EmotionalState, EmotionalPattern } from '../../shared/types/persona';

export interface EmotionalTrigger {
  type: 'positive' | 'negative' | 'neutral' | 'achievement' | 'failure' | 'surprise' | 'conflict';
  intensity: number; // 0-100
  source: 'user_interaction' | 'system_event' | 'memory_access' | 'learning' | 'external';
  context?: string;
  metadata?: Record<string, any>;
}

export interface EmotionalResponse {
  newEmotion: EmotionalState['primaryEmotion'];
  intensityChange: number; // -100 to +100
  confidence: number; // 0-100
  reasoning: string;
  triggers: string[];
}

export interface EmotionalEvent {
  id: string;
  personaId: string;
  timestamp: Date;
  trigger: EmotionalTrigger;
  previousState: EmotionalState;
  newState: EmotionalState;
  response: EmotionalResponse;
  context?: string;
}

export interface EmotionalAnalytics {
  averageIntensity: number;
  emotionalVolatility: number; // How much emotions change
  dominantEmotions: Array<{
    emotion: EmotionalState['primaryEmotion'];
    frequency: number;
    averageIntensity: number;
  }>;
  triggerPatterns: Array<{
    trigger: EmotionalTrigger['type'];
    frequency: number;
    averageResponse: number;
  }>;
  emotionalTrends: Array<{
    date: Date;
    emotion: EmotionalState['primaryEmotion'];
    intensity: number;
  }>;
}

export class EmotionalStateTracker {
  private emotionalHistory: Map<string, EmotionalEvent[]> = new Map();
  private emotionalDecayRate = 0.1; // How fast emotions return to baseline per hour

  async updateEmotionalState(
    persona: PersonaData,
    trigger: EmotionalTrigger,
    context?: string
  ): Promise<EmotionalState> {
    const currentState = persona.currentEmotionalState || this.getDefaultEmotionalState();
    
    // Calculate emotional response based on personality and trigger
    const response = this.calculateEmotionalResponse(persona, currentState, trigger);
    
    // Apply emotional change with personality modifiers
    const newState = this.applyEmotionalChange(currentState, response, persona);
    
    // Record emotional event
    const event: EmotionalEvent = {
      id: `emotion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      personaId: persona.id!,
      timestamp: new Date(),
      trigger,
      previousState: currentState,
      newState,
      response,
      context
    };
    
    await this.recordEmotionalEvent(event);
    
    return newState;
  }

  async getEmotionalPattern(personaId: string, timeWindow?: number): Promise<EmotionalPattern> {
    const history = this.getEmotionalHistory(personaId, timeWindow);
    
    if (history.length === 0) {
      return this.getDefaultEmotionalPattern();
    }

    // Calculate average intensity
    const averageIntensity = history.reduce((sum, event) => 
      sum + event.newState.intensity, 0) / history.length;

    // Calculate emotional range (volatility)
    const intensities = history.map(event => event.newState.intensity);
    const maxIntensity = Math.max(...intensities);
    const minIntensity = Math.min(...intensities);
    const emotionalRange = maxIntensity - minIntensity;

    // Calculate stability score (lower variance = higher stability)
    const variance = this.calculateVariance(intensities);
    const stabilityScore = Math.max(0, 100 - (variance / 10));

    // Find dominant emotions
    const emotionCounts: Record<string, number> = {};
    history.forEach(event => {
      const emotion = event.newState.primaryEmotion;
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    const dominantEmotions = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([emotion]) => emotion);

    // Identify triggers
    const triggerCounts: Record<string, string> = {};
    history.forEach(event => {
      const triggerType = event.trigger.type;
      const responseEmotion = event.newState.primaryEmotion;
      triggerCounts[triggerType] = responseEmotion;
    });

    return {
      averageIntensity,
      emotionalRange,
      stabilityScore,
      dominantEmotions,
      triggers: triggerCounts
    };
  }

  async getEmotionalAnalytics(personaId: string, days: number = 30): Promise<EmotionalAnalytics> {
    const history = this.getEmotionalHistory(personaId, days * 24 * 60 * 60 * 1000);
    
    if (history.length === 0) {
      return this.getEmptyAnalytics();
    }

    const averageIntensity = history.reduce((sum, event) => 
      sum + event.newState.intensity, 0) / history.length;

    // Calculate volatility (average intensity change)
    const intensityChanges = history.map(event => 
      Math.abs(event.newState.intensity - event.previousState.intensity));
    const emotionalVolatility = intensityChanges.reduce((sum, change) => 
      sum + change, 0) / intensityChanges.length;

    // Dominant emotions analysis
    const emotionStats: Record<string, { count: number; totalIntensity: number }> = {};
    history.forEach(event => {
      const emotion = event.newState.primaryEmotion;
      if (!emotionStats[emotion]) {
        emotionStats[emotion] = { count: 0, totalIntensity: 0 };
      }
      emotionStats[emotion].count++;
      emotionStats[emotion].totalIntensity += event.newState.intensity;
    });

    const dominantEmotions = Object.entries(emotionStats)
      .map(([emotion, stats]) => ({
        emotion: emotion as EmotionalState['primaryEmotion'],
        frequency: (stats.count / history.length) * 100,
        averageIntensity: stats.totalIntensity / stats.count
      }))
      .sort((a, b) => b.frequency - a.frequency);

    // Trigger patterns analysis
    const triggerStats: Record<string, { count: number; totalResponse: number }> = {};
    history.forEach(event => {
      const triggerType = event.trigger.type;
      if (!triggerStats[triggerType]) {
        triggerStats[triggerType] = { count: 0, totalResponse: 0 };
      }
      triggerStats[triggerType].count++;
      triggerStats[triggerType].totalResponse += event.response.intensityChange;
    });

    const triggerPatterns = Object.entries(triggerStats)
      .map(([trigger, stats]) => ({
        trigger: trigger as EmotionalTrigger['type'],
        frequency: (stats.count / history.length) * 100,
        averageResponse: stats.totalResponse / stats.count
      }))
      .sort((a, b) => b.frequency - a.frequency);

    // Emotional trends (daily aggregates)
    const dailyTrends = this.calculateDailyTrends(history, days);

    return {
      averageIntensity,
      emotionalVolatility,
      dominantEmotions,
      triggerPatterns,
      emotionalTrends: dailyTrends
    };
  }

  private calculateEmotionalResponse(
    persona: PersonaData,
    currentState: EmotionalState,
    trigger: EmotionalTrigger
  ): EmotionalResponse {
    const personality = persona.personalityProfile;
    if (!personality) {
      return this.getDefaultEmotionalResponse(trigger);
    }

    // Personality traits influence emotional response
    const neuroticism = personality.bigFive.neuroticism / 100;
    const extraversion = personality.bigFive.extraversion / 100;
    const agreeableness = personality.bigFive.agreeableness / 100;
    const openness = personality.bigFive.openness / 100;

    let emotionalResponse: EmotionalResponse;

    switch (trigger.type) {
      case 'positive':
        emotionalResponse = this.calculatePositiveResponse(
          currentState, trigger, extraversion, openness
        );
        break;
      case 'negative':
        emotionalResponse = this.calculateNegativeResponse(
          currentState, trigger, neuroticism, agreeableness
        );
        break;
      case 'achievement':
        emotionalResponse = this.calculateAchievementResponse(
          currentState, trigger, extraversion
        );
        break;
      case 'failure':
        emotionalResponse = this.calculateFailureResponse(
          currentState, trigger, neuroticism
        );
        break;
      case 'surprise':
        emotionalResponse = this.calculateSurpriseResponse(
          currentState, trigger, openness
        );
        break;
      case 'conflict':
        emotionalResponse = this.calculateConflictResponse(
          currentState, trigger, agreeableness, neuroticism
        );
        break;
      default:
        emotionalResponse = this.getDefaultEmotionalResponse(trigger);
    }

    return emotionalResponse;
  }

  private calculatePositiveResponse(
    currentState: EmotionalState,
    trigger: EmotionalTrigger,
    extraversion: number,
    openness: number
  ): EmotionalResponse {
    const baseIntensity = trigger.intensity * 0.8;
    const personalityModifier = (extraversion * 0.6 + openness * 0.4);
    const intensityChange = Math.min(100, baseIntensity * personalityModifier);

    return {
      newEmotion: 'joy',
      intensityChange: intensityChange,
      confidence: 75 + (extraversion * 20),
      reasoning: `Positive trigger with extraversion boost (${(extraversion * 100).toFixed(0)}%)`,
      triggers: ['positive_interaction', 'social_validation']
    };
  }

  private calculateNegativeResponse(
    currentState: EmotionalState,
    trigger: EmotionalTrigger,
    neuroticism: number,
    agreeableness: number
  ): EmotionalResponse {
    const baseIntensity = trigger.intensity * 0.7;
    const personalityModifier = (neuroticism * 0.8 + (1 - agreeableness) * 0.3);
    const intensityChange = Math.max(-100, -baseIntensity * personalityModifier);

    const emotion = neuroticism > 0.6 ? 'fear' : 'sadness';

    return {
      newEmotion: emotion,
      intensityChange: intensityChange,
      confidence: 60 + (neuroticism * 30),
      reasoning: `Negative trigger amplified by neuroticism (${(neuroticism * 100).toFixed(0)}%)`,
      triggers: ['negative_feedback', 'criticism']
    };
  }

  private calculateAchievementResponse(
    currentState: EmotionalState,
    trigger: EmotionalTrigger,
    extraversion: number
  ): EmotionalResponse {
    const baseIntensity = trigger.intensity * 0.9;
    const personalityModifier = (extraversion * 0.7 + 0.3);
    const intensityChange = Math.min(100, baseIntensity * personalityModifier);

    return {
      newEmotion: 'joy',
      intensityChange: intensityChange,
      confidence: 85 + (extraversion * 15),
      reasoning: `Achievement trigger with confidence boost`,
      triggers: ['goal_completion', 'recognition']
    };
  }

  private calculateFailureResponse(
    currentState: EmotionalState,
    trigger: EmotionalTrigger,
    neuroticism: number
  ): EmotionalResponse {
    const baseIntensity = trigger.intensity * 0.8;
    const personalityModifier = (neuroticism * 0.9 + 0.2);
    const intensityChange = Math.max(-100, -baseIntensity * personalityModifier);

    return {
      newEmotion: 'sadness',
      intensityChange: intensityChange,
      confidence: 70 + (neuroticism * 25),
      reasoning: `Failure trigger with neuroticism amplification`,
      triggers: ['goal_failure', 'disappointment']
    };
  }

  private calculateSurpriseResponse(
    currentState: EmotionalState,
    trigger: EmotionalTrigger,
    openness: number
  ): EmotionalResponse {
    const baseIntensity = trigger.intensity * 0.6;
    const personalityModifier = (openness * 0.8 + 0.3);
    const intensityChange = baseIntensity * personalityModifier;

    return {
      newEmotion: 'surprise',
      intensityChange: intensityChange,
      confidence: 60 + (openness * 30),
      reasoning: `Surprise response modulated by openness to experience`,
      triggers: ['unexpected_event', 'novel_information']
    };
  }

  private calculateConflictResponse(
    currentState: EmotionalState,
    trigger: EmotionalTrigger,
    agreeableness: number,
    neuroticism: number
  ): EmotionalResponse {
    const baseIntensity = trigger.intensity * 0.7;
    const personalityModifier = ((1 - agreeableness) * 0.6 + neuroticism * 0.4);
    const intensityChange = Math.max(-100, -baseIntensity * personalityModifier);

    const emotion = agreeableness < 0.4 ? 'anger' : 'fear';

    return {
      newEmotion: emotion,
      intensityChange: intensityChange,
      confidence: 65 + (neuroticism * 25),
      reasoning: `Conflict response based on agreeableness and neuroticism levels`,
      triggers: ['interpersonal_conflict', 'disagreement']
    };
  }

  private applyEmotionalChange(
    currentState: EmotionalState,
    response: EmotionalResponse,
    persona: PersonaData
  ): EmotionalState {
    // Apply decay to current emotion intensity
    const decayedIntensity = Math.max(0, currentState.intensity - this.emotionalDecayRate);
    
    // Calculate new intensity
    const newIntensity = Math.max(0, Math.min(100, 
      decayedIntensity + response.intensityChange
    ));

    // Determine if emotion should change
    const shouldChangeEmotion = Math.abs(response.intensityChange) > 20 && 
                                newIntensity > currentState.intensity;

    return {
      primaryEmotion: shouldChangeEmotion ? response.newEmotion : currentState.primaryEmotion,
      intensity: newIntensity,
      confidence: response.confidence,
      context: response.reasoning,
      timestamp: new Date()
    };
  }

  private async recordEmotionalEvent(event: EmotionalEvent): Promise<void> {
    if (!this.emotionalHistory.has(event.personaId)) {
      this.emotionalHistory.set(event.personaId, []);
    }
    
    const history = this.emotionalHistory.get(event.personaId)!;
    history.push(event);
    
    // Keep only last 1000 events per persona
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  private getEmotionalHistory(personaId: string, timeWindowMs?: number): EmotionalEvent[] {
    const history = this.emotionalHistory.get(personaId) || [];
    
    if (!timeWindowMs) {
      return history;
    }
    
    const cutoffTime = Date.now() - timeWindowMs;
    return history.filter(event => event.timestamp.getTime() > cutoffTime);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private calculateDailyTrends(history: EmotionalEvent[], days: number): Array<{
    date: Date;
    emotion: EmotionalState['primaryEmotion'];
    intensity: number;
  }> {
    const dailyData: Record<string, { emotions: EmotionalState['primaryEmotion'][]; intensities: number[] }> = {};
    
    history.forEach(event => {
      const dateKey = event.timestamp.toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { emotions: [], intensities: [] };
      }
      dailyData[dateKey].emotions.push(event.newState.primaryEmotion);
      dailyData[dateKey].intensities.push(event.newState.intensity);
    });

    return Object.entries(dailyData).map(([dateKey, data]) => {
      // Find most frequent emotion for the day
      const emotionCounts: Record<string, number> = {};
      data.emotions.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
      
      const dominantEmotion = Object.entries(emotionCounts)
        .sort(([, a], [, b]) => b - a)[0][0] as EmotionalState['primaryEmotion'];
      
      const averageIntensity = data.intensities.reduce((sum, intensity) => 
        sum + intensity, 0) / data.intensities.length;

      return {
        date: new Date(dateKey),
        emotion: dominantEmotion,
        intensity: averageIntensity
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private getDefaultEmotionalState(): EmotionalState {
    return {
      primaryEmotion: 'neutral',
      intensity: 50,
      confidence: 50,
      timestamp: new Date()
    };
  }

  private getDefaultEmotionalPattern(): EmotionalPattern {
    return {
      averageIntensity: 50,
      emotionalRange: 20,
      stabilityScore: 75,
      dominantEmotions: ['neutral'],
      triggers: {}
    };
  }

  private getDefaultEmotionalResponse(trigger: EmotionalTrigger): EmotionalResponse {
    return {
      newEmotion: 'neutral',
      intensityChange: trigger.intensity * 0.1,
      confidence: 50,
      reasoning: 'Default emotional response',
      triggers: ['general_interaction']
    };
  }

  private getEmptyAnalytics(): EmotionalAnalytics {
    return {
      averageIntensity: 0,
      emotionalVolatility: 0,
      dominantEmotions: [],
      triggerPatterns: [],
      emotionalTrends: []
    };
  }
} 