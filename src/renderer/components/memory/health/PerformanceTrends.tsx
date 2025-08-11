import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface PerformanceMetric {
  timestamp: Date;
  memoryCount: number;
  averageImportance: number;
  healthScore: number;
}

interface PerformanceTrendsProps {
  performanceHistory: PerformanceMetric[];
}

export const PerformanceTrends: React.FC<PerformanceTrendsProps> = ({
  performanceHistory
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Performance Trends
        </Typography>
        <Box sx={{ p: 2 }}>
          {performanceHistory.length > 0 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Recent Performance Metrics (Last {performanceHistory.length} updates)
              </Typography>
              {performanceHistory.slice(-5).map((metric, index) => (
                <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>#{performanceHistory.length - 4 + index}:</strong> Health: {Math.round(metric.healthScore)}%, 
                    Importance: {Math.round(metric.averageImportance)}, 
                    Count: {metric.memoryCount}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No performance data available yet...
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
