import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  Chip
} from '@mui/material';
import {
  Security as SecurityIcon,
  CheckCircle as SecureIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

export const SecurityDashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Security Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor and manage security settings
        </Typography>
      </Box>

      <Alert severity="success" sx={{ mb: 3 }}>
        All security systems are operational and up to date.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <SecureIcon color="success" />
                <Typography variant="h6">Encryption</Typography>
              </Box>
              <Chip label="AES-256-GCM" color="success" size="small" />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                All data is encrypted at rest and in transit
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <SecurityIcon color="primary" />
                <Typography variant="h6">Privacy</Typography>
              </Box>
              <Chip label="GDPR Compliant" color="success" size="small" />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Full privacy controls and data protection
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <WarningIcon color="warning" />
                <Typography variant="h6">Sandboxing</Typography>
              </Box>
              <Chip label="Active" color="success" size="small" />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Plugin sandboxing and isolation enabled
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 