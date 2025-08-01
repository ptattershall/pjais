# UI Foundation Implementation Plan

## Overview

This plan establishes the foundational UI infrastructure for PajamasWeb AI Hub, including Material-UI integration, theme system architecture, design tokens, and core layout components. This foundation supports all user interface features while maintaining consistency and scalability.

### Integration Points

- **Electron Renderer Process**: React UI integration with secure IPC
- **Component Library**: Base for all UI components
- **Theme System**: Consistent visual design across features
- **Performance Optimization**: Efficient rendering and resource usage

### User Stories

- As a developer, I want a consistent design system for building UI components
- As a user, I want a modern, intuitive interface that responds quickly
- As a designer, I want customizable themes and visual consistency
- As an accessibility user, I want proper contrast and keyboard navigation

## Architecture

### 1.1 Material-UI Foundation Architecture

```typescript
// Core theme configuration with MUI v5
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

interface AIHubTheme {
  // Extended MUI theme with AI Hub specific tokens
  aiHub: {
    personas: {
      active: string;
      inactive: string;
      background: string;
    };
    memory: {
      hot: string;
      warm: string;
      cold: string;
      importance: {
        high: string;
        medium: string;
        low: string;
      };
    };
    glass: {
      background: string;
      border: string;
      blur: number;
      opacity: number;
    };
    animations: {
      fast: number;
      normal: number;
      slow: number;
    };
  };
}

const createAIHubTheme = (mode: 'light' | 'dark'): AIHubTheme => {
  const baseTheme = createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#1976d2' : '#90caf9',
        light: mode === 'light' ? '#42a5f5' : '#bbdefb',
        dark: mode === 'light' ? '#1565c0' : '#5e92f3',
        contrastText: '#ffffff',
      },
      secondary: {
        main: mode === 'light' ? '#dc004e' : '#f48fb1',
        light: mode === 'light' ? '#e33371' : '#f8bbd9',
        dark: mode === 'light' ? '#9a0036' : '#c2185b',
        contrastText: '#ffffff',
      },
      background: {
        default: mode === 'light' ? '#f5f5f5' : '#121212',
        paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
      },
      text: {
        primary: mode === 'light' ? '#212121' : '#ffffff',
        secondary: mode === 'light' ? '#757575' : '#b3b3b3',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 600,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 500,
        lineHeight: 1.6,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
      // Custom typography variants for AI Hub
      personaTitle: {
        fontSize: '1.25rem',
        fontWeight: 500,
        letterSpacing: '0.02em',
        lineHeight: 1.4,
      },
      memoryLabel: {
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        lineHeight: 1.2,
      },
    } as any,
  });

  // Extend with AI Hub specific tokens
  return {
    ...baseTheme,
    aiHub: {
      personas: {
        active: mode === 'light' ? '#00c853' : '#69f0ae',
        inactive: mode === 'light' ? '#9e9e9e' : '#757575',
        background: mode === 'light' ? '#e8f5e8' : '#1b5e20',
      },
      memory: {
        hot: mode === 'light' ? '#ff5722' : '#ff8a65',
        warm: mode === 'light' ? '#ff9800' : '#ffb74d',
        cold: mode === 'light' ? '#607d8b' : '#90a4ae',
        importance: {
          high: mode === 'light' ? '#f44336' : '#ef5350',
          medium: mode === 'light' ? '#ff9800' : '#ffa726',
          low: mode === 'light' ? '#4caf50' : '#66bb6a',
        },
      },
      glass: {
        background: mode === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(30, 30, 30, 0.8)',
        border: mode === 'light' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
        blur: 10,
        opacity: 0.9,
      },
      animations: {
        fast: 150,
        normal: 300,
        slow: 500,
      },
    },
  };
};
```

### 1.2 Component Style Overrides

```typescript
// Custom component overrides for consistent AI Hub styling
const componentOverrides = {
  MuiCard: {
    styleOverrides: {
      root: ({ theme }: { theme: AIHubTheme }) => ({
        borderRadius: 12,
        boxShadow: theme.palette.mode === 'light' 
          ? '0 2px 8px rgba(0,0,0,0.1)' 
          : '0 2px 8px rgba(0,0,0,0.3)',
        border: `1px solid ${theme.palette.divider}`,
        transition: theme.transitions.create(['box-shadow', 'transform'], {
          duration: theme.aiHub.animations.normal,
        }),
        '&:hover': {
          boxShadow: theme.palette.mode === 'light'
            ? '0 4px 16px rgba(0,0,0,0.15)'
            : '0 4px 16px rgba(0,0,0,0.4)',
          transform: 'translateY(-1px)',
        },
      }),
    },
  },
  MuiButton: {
    styleOverrides: {
      root: ({ theme }: { theme: AIHubTheme }) => ({
        borderRadius: 8,
        textTransform: 'none',
        fontWeight: 500,
        transition: theme.transitions.create(['background-color', 'transform'], {
          duration: theme.aiHub.animations.fast,
        }),
        '&:active': {
          transform: 'scale(0.98)',
        },
      }),
      contained: ({ theme }: { theme: AIHubTheme }) => ({
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        '&:hover': {
          boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
        },
      }),
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: ({ theme }: { theme: AIHubTheme }) => ({
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
        },
      }),
    },
  },
  MuiChip: {
    styleOverrides: {
      root: ({ theme }: { theme: AIHubTheme }) => ({
        borderRadius: 16,
        fontWeight: 500,
      }),
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: ({ theme }: { theme: AIHubTheme }) => ({
        background: theme.aiHub.glass.background,
        backdropFilter: `blur(${theme.aiHub.glass.blur}px)`,
        borderBottom: `1px solid ${theme.aiHub.glass.border}`,
        boxShadow: 'none',
      }),
    },
  },
};
```

