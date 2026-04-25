import { Router } from 'express';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const router = Router();

const ALLOWED_SERVICES = [
  'fraghub-api',
  'fraghub-sysadmin',
  'mariadb',
  'nginx',
  'fraghub-cs2',
  'fraghub-csgo',
] as const;

router.get('/:service', async (req, res) => {
  const { service } = req.params;
  const lines = Math.min(Number(req.query['lines'] ?? 200), 2000);

  if (!(ALLOWED_SERVICES as readonly string[]).includes(service)) {
    res.status(400).json({ error: 'Unknown service' });
    return;
  }

  try {
    const { stdout } = await execFileAsync('/usr/bin/journalctl', [
      '-u',
      service,
      '-n',
      String(lines),
      '--no-pager',
      '-o',
      'short-iso',
    ]);
    res.json({ lines: stdout.split('\n').filter(Boolean) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

router.get('/:service/stream', (req, res) => {
  const { service } = req.params;

  if (!(ALLOWED_SERVICES as readonly string[]).includes(service)) {
    res.status(400).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const child = spawn('/usr/bin/journalctl', ['-u', service, '-f', '--no-pager', '-o', 'short-iso']);

  child.stdout.on('data', (chunk: Buffer) => {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      res.write(`data: ${JSON.stringify(line)}\n\n`);
    }
  });

  child.stderr.on('data', (chunk: Buffer) => {
    res.write(`event: error\ndata: ${JSON.stringify(chunk.toString())}\n\n`);
  });

  const cleanup = () => child.kill();
  req.on('close', cleanup);
  req.on('end', cleanup);
});

export default router;
