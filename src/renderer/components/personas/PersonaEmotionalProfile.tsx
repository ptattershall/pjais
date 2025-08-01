import React, { useState, useEffect } from 'react';
import { PersonaData, EmotionalState } from '../../../shared/types/persona';

interface EmotionalAnalytics {
  averageIntensity: number;
  emotionalVolatility: number;
  dominantEmotions: Array<{
    emotion: EmotionalState['primaryEmotion'];
    frequency: number;
    averageIntensity: number;
  }>;
  triggerPatterns: Array<{
    trigger: string;
    frequency: number;
    averageResponse: number;
  }>;
  emotionalTrends: Array<{
    date: Date;
    emotion: EmotionalState['primaryEmotion'];
    intensity: number;
  }>;
}

interface PersonaEmotionalProfileProps {
  persona: PersonaData;
  onEmotionalStateUpdate?: (personaId: string, newState: EmotionalState) => Promise<void>;
  onTriggerEmotion?: (personaId: string, trigger: any) => Promise<void>;
}

const EMOTION_ICONS: Record<EmotionalState['primaryEmotion'], string> = {
  joy: '😊',
  sadness: '😢',
  anger: '😠',
  fear: '😨',
  surprise: '😲',
  disgust: '🤢',
  neutral: '😐'
};

const EMOTION_COLORS: Record<EmotionalState['primaryEmotion'], string> = {
  joy: '#10B981',     // Green
  sadness: '#3B82F6', // Blue
  anger: '#EF4444',   // Red
  fear: '#8B5CF6',    // Purple
  surprise: '#F59E0B', // Orange
  disgust: '#6B7280', // Gray
  neutral: '#9CA3AF'  // Light Gray
};

