import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Alert
} from '@mui/material';
import {
  Extension as PluginIcon,
  Add as AddIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

export const PluginManagement: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Plugin Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and configure AI plugins and extensions
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Plugin system is under development. This feature will allow you to install and manage AI plugins.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <PluginIcon color="primary" />
                <Typography variant="h6">Installed Plugins</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No plugins currently installed
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                disabled
              >
                Install Plugin
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <SettingsIcon color="primary" />
                <Typography variant="h6">Plugin Settings</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Configure plugin permissions and behavior
              </Typography>
              <Button
                variant="outlined"
                disabled
              >
                Configure
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 