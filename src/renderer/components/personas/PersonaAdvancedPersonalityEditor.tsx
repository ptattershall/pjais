import React, { lazy, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Alert,
  Stack,
} from '@mui/material';
import {
  Psychology as PersonalityIcon,
  Save as SaveIcon,
  RestoreFromTrash as ResetIcon,
} from '@mui/icons-material';
import { PersonaData } from '../../../shared/types/persona';
import { LoadingBoundary } from '../common/LoadingBoundary';
import { ErrorBoundary } from '../common/ErrorBoundary';

// Immediately loaded components
import { BigFiveEditor } from './components';

// Lazy-loaded components for better performance
const PersonalityTraitEditor = lazy(() => import('./components/PersonalityTraitEditor'));
const PersonalityTemplateSelector = lazy(() => import('./components/PersonalityTemplateSelector'));

interface PersonaAdvancedPersonalityEditorProps {
  persona: PersonaData;
  onSave: (persona: PersonaData) => void;
  readonly?: boolean;
}

interface PersonalityTrait {
  id: string;
  name: string;
  value: number;
  description?: string;
}

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

export const PersonaAdvancedPersonalityEditor: React.FC<PersonaAdvancedPersonalityEditorProps> = ({
  persona,
  onSave,
  readonly = false,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [editedPersona, setEditedPersona] = useState<PersonaData>(persona);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Mock data for demonstration
  const [customTraits, setCustomTraits] = useState<PersonalityTrait[]>([
    { id: 'creativity', name: 'Creativity', value: 75, description: 'Ability to generate novel ideas' },
    { id: 'empathy', name: 'Empathy', value: 60, description: 'Understanding others emotions' },
    { id: 'leadership', name: 'Leadership', value: 45, description: 'Ability to guide and inspire others' },
  ]);

  const [templates] = useState<PersonalityTemplate[]>([
    {
      id: 'professional',
      name: 'Professional Assistant',
      description: 'Balanced, reliable, and task-focused',
      category: 'professional',
      bigFive: { openness: 60, conscientiousness: 85, extraversion: 65, agreeableness: 75, neuroticism: 30 },
      customTraits: { creativity: 55, empathy: 70, leadership: 60 },
      popularity: 9,
      useCases: ['Business', 'Productivity', 'Analysis'],
    },
    {
      id: 'creative',
      name: 'Creative Collaborator',
      description: 'Imaginative, expressive, and innovative',
      category: 'creative',
      bigFive: { openness: 90, conscientiousness: 50, extraversion: 75, agreeableness: 80, neuroticism: 45 },
      customTraits: { creativity: 95, empathy: 80, leadership: 50 },
      popularity: 8,
      useCases: ['Art', 'Writing', 'Brainstorming'],
    },
  ]);

  const handleBigFiveChange = (
    trait: 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism',
    value: number
  ) => {
    setEditedPersona(prev => {
      const personality = prev.personality ?? { bigFive: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 } };
      return {
        ...prev,
        personality: {
          ...personality,
          bigFive: {
            ...personality.bigFive,
            [trait]: value,
          },
        },
      };
    });
    setHasChanges(true);
  };

  const handleCustomTraitChange = (traitId: string, value: number) => {
    setCustomTraits(prev => 
      prev.map(trait => 
        trait.id === traitId ? { ...trait, value } : trait
      )
    );
    setHasChanges(true);
  };

  const handleTemplateSelect = (template: PersonalityTemplate) => {
    setEditedPersona(prev => ({
      ...prev,
      personality: {
        ...prev.personality,
        bigFive: template.bigFive,
      },
    }));
    
    // Update custom traits from template
    setCustomTraits(prev => 
      prev.map(trait => ({
        ...trait,
        value: template.customTraits[trait.id] || trait.value,
      }))
    );
    
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate save
      onSave(editedPersona);
      setHasChanges(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleReset = () => {
    setEditedPersona(persona);
    setHasChanges(false);
  };

  const tabContent = [
    {
      label: 'Big Five',
      component: (
        <BigFiveEditor
          traits={editedPersona.personality?.bigFive || {
            openness: 50,
            conscientiousness: 50,
            extraversion: 50,
            agreeableness: 50,
            neuroticism: 50,
          }}
          onTraitChange={handleBigFiveChange}
          readonly={readonly}
        />
      ),
    },
    {
      label: 'Custom Traits',
      component: (
        <ErrorBoundary>
          <LoadingBoundary>
            <PersonalityTraitEditor
              traits={customTraits}
              onTraitChange={handleCustomTraitChange}
              readonly={readonly}
            />
          </LoadingBoundary>
        </ErrorBoundary>
      ),
    },
    {
      label: 'Templates',
      component: (
        <ErrorBoundary>
          <LoadingBoundary>
            <PersonalityTemplateSelector
              templates={templates}
              onTemplateSelect={handleTemplateSelect}
              selectedTemplateId={undefined}
            />
          </LoadingBoundary>
        </ErrorBoundary>
      ),
    },
  ];

  return (
    <ErrorBoundary>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <PersonalityIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h5" component="h1">
              Advanced Personality Editor
            </Typography>
          </Box>

          {saveStatus === 'saved' && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Personality settings saved successfully!
            </Alert>
          )}

          {saveStatus === 'error' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to save personality settings. Please try again.
            </Alert>
          )}

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              {tabContent.map((tab, index) => (
                <Tab key={index} label={tab.label} />
              ))}
            </Tabs>
          </Box>

          <Box sx={{ minHeight: 400 }}>
            {tabContent[activeTab]?.component}
          </Box>

          {!readonly && (
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!hasChanges || saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<ResetIcon />}
                onClick={handleReset}
                disabled={!hasChanges}
              >
                Reset
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

export default PersonaAdvancedPersonalityEditor;
