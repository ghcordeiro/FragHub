import { Router } from 'express';
import knex from 'knex';

const router = Router();

function getDb() {
  return knex({
    client: 'mysql2',
    connection: {
      host: process.env['DB_HOST'] ?? '127.0.0.1',
      port: Number(process.env['DB_PORT'] ?? '3306'),
      user: process.env['DB_USER'] ?? '',
      password: process.env['DB_PASSWORD'] ?? '',
      database: process.env['DB_NAME'] ?? 'fraghub_db',
      charset: 'utf8mb4',
    },
    pool: { min: 0, max: 5 },
  });
}

router.get('/tables', async (_req, res) => {
  const db = getDb();
  try {
    const dbName = process.env['DB_NAME'] ?? 'fraghub_db';
    const rows = await db('information_schema.TABLES')
      .select('TABLE_NAME as name', 'TABLE_ROWS as rows', 'ENGINE as engine', 'DATA_LENGTH as dataLength')
      .where('TABLE_SCHEMA', dbName)
      .orderBy('TABLE_NAME');
    res.json(rows);
  } finally {
    await db.destroy();
  }
});

router.get('/tables/:table', async (req, res) => {
  const { table } = req.params;
  const page = Math.max(1, Number(req.query['page'] ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 50)));
  const offset = (page - 1) * limit;

  // Validate table name: only allow alphanumeric and underscore
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    res.status(400).json({ error: 'Invalid table name' });
    return;
  }

  const db = getDb();
  try {
    const [rows, countResult] = await Promise.all([
      db(table).select('*').limit(limit).offset(offset),
      db(table).count('* as total').first(),
    ]);
    const total = Number((countResult as { total: string | number })?.total ?? 0);
    res.json({ rows, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  } finally {
    await db.destroy();
  }
});

export default router;
