import { config } from 'dotenv';
config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

import { lanOnly } from './middleware/lanOnly.js';
import servicesRouter from './routes/services.js';
import logsRouter from './routes/logs.js';
import databaseRouter from './routes/database.js';
import updatesRouter from './routes/updates.js';
import systemRouter from './routes/system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = Number(process.env['PORT'] ?? 8080);

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(cors({ origin: false }));
app.use(express.json());

app.use(lanOnly);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/services', servicesRouter);
app.use('/api/logs', logsRouter);
app.use('/api/db', databaseRouter);
app.use('/api/updates', updatesRouter);
app.use('/api/system', systemRouter);

// Serve React build in production
const publicDir = join(__dirname, '..', 'public');
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => {
    res.sendFile(join(publicDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[fraghub-sysadmin] Running on port ${PORT}`);
});
