import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Vitest configuration for the main process
    environment: 'node',
    globals: true,
    include: ['src/main/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    // Exclude renderer tests if they are in the same directory
    exclude: ['src/renderer/**/*.test.{ts,tsx}', 'e2e/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-utils/',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        'src/renderer/**', // Exclude renderer from main coverage
        'e2e/**'
      ]
    },
    // Electron specific configuration
    pool: 'forks', // Use forks for better isolation with Electron
    poolOptions: {
      forks: {
        singleFork: true // Single fork for Electron main process
      }
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