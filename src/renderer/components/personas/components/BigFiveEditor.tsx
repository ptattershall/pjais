import React from 'react';
import { Box, Typography, Slider, Card, CardContent, LinearProgress } from '@mui/material';

interface BigFiveTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

interface BigFiveEditorProps {
  traits: BigFiveTraits;
  onTraitChange: (trait: keyof BigFiveTraits, value: number) => void;
  readonly?: boolean;
}

const traitDescriptions = {
  openness: 'Openness to experience - imagination, curiosity, and appreciation for variety',
  conscientiousness: 'Conscientiousness - organization, responsibility, and dependability',
  extraversion: 'Extraversion - energy, positive emotions, and sociability',
  agreeableness: 'Agreeableness - cooperation, trust, and empathy',
  neuroticism: 'Neuroticism - tendency toward emotional instability and anxiety',
};

export const BigFiveEditor: React.FC<BigFiveEditorProps> = ({
  traits,
  onTraitChange,
  readonly = false,
}) => {
  const getTraitColor = (value: number) => {
    if (value >= 70) return 'success';
    if (value >= 40) return 'warning';
    return 'error';
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Big Five Personality Traits
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {Object.entries(traits).map(([key, value]) => (
            <Box key={key}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ minWidth: 140, textTransform: 'capitalize' }}>
                  {key}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  {value}%
                </Typography>
              </Box>
              
              <Slider
                value={value}
                onChange={(_, newValue) => onTraitChange(key as keyof BigFiveTraits, newValue as number)}
                disabled={readonly}
                min={0}
                max={100}
                step={1}
                sx={{ mb: 1 }}
                color={getTraitColor(value)}
              />
              
              <Typography variant="caption" color="text.secondary">
                {traitDescriptions[key as keyof BigFiveTraits]}
              </Typography>
            </Box>
          ))}
        </Box>
        
        {/* Overall personality balance indicator */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Personality Balance
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Object.values(traits).reduce((sum, val) => sum + val, 0) / 5)}
              sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption">
              {Math.round(Object.values(traits).reduce((sum, val) => sum + val, 0) / 5)}%
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default BigFiveEditor;