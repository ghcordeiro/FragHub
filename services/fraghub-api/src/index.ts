import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { loadEnv } from './config/env';
import { assertDatabaseConnection } from './db';
import adminRouter from './routes/admin';
import authRouter from './routes/auth';
import matchesRouter from './routes/matches';
import playersRouter from './routes/players';
import steamRouter from './routes/steam';

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

app.use('/auth', authRouter);
app.use('/auth', steamRouter);
app.use('/api', matchesRouter);
app.use('/api', playersRouter);
app.use('/admin', adminRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console -- central error sink
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function main(): Promise<void> {
  await assertDatabaseConnection();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console -- startup banner
    console.log(`fraghub-api listening on port ${env.PORT}`);
  });
}

void main().catch((err: unknown) => {
  // eslint-disable-next-line no-console -- fatal startup
  console.error(err);
  process.exit(1);
});

export { app };
