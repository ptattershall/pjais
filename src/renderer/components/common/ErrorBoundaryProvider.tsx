import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface ErrorBoundaryContextType {
  reportError: (error: Error, context?: string) => void;
  clearErrors: () => void;
  errors: ErrorReport[];
}

interface ErrorReport {
  id: string;
  error: Error;
  context?: string;
  timestamp: number;
  resolved: boolean;
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextType | undefined>(undefined);

interface ErrorBoundaryProviderProps {
  children: ReactNode;
  onError?: (error: Error, context?: string) => void;
}

export function ErrorBoundaryProvider({ children, onError }: ErrorBoundaryProviderProps) {
  const [errors, setErrors] = useState<ErrorReport[]>([]);

  const reportError = useCallback((error: Error, context?: string) => {
    const errorReport: ErrorReport = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      error,
      context,
      timestamp: Date.now(),
      resolved: false,
    };

    setErrors(prev => [...prev, errorReport]);
    onError?.(error, context);

    // Send to main process
    if (window.electronAPI?.system?.logError) {
      window.electronAPI.system.logError({
        id: errorReport.id,
        error: {
          message: error.message,
          stack: error.stack,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          context,
        },
        context: context || 'Global Error Handler',
      });
    }
  }, [onError]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const contextValue: ErrorBoundaryContextType = {
    reportError,
    clearErrors,
    errors,
  };

  return (
    <ErrorBoundaryContext.Provider value={contextValue}>
      <ErrorBoundary
        context="ErrorBoundaryProvider"
        onError={(error, errorInfo) => {
          reportError(error, 'ErrorBoundaryProvider');
          console.error('Global error boundary:', error, errorInfo);
        }}
      >
        {children}
      </ErrorBoundary>
    </ErrorBoundaryContext.Provider>
  );
}

export function useErrorBoundary() {
  const context = useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error('useErrorBoundary must be used within an ErrorBoundaryProvider');
  }
  return context;
}

// Higher-order component for automatic error boundary wrapping
export function withErrorBoundaryProvider<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProviderProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryProvider {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundaryProvider>
  );

  WrappedComponent.displayName = `withErrorBoundaryProvider(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default ErrorBoundaryProvider;