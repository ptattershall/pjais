import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
} from '@mui/material';
import {
  TrendingUp as TrendIcon,
  Group as CollaborationIcon,
  Warning as ConflictIcon,
  Psychology as AnalysisIcon,
} from '@mui/icons-material';
import { PersonaRelationship, RelationshipStats } from '../types/relationship-types';

interface AnalyticsDashboardProps {
  relationships: PersonaRelationship[];
  stats: RelationshipStats;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  relationships,
  stats,
}) => {
  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        Relationship Analytics Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card
            sx={{
              background: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" color="success.main">
                {stats.totalRelationships}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Relationships
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card
            sx={{
              background: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)',
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <CollaborationIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" color="primary.main">
                {stats.collaborationOpportunities}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                High-Potential Pairs
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card
            sx={{
              background: 'rgba(255, 152, 0, 0.1)',
              border: '1px solid rgba(255, 152, 0, 0.3)',
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <ConflictIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" color="warning.main">
                {stats.conflictCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Risk Areas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card
            sx={{
              background: 'rgba(156, 39, 176, 0.1)',
              border: '1px solid rgba(156, 39, 176, 0.3)',
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <AnalysisIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h4" color="secondary.main">
                {stats.networkDensity.toFixed(0)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Network Density
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper
            sx={{
              p: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Relationship Quality Distribution
            </Typography>
            
            <Box display="flex" gap={2} flexWrap="wrap" mt={2}>
              {['excellent', 'good', 'neutral', 'poor', 'problematic'].map((quality) => {
                const count = relationships.filter(r => r.quality === quality).length;
                const percentage = relationships.length > 0 ? (count / relationships.length) * 100 : 0;
                
                return (
                  <Box key={quality} display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        bgcolor: quality === 'excellent' ? 'success.main' :
                               quality === 'good' ? 'primary.main' :
                               quality === 'neutral' ? 'warning.main' :
                               quality === 'poor' ? 'error.light' : 'error.main',
                      }}
                    />
                    <Typography variant="body2">
                      {quality}: {count} ({percentage.toFixed(0)}%)
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}; 