import React, { lazy, useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppShell } from './components/layout';
import { MainRouter } from './components/layout/MainRouter';
import { LoadingBoundary } from './components/common/LoadingBoundary';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ErrorBoundaryProvider } from './components/common/ErrorBoundaryProvider';

type Route = 'dashboard' | 'personas' | 'memory' | 'plugins' | 'security' | 'settings';

const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<Route>('dashboard');
  const [userId] = useState('user-1'); // In a real app, this would come from authentication

  const handleNavigation = (route: Route) => {
    setCurrentRoute(route);
  };

  return (
    <ErrorBoundaryProvider
      onError={(error, context) => {
        console.error('Global error handler:', error, context);
          // Additional global error handling logic can be added here
        }}
      >
        <ThemeProvider>
          <ErrorBoundary 
            context="App"
            showDetails={true}
            maxRetries={3}
            onError={(error, errorInfo) => {
              console.error('App-level error:', error, errorInfo);
              // Additional error handling logic can be added here
            }}
          >
            <AppShell onNavigation={handleNavigation} currentRoute={currentRoute}>
              <LoadingBoundary minHeight={400}>
                <MainRouter currentRoute={currentRoute} userId={userId} />
              </LoadingBoundary>
            </AppShell>
          </ErrorBoundary>
        </ThemeProvider>
      </ErrorBoundaryProvider>
  );
};

export default App; 