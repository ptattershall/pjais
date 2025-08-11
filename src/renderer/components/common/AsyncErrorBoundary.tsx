import React, { useState, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Box, CircularProgress, Typography } from '@mui/material';

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  onError?: (error: Error) => void;
  context?: string;
}

interface AsyncErrorBoundaryState {
  isLoading: boolean;
  error: Error | null;
}

// Hook for handling async errors in functional components
export function useAsyncErrorHandler() {
  const [state, setState] = useState<AsyncErrorBoundaryState>({
    isLoading: false,
    error: null,
  });

  const execute = async <T,>(
    asyncFn: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      setState({ isLoading: true, error: null });
      const result = await asyncFn();
      setState({ isLoading: false, error: null });
      return result;
    } catch (error) {
      const errorObj = error as Error;
      setState({ isLoading: false, error: errorObj });
      
      // Log error details
      console.error('Async operation failed:', {
        error: errorObj,
        context,
        timestamp: new Date().toISOString(),
      });

      // Send to main process if available
      if (window.electronAPI?.system && typeof (window.electronAPI.system as any).logError === 'function') {
        (window.electronAPI.system as any).logError({
          id: `async-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          error: {
            message: errorObj.message,
            stack: errorObj.stack,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            context,
          },
          context: context || 'Async Operation',
        });
      }

      return null;
    }
  };

  const reset = () => {
    setState({ isLoading: false, error: null });
  };

  return {
    ...state,
    execute,
    reset,
  };
}

// Component for wrapping async operations
export function AsyncErrorBoundary({
  children,
  fallback,
  loadingFallback,
  onError,
  context = 'AsyncOperation',
}: AsyncErrorBoundaryProps) {
  const [asyncState, setAsyncState] = useState<AsyncErrorBoundaryState>({
    isLoading: false,
    error: null,
  });

  const handleAsyncError = (error: Error) => {
    setAsyncState({ isLoading: false, error });
    onError?.(error);
  };

  const defaultLoadingFallback = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        padding: 3,
      }}
    >
      <CircularProgress size={48} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Loading...
      </Typography>
    </Box>
  );

  if (asyncState.isLoading) {
    return <>{loadingFallback || defaultLoadingFallback}</>;
  }

  if (asyncState.error) {
    return (
      <ErrorBoundary
        context={context}
        onError={handleAsyncError}
        fallback={fallback}
      >
        <Box sx={{ p: 2 }}>
          <Typography color="error">
            {asyncState.error.message}
          </Typography>
        </Box>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary
      context={context}
      onError={handleAsyncError}
      fallback={fallback}
    >
      {children}
    </ErrorBoundary>
  );
}

// Higher-order component for async error handling
export function withAsyncErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AsyncErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AsyncErrorBoundary {...options}>
      <Component {...props} />
    </AsyncErrorBoundary>
  );

  WrappedComponent.displayName = `withAsyncErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default AsyncErrorBoundary;
