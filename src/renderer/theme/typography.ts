// Modern font stack optimized for Electron apps
export const fontFamily = [
  'Inter',
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(',');

export const monospaceFontFamily = [
  '"Fira Code"',
  '"JetBrains Mono"',
  'Consolas',
  '"Liberation Mono"',
  'Menlo',
  'Courier',
  'monospace',
].join(',');

// TypeScript module augmentation for custom variants
declare module '@mui/material/styles' {
  interface TypographyVariants {
    code: React.CSSProperties;
    displayLarge: React.CSSProperties;
    displayMedium: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    code?: React.CSSProperties;
    displayLarge?: React.CSSProperties;
    displayMedium?: React.CSSProperties;
  }
}

// Update Typography component's variant prop
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    code: true;
    displayLarge: true;
    displayMedium: true;
  }
}

export const typography = {
  fontFamily,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,
  
  // Standard variants
  h1: {
    fontSize: '2.5rem',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '-0.005em',
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.6,
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.6,
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: '0.01em',
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: '0.01em',
    textTransform: 'none' as const,
  },
  
  // Custom variants for AI Hub
  code: {
    fontFamily: monospaceFontFamily,
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.4,
  },
  displayLarge: {
    fontSize: '3.5rem',
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: '-0.025em',
  },
  displayMedium: {
    fontSize: '2.875rem',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
}; 