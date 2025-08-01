import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Vitest configuration for the renderer process (React components)
    environment: 'jsdom',
    globals: true,
    include: ['src/renderer/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.renderer.setup.ts'],
    exclude: ['src/main/**/*.test.{ts,tsx}', 'e2e/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-utils/',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        'src/main/**', // Exclude main process from renderer coverage
        'e2e/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@main': path.resolve(__dirname, './src/main'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@preload': path.resolve(__dirname, './src/preload'),
      '@test-utils': path.resolve(__dirname, './src/test-utils')
    }
  }
})