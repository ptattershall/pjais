import React, { lazy, useState, useEffect } from 'react';
import { Box, Grid, Fade, Typography } from '@mui/material';
import {
  Memory as MemoryIcon,
  Person as PersonaIcon,
  Extension as PluginIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

// Common components (loaded immediately)
import { MetricCard, SystemInfoCard, QuickActionsCard } from './components';
import { LoadingBoundary } from '../common/LoadingBoundary';
import { ErrorBoundary } from '../common/ErrorBoundary';

// Lazy-loaded components for better performance
const PersonaIntegrationTest = lazy(() => import('./components/PersonaIntegrationTest'));
const MemoryIntegrationTest = lazy(() => import('./components/MemoryIntegrationTest'));

// Simulate a lazy-loaded persistence test component
const PersistenceTest = lazy(() => 
  import('./components/PersonaIntegrationTest').then(module => ({
    default: React.memo(() => {
      return (
        <div>
          <Typography variant="h6">Persistence Test</Typography>
          <Typography variant="body2">Test persistence functionality here...</Typography>
        </div>
      );
    })
  }))
);

interface DashboardMetrics {
  personas: number;
  memories: number;
  plugins: number;
  security: number;
}

export const DashboardOverview: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    personas: 0,
    memories: 0,
    plugins: 0,
    security: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      try {
        // Simulate loading metrics
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // In a real app, you would fetch actual metrics here
        setMetrics({
          personas: 5,
          memories: 142,
          plugins: 3,
          security: 8,
        });
      } catch (error) {
        console.error('Failed to load dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  const handleQuickAction = (action: string) => {
    console.log('Quick action clicked:', action);
    // Handle navigation or action here
  };

  return (
    <ErrorBoundary>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Fade in={!loading} timeout={500}>
          <Box>
            {/* Metrics Overview */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Active Personas"
                  value={metrics.personas}
                  subtitle="AI personalities"
                  icon={<PersonaIcon />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Stored Memories"
                  value={metrics.memories}
                  subtitle="Conversation history"
                  icon={<MemoryIcon />}
                  color="secondary"
                  progress={75}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Active Plugins"
                  value={metrics.plugins}
                  subtitle="Extensions loaded"
                  icon={<PluginIcon />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Security Score"
                  value={metrics.security}
                  subtitle="Out of 10"
                  icon={<SecurityIcon />}
                  color="warning"
                  progress={80}
                />
              </Grid>
            </Grid>

            {/* Secondary Grid */}
            <Grid container spacing={3}>
              {/* Left Column */}
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <SystemInfoCard />
                  <QuickActionsCard onAction={handleQuickAction} />
                </Box>
              </Grid>

              {/* Right Column - Lazy-loaded integration tests */}
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Integration Tests
                  </Typography>
                  
                  <ErrorBoundary>
                    <LoadingBoundary minHeight={100}>
                      <PersonaIntegrationTest />
                    </LoadingBoundary>
                  </ErrorBoundary>

                  <ErrorBoundary>
                    <LoadingBoundary minHeight={100}>
                      <MemoryIntegrationTest />
                    </LoadingBoundary>
                  </ErrorBoundary>

                  <ErrorBoundary>
                    <LoadingBoundary minHeight={100}>
                      <PersistenceTest />
                    </LoadingBoundary>
                  </ErrorBoundary>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Fade>
      </Box>
    </ErrorBoundary>
  );
};

export default DashboardOverview;