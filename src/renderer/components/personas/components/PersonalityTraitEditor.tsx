import React from 'react';
import { Box, Typography, Slider, Card, CardContent } from '@mui/material';

interface PersonalityTrait {
  id: string;
  name: string;
  value: number;
  description?: string;
}

interface PersonalityTraitEditorProps {
  traits: PersonalityTrait[];
  onTraitChange: (traitId: string, value: number) => void;
  readonly?: boolean;
}

export const PersonalityTraitEditor: React.FC<PersonalityTraitEditorProps> = ({
  traits,
  onTraitChange,
  readonly = false,
}) => {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Personality Traits
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {traits.map((trait) => (
            <Box key={trait.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ minWidth: 120 }}>
                  {trait.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  {trait.value}%
                </Typography>
              </Box>
              
              <Slider
                value={trait.value}
                onChange={(_, value) => onTraitChange(trait.id, value as number)}
                disabled={readonly}
                min={0}
                max={100}
                step={1}
                sx={{ mb: 1 }}
              />
              
              {trait.description && (
                <Typography variant="caption" color="text.secondary">
                  {trait.description}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default PersonalityTraitEditor;