import React, { Suspense, type ReactNode } from 'react';
import { CircularProgress, Box } from '@mui/material';

interface LoadingBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  message?: string;
}

export const LoadingBoundary: React.FC<LoadingBoundaryProps> = ({ 
  children, 
  fallback,
  message = 'Loading...'
}) => {
  const defaultFallback = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="200px"
      gap={2}
    >
      <CircularProgress />
      {message && <Box component="span">{message}</Box>}
    </Box>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

export default LoadingBoundary;
