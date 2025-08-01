import React, { Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: number;
}

const DefaultFallback: React.FC<{ minHeight?: number }> = ({ minHeight = 200 }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: minHeight,
      gap: 2,
    }}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="text.secondary">
      Loading component...
    </Typography>
  </Box>
);

export const LoadingBoundary: React.FC<LoadingBoundaryProps> = ({
  children,
  fallback,
  minHeight = 200,
}) => {
  return (
    <Suspense fallback={fallback || <DefaultFallback minHeight={minHeight} />}>
      {children}
    </Suspense>
  );
};

export default LoadingBoundary;