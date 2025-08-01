import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  Skeleton,
  Paper,
  Divider,
  Stack,
  Fab,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Psychology as PersonalityIcon,
  Memory as MemoryIcon,
  Settings as SettingsIcon,
  Mood as EmotionIcon,
  Code as BehaviorIcon,
  Dashboard as DashboardIcon,
  Close as CloseIcon
} from '@mui/icons-material';

// Import existing persona components
import { PersonaDashboard } from './PersonaDashboard';
import { PersonaAdvancedEditor } from './PersonaAdvancedEditor';
import { PersonaBehaviorConfiguration } from './PersonaBehaviorConfiguration';
import { PersonaEmotionalProfile } from './PersonaEmotionalProfile';
import { PersonaMemoryDashboard } from './PersonaMemoryDashboard';
import { PersonaCreationWizard } from './PersonaCreationWizard';

// Import common components
import { ErrorBoundary } from '../common/ErrorBoundary';
import { AsyncErrorBoundary } from '../common/AsyncErrorBoundary';
import { LoadingBoundary } from '../common/LoadingBoundary';

// Import reactive hook
import { useReactivePersonas } from '../../hooks/useReactivePersonas';

// Import types
import { PersonaData } from '../../../shared/types/persona';

interface PersonaManagementProps {
  userId: string;
}

