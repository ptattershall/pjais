import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Storage as StorageIcon
} from '@mui/icons-material';

export const SettingsPanel: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure application preferences and behavior
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Settings panel is under development. More configuration options will be available soon.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <NotificationsIcon color="primary" />
                <Typography variant="h6">Notifications</Typography>
              </Box>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Enable notifications"
              />
              <FormControlLabel
                control={<Switch />}
                label="Sound alerts"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <SecurityIcon color="primary" />
                <Typography variant="h6">Privacy</Typography>
              </Box>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Data encryption"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Auto-lock after inactivity"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <StorageIcon color="primary" />
                <Typography variant="h6">Storage</Typography>
              </Box>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Auto-cleanup old memories"
              />
              <FormControlLabel
                control={<Switch />}
                label="Compress data"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <SettingsIcon color="primary" />
                <Typography variant="h6">General</Typography>
              </Box>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Auto-save changes"
              />
              <FormControlLabel
                control={<Switch />}
                label="Debug mode"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 