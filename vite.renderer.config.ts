import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@emotion/styled', '@mui/material', '@mui/icons-material'],
  },
  build: {
    outDir: 'dist-renderer',
    rollupOptions: {
      output: {
        // Manual chunking for better code splitting
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
          
          // Lazy-loaded chunks will be split automatically
        },
        // Optimize chunk file names
        chunkFileNames: () => {
          return `chunks/[name]-[hash].js`;
        },
      },
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src/shared'),
      '@main': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src/main'),
      '@renderer': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src/renderer'),
      '@preload': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src/preload'),
      // Temporary workaround for @mui/icons-material resolution issue
      '@mui/icons-material': '@mui/icons-material',
    },
  },
});