type PersonaViewMode = 'dashboard' | 'editor' | 'behavior' | 'emotion' | 'memory';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`persona-tabpanel-${index}`}
      aria-labelledby={`persona-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const PersonaManagement: React.FC<PersonaManagementProps> = ({
  userId
}) => {
  // Use reactive personas hook
  const {
    personas,
    loading,
    error,
    refresh,
    createPersona,
    updatePersona,
    deletePersona,
    activatePersona,
    deactivatePersona
  } = useReactivePersonas();

  const [selectedPersona, setSelectedPersona] = useState<PersonaData | null>(null);
  const [viewMode, setViewMode] = useState<PersonaViewMode>('dashboard');
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personaToDelete, setPersonaToDelete] = useState<PersonaData | null>(null);

  // Handle persona selection
  const handlePersonaSelect = useCallback((personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    setSelectedPersona(persona || null);
    setViewMode('dashboard');
    setTabValue(0);
  }, [personas]);

  // Handle persona creation
  const handleCreatePersona = useCallback(async (personaData: Partial<PersonaData>) => {
    try {
      await createPersona(personaData as Omit<PersonaData, 'id'>);
      setCreateDialogOpen(false);
    } catch (err) {
      console.error('Failed to create persona:', err);
      throw err;
    }
  }, [createPersona]);

  // Handle persona update
  const handleUpdatePersona = useCallback(async (personaId: string, updates: Partial<PersonaData>) => {
    try {
      const updatedPersona = await updatePersona(personaId, updates);
      if (updatedPersona && selectedPersona?.id === personaId) {
        setSelectedPersona(updatedPersona);
      }
    } catch (err) {
      console.error('Failed to update persona:', err);
      throw err;
    }
  }, [updatePersona, selectedPersona]);

  // Handle persona deletion
  const handleDeletePersona = useCallback(async (personaId: string) => {
    try {
      await deletePersona(personaId);
      if (selectedPersona?.id === personaId) {
        setSelectedPersona(null);
      }
      setDeleteDialogOpen(false);
      setPersonaToDelete(null);
    } catch (err) {
      console.error('Failed to delete persona:', err);
      throw err;
    }
  }, [deletePersona, selectedPersona]);

  // Handle persona activation toggle
  const handleToggleActive = useCallback(async (personaId: string, active: boolean) => {
    try {
      if (active) {
        await activatePersona(personaId);
      } else {
        await deactivatePersona(personaId);
      }
    } catch (err) {
      console.error('Failed to toggle persona active state:', err);
    }
  }, [activatePersona, deactivatePersona]);

  // Handle tab change
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: PersonaViewMode) => {
    setViewMode(mode);
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback((persona: PersonaData) => {
    setPersonaToDelete(persona);
    setDeleteDialogOpen(true);
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={refresh}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <ErrorBoundary context="PersonaManagement">
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Persona Management
            {personas.length > 0 && (
              <Chip 
                label={`${personas.length} persona${personas.length !== 1 ? 's' : ''}`} 
                color="primary" 
                size="small" 
                sx={{ ml: 2 }}
              />
            )}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create, configure, and manage your AI personas
          </Typography>
        </Box>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Persona List */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Personas</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                    size="small"
                  >
                    Create
                  </Button>
                </Box>
                
                <PersonaDashboard
                  personas={personas}
                  selectedPersonaId={selectedPersona?.id}
                  onPersonaSelect={handlePersonaSelect}
                  onPersonaEdit={(personaId) => {
                    handlePersonaSelect(personaId);
                    setViewMode('editor');
                  }}
                  onPersonaDelete={handleDeleteConfirm}
                  onPersonaToggleActive={handleToggleActive}
                  onCreatePersona={() => setCreateDialogOpen(true)}
                  isLoading={loading}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Selected Persona Details */}
          <Grid item xs={12} md={8}>
            {selectedPersona ? (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h5">{selectedPersona.name}</Typography>
                      <Chip
                        label={selectedPersona.isActive ? 'Active' : 'Inactive'}
                        color={selectedPersona.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Dashboard">
                        <IconButton
                          onClick={() => handleViewModeChange('dashboard')}
                          color={viewMode === 'dashboard' ? 'primary' : 'default'}
                        >
                          <DashboardIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          onClick={() => handleViewModeChange('editor')}
                          color={viewMode === 'editor' ? 'primary' : 'default'}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Behavior">
                        <IconButton
                          onClick={() => handleViewModeChange('behavior')}
                          color={viewMode === 'behavior' ? 'primary' : 'default'}
                        >
                          <BehaviorIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Emotion">
                        <IconButton
                          onClick={() => handleViewModeChange('emotion')}
                          color={viewMode === 'emotion' ? 'primary' : 'default'}
                        >
                          <EmotionIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Memory">
                        <IconButton
                          onClick={() => handleViewModeChange('memory')}
                          color={viewMode === 'memory' ? 'primary' : 'default'}
                        >
                          <MemoryIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {selectedPersona.description}
                  </Typography>

                  {/* View Mode Content */}
                  <Box sx={{ mt: 2 }}>
                    {viewMode === 'dashboard' && (
                      <AsyncErrorBoundary context="PersonaDashboard">
                        <Box>
                          <Typography variant="h6" gutterBottom>Overview</Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">Personality</Typography>
                                <Typography variant="h6">
                                  {selectedPersona.personalityProfile?.dominantTraits?.join(', ') || 'Not configured'}
                                </Typography>
                              </Paper>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">Emotional State</Typography>
                                <Typography variant="h6">
                                  {selectedPersona.currentEmotionalState?.primaryEmotion || 'Neutral'}
                                </Typography>
                              </Paper>
                            </Grid>
                          </Grid>
                        </Box>
                      </AsyncErrorBoundary>
                    )}

                    {viewMode === 'editor' && (
                      <AsyncErrorBoundary context="PersonaAdvancedEditor">
                        <PersonaAdvancedEditor
                          persona={selectedPersona}
                          onPersonalityUpdate={(updates) => selectedPersona?.id && handleUpdatePersona(selectedPersona.id, updates)}
                          onSave={() => console.log('Persona saved')}
                          isLoading={false}
                        />
                      </AsyncErrorBoundary>
                    )}

                    {viewMode === 'behavior' && selectedPersona?.id && (
                      <AsyncErrorBoundary context="PersonaBehaviorConfiguration">
                        <PersonaBehaviorConfiguration
                          personaId={selectedPersona.id}
                          onBehaviorUpdate={(updates) => handleUpdatePersona(selectedPersona.id, updates)}
                        />
                      </AsyncErrorBoundary>
                    )}

                    {viewMode === 'emotion' && selectedPersona?.id && (
                      <AsyncErrorBoundary context="PersonaEmotionalProfile">
                        <PersonaEmotionalProfile
                          personaId={selectedPersona.id}
                          onEmotionalStateUpdate={(updates) => handleUpdatePersona(selectedPersona.id, updates)}
                        />
                      </AsyncErrorBoundary>
                    )}

                    {viewMode === 'memory' && selectedPersona?.id && (
                      <AsyncErrorBoundary context="PersonaMemoryDashboard">
                        <PersonaMemoryDashboard
                          personaId={selectedPersona.id}
                        />
                      </AsyncErrorBoundary>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent>
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No Persona Selected
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Select a persona from the list to view and edit its configuration
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>

        {/* Create Persona Dialog */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Create New Persona
            <IconButton
              aria-label="close"
              onClick={() => setCreateDialogOpen(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <PersonaCreationWizard
              onComplete={handleCreatePersona}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete Persona</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{personaToDelete?.name}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => personaToDelete && handleDeletePersona(personaToDelete.id)}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Floating Action Button for quick persona creation */}
        <Fab
          color="primary"
          aria-label="create persona"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setCreateDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      </Box>
    </ErrorBoundary>
  );
}; 