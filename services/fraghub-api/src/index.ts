import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { loadEnv } from './config/env';
import { assertDatabaseConnection, getKnex } from './db';
import adminRouter from './routes/admin';
import authRouter from './routes/auth';
import liveRouter from './routes/live';
import matchesRouter from './routes/matches';
import playersRouter from './routes/players';
import steamRouter from './routes/steam';
import createQueueRouter from './routes/queue';
import * as queueService from './services/queueService';
import logger from './logger';

loadEnv();
const env = loadEnv();

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/auth', steamRouter);
app.use('/api', liveRouter);
app.use('/api', matchesRouter);
app.use('/api', playersRouter);
app.use('/api/queue', (_req, _res, next) => {
  next();
});
app.use('/api/queue', createQueueRouter(getKnex()));
app.use('/admin', adminRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  },
);

async function main(): Promise<void> {
  await assertDatabaseConnection();
  const knex = getKnex();

  // Initialize queue timeout background task (every 60 seconds)
  setInterval(() => {
    queueService
      .checkQueueTimeouts(knex, env.QUEUE_TIMEOUT_MINUTES)
      .catch((err) => logger.error('[QUEUE] Timeout check failed:', err));
  }, 60000);
  logger.info('[QUEUE] Queue timeout service started (interval: 60s)');

  app.listen(env.PORT, () => {
    logger.info(`fraghub-api listening on port ${env.PORT}`);
    logger.info(
      '[CONFIG] Queue: MAX_ELO_DIFF=' +
        env.MAX_ELO_DIFF +
        ', TIMEOUT=' +
        env.QUEUE_TIMEOUT_MINUTES +
        'min',
    );
  });
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

export { app };
