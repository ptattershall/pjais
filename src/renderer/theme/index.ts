import { createTheme, ThemeOptions } from '@mui/material/styles';
import { lightPalette, darkPalette, glassTokens } from './palette';
import { typography } from './typography';
import { createComponents } from './components';

// Custom theme interface
declare module '@mui/material/styles' {
  interface Theme {
    glass: typeof glassTokens.light;
  }

  interface ThemeOptions {
    glass?: typeof glassTokens.light;
  }
}

// Base theme configuration
const baseThemeOptions: ThemeOptions = {
  typography,
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
  zIndex: {
    mobileStepper: 1000,
    fab: 1050,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },
};

// Create light theme first without components
const lightThemeBase = createTheme({
  ...baseThemeOptions,
  palette: lightPalette,
  glass: glassTokens.light,
});

// Create light theme with components
export const lightTheme = createTheme({
  ...lightThemeBase,
  components: createComponents(lightThemeBase),
});

// Create dark theme first without components
const darkThemeBase = createTheme({
  ...baseThemeOptions,
  palette: darkPalette,
  glass: glassTokens.dark,
});

// Create dark theme with components
export const darkTheme = createTheme({
  ...darkThemeBase,
  components: createComponents(darkThemeBase),
});

// Theme context types
export type ThemeMode = 'light' | 'dark';

export interface ThemeContextType {
  mode: ThemeMode;
  toggleMode: () => void;
  theme: typeof lightTheme;
}

// Export themes
export { lightTheme as default };
export type { Theme } from '@mui/material/styles'; 