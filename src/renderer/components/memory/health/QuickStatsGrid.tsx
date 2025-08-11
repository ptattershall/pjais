import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface QuickStatsGridProps {
  totalMemories: number;
  averageImportance: number;
  storageEfficiency: number;
  hotTierCount: number;
}

export const QuickStatsGrid: React.FC<QuickStatsGridProps> = ({
  totalMemories,
  averageImportance,
  storageEfficiency,
  hotTierCount
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quick Statistics
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2 }}>
          <Box textAlign="center">
            <Typography variant="h4" color="primary">
              {totalMemories}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Memories
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="secondary">
              {Math.round(averageImportance)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avg Importance
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="info.main">
              {Math.round(storageEfficiency)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Storage Efficiency
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="success.main">
              {hotTierCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hot Tier
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
