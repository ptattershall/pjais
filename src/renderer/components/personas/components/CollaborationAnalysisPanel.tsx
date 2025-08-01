import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { CollaborationPattern } from '../types/relationship-types';
import { mockPersonas } from '../utils/mock-data';

interface CollaborationAnalysisPanelProps {
  patterns: CollaborationPattern[];
}

export const CollaborationAnalysisPanel: React.FC<CollaborationAnalysisPanelProps> = ({
  patterns,
}) => {
  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        Collaboration Pattern Analysis
      </Typography>

      {patterns.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography>
            No strong collaboration patterns detected. Consider developing more diverse persona relationships.
          </Typography>
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {patterns.map((pattern, index) => {
            const persona1 = mockPersonas.find(p => p.id === pattern.personas[0]);
            const persona2 = mockPersonas.find(p => p.id === pattern.personas[1]);
            
            return (
              <Grid size={{ xs: 12, md: 6 }} key={index}>
                <Card
                  sx={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                          <StarIcon sx={{ fontSize: 14 }} />
                        </Avatar>
                        <Typography variant="h6">
                          {persona1?.name} + {persona2?.name}
                        </Typography>
                      </Box>
                      <Chip
                        label={pattern.patternType.replace('_', ' ')}
                        color={pattern.patternType === 'highly_compatible' ? 'success' : 'primary'}
                        size="small"
                      />
                    </Box>

                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Success Rate: {pattern.successRate}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={pattern.successRate}
                        sx={{ mt: 1 }}
                      />
                    </Box>

                    <Typography variant="subtitle2" gutterBottom>
                      Strengths:
                    </Typography>
                    <List dense sx={{ mb: 1 }}>
                      {pattern.strengths.slice(0, 2).map((strength, idx) => (
                        <ListItem key={idx} sx={{ py: 0.25 }}>
                          <ListItemIcon sx={{ minWidth: 20 }}>
                            <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={strength} 
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>

                    {pattern.recommendations.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Key Recommendation:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {pattern.recommendations[0]}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}; 