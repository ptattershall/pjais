import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/main/database/schema.ts',
  out: './src/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './pjais.db', // Default database file for migrations
  },
  verbose: true,
  strict: true,
});
