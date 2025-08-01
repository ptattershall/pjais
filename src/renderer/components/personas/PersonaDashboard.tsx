import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Paper
} from '@mui/material';
// Error boundaries - imported but not used yet in this component
// import { ErrorBoundary } from '../common/ErrorBoundary';
// import { AsyncErrorBoundary } from '../common/AsyncErrorBoundary';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as ActivateIcon,
  Pause as DeactivateIcon,
  Psychology as PersonalityIcon,
  Memory as MemoryIcon,
  CheckCircle as HealthyIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { PersonaData, EmotionalState } from '../../../shared/types/persona';
import { VirtualizedPersonaList } from './VirtualizedPersonaList';

interface PersonaDashboardStats {
  memoryCount: number;
  memoryHealth: 'excellent' | 'good' | 'fair' | 'poor';
  emotionalStability: number;
  lastActive: Date;
  userSatisfaction: number;
}

interface PersonaDashboardProps {
  personas: PersonaData[];
  selectedPersonaId?: string;
  onPersonaSelect: (personaId: string) => void;
  onPersonaEdit: (personaId: string) => void;
  onPersonaDelete: (personaId: string) => void;
  onPersonaToggleActive: (personaId: string, active: boolean) => void;
  onCreatePersona: () => void;
  isLoading?: boolean;
}

const EMOTION_ICONS: Record<EmotionalState['primaryEmotion'], string> = {
  joy: '😊',
  sadness: '😢',
  anger: '😠',
  fear: '😨',
  surprise: '😲',
  disgust: '🤢',
  neutral: '😐'
};

const HEALTH_COLORS = {
  excellent: '#10B981',
  good: '#10B981',
  fair: '#F59E0B',
  poor: '#EF4444'
};

