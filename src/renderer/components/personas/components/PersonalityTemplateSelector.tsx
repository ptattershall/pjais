import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
} from '@mui/material';
import { AutoAwesome as TemplateIcon } from '@mui/icons-material';

interface PersonalityTemplate {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'creative' | 'analytical' | 'social';
  bigFive: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  customTraits: Record<string, number>;
  popularity: number;
  useCases: string[];
}

interface PersonalityTemplateSelectorProps {
  templates: PersonalityTemplate[];
  onTemplateSelect: (template: PersonalityTemplate) => void;
  selectedTemplateId?: string;
}

export const PersonalityTemplateSelector: React.FC<PersonalityTemplateSelectorProps> = ({
  templates,
  onTemplateSelect,
  selectedTemplateId,
}) => {
  const getCategoryColor = (category: PersonalityTemplate['category']) => {
    switch (category) {
      case 'professional':
        return 'primary';
      case 'creative':
        return 'secondary';
      case 'analytical':
        return 'info';
      case 'social':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <TemplateIcon sx={{ mr: 1 }} />
        Personality Templates
      </Typography>
      
      <Grid container spacing={2}>
        {templates.map((template) => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
            <Card
              variant={selectedTemplateId === template.id ? 'outlined' : 'elevation'}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                border: selectedTemplateId === template.id ? 2 : 1,
                borderColor: selectedTemplateId === template.id ? 'primary.main' : 'divider',
                '&:hover': {
                  boxShadow: 3,
                },
              }}
              onClick={() => onTemplateSelect(template)}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" component="h3" sx={{ flexGrow: 1 }}>
                    {template.name}
                  </Typography>
                  <Chip
                    label={template.category}
                    size="small"
                    color={getCategoryColor(template.category)}
                    sx={{ ml: 1 }}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {template.description}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Use Cases:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {template.useCases.slice(0, 3).map((useCase, index) => (
                      <Chip
                        key={index}
                        label={useCase}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                    {template.useCases.length > 3 && (
                      <Chip
                        label={`+${template.useCases.length - 3}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Popularity: {template.popularity}/10
                  </Typography>
                  <Chip
                    label={selectedTemplateId === template.id ? 'Selected' : 'Select'}
                    size="small"
                    color={selectedTemplateId === template.id ? 'primary' : 'default'}
                    variant={selectedTemplateId === template.id ? 'filled' : 'outlined'}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default PersonalityTemplateSelector;