export const PersonaEmotionalProfile: React.FC<PersonaEmotionalProfileProps> = ({
  persona,
  onEmotionalStateUpdate: _onEmotionalStateUpdate,
  onTriggerEmotion
}) => {
  const [emotionalAnalytics, setEmotionalAnalytics] = useState<EmotionalAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadEmotionalAnalytics();
  }, [persona.id, selectedTimeRange]);

  const loadEmotionalAnalytics = async () => {
    if (!persona.id) return;
    
    try {
      setIsLoading(true);
      const days = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90;
      // TODO: Call EmotionalStateTracker via IPC
      const analytics = await window.electronAPI.invoke('persona:getEmotionalAnalytics', persona.id, days);
      setEmotionalAnalytics(analytics);
    } catch (error) {
      console.error('Failed to load emotional analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerEmotion = async (triggerType: string, intensity: number) => {
    if (!persona.id) return;

    const trigger = {
      type: triggerType,
      intensity,
      source: 'user_interaction',
      context: 'Manual emotion trigger from UI'
    };

    try {
      await onTriggerEmotion?.(persona.id, trigger);
      await loadEmotionalAnalytics(); // Refresh data
    } catch (error) {
      console.error('Failed to trigger emotion:', error);
    }
  };

  const getCurrentEmotionalState = (): EmotionalState => {
    return persona.currentEmotionalState || {
      primaryEmotion: 'neutral',
      intensity: 50,
      confidence: 50,
      timestamp: new Date()
    };
  };

  const formatEmotionName = (emotion: EmotionalState['primaryEmotion']): string => {
    return emotion.charAt(0).toUpperCase() + emotion.slice(1);
  };

  if (isLoading) {
    return (
      <div className="persona-emotional-profile loading">
        <div className="loading-spinner"></div>
        <p>Loading emotional profile...</p>
      </div>
    );
  }

  const currentState = getCurrentEmotionalState();

  return (
    <div className="persona-emotional-profile">
      <div className="profile-header">
        <h3>Emotional Profile</h3>
        <p>Monitor and understand {persona.name}&apos;s emotional patterns</p>
        
        <div className="time-range-selector">
          <label>Time Range:</label>
          <select 
            value={selectedTimeRange} 
            onChange={(e) => setSelectedTimeRange(e.target.value as typeof selectedTimeRange)}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Current Emotional State */}
      <div className="current-emotional-state">
        <h4>Current State</h4>
        <div className="emotion-display">
          <div 
            className="emotion-circle"
            style={{ 
              backgroundColor: EMOTION_COLORS[currentState.primaryEmotion],
              opacity: currentState.intensity / 100 
            }}
          >
            <span className="emotion-icon">
              {EMOTION_ICONS[currentState.primaryEmotion]}
            </span>
          </div>
          <div className="emotion-details">
            <h5>{formatEmotionName(currentState.primaryEmotion)}</h5>
            <div className="emotion-stats">
              <div className="stat">
                <label>Intensity</label>
                <span>{currentState.intensity}%</span>
              </div>
              <div className="stat">
                <label>Confidence</label>
                <span>{currentState.confidence}%</span>
              </div>
            </div>
            {currentState.context && (
              <p className="emotion-context">{currentState.context}</p>
            )}
          </div>
        </div>
      </div>

      {/* Emotion Triggers */}
      <div className="emotion-triggers">
        <h4>Trigger Emotions</h4>
        <p>Manually trigger emotional responses for testing</p>
        <div className="trigger-buttons">
          <button 
            onClick={() => handleTriggerEmotion('positive', 70)}
            className="trigger-button positive"
          >
            😊 Positive
          </button>
          <button 
            onClick={() => handleTriggerEmotion('negative', 60)}
            className="trigger-button negative"
          >
            😢 Negative
          </button>
          <button 
            onClick={() => handleTriggerEmotion('achievement', 80)}
            className="trigger-button achievement"
          >
            🏆 Achievement
          </button>
          <button 
            onClick={() => handleTriggerEmotion('surprise', 65)}
            className="trigger-button surprise"
          >
            😲 Surprise
          </button>
          <button 
            onClick={() => handleTriggerEmotion('conflict', 55)}
            className="trigger-button conflict"
          >
            ⚡ Conflict
          </button>
        </div>
      </div>

      {/* Emotional Analytics */}
      {emotionalAnalytics && (
        <>
          {/* Overview Stats */}
          <div className="emotional-overview">
            <h4>Emotional Overview</h4>
            <div className="overview-stats">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-icon">📊</span>
                  <span className="stat-title">Average Intensity</span>
                </div>
                <div className="stat-value">
                  {emotionalAnalytics.averageIntensity.toFixed(1)}%
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-icon">📈</span>
                  <span className="stat-title">Volatility</span>
                </div>
                <div className="stat-value">
                  {emotionalAnalytics.emotionalVolatility.toFixed(1)}%
                </div>
                <div className={`volatility-indicator ${
                  emotionalAnalytics.emotionalVolatility > 30 ? 'high' : 
                  emotionalAnalytics.emotionalVolatility > 15 ? 'medium' : 'low'
                }`}>
                  {emotionalAnalytics.emotionalVolatility > 30 ? 'High' : 
                   emotionalAnalytics.emotionalVolatility > 15 ? 'Medium' : 'Low'}
                </div>
              </div>
            </div>
          </div>

          {/* Dominant Emotions */}
          <div className="dominant-emotions">
            <h4>Dominant Emotions</h4>
            <div className="emotions-list">
              {emotionalAnalytics.dominantEmotions.slice(0, 5).map((emotion, _index) => (
                <div key={emotion.emotion} className="emotion-item">
                  <div className="emotion-info">
                    <span className="emotion-icon">
                      {EMOTION_ICONS[emotion.emotion]}
                    </span>
                    <span className="emotion-name">
                      {formatEmotionName(emotion.emotion)}
                    </span>
                  </div>
                  <div className="emotion-stats">
                    <div className="frequency-bar">
                      <div 
                        className="frequency-fill"
                        style={{ 
                          width: `${emotion.frequency}%`,
                          backgroundColor: EMOTION_COLORS[emotion.emotion]
                        }}
                      />
                    </div>
                    <span className="frequency-text">
                      {emotion.frequency.toFixed(1)}%
                    </span>
                  </div>
                  <div className="average-intensity">
                    {emotion.averageIntensity.toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trigger Patterns */}
          {emotionalAnalytics.triggerPatterns.length > 0 && (
            <div className="trigger-patterns">
              <h4>Trigger Patterns</h4>
              <div className="patterns-list">
                {emotionalAnalytics.triggerPatterns.slice(0, 5).map((pattern) => (
                  <div key={pattern.trigger} className="pattern-item">
                    <div className="pattern-info">
                      <span className="trigger-name">
                        {pattern.trigger.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="pattern-stats">
                      <div className="pattern-frequency">
                        <label>Frequency</label>
                        <span>{pattern.frequency.toFixed(1)}%</span>
                      </div>
                      <div className="pattern-response">
                        <label>Avg Response</label>
                        <span className={pattern.averageResponse > 0 ? 'positive' : 'negative'}>
                          {pattern.averageResponse > 0 ? '+' : ''}{pattern.averageResponse.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emotional Timeline */}
          {emotionalAnalytics.emotionalTrends.length > 0 && (
            <div className="emotional-timeline">
              <h4>Emotional Timeline</h4>
              <div className="timeline-chart">
                {emotionalAnalytics.emotionalTrends.slice(-14).map((trend, _index) => (
                  <div key={_index} className="timeline-point">
                    <div 
                      className="timeline-emotion"
                      style={{ backgroundColor: EMOTION_COLORS[trend.emotion] }}
                      title={`${formatEmotionName(trend.emotion)} - ${trend.intensity.toFixed(0)}%`}
                    >
                      {EMOTION_ICONS[trend.emotion]}
                    </div>
                    <div className="timeline-date">
                      {trend.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Emotional Stability Insights */}
      <div className="emotional-insights">
        <h4>Insights & Recommendations</h4>
        <div className="insights-list">
          {currentState.intensity > 80 && (
            <div className="insight-card high-intensity">
              <span className="insight-icon">⚡</span>
              <div className="insight-content">
                <h5>High Emotional Intensity</h5>
                <p>Current emotional state is highly intense. Consider gradual cooling down.</p>
              </div>
            </div>
          )}
          
          {emotionalAnalytics && emotionalAnalytics.emotionalVolatility > 30 && (
            <div className="insight-card high-volatility">
              <span className="insight-icon">📈</span>
              <div className="insight-content">
                <h5>High Emotional Volatility</h5>
                <p>Emotions are changing frequently. Consider stability interventions.</p>
              </div>
            </div>
          )}
          
          {emotionalAnalytics && emotionalAnalytics.averageIntensity < 30 && (
            <div className="insight-card low-engagement">
              <span className="insight-icon">💤</span>
              <div className="insight-content">
                <h5>Low Emotional Engagement</h5>
                <p>Average emotional intensity is low. Consider more engaging interactions.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 