### 1.3 Glass Morphism Integration

```typescript
// Glass morphism components for modern visual appeal
import { styled } from '@mui/material/styles';

export const GlassCard = styled('div')(({ theme }: { theme: AIHubTheme }) => ({
  background: theme.aiHub.glass.background,
  backdropFilter: `blur(${theme.aiHub.glass.blur}px)`,
  border: `1px solid ${theme.aiHub.glass.border}`,
  borderRadius: 16,
  padding: theme.spacing(3),
  position: 'relative',
  overflow: 'hidden',
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: `linear-gradient(90deg, transparent, ${theme.aiHub.glass.border}, transparent)`,
  },
  
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.aiHub.animations.normal,
  }),
  
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.palette.mode === 'light'
      ? '0 8px 32px rgba(0,0,0,0.15)'
      : '0 8px 32px rgba(0,0,0,0.3)',
  },
}));

export const GlassPanel = styled('div')(({ theme }: { theme: AIHubTheme }) => ({
  background: theme.aiHub.glass.background,
  backdropFilter: `blur(${theme.aiHub.glass.blur}px)`,
  border: `1px solid ${theme.aiHub.glass.border}`,
  borderRadius: 12,
  padding: theme.spacing(2),
  minHeight: '100%',
}));
```

## Implementation Details

### 2.1 Application Shell Layout

The main application shell provides the foundational layout structure:

- **Top Navigation**: Global search, notifications, user menu
- **Side Navigation**: Main sections and persona list
- **Content Area**: Dynamic content based on current route
- **Glass Effects**: Modern visual styling with backdrop blur

### 2.2 Theme System

The theme system provides:

- **Light/Dark Mode**: Automatic or manual theme switching
- **AI-Specific Colors**: Persona status, memory importance, system states
- **Typography Scale**: Consistent text sizing and spacing
- **Component Overrides**: Custom styling for Material-UI components

### 2.3 Layout Components

Core layout components include:

- `AppShell`: Main application container
- `TopNavigation`: Header with search and user controls
- `SideNavigation`: Collapsible sidebar with main navigation
- `GlassCard`: Glass morphism card component
- `GlassPanel`: Glass morphism panel component

## Design System Foundation

### 3.1 Color Palette System

```typescript
// AI Hub specific color tokens
export const AIHubColors = {
  // Brand colors
  brand: {
    primary: '#1976d2',
    secondary: '#dc004e',
    accent: '#00c853',
  },
  
  // Semantic colors
  semantic: {
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
  },
  
  // AI-specific colors
  personas: {
    active: '#00c853',
    inactive: '#9e9e9e',
    processing: '#ff9800',
    error: '#f44336',
  },
  
  memory: {
    hot: '#ff5722',      // Recently accessed
    warm: '#ff9800',     // Moderately accessed
    cold: '#607d8b',     // Rarely accessed
    archived: '#9e9e9e', // Archived
  },
  
  importance: {
    critical: '#f44336',
    high: '#ff5722',
    medium: '#ff9800',
    low: '#4caf50',
    minimal: '#9e9e9e',
  },
};
```

### 3.2 Typography System

Consistent typography with custom variants:

- **Display**: Large headings for hero sections
- **Persona Title**: Styled titles for persona cards
- **Memory Label**: Small labels for memory categories
- **Status Label**: System status indicators

### 3.3 Spacing & Layout System

8px base unit system for consistent spacing:

- **Layout**: Navigation heights, sidebar widths, margins
- **Components**: Card padding, section spacing
- **Responsive**: Breakpoint-specific spacing adjustments

## Implementation Timeline

### Phase 1: Foundation Setup (Weeks 1-2)

- Material-UI installation and configuration
- Theme system implementation
- Basic layout components (AppShell, Navigation)
- Glass morphism components

### Phase 2: Design System (Weeks 3-4)

- Component style overrides
- Typography system completion
- Color palette implementation
- Spacing and layout tokens

### Phase 3: Layout Components (Weeks 5-6)

- Advanced navigation features
- Responsive layout improvements
- Glass effects optimization
- Theme switching functionality

### Phase 4: Testing & Polish (Weeks 7-8)

- Cross-browser testing
- Performance optimization
- Accessibility improvements
- Documentation completion

## Testing & Validation

### Visual Consistency Testing

- Component storybook for isolated testing
- Theme variation testing (light/dark)
- Cross-browser compatibility validation
- Visual regression testing

### Performance Requirements

- First paint time <500ms
- Theme switching <200ms
- Component render time <16ms (60fps)
- Bundle size optimization <2MB for foundation

### Accessibility Standards

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

This UI foundation provides a solid, scalable base for all PajamasWeb AI Hub interfaces while maintaining modern design standards and optimal performance.
