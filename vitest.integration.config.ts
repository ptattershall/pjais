import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath } from 'node:url';
import path from 'path';

export default defineConfig({
  test: {
    name: 'Integration Tests',
    include: [
      'src/main/integration/**/*.test.ts',
      'src/main/services/**/*.integration.test.ts'
    ],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 10000,
    globals: true,
    coverage: {
      reporter: ['text', 'html', 'json'],
      include: [
        'src/main/services/**/*.ts',
        'src/main/database/**/*.ts',
        'src/main/ipc/**/*.ts'
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/mocks/**',
        '**/node_modules/**'
      ]
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    reporter: ['verbose', 'html'],
    outputFile: {
      html: './test-results/integration-report.html',
      json: './test-results/integration-results.json'
    }
  },
  resolve: {
    alias: {
      '@shared': resolve(path.dirname(fileURLToPath(import.meta.url)), './src/shared'),
      '@main': resolve(path.dirname(fileURLToPath(import.meta.url)), './src/main'),
      '@renderer': resolve(path.dirname(fileURLToPath(import.meta.url)), './src/renderer'),
      '@preload': resolve(path.dirname(fileURLToPath(import.meta.url)), './src/preload')
    }
  }
});