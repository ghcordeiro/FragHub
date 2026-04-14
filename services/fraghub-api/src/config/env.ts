import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  FRONTEND_URL: z.string().url(),
  STEAM_REALM: z.string().url(),
  STEAM_RETURN_URL: z.string().url(),
  STEAM_STATE_SECRET: z.string().min(32),
  WEBHOOK_SECRET: z.string().min(32),
  DISCORD_WEBHOOK_URL: z.preprocess(
    (v) => (v === undefined || v === null || String(v).trim() === '' ? undefined : String(v).trim()),
    z.string().url().optional(),
  ),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) {
    return cached;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console -- startup failure before logger
    console.error('[FATAL] Invalid environment', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  cached = parsed.data;
  return cached;
}