export const PersonaDashboard: React.FC<PersonaDashboardProps> = ({
  personas,
  selectedPersonaId,
  onPersonaSelect,
  onPersonaEdit,
  onPersonaDelete,
  onPersonaToggleActive,
  onCreatePersona,
  isLoading = false
}) => {
  const [personaStats, setPersonaStats] = useState<Map<string, PersonaDashboardStats>>(new Map());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPersona, setSelectedPersona] = useState<PersonaData | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [personaToDelete, setPersonaToDelete] = useState<PersonaData | null>(null);

  const loadPersonaStats = useCallback(async () => {
    const statsMap = new Map<string, PersonaStats>();
    
    for (const persona of personas) {
      if (persona.id) {
        try {
          // TODO: Call backend services via IPC to get real stats
          // For now use mock data since the persona stats endpoint doesn't exist yet
          const stats = generateMockStats();
          statsMap.set(persona.id, stats);
        } catch (error) {
          console.error(`Failed to load stats for persona ${persona.id}:`, error);
          // Fallback to mock data
          statsMap.set(persona.id, generateMockStats());
        }
      }
    }
    
    setPersonaStats(statsMap);
  }, [personas]);

  useEffect(() => {
    loadPersonaStats();
  }, [loadPersonaStats]);

  const generateMockStats = (): PersonaStats => ({
    memoryCount: Math.floor(Math.random() * 500) + 100,
    memoryHealth: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)] as PersonaStats['memoryHealth'],
    emotionalStability: Math.floor(Math.random() * 40) + 60,
    lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    userSatisfaction: Math.floor(Math.random() * 30) + 70
  });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, persona: PersonaData) => {
    setAnchorEl(event.currentTarget);
    setSelectedPersona(persona);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPersona(null);
  };

  const handleDeleteConfirm = (persona: PersonaData) => {
    setPersonaToDelete(persona);
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  const handleDeleteExecute = () => {
    if (personaToDelete?.id) {
      onPersonaDelete(personaToDelete.id);
    }
    setDeleteConfirmOpen(false);
    setPersonaToDelete(null);
  };

  const getHealthIcon = (health: PersonaStats['memoryHealth']) => {
    return health === 'excellent' || health === 'good' ? 
      <HealthyIcon sx={{ color: HEALTH_COLORS[health], fontSize: 20 }} /> :
      <WarningIcon sx={{ color: HEALTH_COLORS[health], fontSize: 20 }} />;
  };

  const formatLastActive = (date: Date) => {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Persona Dashboard
        </Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="circular" width={56} height={56} sx={{ mb: 2 }} />
                  <Skeleton variant="text" height={32} sx={{ mb: 1 }} />
                  <Skeleton variant="text" height={24} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" height={80} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Persona Dashboard
        </Typography>
        <Button
          variant="contained"
          onClick={onCreatePersona}
          startIcon={<PersonalityIcon />}
          sx={{
            background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #5a6fd8 0%, #6a4190 100%)',
            }
          }}
        >
          Create Persona
        </Button>
      </Box>

      {/* Summary Stats */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3, 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Grid container spacing={3}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>
                {personas.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Personas
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>
                {personas.filter(p => p.isActive).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Personas
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="info.main" sx={{ fontWeight: 'bold' }}>
                {Array.from(personaStats.values()).reduce((sum, stats) => sum + stats.memoryCount, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Memories
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="warning.main" sx={{ fontWeight: 'bold' }}>
                {Math.round(Array.from(personaStats.values()).reduce((sum, stats) => sum + stats.userSatisfaction, 0) / Math.max(personaStats.size, 1))}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Satisfaction
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Persona Cards Grid */}
      {personas.length === 0 ? (
        <Paper 
          elevation={0}
          sx={{ 
            p: 6, 
            textAlign: 'center',
            background: 'rgba(255,255,255,0.02)',
            border: '2px dashed rgba(255,255,255,0.1)'
          }}
        >
          <PersonalityIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="text.secondary">
            No Personas Created Yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Create your first persona to get started with AI personality management
          </Typography>
          <Button
            variant="contained"
            onClick={onCreatePersona}
            size="large"
            startIcon={<PersonalityIcon />}
          >
            Create Your First Persona
          </Button>
        </Paper>
      ) : (
        <VirtualizedPersonaList
          personas={personas}
          selectedPersonaId={selectedPersonaId}
          onPersonaSelect={(persona) => persona.id && onPersonaSelect(persona.id)}
          onPersonaEdit={(persona) => persona.id && onPersonaEdit(persona.id)}
          onPersonaDelete={(personaId) => onPersonaDelete(personaId)}
          onPersonaFavorite={(personaId, favorite) => {
            // Handle favorite logic here if needed
            console.log('Favorite toggle:', personaId, favorite);
          }}
          personaStats={useMemo(() => {
            // Convert PersonaDashboardStats to PersonaStats format
            const convertedStats = new Map();
            personaStats.forEach((stats, personaId) => {
              convertedStats.set(personaId, {
                memoryCount: stats.memoryCount,
                lastInteraction: stats.lastActive.toISOString(),
                averageImportance: stats.userSatisfaction / 10, // Convert to 0-1 scale
                totalInteractions: stats.memoryCount // Use memory count as proxy for interactions
              });
            });
            return convertedStats;
          }, [personaStats])}
          containerHeight={600}
          isLoading={loading}
          emptyMessage="No personas found"
          showActions={true}
          showDetails={true}
          showStats={true}
          sortBy="name"
          sortOrder="asc"
          itemHeight={180}
          className="persona-virtualized-list"
        />
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { selectedPersona?.id && onPersonaEdit(selectedPersona.id); handleMenuClose(); }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Persona</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => { 
          selectedPersona?.id && onPersonaToggleActive(selectedPersona.id, !selectedPersona.isActive); 
          handleMenuClose(); 
        }}>
          <ListItemIcon>
            {selectedPersona?.isActive ? <DeactivateIcon fontSize="small" /> : <ActivateIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>{selectedPersona?.isActive ? 'Deactivate' : 'Activate'}</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={() => { selectedPersona && handleDeleteConfirm(selectedPersona); }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Delete Persona</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Persona</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. All memories and configurations for this persona will be permanently deleted.
          </Alert>
          <Typography>
            Are you sure you want to delete <strong>{personaToDelete?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteExecute} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 