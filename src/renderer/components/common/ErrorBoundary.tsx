import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Alert, 
  AlertTitle, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Chip,
  Stack
} from '@mui/material';
import { 
  ErrorOutline, 
  Refresh, 
  BugReport, 
  ExpandMore,
  Info
} from '@mui/icons-material';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  timestamp: number;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  maxRetries?: number;
  context?: string;
}

interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  timestamp: string;
  url: string;
  context?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: Set<NodeJS.Timeout> = new Set();

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      timestamp: 0,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    return {
      hasError: true,
      error,
      errorId,
      timestamp: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error details
    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack ?? undefined,
      componentStack: errorInfo.componentStack ?? undefined,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      context: this.props.context,
    };

    console.error('Error Boundary caught an error:', errorDetails);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to IPC if available
    if (window.electronAPI?.system && typeof (window.electronAPI.system as any).logError === 'function') {
      (window.electronAPI.system as any).logError({
        id: this.state.errorId,
        error: errorDetails,
        context: this.props.context || 'Unknown',
      });
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  handleReload = () => {
    if (window.electronAPI?.system && typeof (window.electronAPI.system as any).reload === 'function') {
      (window.electronAPI.system as any).reload();
    } else {
      window.location.reload();
    }
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    if (!error) return;

    const errorReport = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      context: this.props.context,
    };

    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
    
    // Show notification if available
    if (window.electronAPI?.system && typeof (window.electronAPI.system as any).showNotification === 'function') {
      (window.electronAPI.system as any).showNotification({
        title: 'Error Report Copied',
        body: 'Error details have been copied to clipboard',
        type: 'info',
      });
    }
  };

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallback, showDetails = true, maxRetries = 3 } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            padding: 3,
            textAlign: 'center',
          }}
        >
          <ErrorOutline sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          
          <Typography variant="h4" gutterBottom>
            Something went wrong
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {error.message || 'An unexpected error occurred'}
          </Typography>

          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Chip 
              label={`Error ID: ${this.state.errorId}`} 
              variant="outlined" 
              size="small"
              icon={<Info />}
            />
            {retryCount > 0 && (
              <Chip 
                label={`Retry ${retryCount}/${maxRetries}`} 
                variant="outlined" 
                size="small"
                color="warning"
              />
            )}
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            {retryCount < maxRetries && (
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleRetry}
                color="primary"
              >
                Try Again
              </Button>
            )}
            
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={this.handleReload}
            >
              Reload Page
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<BugReport />}
              onClick={this.handleReportError}
            >
              Report Error
            </Button>
          </Stack>

          {showDetails && (
            <Box sx={{ width: '100%', maxWidth: 800 }}>
              <Alert severity="error" sx={{ mb: 2 }}>
                <AlertTitle>Error Details</AlertTitle>
                <Typography variant="body2">
                  Component: {this.props.context || 'Unknown'}
                </Typography>
                <Typography variant="body2">
                  Time: {new Date(this.state.timestamp).toLocaleString()}
                </Typography>
              </Alert>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>Technical Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Error Message:
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace', 
                        backgroundColor: 'grey.100',
                        padding: 1,
                        borderRadius: 1,
                        mb: 2,
                      }}
                    >
                      {error.message}
                    </Typography>

                    {error.stack && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          Stack Trace:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace', 
                            backgroundColor: 'grey.100',
                            padding: 1,
                            borderRadius: 1,
                            mb: 2,
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {error.stack}
                        </Typography>
                      </>
                    )}

                    {errorInfo?.componentStack && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          Component Stack:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace', 
                            backgroundColor: 'grey.100',
                            padding: 1,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {errorInfo.componentStack}
                        </Typography>
                      </>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </Box>
      );
    }

    return children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for error reporting in functional components
export function useErrorHandler() {
  const reportError = React.useCallback((error: Error, context?: string) => {
    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack ?? undefined,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      context,
    };

    console.error('Manual error report:', errorDetails);
    
    if (window.electronAPI?.system && typeof (window.electronAPI.system as any).logError === 'function') {
      (window.electronAPI.system as any).logError({
        id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        error: errorDetails,
        context: context || 'Manual Report',
      });
    }
  }, []);

  const handleAsyncError = React.useCallback((asyncFn: () => Promise<void>, context?: string) => {
    return async () => {
      try {
        await asyncFn();
      } catch (error) {
        reportError(error as Error, context);
      }
    };
  }, [reportError]);

  return { reportError, handleAsyncError };
}

export default ErrorBoundary;
