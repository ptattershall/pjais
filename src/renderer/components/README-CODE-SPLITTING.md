# Code Splitting Implementation

This document describes the code splitting implementation for the PJAIS application to improve performance and reduce bundle size.

## Overview

The code splitting implementation follows modern React best practices with Vite bundler optimization, breaking down large components into smaller, lazy-loaded chunks.

## Architecture

### 1. Core Components (Always Loaded)
- **ErrorBoundary** - Error handling wrapper
- **LoadingBoundary** - Suspense wrapper with loading states
- **MetricCard** - Reusable metric display component
- **SystemInfoCard** - System information display

### 2. Lazy-Loaded Components
- **PersonaIntegrationTest** - Heavy integration test component
- **MemoryIntegrationTest** - Memory system test component
- **PersonalityTraitEditor** - Advanced personality editing
- **PersonalityTemplateSelector** - Template selection interface
- **DashboardOverviewRefactored** - Main dashboard (route-level lazy loading)

## Implementation Details

### Component Structure

```
src/renderer/components/
├── common/
│   ├── ErrorBoundary.tsx        # Error boundary wrapper
│   └── LoadingBoundary.tsx      # Suspense wrapper
├── dashboard/
│   ├── components/
│   │   ├── MetricCard.tsx       # Core metric display
│   │   ├── SystemInfoCard.tsx   # System info display
│   │   ├── QuickActionsCard.tsx # Quick actions panel
│   │   ├── PersonaIntegrationTest.tsx  # Lazy-loaded
│   │   ├── MemoryIntegrationTest.tsx   # Lazy-loaded
│   │   └── index.ts
│   ├── DashboardOverview.tsx              # Original (1008 lines)
│   └── DashboardOverviewRefactored.tsx    # Refactored with code splitting
└── personas/
    ├── components/
    │   ├── PersonalityTraitEditor.tsx     # Lazy-loaded
    │   ├── PersonalityTemplateSelector.tsx # Lazy-loaded
    │   ├── BigFiveEditor.tsx              # Core component
    │   └── index.ts
    ├── PersonaAdvancedPersonalityEditor.tsx        # Original (830 lines)
    └── PersonaAdvancedPersonalityEditorRefactored.tsx # Refactored
```

### Lazy Loading Pattern

```typescript
// Lazy import
const PersonaIntegrationTest = lazy(() => import('./components/PersonaIntegrationTest'));

// Usage with error boundary and loading state
<ErrorBoundary>
  <LoadingBoundary minHeight={100}>
    <PersonaIntegrationTest />
  </LoadingBoundary>
</ErrorBoundary>
```

### Vite Configuration

```typescript
// vite.renderer.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          
          // Feature chunks
          dashboard: [
            'src/renderer/components/dashboard/components/MetricCard',
            'src/renderer/components/dashboard/components/SystemInfoCard',
            'src/renderer/components/dashboard/components/QuickActionsCard'
          ],
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

## Performance Benefits

### Before Code Splitting
- **DashboardOverview.tsx**: 1008 lines, ~45KB
- **PersonaAdvancedPersonalityEditor.tsx**: 830 lines, ~38KB
- **MemoryAdvancedSearchRefactored.tsx**: 716 lines, ~32KB
- **Total large components**: ~115KB in initial bundle

### After Code Splitting
- **Initial bundle**: Contains only essential components
- **Lazy chunks**: Components loaded on-demand
- **Reduced initial load time**: 40-60% improvement estimated
- **Better caching**: Individual components can be cached separately

## Usage Examples

### 1. Basic Lazy Loading

```typescript
import { lazy } from 'react';
import { LoadingBoundary } from '../common/LoadingBoundary';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export const ParentComponent = () => (
  <LoadingBoundary>
    <HeavyComponent />
  </LoadingBoundary>
);
```

### 2. With Error Boundaries

```typescript
import { ErrorBoundary } from '../common/ErrorBoundary';

export const SafeComponent = () => (
  <ErrorBoundary>
    <LoadingBoundary minHeight={200}>
      <LazyComponent />
    </LoadingBoundary>
  </ErrorBoundary>
);
```

### 3. Conditional Lazy Loading

```typescript
const ConditionalComponent = lazy(() => {
  if (condition) {
    return import('./ComponentA');
  }
  return import('./ComponentB');
});
```

## Best Practices

### 1. Component Size Thresholds
- **Lazy load components >30KB** (post-minification)
- **Keep core components <10KB** each
- **Monitor bundle size** with build tools

### 2. Loading States
- **Always provide loading fallbacks**
- **Use skeleton components** for better UX
- **Implement error boundaries** for graceful failures

### 3. Chunk Organization
- **Group related components** in manual chunks
- **Separate vendor libraries** from app code
- **Use descriptive chunk names**

## Migration Guide

### Converting Large Components

1. **Identify sections** that can be extracted
2. **Create separate component files**
3. **Add lazy imports** where appropriate
4. **Wrap with LoadingBoundary** and ErrorBoundary
5. **Test loading states** and error scenarios

### Example Migration

```typescript
// Before: Large component (800+ lines)
export const LargeComponent = () => {
  // 800+ lines of code
  return <div>...</div>;
};

// After: Refactored with code splitting
const Section1 = lazy(() => import('./components/Section1'));
const Section2 = lazy(() => import('./components/Section2'));

export const RefactoredComponent = () => (
  <div>
    <CoreSection /> {/* Always loaded */}
    <LoadingBoundary>
      <Section1 /> {/* Lazy loaded */}
    </LoadingBoundary>
    <LoadingBoundary>
      <Section2 /> {/* Lazy loaded */}
    </LoadingBoundary>
  </div>
);
```

## Monitoring and Analysis

### Bundle Analysis
```bash
# Build with analysis
npm run build

# Check dist-renderer/chunks/ for chunk sizes
ls -la dist-renderer/chunks/
```

### Performance Metrics
- **Initial bundle size**: Monitor main chunk size
- **Lazy chunk sizes**: Keep individual chunks manageable
- **Loading performance**: Measure time to interactive
- **Network requests**: Balance between chunks and requests

## Future Improvements

1. **Route-based code splitting** with React Router
2. **Component-level lazy loading** for heavy UI components
3. **Dynamic imports** based on user interactions
4. **Progressive enhancement** for non-critical features
5. **Service worker** for intelligent prefetching

## Testing

### Unit Tests
- Test lazy components in isolation
- Mock React.lazy for testing
- Test error boundary scenarios

### Integration Tests
- Test loading states
- Test error recovery
- Test chunk loading performance

### Performance Tests
- Measure bundle sizes
- Test loading times
- Monitor memory usage

## Conclusion

This code splitting implementation significantly improves the application's performance by:
- Reducing initial bundle size
- Enabling on-demand loading
- Improving caching efficiency
- Providing better user experience with loading states

The implementation is modular, maintainable, and follows React/Vite best practices for production applications.