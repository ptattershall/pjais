import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Slider,
  TextField,
  Button,
  Chip,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Stack
} from '@mui/material';
import {
  Psychology as PersonalityIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  AutoAwesome as TemplateIcon,
  Tune as CustomizeIcon,
} from '@mui/icons-material';
import { PersonaData, PersonalityProfile } from '../../../shared/types/persona';

interface PersonalityTemplate {
  id: string;
  name: string;
  description: string;
  bigFive: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  customTraits: Record<string, number>;
  useCases: string[];
}

interface PersonaAdvancedEditorProps {
  persona: PersonaData;
  onPersonalityUpdate: (personality: PersonalityProfile) => Promise<void>;
  onSave?: () => void;
  isLoading?: boolean;
}

const BIG_FIVE_DESCRIPTIONS = {
  openness: {
    high: 'Creative, curious, and open to new experiences',
    low: 'Practical, conventional, and prefers routine'
  },
  conscientiousness: {
    high: 'Organized, responsible, and goal-oriented', 
    low: 'Flexible, spontaneous, and adaptable'
  },
  extraversion: {
    high: 'Outgoing, energetic, and seeks social interaction',
    low: 'Reserved, introspective, and prefers solitude'
  },
  agreeableness: {
    high: 'Cooperative, trusting, and empathetic',
    low: 'Competitive, skeptical, and direct'
  },
  neuroticism: {
    high: 'Sensitive, emotional, and stress-prone',
    low: 'Calm, resilient, and emotionally stable'
  }
};

const PERSONALITY_TEMPLATES: PersonalityTemplate[] = [
  {
    id: 'professional-assistant',
    name: 'Professional Assistant',
    description: 'Reliable, organized, and detail-oriented helper',
    bigFive: { openness: 60, conscientiousness: 85, extraversion: 55, agreeableness: 80, neuroticism: 25 },
    customTraits: { helpfulness: 90, reliability: 85, patience: 80 },
    useCases: ['Business support', 'Task management', 'Professional communication']
  },
  {
    id: 'creative-collaborator', 
    name: 'Creative Collaborator',
    description: 'Imaginative, inspirational, and innovative thinking partner',
    bigFive: { openness: 95, conscientiousness: 60, extraversion: 75, agreeableness: 70, neuroticism: 45 },
    customTraits: { creativity: 95, inspiration: 85, adaptability: 80 },
    useCases: ['Creative projects', 'Brainstorming', 'Artistic endeavors']
  }
];

