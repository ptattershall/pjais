import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Avatar,
} from '@mui/material';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactElement;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  progress?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  progress,
}) => (
  <Card
    variant="glass"
    sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        transform: 'translateY(-4px)',
      },
    }}
  >
    <CardContent sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar
          sx={{
            bgcolor: `${color}.main`,
            mr: 2,
            width: 48,
            height: 48,
          }}
        >
          {icon}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="div" fontWeight={700}>
            {value}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {title}
          </Typography>
        </Box>
      </Box>
      
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {subtitle}
        </Typography>
      )}
      
      {progress !== undefined && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'action.disabled',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
              },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {progress}% capacity
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

export default MetricCard;