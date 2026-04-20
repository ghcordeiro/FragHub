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
  COOKIE_SECURE: z.preprocess(
    (v) => String(v).toLowerCase() !== 'false',
    z.boolean(),
  ).default(true),
  DISCORD_WEBHOOK_URL: z.preprocess(
    (v) => (v === undefined || v === null || String(v).trim() === '' ? undefined : String(v).trim()),
    z.string().url().optional(),
  ),
  GAME_SERVER_CONNECT: z.preprocess(
    (v) => (v === undefined || v === null || String(v).trim() === '' ? undefined : String(v).trim()),
    z.string().optional(),
  ),
  // Phase 5: Matchmaking Queue Configuration
  MAX_ELO_DIFF: z.coerce.number().default(50).describe('Maximum ELO difference between team averages'),
  QUEUE_TIMEOUT_MINUTES: z.coerce.number().default(10).describe('Minutes of inactivity before removal from queue'),
  QUEUE_MAP_POOL: z.string().default('de_dust2,de_mirage,de_inferno,de_nuke,de_overpass,de_ancient,de_anubis').describe('Comma-separated list of available maps'),
  VETO_TIMEOUT_SECONDS: z.coerce.number().default(30).describe('Seconds per veto turn before auto-ban'),
  MATCHZY_BACKUP_PATH: z.preprocess(
    (v) => (v === undefined || v === null || String(v).trim() === '' ? undefined : String(v).trim()),
    z.string().optional(),
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
