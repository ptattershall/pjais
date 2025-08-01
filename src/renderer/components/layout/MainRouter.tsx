import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';

// Import all main components
import DashboardOverview from '../dashboard/DashboardOverview';
import { PersonaManagement } from '../personas/PersonaManagement';
import { MemoryExplorer } from '../memory/MemoryExplorer';

// Lazy load other components for better performance
const PluginManagement = React.lazy(() => import('../plugins/PluginManagement').then(module => ({ default: module.PluginManagement })));
const SecurityDashboard = React.lazy(() => import('../admin/SecurityDashboard'));
const SettingsPanel = React.lazy(() => import('../settings/SettingsPanel'));

type Route = 'dashboard' | 'personas' | 'memory' | 'plugins' | 'security' | 'settings';

interface MainRouterProps {
  currentRoute: Route;
  userId: string;
}

export const MainRouter: React.FC<MainRouterProps> = ({ currentRoute, userId }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Simulate loading time for route transitions
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, [currentRoute]);

  const renderComponent = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <DashboardOverview />;
      
      case 'personas':
        return <PersonaManagement userId={userId} />;
      
      case 'memory':
        return <MemoryExplorer userId={userId} />;
      
      case 'plugins':
        return (
          <React.Suspense fallback={<Box sx={{ p: 3 }}>Loading Plugins...</Box>}>
            <PluginManagement />
          </React.Suspense>
        );
      
      case 'security':
        return (
          <React.Suspense fallback={<Box sx={{ p: 3 }}>Loading Security...</Box>}>
            <SecurityDashboard />
          </React.Suspense>
        );
      
      case 'settings':
        return (
          <React.Suspense fallback={<Box sx={{ p: 3 }}>Loading Settings...</Box>}>
            <SettingsPanel />
          </React.Suspense>
        );
      
      default:
        return <DashboardOverview />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          Loading...
        </Box>
      </Box>
    );
  }

  return renderComponent();
}; 