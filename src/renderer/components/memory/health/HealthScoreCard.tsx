import React from 'react';
import { Card, CardContent, Typography, LinearProgress, Box } from '@mui/material';

interface HealthScoreCardProps {
  healthScore: number;
  title?: string;
  size?: 'small' | 'medium' | 'large';
}

export const HealthScoreCard: React.FC<HealthScoreCardProps> = ({
  healthScore,
  title = "Health Score",
  size = 'medium'
}) => {
  const getScoreColor = (score: number) => {
    if (score > 80) return 'success.main';
    if (score > 60) return 'warning.main';
    return 'error.main';
  };

  const getProgressColor = (score: number) => {
    if (score > 80) return 'success';
    if (score > 60) return 'warning';
    return 'error';
  };

  const getSizeVariants = () => {
    switch (size) {
      case 'small': 
        return { 
          title: 'subtitle1' as const, 
          score: 'h4' as const 
        };
      case 'large': 
        return { 
          title: 'h4' as const, 
          score: 'h2' as const 
        };
      default: 
        return { 
          title: 'h6' as const, 
          score: 'h3' as const 
        };
    }
  };

  const sizeVariants = getSizeVariants();

  return (
    <Card>
      <CardContent>
        <Typography variant={sizeVariants.title} gutterBottom>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography 
            variant={sizeVariants.score} 
            color={getScoreColor(healthScore)}
          >
            {Math.round(healthScore)}
          </Typography>
          <Typography 
            variant="h5" 
            color="text.secondary" 
            sx={{ ml: 1 }}
          >
            /100
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={healthScore}
          color={getProgressColor(healthScore)}
          sx={{ 
            height: size === 'large' ? 12 : 8, 
            borderRadius: 4 
          }}
        />
      </CardContent>
    </Card>
  );
};
