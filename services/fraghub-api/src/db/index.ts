import { config } from 'dotenv';
import knex, { Knex } from 'knex';
import { loadEnv } from '../config/env';

config();
loadEnv();

export const db: Knex = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? '3306'),
    user: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'fraghub_db',
    charset: 'utf8mb4',
  },
  pool: {
    min: 0,
    max: 10,
  },
});

export function getKnex(): Knex {
  return db;
}

export async function assertDatabaseConnection(): Promise<void> {
  await db.raw('SELECT 1');
}
