import { Router } from 'express';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

const router = Router();

const GAME_CONFIG: Record<string, { script: string; serverName: string }> = {
  cs2: {
    script: '/home/fraghub/lgsm/cs2server',
    serverName: 'CS2',
  },
  csgo: {
    script: '/home/fraghub/lgsm/csgoserver',
    serverName: 'CS:GO',
  },
};

router.get('/status', (_req, res) => {
  const status = Object.entries(GAME_CONFIG).map(([key, cfg]) => ({
    game: key,
    name: cfg.serverName,
    scriptExists: existsSync(cfg.script),
  }));
  res.json(status);
});

router.post('/:game', (req, res) => {
  const { game } = req.params;
  const cfg = GAME_CONFIG[game];

  if (!cfg) {
    res.status(400).json({ error: 'Unknown game' });
    return;
  }

  if (!existsSync(cfg.script)) {
    res.status(404).json({ error: `LinuxGSM script not found: ${cfg.script}` });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event: string, data: string) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send('start', `Starting update for ${cfg.serverName}...`);

  const child = spawn('/usr/bin/sudo', ['-u', 'fraghub', cfg.script, 'update'], {
    env: { ...process.env, TERM: 'dumb' },
  });

  child.stdout.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString().split('\n').filter(Boolean)) {
      send('line', line);
    }
  });

  child.stderr.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString().split('\n').filter(Boolean)) {
      send('line', line);
    }
  });

  child.on('close', (code) => {
    send('done', String(code ?? 0));
    res.end();
  });

  const cleanup = () => child.kill();
  req.on('close', cleanup);
});

export default router;
