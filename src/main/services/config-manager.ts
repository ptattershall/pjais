import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  LOG_LEVEL: z.enum(['info', 'warn', 'error', 'debug']).default('info'),
  IS_DEV: z.boolean().default(process.env.NODE_ENV === 'development'),
});

type AppConfig = z.infer<typeof configSchema>;

export class ConfigManager {
  private static instance: ConfigManager;
  public readonly config: AppConfig;

  private constructor() {
    const envPath = path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`);
    dotenv.config({ path: envPath });
    
    // Also load a local override file if it exists
    const localEnvPath = path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}.local`);
    dotenv.config({ path: localEnvPath, override: true });

    const parsedConfig = configSchema.safeParse(process.env);
    if (!parsedConfig.success) {
      console.error('Failed to parse application configuration:', parsedConfig.error.issues);
      throw new Error('Invalid application configuration.');
    }
    
    this.config = parsedConfig.data;
    console.log('Configuration loaded for environment:', this.config.NODE_ENV);
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
}

export const configManager = ConfigManager.getInstance(); 