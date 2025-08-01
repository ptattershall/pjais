import React from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { ConflictDetection } from '../types/relationship-types';
import { mockPersonas } from '../utils/mock-data';

interface ConflictDetectionPanelProps {
  conflicts: ConflictDetection[];
  detectionEnabled: boolean;
  onToggleDetection: (enabled: boolean) => void;
}

export const ConflictDetectionPanel: React.FC<ConflictDetectionPanelProps> = ({
  conflicts,
  detectionEnabled,
  onToggleDetection,
}) => {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" component="h3">
          Conflict Detection & Resolution
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={detectionEnabled}
              onChange={(e) => onToggleDetection(e.target.checked)}
            />
          }
          label="Auto-detect conflicts"
        />
      </Box>

      {conflicts.length === 0 ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <SuccessIcon />
            <Typography>No significant conflicts detected between personas.</Typography>
          </Box>
        </Alert>
      ) : (
        <Box mb={3}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography>
              {conflicts.length} potential conflicts detected. Review recommendations below.
            </Typography>
          </Alert>
          
          {conflicts.map((conflict, index) => {
            const persona1 = mockPersonas.find(p => p.id === conflict.personas[0]);
            const persona2 = mockPersonas.find(p => p.id === conflict.personas[1]);
            
            return (
              <Accordion key={index} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={2} width="100%">
                    <Chip
                      label={conflict.severity}
                      color={
                        conflict.severity === 'critical' ? 'error' :
                        conflict.severity === 'high' ? 'warning' : 'default'
                      }
                      size="small"
                    />
                    <Typography>
                      {persona1?.name} ↔ {persona2?.name}
                    </Typography>
                    <Box flexGrow={1} />
                    <Typography variant="body2" color="text.secondary">
                      {conflict.conflictType}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>{conflict.description}</Typography>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Affected Traits:
                  </Typography>
                  <Box display="flex" gap={1} mb={2}>
                    {conflict.affectedTraits.map((trait) => (
                      <Chip key={trait} label={trait} size="small" variant="outlined" />
                    ))}
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Recommendations:
                  </Typography>
                  <List dense>
                    {conflict.recommendations.map((rec, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon>
                          <InfoIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={rec} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
    </Box>
  );
}; 