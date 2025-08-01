import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    lib: {
      entry: 'src/main/index.ts',
      formats: ['cjs'],
      fileName: () => 'main.js'
    },
    rollupOptions: {
      external: [
        'electron',
        'electron-log',
        'electron-store',
        'extract-zip',
        'fs-extra',
        'update-electron-app',
        'dotenv',
        'path',
        'fs',
        'os',
        'zod',
        'effect',
        '@effect/schema',
        '@effect/platform',
        '@effect/opentelemetry',
        '@effect/rpc',
        'onnxruntime-node',
        'better-sqlite3',
        '@xenova/transformers'
      ]
    },
    minify: false,
    commonjsOptions: {
      ignoreDynamicRequires: true
    }
  },
  optimizeDeps: {
    exclude: ['onnxruntime-node', 'better-sqlite3']
  }
});
