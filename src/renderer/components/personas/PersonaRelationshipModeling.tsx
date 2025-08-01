import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tab,
  Tabs,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  AccountTree as RelationshipIcon,
  Warning as ConflictIcon,
  Psychology as AnalysisIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Group as CollaborationIcon,
} from '@mui/icons-material';

// Import modular components
import { RelationshipGraph } from './components/RelationshipGraph';
import { ConflictDetectionPanel } from './components/ConflictDetectionPanel';
import { CollaborationAnalysisPanel } from './components/CollaborationAnalysisPanel';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';

// Import types and data
import { 
  PersonaRelationship, 
  ConflictDetection, 
  CollaborationPattern,
  RelationshipStats 
} from './types/relationship-types';
import { mockPersonas, mockRelationships } from './utils/mock-data';

const PersonaRelationshipModeling: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [relationships] = useState<PersonaRelationship[]>(mockRelationships);
  const [selectedRelationship, setSelectedRelationship] = useState<PersonaRelationship | null>(null);
  const [showRelationshipDialog, setShowRelationshipDialog] = useState(false);
  const [conflictDetectionEnabled, setConflictDetectionEnabled] = useState(true);
  const [isLoading] = useState(false);

  // Calculate conflicts based on personality differences
  const detectedConflicts = useMemo<ConflictDetection[]>(() => {
    if (!conflictDetectionEnabled) return [];
    
    const conflicts: ConflictDetection[] = [];
    
    for (let i = 0; i < mockPersonas.length; i++) {
      for (let j = i + 1; j < mockPersonas.length; j++) {
        const persona1 = mockPersonas[i];
        const persona2 = mockPersonas[j];
        
        const traits1 = persona1.personalityProfile?.bigFive;
        const traits2 = persona2.personalityProfile?.bigFive;
        
        if (traits1 && traits2) {
          const extraversionDiff = Math.abs(traits1.extraversion - traits2.extraversion);
          const agreeablenessDiff = Math.abs(traits1.agreeableness - traits2.agreeableness);
          const neuroticismConflict = Math.max(traits1.neuroticism, traits2.neuroticism);
          
          const conflictScore = (extraversionDiff + agreeablenessDiff + neuroticismConflict) / 3;
          
          if (conflictScore > 50) {
            const severity = conflictScore > 75 ? 'critical' : conflictScore > 65 ? 'high' : 'medium';
            
            conflicts.push({
              personas: [persona1.id, persona2.id],
              conflictType: 'personality',
              severity: severity as 'medium' | 'high' | 'critical',
              description: `High personality trait differences detected between ${persona1.name} and ${persona2.name}`,
              recommendations: [
                'Consider structured communication protocols',
                'Implement conflict resolution guidelines',
                'Use a mediating persona for interactions',
              ],
              affectedTraits: ['extraversion', 'agreeableness', 'neuroticism'],
            });
          }
        }
      }
    }
    
    return conflicts;
  }, [conflictDetectionEnabled]);

  // Calculate collaboration patterns
  const collaborationPatterns = useMemo<CollaborationPattern[]>(() => {
    const patterns: CollaborationPattern[] = [];
    
    for (let i = 0; i < mockPersonas.length; i++) {
      for (let j = i + 1; j < mockPersonas.length; j++) {
        const persona1 = mockPersonas[i];
        const persona2 = mockPersonas[j];
        
        const traits1 = persona1.personalityProfile?.bigFive;
        const traits2 = persona2.personalityProfile?.bigFive;
        
        if (traits1 && traits2) {
          const conscientiousnessAlign = 100 - Math.abs(traits1.conscientiousness - traits2.conscientiousness);
          const opennessComplement = Math.min(traits1.openness + traits2.openness, 100);
          const agreabilityAlign = 100 - Math.abs(traits1.agreeableness - traits2.agreeableness);
          
          const compatibilityScore = (conscientiousnessAlign + opennessComplement + agreabilityAlign) / 3;
          
          if (compatibilityScore > 70) {
            patterns.push({
              personas: [persona1.id, persona2.id],
              patternType: compatibilityScore > 85 ? 'highly_compatible' : 'complementary',
              successRate: Math.round(compatibilityScore),
              strengths: ['Aligned work styles', 'Complementary skills', 'Low conflict potential'],
              challenges: ['May need external perspective for innovation'],
              recommendations: ['Leverage natural compatibility for complex projects'],
            });
          }
        }
      }
    }
    
    return patterns;
  }, []);

  // Relationship statistics
  const relationshipStats = useMemo<RelationshipStats>(() => ({
    totalRelationships: relationships.length,
    averageStrength: relationships.reduce((sum, rel) => sum + rel.strength, 0) / relationships.length || 0,
    conflictCount: detectedConflicts.filter(c => c.severity === 'high' || c.severity === 'critical').length,
    collaborationOpportunities: collaborationPatterns.filter(p => p.patternType === 'highly_compatible').length,
    networkDensity: (relationships.length / (mockPersonas.length * (mockPersonas.length - 1) / 2)) * 100,
  }), [relationships, detectedConflicts, collaborationPatterns]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAddRelationship = () => {
    setSelectedRelationship(null);
    setShowRelationshipDialog(true);
  };

  return (
    <Box sx={{ width: '100%', height: '100vh', overflow: 'hidden', p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Persona Relationship Modeling
        </Typography>
        <Box display="flex" gap={1}>
          {isLoading && <LinearProgress sx={{ width: 200 }} />}
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            size="small"
            onClick={handleAddRelationship}
          >
            Add Relationship
          </Button>
          <IconButton size="small" onClick={() => window.location.reload()}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      <Paper
        sx={{
          height: 'calc(100vh - 180px)',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<RelationshipIcon />} label="Relationship Graph" />
          <Tab icon={<ConflictIcon />} label="Conflict Detection" />
          <Tab icon={<CollaborationIcon />} label="Collaboration Analysis" />
          <Tab icon={<AnalysisIcon />} label="Analytics Dashboard" />
        </Tabs>

        <Box sx={{ p: 3, height: 'calc(100% - 72px)', overflow: 'auto' }}>
          {activeTab === 0 && (
            <RelationshipGraph relationships={relationships} stats={relationshipStats} />
          )}
          {activeTab === 1 && (
            <ConflictDetectionPanel
              conflicts={detectedConflicts}
              detectionEnabled={conflictDetectionEnabled}
              onToggleDetection={setConflictDetectionEnabled}
            />
          )}
          {activeTab === 2 && (
            <CollaborationAnalysisPanel patterns={collaborationPatterns} />
          )}
          {activeTab === 3 && (
            <AnalyticsDashboard relationships={relationships} stats={relationshipStats} />
          )}
        </Box>
      </Paper>

      {/* Relationship Dialog */}
      <Dialog
        open={showRelationshipDialog}
        onClose={() => setShowRelationshipDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedRelationship ? 'Edit Relationship' : 'Add New Relationship'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={6}>
              <TextField select fullWidth label="From Persona" defaultValue="">
                {mockPersonas.map((persona) => (
                  <MenuItem key={persona.id} value={persona.id}>
                    {persona.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField select fullWidth label="To Persona" defaultValue="">
                {mockPersonas.map((persona) => (
                  <MenuItem key={persona.id} value={persona.id}>
                    {persona.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRelationshipDialog(false)}>Cancel</Button>
          <Button variant="contained">
            {selectedRelationship ? 'Update' : 'Add'} Relationship
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PersonaRelationshipModeling; 