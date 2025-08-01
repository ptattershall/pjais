import React, { useState, useEffect } from 'react';
import { PersonaData } from '../../../shared/types/persona';

interface MemoryHealth {
  overall: number;
  distribution: {
    hot: number;
    warm: number;
    cold: number;
  };
  fragmentation: number;
  lastOptimization: Date | null;
  recommendations: MemoryRecommendation[];
  usage: {
    totalMemories: number;
    totalSize: number;
    capacityUsed: number;
  };
}

interface MemoryRecommendation {
  id: string;
  type: 'optimization' | 'cleanup' | 'configuration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action: string;
  estimatedImpact: string;
  autoExecutable: boolean;
}

interface PersonaMemoryDashboardProps {
  persona: PersonaData;
  onOptimizeMemory?: (personaId: string) => Promise<void>;
  onConfigurationChange?: (personaId: string, config: any) => Promise<void>;
}

export const PersonaMemoryDashboard: React.FC<PersonaMemoryDashboardProps> = ({
  persona,
  onOptimizeMemory,
  onConfigurationChange: _onConfigurationChange
}) => {
  const [memoryHealth, setMemoryHealth] = useState<MemoryHealth | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMemoryHealth();
  }, [persona.id]);

  const loadMemoryHealth = async () => {
    if (!persona.id) return;
    
    try {
      setIsLoading(true);
      // TODO: Call PersonaMemoryManager via IPC
      const health = await window.electronAPI.invoke('persona:getMemoryHealth', persona.id);
      setMemoryHealth(health);
    } catch (error) {
      console.error('Failed to load memory health:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimizeMemory = async () => {
    if (!persona.id || isOptimizing) return;

    try {
      setIsOptimizing(true);
      await onOptimizeMemory?.(persona.id);
      await loadMemoryHealth(); // Refresh data
    } catch (error) {
      console.error('Memory optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="persona-memory-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading memory health data...</p>
      </div>
    );
  }

  if (!memoryHealth) {
    return (
      <div className="persona-memory-dashboard error">
        <p>Failed to load memory health data</p>
        <button onClick={loadMemoryHealth} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="persona-memory-dashboard">
      <div className="dashboard-header">
        <h3>Memory Health Dashboard</h3>
        <p>Monitor and optimize {persona.name}&apos;s memory system</p>
      </div>

      {/* Overall Health Score */}
      <div className="health-overview">
        <div className={`health-score ${memoryHealth.overall >= 80 ? 'good' : memoryHealth.overall >= 60 ? 'warning' : 'critical'}`}>
          <div className="score-circle">
            <span className="score">{memoryHealth.overall}%</span>
            <span className="label">Health</span>
          </div>
          <div className="score-details">
            <p>Overall memory system health</p>
            <span className="status">
              {memoryHealth.overall >= 80 ? 'Excellent' : 
               memoryHealth.overall >= 60 ? 'Good' : 
               memoryHealth.overall >= 40 ? 'Fair' : 'Poor'}
            </span>
          </div>
        </div>

        <div className="health-actions">
          <button
            onClick={handleOptimizeMemory}
            disabled={isOptimizing}
            className={`optimize-button ${isOptimizing ? 'optimizing' : ''}`}
          >
            {isOptimizing ? '🔄 Optimizing...' : '⚡ Optimize Memory'}
          </button>
          <button onClick={loadMemoryHealth} className="refresh-button">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Memory Usage Statistics */}
      <div className="memory-stats">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">🧠</span>
            <span className="stat-title">Total Memories</span>
          </div>
          <div className="stat-value">
            <span className="value">{memoryHealth.usage.totalMemories}</span>
            <span className="limit">/ {persona.memoryConfiguration?.maxMemories || 1000}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">💾</span>
            <span className="stat-title">Storage Used</span>
          </div>
          <div className="stat-value">
            <span className="value">{formatSize(memoryHealth.usage.totalSize)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">📊</span>
            <span className="stat-title">Capacity</span>
          </div>
          <div className="stat-value">
            <span className="value">{memoryHealth.usage.capacityUsed.toFixed(1)}%</span>
          </div>
          <div className={`capacity-bar ${memoryHealth.usage.capacityUsed > 90 ? 'critical' : memoryHealth.usage.capacityUsed > 75 ? 'warning' : 'good'}`}>
            <div 
              className="capacity-fill" 
              style={{ width: `${Math.min(100, memoryHealth.usage.capacityUsed)}%` }}
            />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">🔧</span>
            <span className="stat-title">Fragmentation</span>
          </div>
          <div className="stat-value">
            <span className="value">{memoryHealth.fragmentation.toFixed(1)}%</span>
          </div>
          <div className={`fragmentation-indicator ${memoryHealth.fragmentation > 60 ? 'high' : memoryHealth.fragmentation > 30 ? 'medium' : 'low'}`}>
            {memoryHealth.fragmentation > 60 ? 'High' : 
             memoryHealth.fragmentation > 30 ? 'Medium' : 'Low'}
          </div>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="tier-distribution">
        <h4>Memory Tier Distribution</h4>
        <div className="distribution-chart">
          <div className="tier-bar">
            <div 
              className="tier-segment hot" 
              style={{ width: `${memoryHealth.distribution.hot}%` }}
            >
              <span className="tier-label">Hot ({memoryHealth.distribution.hot.toFixed(1)}%)</span>
            </div>
            <div 
              className="tier-segment warm" 
              style={{ width: `${memoryHealth.distribution.warm}%` }}
            >
              <span className="tier-label">Warm ({memoryHealth.distribution.warm.toFixed(1)}%)</span>
            </div>
            <div 
              className="tier-segment cold" 
              style={{ width: `${memoryHealth.distribution.cold}%` }}
            >
              <span className="tier-label">Cold ({memoryHealth.distribution.cold.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
        <div className="tier-legend">
          <div className="legend-item">
            <span className="legend-color hot"></span>
            <span>Hot: Frequently accessed, high importance</span>
          </div>
          <div className="legend-item">
            <span className="legend-color warm"></span>
            <span>Warm: Moderately accessed, medium importance</span>
          </div>
          <div className="legend-item">
            <span className="legend-color cold"></span>
            <span>Cold: Rarely accessed, low importance</span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {memoryHealth.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>Optimization Recommendations</h4>
          <div className="recommendations-list">
            {memoryHealth.recommendations.map((rec) => (
              <div key={rec.id} className={`recommendation-card ${rec.priority}`}>
                <div className="recommendation-header">
                  <div className="recommendation-meta">
                    <span className={`priority-badge ${rec.priority}`}>
                      {rec.priority.toUpperCase()}
                    </span>
                    <span className={`type-badge ${rec.type}`}>
                      {rec.type}
                    </span>
                  </div>
                  <h5>{rec.title}</h5>
                </div>
                <div className="recommendation-body">
                  <p className="description">{rec.description}</p>
                  <p className="action"><strong>Action:</strong> {rec.action}</p>
                  <p className="impact"><strong>Expected Impact:</strong> {rec.estimatedImpact}</p>
                </div>
                <div className="recommendation-actions">
                  {rec.autoExecutable && (
                    <button 
                      className="action-button primary"
                      onClick={() => {/* TODO: Execute recommendation */}}
                    >
                      Apply Fix
                    </button>
                  )}
                  <button className="action-button secondary">
                    Learn More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memory Configuration */}
      <div className="memory-configuration">
        <h4>Configuration</h4>
        <div className="config-grid">
          <div className="config-item">
            <label>Max Memories</label>
            <span>{persona.memoryConfiguration?.maxMemories || 1000}</span>
          </div>
          <div className="config-item">
            <label>Importance Threshold</label>
            <span>{persona.memoryConfiguration?.memoryImportanceThreshold || 50}%</span>
          </div>
          <div className="config-item">
            <label>Auto Optimize</label>
            <span>{persona.memoryConfiguration?.autoOptimize ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="config-item">
            <label>Retention Period</label>
            <span>{persona.memoryConfiguration?.retentionPeriod || 90} days</span>
          </div>
        </div>
        <button 
          className="config-edit-button"
          onClick={() => {/* TODO: Open configuration modal */}}
        >
          Edit Configuration
        </button>
      </div>
    </div>
  );
}; 