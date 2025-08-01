import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Person as PersonaIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

export const PersonaIntegrationTest: React.FC = () => {
  const [personas, setPersonas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const [testError, setTestError] = useState<string>('');

  const loadPersonas = async () => {
    setLoading(true);
    setTestError('');
    try {
      if (window.electronAPI?.persona) {
        const personaList = await window.electronAPI.persona.list();
        setPersonas(personaList);
        setTestResult(`✅ Successfully loaded ${personaList.length} personas from persistent database`);
        console.log('Loaded personas:', personaList);
      }
    } catch (error) {
      console.error('Failed to load personas:', error);
      setTestError(`❌ Failed to load personas: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const createTestPersona = async () => {
    setLoading(true);
    setTestError('');
    try {
      if (window.electronAPI?.persona) {
        const testPersona = {
          name: `Test Persona ${Date.now()}`,
          description: 'Test persona created to verify database integration',
          personality: {
            traits: ['helpful', 'analytical'],
            temperament: 'balanced',
            communicationStyle: 'professional'
          }
        } as any;
        
        const created = await window.electronAPI.persona.create(testPersona);
        setTestResult(`✅ Successfully created persona: ${created.name} (ID: ${created.id})`);
        console.log('Created persona:', created);
        
        // Reload the list to show the new persona
        await loadPersonas();
      }
    } catch (error) {
      console.error('Failed to create persona:', error);
      setTestError(`❌ Failed to create persona: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonas();
  }, []);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <PersonaIcon sx={{ mr: 2, color: 'primary.main' }} />
        <Typography variant="h6">
          Persona Integration Test
        </Typography>
        <Chip
          label={`${personas.length} personas`}
          size="small"
          sx={{ ml: 'auto', mr: 2 }}
          color={personas.length > 0 ? 'success' : 'default'}
        />
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadPersonas}
            disabled={loading}
          >
            Load Personas
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={createTestPersona}
            disabled={loading}
          >
            Create Test Persona
          </Button>
          {loading && <CircularProgress size={24} />}
        </Box>

        {testResult && (
          <Alert severity="success" sx={{ mb: 2, fontSize: '0.875rem' }}>
            {testResult}
          </Alert>
        )}

        {testError && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
            {testError}
          </Alert>
        )}

        {personas.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Loaded Personas ({personas.length}):
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {personas.slice(0, 10).map((persona) => (
                <Chip
                  key={persona.id}
                  label={persona.name}
                  size="small"
                  variant="outlined"
                />
              ))}
              {personas.length > 10 && (
                <Chip
                  label={`+${personas.length - 10} more`}
                  size="small"
                  variant="outlined"
                  color="secondary"
                />
              )}
            </Box>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default PersonaIntegrationTest;