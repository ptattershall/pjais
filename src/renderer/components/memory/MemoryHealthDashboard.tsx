import React, { useState, useEffect, useMemo } from 'react';
import { MemoryEntity } from '@shared/types/memory';
import { Typography, Box } from '@mui/material';
import {
  HealthScoreCard,
  QuickStatsGrid,
  DistributionChart,
  PerformanceTrends,
  OptimizationRecommendations,
  OptimizationControls
} from './health';

interface MemoryHealthDashboardProps {
  userId: string;
  memories: MemoryEntity[];
  onOptimizationAction?: (actionType: string, params: any) => void;
  refreshInterval?: number;
}

interface HealthMetrics {
  totalMemories: number;
  memoryByType: Record<string, number>;
  memoryByTier: Record<string, number>;
  averageImportance: number;
  healthScore: number;
  storageEfficiency: number;
  lastOptimized: Date | null;
  recommendations: string[];
}

interface PerformanceMetric {
  timestamp: Date;
  memoryCount: number;
  averageImportance: number;
  healthScore: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const MemoryHealthDashboard: React.FC<MemoryHealthDashboardProps> = ({
  userId: _userId,
  memories,
  onOptimizationAction,
  refreshInterval = 30000
}) => {
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetric[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Calculate health metrics
  const healthMetrics: HealthMetrics = useMemo(() => {
    const total = memories.length;
    const memoryByType: Record<string, number> = {};
    const memoryByTier: Record<string, number> = {};
    let totalImportance = 0;

    memories.forEach(memory => {
      // Count by type
      memoryByType[memory.type] = (memoryByType[memory.type] || 0) + 1;
      
      // Count by tier
      const tier = memory.memoryTier || 'cold';
      memoryByTier[tier] = (memoryByTier[tier] || 0) + 1;
      
      // Sum importance
      totalImportance += memory.importance || 0;
    });

    const averageImportance = total > 0 ? totalImportance / total : 0;
    
    // Calculate health score (0-100)
    let healthScore = 100;
    
    // Penalty for too many low importance memories
    const lowImportanceCount = memories.filter(m => (m.importance || 0) < 30).length;
    const lowImportanceRatio = total > 0 ? lowImportanceCount / total : 0;
    if (lowImportanceRatio > 0.5) {
      healthScore -= (lowImportanceRatio - 0.5) * 100;
    }
    
    // Bonus for good tier distribution
    const hotTierRatio = (memoryByTier.hot || 0) / Math.max(total, 1);
    if (hotTierRatio > 0.1 && hotTierRatio < 0.3) {
      healthScore += 10; // Good hot tier ratio
    }
    
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Storage efficiency (simulated)
    const storageEfficiency = Math.min(100, 80 + Math.random() * 20);

    // Generate recommendations
    const recommendations: string[] = [];
    if (lowImportanceRatio > 0.3) {
      recommendations.push(`${Math.round(lowImportanceRatio * 100)}% of memories have low importance - consider archiving`);
    }
    if ((memoryByTier.hot || 0) / Math.max(total, 1) > 0.4) {
      recommendations.push('Too many memories in hot tier - consider moving some to warm tier');
    }
    if (total > 1000) {
      recommendations.push('Large memory count detected - consider enabling automatic optimization');
    }
    if (averageImportance < 50) {
      recommendations.push('Average importance is low - review memory rating criteria');
    }

    return {
      totalMemories: total,
      memoryByType,
      memoryByTier,
      averageImportance,
      healthScore,
      storageEfficiency,
      lastOptimized: null, // Would be fetched from service
      recommendations
    };
  }, [memories]);

  // Update performance history
  useEffect(() => {
    const updateHistory = () => {
      const newMetric: PerformanceMetric = {
        timestamp: new Date(),
        memoryCount: healthMetrics.totalMemories,
        averageImportance: healthMetrics.averageImportance,
        healthScore: healthMetrics.healthScore
      };

      setPerformanceHistory(prev => {
        const updated = [...prev, newMetric];
        // Keep only last 20 points
        return updated.slice(-20);
      });
      
      setLastRefresh(new Date());
    };

    // Initial update
    updateHistory();

    // Set up interval
    const interval = setInterval(updateHistory, refreshInterval);
    return () => clearInterval(interval);
  }, [healthMetrics, refreshInterval]);

  // Handle optimization actions
  const handleOptimization = async (actionType: string) => {
    setIsOptimizing(true);
    try {
      await onOptimizationAction?.(actionType, { memories: memories.length });
      // Simulate optimization delay
      setTimeout(() => {
        setIsOptimizing(false);
      }, 2000);
    } catch (error) {
      console.error('Optimization failed:', error);
      setIsOptimizing(false);
    }
  };

  // Prepare chart data
  const typeChartData = Object.entries(healthMetrics.memoryByType).map(([type, count]) => ({
    name: type,
    value: count,
    percentage: Math.round((count / healthMetrics.totalMemories) * 100)
  }));

  const tierChartData = Object.entries(healthMetrics.memoryByTier).map(([tier, count]) => ({
    name: tier,
    count,
    percentage: Math.round((count / healthMetrics.totalMemories) * 100)
  }));

  return (
    <Box className="memory-health-dashboard" sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Memory System Health Dashboard
      </Typography>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Last updated: {lastRefresh.toLocaleTimeString()}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* First Row: Health Score and Quick Stats */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 33%' }, minWidth: '300px' }}>
            <HealthScoreCard 
              healthScore={healthMetrics.healthScore}
              title="Overall Health Score"
              size="large"
            />
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 66%' }, minWidth: '400px' }}>
            <QuickStatsGrid
              totalMemories={healthMetrics.totalMemories}
              averageImportance={healthMetrics.averageImportance}
              storageEfficiency={healthMetrics.storageEfficiency}
              hotTierCount={healthMetrics.memoryByTier.hot || 0}
            />
          </Box>
        </Box>

        {/* Second Row: Distribution Charts */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 48%', minWidth: '300px' }}>
            <DistributionChart
              title="Memory Type Distribution"
              data={typeChartData}
              colors={COLORS}
              chartType="circle"
            />
          </Box>
          <Box sx={{ flex: '1 1 48%', minWidth: '300px' }}>
            <DistributionChart
              title="Memory Tier Distribution"
              data={tierChartData.map(entry => ({
                name: entry.name,
                value: entry.count,
                percentage: entry.percentage
              }))}
              colors={COLORS}
              chartType="square"
            />
          </Box>
        </Box>

        {/* Third Row: Performance Trends */}
        <Box>
          <PerformanceTrends performanceHistory={performanceHistory} />
        </Box>

        {/* Fourth Row: Recommendations and Controls */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 65%', minWidth: '400px' }}>
            <OptimizationRecommendations recommendations={healthMetrics.recommendations} />
          </Box>
          <Box sx={{ flex: '1 1 33%', minWidth: '300px' }}>
            <OptimizationControls
              isOptimizing={isOptimizing}
              lastOptimized={healthMetrics.lastOptimized}
              onOptimize={handleOptimization}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
