import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';

interface OptimizationRecommendationsProps {
  recommendations: string[];
}

export const OptimizationRecommendations: React.FC<OptimizationRecommendationsProps> = ({
  recommendations
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Optimization Recommendations
        </Typography>
        {recommendations.length > 0 ? (
          <Box>
            {recommendations.map((recommendation, index) => (
              <Chip
                key={index}
                label={recommendation}
                variant="outlined"
                color="warning"
                sx={{ mr: 1, mb: 1 }}
              />
            ))}
          </Box>
        ) : (
          <Typography color="success.main">
            ✅ Memory system is performing optimally
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