export const PersonaAdvancedEditor: React.FC<PersonaAdvancedEditorProps> = ({
  persona,
  onPersonalityUpdate,
  onSave,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [personality, setPersonality] = useState<PersonalityProfile>(
    persona.personalityProfile || {
      bigFive: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 },
      customTraits: {},
      dominantTraits: []
    }
  );
  const [customTraitName, setCustomTraitName] = useState('');
  const [customTraitValue, setCustomTraitValue] = useState(50);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const isChanged = JSON.stringify(personality) !== JSON.stringify(persona.personalityProfile);
    setHasUnsavedChanges(isChanged);
  }, [personality, persona.personalityProfile]);

  const handleBigFiveChange = (trait: keyof typeof personality.bigFive, value: number) => {
    setPersonality(prev => ({
      ...prev,
      bigFive: {
        ...prev.bigFive,
        [trait]: value
      }
    }));
  };

  const handleCustomTraitChange = (name: string, value: number) => {
    setPersonality(prev => ({
      ...prev,
      customTraits: {
        ...prev.customTraits,
        [name]: value
      }
    }));
  };

  const addCustomTrait = () => {
    if (customTraitName.trim() && !personality.customTraits[customTraitName]) {
      handleCustomTraitChange(customTraitName, customTraitValue);
      setCustomTraitName('');
      setCustomTraitValue(50);
    }
  };

  const removeCustomTrait = (name: string) => {
    setPersonality(prev => {
      const newCustomTraits = { ...prev.customTraits };
      delete newCustomTraits[name];
      return {
        ...prev,
        customTraits: newCustomTraits
      };
    });
  };

  const applyTemplate = (template: PersonalityTemplate) => {
    setPersonality({
      bigFive: template.bigFive,
      customTraits: template.customTraits,
      dominantTraits: calculateDominantTraits(template.bigFive, template.customTraits),
      personalityType: template.name
    });
    setTemplateDialogOpen(false);
  };

  const calculateDominantTraits = (bigFive: typeof personality.bigFive, customTraits: Record<string, number>): string[] => {
    const allTraits = [
      ...Object.entries(bigFive).map(([name, value]) => ({ name, value })),
      ...Object.entries(customTraits).map(([name, value]) => ({ name, value }))
    ];
    
    return allTraits
      .filter(trait => trait.value >= 70)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map(trait => trait.name);
  };

  const handleSave = async () => {
    try {
      const updatedPersonality = {
        ...personality,
        dominantTraits: calculateDominantTraits(personality.bigFive, personality.customTraits)
      };
      await onPersonalityUpdate(updatedPersonality);
      onSave?.();
    } catch (error) {
      console.error('Failed to save personality:', error);
    }
  };

  const getTraitColor = (value: number): string => {
    if (value >= 80) return '#10B981';
    if (value >= 60) return '#F59E0B';
    if (value >= 40) return '#6B7280';
    return '#EF4444';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonalityIcon />
            Advanced Personality Editor
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure detailed personality traits for {persona.name}
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            onClick={() => setTemplateDialogOpen(true)}
            startIcon={<TemplateIcon />}
          >
            Templates
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isLoading}
            startIcon={<SaveIcon />}
          >
            Save Changes
          </Button>
        </Stack>
      </Box>

      {/* Unsaved Changes Alert */}
      {hasUnsavedChanges && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You have unsaved changes. Don&apos;t forget to save your personality configuration.
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Big Five Traits" />
        <Tab label="Custom Traits" />
        <Tab label="Overview" />
      </Tabs>

      {/* Big Five Traits Tab */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Big Five Personality Traits
          </Typography>

          {Object.entries(personality.bigFive).map(([trait, value]) => (
            <Card key={trait} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                    {trait}
                  </Typography>
                  <Chip 
                    label={`${value}%`}
                    size="small"
                    sx={{ 
                      bgcolor: getTraitColor(value),
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                </Box>
                
                <Slider
                  value={value}
                  onChange={(_, newValue) => handleBigFiveChange(trait as keyof typeof personality.bigFive, newValue as number)}
                  min={0}
                  max={100}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 50, label: '50%' },
                    { value: 100, label: '100%' }
                  ]}
                  sx={{ color: getTraitColor(value) }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {BIG_FIVE_DESCRIPTIONS[trait as keyof typeof BIG_FIVE_DESCRIPTIONS]?.low}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {BIG_FIVE_DESCRIPTIONS[trait as keyof typeof BIG_FIVE_DESCRIPTIONS]?.high}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Custom Traits Tab */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Custom Traits
          </Typography>

          {/* Add Custom Trait */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Add New Trait
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                <TextField
                  label="Trait Name"
                  value={customTraitName}
                  onChange={(e) => setCustomTraitName(e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <Box sx={{ minWidth: 200 }}>
                  <Typography variant="caption" color="text.secondary">
                    Value: {customTraitValue}%
                  </Typography>
                  <Slider
                    value={customTraitValue}
                    onChange={(_, value) => setCustomTraitValue(value as number)}
                    min={0}
                    max={100}
                    size="small"
                  />
                </Box>
                <Button
                  variant="contained"
                  onClick={addCustomTrait}
                  disabled={!customTraitName.trim()}
                  startIcon={<AddIcon />}
                >
                  Add
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Existing Custom Traits */}
          {Object.entries(personality.customTraits).map(([name, value]) => (
            <Card key={name} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                    {name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={`${value}%`}
                      size="small"
                      sx={{ 
                        bgcolor: getTraitColor(value),
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeCustomTrait(name)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                
                <Slider
                  value={value}
                  onChange={(_, newValue) => handleCustomTraitChange(name, newValue as number)}
                  min={0}
                  max={100}
                  sx={{ color: getTraitColor(value) }}
                />
              </CardContent>
            </Card>
          ))}

          {Object.keys(personality.customTraits).length === 0 && (
            <Paper 
              elevation={0}
              sx={{ 
                p: 4, 
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
                border: '2px dashed rgba(255,255,255,0.1)'
              }}
            >
              <CustomizeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom color="text.secondary">
                No Custom Traits Added
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Add custom traits to make this persona unique for your specific use case
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Overview Tab */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Personality Overview
          </Typography>
          
          {/* Trait Distribution */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trait Distribution
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(personality.bigFive).map(([trait, value]) => (
                  <Chip
                    key={trait}
                    label={`${trait}: ${value}%`}
                    size="small"
                    sx={{
                      bgcolor: getTraitColor(value),
                      color: 'white',
                      textTransform: 'capitalize'
                    }}
                  />
                ))}
                {Object.entries(personality.customTraits).map(([trait, value]) => (
                  <Chip
                    key={trait}
                    label={`${trait}: ${value}%`}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: getTraitColor(value),
                      color: getTraitColor(value),
                      textTransform: 'capitalize'
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Dominant Traits */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Dominant Traits (≥70%)
              </Typography>
              {calculateDominantTraits(personality.bigFive, personality.customTraits).length > 0 ? (
                <Stack spacing={1}>
                  {calculateDominantTraits(personality.bigFive, personality.customTraits).map(trait => {
                    const value = personality.bigFive[trait as keyof typeof personality.bigFive] || personality.customTraits[trait];
                    return (
                      <Box key={trait} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" sx={{ minWidth: 120, textTransform: 'capitalize' }}>
                          {trait}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={value}
                          sx={{
                            flex: 1,
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              bgcolor: getTraitColor(value)
                            }
                          }}
                        />
                        <Typography variant="caption" sx={{ minWidth: 40 }}>
                          {value}%
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No dominant traits (all traits below 70%)
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Template Selection Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Personality Templates</DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Choose from pre-configured personality templates or start with a custom configuration.
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
            {PERSONALITY_TEMPLATES.map((template) => (
              <Card 
                key={template.id} 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { 
                    transform: 'translateY(-2px)',
                    boxShadow: 'rgba(0, 0, 0, 0.25) 0px 25px 50px -12px'
                  }
                }}
                onClick={() => applyTemplate(template)}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {template.name}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {template.description}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Use Cases:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {template.useCases.slice(0, 2).map((useCase) => (
                        <Chip key={useCase} label={useCase} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Key Traits:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {Object.entries(template.bigFive)
                        .filter(([_, value]) => value >= 70)
                        .slice(0, 3)
                        .map(([trait, value]) => (
                          <Chip 
                            key={trait} 
                            label={`${trait}: ${value}%`} 
                            size="small"
                            sx={{ 
                              bgcolor: getTraitColor(value),
                              color: 'white',
                              fontSize: '0.7rem',
                              textTransform: 'capitalize'
                            }}
                          />
                        ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 