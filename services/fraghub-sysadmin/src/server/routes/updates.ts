import { Router } from 'express';
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';

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

const STATE_DIR = process.env.FRAGHUB_STATE_DIR ?? '/opt/fraghub/state';
const MONITOR_STATE_FILE = `${STATE_DIR}/cs2-monitor.state`;
const UPDATE_LOG = `${STATE_DIR}/cs2-update.log`;
const REPO_ROOT = process.env.FRAGHUB_REPO_ROOT ?? '/opt/fraghub/repo';
const PLUGIN_UPDATE_SCRIPT = `${REPO_ROOT}/scripts/plugin-update-cs2.sh`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseStateFile(path: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!existsSync(path)) return result;
  try {
    const lines = readFileSync(path, 'utf8').split('\n');
    for (const line of lines) {
      const eq = line.indexOf('=');
      if (eq > 0) {
        result[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
      }
    }
  } catch {
    // ignore read errors
  }
  return result;
}

function readLastLines(path: string, count: number): string[] {
  if (!existsSync(path)) return [];
  try {
    const content = readFileSync(path, 'utf8');
    return content.split('\n').filter(Boolean).slice(-count);
  } catch {
    return [];
  }
}

function sseStream(res: import('express').Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  return (event: string, data: string) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
}

// ---------------------------------------------------------------------------
// GET /status — list game servers
// ---------------------------------------------------------------------------
router.get('/status', (_req, res) => {
  const status = Object.entries(GAME_CONFIG).map(([key, cfg]) => ({
    game: key,
    name: cfg.serverName,
    scriptExists: existsSync(cfg.script),
  }));
  res.json(status);
});

// ---------------------------------------------------------------------------
// GET /cs2/status — CS2 update pipeline state
// ---------------------------------------------------------------------------
router.get('/cs2/status', (_req, res) => {
  const state = parseStateFile(MONITOR_STATE_FILE);
  const log = readLastLines(UPDATE_LOG, 20);

  const waiting = state['WAITING_UPSTREAM'] === '1';
  const retryCount = parseInt(state['RETRY_COUNT'] ?? '0', 10);
  const pendingBuildid = state['PENDING_BUILDID'] ?? null;
  const lastAttempt = state['LAST_ATTEMPT'] ?? null;

  let updateState: 'idle' | 'retrying' | 'failed';
  if (!waiting) {
    updateState = 'idle';
  } else if (retryCount > parseInt(process.env.FRAGHUB_CS2_MONITOR_MAX_RETRIES ?? '20', 10)) {
    updateState = 'failed';
  } else {
    updateState = 'retrying';
  }

  res.json({
    updateState,
    retryCount: waiting ? retryCount : 0,
    pendingBuildid,
    lastAttempt,
    log,
  });
});

// ---------------------------------------------------------------------------
// POST /cs2/full-update — full pipeline: LGSM update + plugin reinstall (SSE)
// ---------------------------------------------------------------------------
router.post('/cs2/full-update', (req, res) => {
  const send = sseStream(res);
  send('start', 'Starting full CS2 update pipeline (binary update + plugin reinstall)...');

  // Run LGSM update, then plugin-update-cs2.sh sequentially via shell
  const lgsmScript = GAME_CONFIG['cs2'].script;
  const lgsmExists = existsSync(lgsmScript);

  const commands: string[] = [];
  if (lgsmExists) {
    commands.push(`sudo -u fraghub ${lgsmScript} update`);
  } else {
    send('line', '[WARN] LinuxGSM script not found — skipping binary update, proceeding to plugin reinstall.');
  }
  commands.push(`bash ${PLUGIN_UPDATE_SCRIPT}`);

  const shellCmd = commands.join(' && ');
  const child = spawn('/bin/bash', ['-c', shellCmd], {
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

// ---------------------------------------------------------------------------
// POST /:game — LinuxGSM binary update only (SSE)
// ---------------------------------------------------------------------------
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

  const send = sseStream(res);
  send('start', `Starting binary update for ${cfg.serverName}...`);

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
