import React from 'react';
import { Card, CardContent, Typography, Box, Button } from '@mui/material';

interface OptimizationControlsProps {
  isOptimizing: boolean;
  lastOptimized?: Date | null;
  onOptimize: (actionType: string) => void;
}

export const OptimizationControls: React.FC<OptimizationControlsProps> = ({
  isOptimizing,
  lastOptimized,
  onOptimize
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Optimization Tools
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="contained"
            onClick={() => onOptimize('tier-optimization')}
            disabled={isOptimizing}
            color="primary"
          >
            {isOptimizing ? 'Optimizing...' : 'Optimize Tiers'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => onOptimize('cleanup-low-importance')}
            disabled={isOptimizing}
            color="warning"
          >
            Cleanup Low Importance
          </Button>
          <Button
            variant="outlined"
            onClick={() => onOptimize('rebalance-storage')}
            disabled={isOptimizing}
            color="info"
          >
            Rebalance Storage
          </Button>
        </Box>
        
        {lastOptimized && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Last optimized: {lastOptimized.toLocaleString()}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
