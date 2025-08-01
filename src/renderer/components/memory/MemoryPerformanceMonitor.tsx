import React, { useState, useEffect, useCallback } from 'react';
import { MemoryEntity } from '@shared/types/memory';
import { 
  PerformanceMetrics, 
  PerformanceMetricsCalculator, 
  DEFAULT_THRESHOLDS 
} from './PerformanceMetricsCalculator';
import { SystemHealth, SystemHealthCalculator } from './SystemHealthCalculator';
import { 
  PerformanceAlert, 
  OptimizationRecommendation, 
  PerformanceAlertManager 
} from './PerformanceAlertManager';

interface MemoryPerformanceMonitorProps {
  memories: MemoryEntity[];
  refreshInterval?: number;
  onPerformanceAlert?: (alert: PerformanceAlert) => void;
  onOptimizationRecommended?: (recommendation: OptimizationRecommendation) => void;
}

export const MemoryPerformanceMonitor: React.FC<MemoryPerformanceMonitorProps> = ({
  memories,
  refreshInterval = 5000,
  onPerformanceAlert,
  onOptimizationRecommended
}) => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [metricHistory, setMetricHistory] = useState<PerformanceMetrics[]>([]);
  
  // Initialize alert manager
  const alertManager = new PerformanceAlertManager(DEFAULT_THRESHOLDS);

  // Update metrics and check for issues
  const updateMetrics = useCallback(() => {
    if (!isMonitoring) return;
    
    const newMetrics = PerformanceMetricsCalculator.calculateMetrics(memories);
    setPerformanceMetrics(newMetrics);
    
    // Update history (keep last 50 entries)
    setMetricHistory(prev => {
      const updated = [...prev, newMetrics];
      return updated.slice(-50);
    });
    
    // Calculate system health
    const health = SystemHealthCalculator.calculateSystemHealth(newMetrics, metricHistory);
    setSystemHealth(health);
    
    // Check for alerts
    const newAlerts = alertManager.checkAlerts(newMetrics);
    if (newAlerts.length > 0) {
      setAlerts(prev => {
        const updated = [...prev, ...newAlerts];
        // Keep only last 20 alerts
        return updated.slice(-20);
      });
      
      // Notify parent
      newAlerts.forEach(alert => onPerformanceAlert?.(alert));
    }
    
    // Generate recommendations
    const recommendations = alertManager.generateRecommendations(newMetrics);
    recommendations.forEach(rec => onOptimizationRecommended?.(rec));
    
  }, [isMonitoring, memories, metricHistory, alertManager, onPerformanceAlert, onOptimizationRecommended]);

  // Auto-refresh effect
  useEffect(() => {
    if (!isMonitoring) return;
    
    const interval = setInterval(updateMetrics, refreshInterval);
    
    // Initial update
    updateMetrics();
    
    return () => clearInterval(interval);
  }, [updateMetrics, refreshInterval, isMonitoring]);

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  if (!performanceMetrics || !systemHealth) {
    return (
      <div className="memory-performance-monitor loading">
        <div className="loading-indicator">
          <span className="spinner"></span>
          <p>Initializing performance monitoring...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="memory-performance-monitor">
      <div className="monitor-header">
        <h3>Performance Monitor</h3>
        <div className="monitor-controls">
          <button 
            className={`monitoring-toggle ${isMonitoring ? 'active' : 'inactive'}`}
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? '⏸️ Pause' : '▶️ Resume'}
          </button>
          <span className="last-updated">
            Updated: {performanceMetrics.lastUpdated.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="system-health-overview">
        <div className="health-score">
          <div className={`health-circle ${systemHealth.overall >= 80 ? 'good' : systemHealth.overall >= 60 ? 'warning' : 'critical'}`}>
            <span className="score">{systemHealth.overall}%</span>
            <span className="label">Health</span>
          </div>
        </div>
        
        <div className="health-components">
          {Object.entries(systemHealth.components).map(([component, score]) => (
            <div key={component} className="component-health">
              <span className="component-name">{component}</span>
              <div className="health-bar">
                <div 
                  className={`health-fill ${score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical'}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="component-score">{score}%</span>
            </div>
          ))}
        </div>
        
        <div className="health-trend">
          {systemHealth.trends.improving && <span className="trend improving">📈 Improving</span>}
          {systemHealth.trends.stable && <span className="trend stable">➡️ Stable</span>}
          {systemHealth.trends.degrading && <span className="trend degrading">📉 Degrading</span>}
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">⚡</span>
            <span className="metric-name">Access Latency</span>
          </div>
          <div className="metric-value">
            <span className="value">{performanceMetrics.accessLatency}</span>
            <span className="unit">ms</span>
          </div>
          <div className={`metric-status ${performanceMetrics.accessLatency > DEFAULT_THRESHOLDS.accessLatency.warning ? 'warning' : 'good'}`}>
            {performanceMetrics.accessLatency > DEFAULT_THRESHOLDS.accessLatency.critical ? 'Critical' : 
             performanceMetrics.accessLatency > DEFAULT_THRESHOLDS.accessLatency.warning ? 'High' : 'Good'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">🚀</span>
            <span className="metric-name">Throughput</span>
          </div>
          <div className="metric-value">
            <span className="value">{performanceMetrics.queryThroughput}</span>
            <span className="unit">q/s</span>
          </div>
          <div className={`metric-status ${performanceMetrics.queryThroughput < DEFAULT_THRESHOLDS.queryThroughput.warning ? 'warning' : 'good'}`}>
            {performanceMetrics.queryThroughput < DEFAULT_THRESHOLDS.queryThroughput.critical ? 'Critical' : 
             performanceMetrics.queryThroughput < DEFAULT_THRESHOLDS.queryThroughput.warning ? 'Low' : 'Good'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">💾</span>
            <span className="metric-name">Memory Usage</span>
          </div>
          <div className="metric-value">
            <span className="value">{performanceMetrics.memoryUtilization}</span>
            <span className="unit">%</span>
          </div>
          <div className={`metric-status ${performanceMetrics.memoryUtilization > DEFAULT_THRESHOLDS.memoryUtilization.warning ? 'warning' : 'good'}`}>
            {performanceMetrics.memoryUtilization > DEFAULT_THRESHOLDS.memoryUtilization.critical ? 'Critical' : 
             performanceMetrics.memoryUtilization > DEFAULT_THRESHOLDS.memoryUtilization.warning ? 'High' : 'Good'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">🎯</span>
            <span className="metric-name">Cache Hit Rate</span>
          </div>
          <div className="metric-value">
            <span className="value">{performanceMetrics.cacheHitRatio}</span>
            <span className="unit">%</span>
          </div>
          <div className={`metric-status ${performanceMetrics.cacheHitRatio < DEFAULT_THRESHOLDS.cacheHitRatio.warning ? 'warning' : 'good'}`}>
            {performanceMetrics.cacheHitRatio < DEFAULT_THRESHOLDS.cacheHitRatio.critical ? 'Critical' : 
             performanceMetrics.cacheHitRatio < DEFAULT_THRESHOLDS.cacheHitRatio.warning ? 'Low' : 'Good'}
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          <div className="alerts-header">
            <h4>Active Alerts ({alerts.length})</h4>
            <button onClick={clearAllAlerts} className="clear-alerts">
              Clear All
            </button>
          </div>
          <div className="alerts-list">
            {alerts.slice(-5).map(alert => (
              <div key={alert.id} className={`alert-card ${alert.severity}`}>
                <div className="alert-content">
                  <div className="alert-header">
                    <span className={`alert-type ${alert.type}`}>
                      {alert.type.toUpperCase()}
                    </span>
                    <span className={`alert-severity ${alert.severity}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="alert-message">{alert.message}</p>
                  <p className="alert-details">
                    Value: {alert.value} | Threshold: {alert.threshold}
                  </p>
                  <p className="alert-recommendation">{alert.recommendation}</p>
                </div>
                <button 
                  className="dismiss-alert"
                  onClick={() => dismissAlert(alert.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 
