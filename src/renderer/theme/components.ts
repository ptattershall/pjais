import { Components, Theme } from '@mui/material/styles';
import { glassTokens } from './palette';

export const createComponents = (theme: Theme): Components<Theme> => ({
  // Global styles
  MuiCssBaseline: {
    styleOverrides: {
      '*': {
        boxSizing: 'border-box',
      },
      html: {
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        height: '100%',
        width: '100%',
      },
      body: {
        height: '100%',
        width: '100%',
        margin: 0,
        padding: 0,
        // Glass morphism background
        background: theme.palette.mode === 'light' 
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        backgroundAttachment: 'fixed',
      },
      '#root': {
        height: '100%',
        width: '100%',
      },
      // Custom scrollbar
      '::-webkit-scrollbar': {
        width: '8px',
      },
      '::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '::-webkit-scrollbar-thumb': {
        background: theme.palette.mode === 'light' 
          ? 'rgba(0, 0, 0, 0.2)' 
          : 'rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        '&:hover': {
          background: theme.palette.mode === 'light' 
            ? 'rgba(0, 0, 0, 0.3)' 
            : 'rgba(255, 255, 255, 0.3)',
        },
      },
    },
  },

  // Paper with glass morphism
  MuiPaper: {
    styleOverrides: {
      root: {
        backdropFilter: glassTokens[theme.palette.mode].backdrop.blur,
        background: glassTokens[theme.palette.mode].background.glass,
        border: `1px solid ${glassTokens[theme.palette.mode].border.glass}`,
        boxShadow: glassTokens[theme.palette.mode].shadow.glass,
      },
    },
    variants: [
      {
        props: { variant: 'glass' },
        style: {
          background: glassTokens[theme.palette.mode].background.glassSubtle,
          backdropFilter: glassTokens[theme.palette.mode].backdrop.blurSubtle,
          border: `1px solid ${glassTokens[theme.palette.mode].border.glass}`,
          boxShadow: glassTokens[theme.palette.mode].shadow.glass,
        },
      },
      {
        props: { variant: 'glassStrong' },
        style: {
          background: glassTokens[theme.palette.mode].background.glassStrong,
          backdropFilter: glassTokens[theme.palette.mode].backdrop.blurStrong,
          border: `1px solid ${glassTokens[theme.palette.mode].border.glassStrong}`,
          boxShadow: glassTokens[theme.palette.mode].shadow.glassElevated,
        },
      },
    ],
  },

  // Button improvements
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
        textTransform: 'none',
        fontWeight: 500,
        padding: '12px 24px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: theme.palette.mode === 'light'
            ? '0 4px 12px rgba(0, 0, 0, 0.15)'
            : '0 4px 12px rgba(0, 0, 0, 0.3)',
        },
        '&:active': {
          transform: 'translateY(0)',
        },
      },
      contained: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        '&:hover': {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    variants: [
      {
        props: { variant: 'glass' },
        style: {
          background: glassTokens[theme.palette.mode].background.glass,
          backdropFilter: glassTokens[theme.palette.mode].backdrop.blur,
          border: `1px solid ${glassTokens[theme.palette.mode].border.glass}`,
          color: theme.palette.text.primary,
          '&:hover': {
            background: glassTokens[theme.palette.mode].background.glassHover,
          },
        },
      },
    ],
  },

  // Card with glass effect
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: '16px',
        background: glassTokens[theme.palette.mode].background.glass,
        backdropFilter: glassTokens[theme.palette.mode].backdrop.blur,
        border: `1px solid ${glassTokens[theme.palette.mode].border.glass}`,
        boxShadow: glassTokens[theme.palette.mode].shadow.glass,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          background: glassTokens[theme.palette.mode].background.glassHover,
          transform: 'translateY(-2px)',
          boxShadow: glassTokens[theme.palette.mode].shadow.glassElevated,
        },
      },
    },
  },

  // AppBar with glass effect
  MuiAppBar: {
    styleOverrides: {
      root: {
        background: glassTokens[theme.palette.mode].background.glass,
        backdropFilter: glassTokens[theme.palette.mode].backdrop.blur,
        border: 'none',
        borderBottom: `1px solid ${glassTokens[theme.palette.mode].border.glass}`,
        boxShadow: 'none',
        color: theme.palette.text.primary,
      },
    },
  },

  // Drawer with glass effect
  MuiDrawer: {
    styleOverrides: {
      paper: {
        background: glassTokens[theme.palette.mode].background.glass,
        backdropFilter: glassTokens[theme.palette.mode].backdrop.blur,
        border: `1px solid ${glassTokens[theme.palette.mode].border.glass}`,
        boxShadow: glassTokens[theme.palette.mode].shadow.glass,
      },
    },
  },

  // Typography enhancements
  MuiTypography: {
    variants: [
      {
        props: { variant: 'code' },
        style: {
          fontFamily: '"Fira Code", "JetBrains Mono", Consolas, monospace',
          fontSize: '0.875rem',
          background: theme.palette.mode === 'light' 
            ? 'rgba(0, 0, 0, 0.05)' 
            : 'rgba(255, 255, 255, 0.05)',
          padding: '2px 6px',
          borderRadius: '4px',
          border: `1px solid ${theme.palette.divider}`,
        },
      },
      {
        props: { variant: 'displayLarge' },
        style: {
          fontSize: '3.5rem',
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: '-0.025em',
        },
      },
      {
        props: { variant: 'displayMedium' },
        style: {
          fontSize: '2.875rem',
          fontWeight: 600,
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
        },
      },
    ],
  },

  // Chip with glass effect
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: '16px',
        background: glassTokens[theme.palette.mode].background.glassSubtle,
        backdropFilter: glassTokens[theme.palette.mode].backdrop.blurSubtle,
        border: `1px solid ${glassTokens[theme.palette.mode].border.glass}`,
      },
    },
  },

  // TextField improvements
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: '12px',
          background: glassTokens[theme.palette.mode].background.glassSubtle,
          backdropFilter: glassTokens[theme.palette.mode].backdrop.blurSubtle,
          '& fieldset': {
            border: `1px solid ${glassTokens[theme.palette.mode].border.glass}`,
          },
          '&:hover fieldset': {
            border: `1px solid ${theme.palette.primary.main}`,
          },
          '&.Mui-focused fieldset': {
            border: `2px solid ${theme.palette.primary.main}`,
          },
        },
      },
    },
  },
});

// TypeScript module augmentation for custom variants
declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    glass: true;
    glassStrong: true;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    glass: true;
  }
} 