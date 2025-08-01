import { PaletteOptions } from '@mui/material/styles';

// AI Hub Brand Colors
const brandColors = {
  primary: {
    50: '#f0f4ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1', // Main brand color
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  secondary: {
    50: '#fef7ff',
    100: '#fce7ff',
    200: '#f8d4ff',
    300: '#f2b5ff',
    400: '#e879f9',
    500: '#d946ef', // Secondary accent
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
  },
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
};

// Glass Morphism Design Tokens
export const glassTokens = {
  light: {
    background: {
      glass: 'rgba(255, 255, 255, 0.85)',
      glassHover: 'rgba(255, 255, 255, 0.95)',
      glassFocus: 'rgba(255, 255, 255, 0.9)',
      glassSubtle: 'rgba(255, 255, 255, 0.6)',
      glassStrong: 'rgba(255, 255, 255, 0.95)',
    },
    backdrop: {
      blur: 'blur(20px)',
      blurSubtle: 'blur(10px)',
      blurStrong: 'blur(30px)',
    },
    border: {
      glass: 'rgba(255, 255, 255, 0.2)',
      glassStrong: 'rgba(255, 255, 255, 0.3)',
    },
    shadow: {
      glass: '0 8px 32px rgba(31, 38, 135, 0.37)',
      glassElevated: '0 15px 50px rgba(31, 38, 135, 0.2)',
    },
  },
  dark: {
    background: {
      glass: 'rgba(0, 0, 0, 0.4)',
      glassHover: 'rgba(0, 0, 0, 0.6)',
      glassFocus: 'rgba(0, 0, 0, 0.5)',
      glassSubtle: 'rgba(0, 0, 0, 0.2)',
      glassStrong: 'rgba(0, 0, 0, 0.7)',
    },
    backdrop: {
      blur: 'blur(20px)',
      blurSubtle: 'blur(10px)',
      blurStrong: 'blur(30px)',
    },
    border: {
      glass: 'rgba(255, 255, 255, 0.1)',
      glassStrong: 'rgba(255, 255, 255, 0.2)',
    },
    shadow: {
      glass: '0 8px 32px rgba(0, 0, 0, 0.5)',
      glassElevated: '0 15px 50px rgba(0, 0, 0, 0.3)',
    },
  },
};

export const lightPalette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: brandColors.primary[500],
    light: brandColors.primary[400],
    dark: brandColors.primary[600],
    contrastText: '#ffffff',
  },
  secondary: {
    main: brandColors.secondary[500],
    light: brandColors.secondary[400],
    dark: brandColors.secondary[600],
    contrastText: '#ffffff',
  },
  background: {
    default: brandColors.neutral[50],
    paper: '#ffffff',
  },
  text: {
    primary: brandColors.neutral[900],
    secondary: brandColors.neutral[600],
  },
  divider: brandColors.neutral[200],
  error: {
    main: '#ef4444',
    light: '#fca5a5',
    dark: '#dc2626',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
  },
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#047857',
  },
};

export const darkPalette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: brandColors.primary[400],
    light: brandColors.primary[300],
    dark: brandColors.primary[500],
    contrastText: '#ffffff',
  },
  secondary: {
    main: brandColors.secondary[400],
    light: brandColors.secondary[300],
    dark: brandColors.secondary[500],
    contrastText: '#ffffff',
  },
  background: {
    default: brandColors.neutral[900],
    paper: brandColors.neutral[800],
  },
  text: {
    primary: brandColors.neutral[100],
    secondary: brandColors.neutral[400],
  },
  divider: brandColors.neutral[700],
  error: {
    main: '#f87171',
    light: '#fca5a5',
    dark: '#ef4444',
  },
  warning: {
    main: '#fbbf24',
    light: '#fde047',
    dark: '#f59e0b',
  },
  success: {
    main: '#34d399',
    light: '#6ee7b7',
    dark: '#10b981',
  },
}; 