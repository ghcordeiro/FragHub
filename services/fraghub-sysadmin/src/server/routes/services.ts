import { Router } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const router = Router();

const ALLOWED_SERVICES = [
  'fraghub-api',
  'mariadb',
  'nginx',
  'fraghub-cs2',
  'fraghub-csgo',
  'fraghub-sysadmin',
] as const;

const ALLOWED_ACTIONS = ['start', 'stop', 'restart', 'status'] as const;

type ServiceName = (typeof ALLOWED_SERVICES)[number];

async function getServiceStatus(name: ServiceName): Promise<{
  name: string;
  active: boolean;
  status: string;
  description: string;
}> {
  try {
    const { stdout } = await execFileAsync('/usr/bin/systemctl', [
      'show',
      name,
      '--no-page',
      '--property=ActiveState,SubState,Description',
    ]);
    const props: Record<string, string> = {};
    for (const line of stdout.split('\n')) {
      const [key, ...rest] = line.split('=');
      if (key) props[key.trim()] = rest.join('=').trim();
    }
    return {
      name,
      active: props['ActiveState'] === 'active',
      status: `${props['ActiveState'] ?? 'unknown'} (${props['SubState'] ?? 'unknown'})`,
      description: props['Description'] ?? name,
    };
  } catch {
    return { name, active: false, status: 'not-found', description: name };
  }
}

router.get('/', async (_req, res) => {
  const results = await Promise.all(ALLOWED_SERVICES.map(getServiceStatus));
  res.json(results);
});

router.post('/:name/:action', async (req, res) => {
  const { name, action } = req.params;

  if (!(ALLOWED_SERVICES as readonly string[]).includes(name)) {
    res.status(400).json({ error: 'Unknown service' });
    return;
  }
  if (!(ALLOWED_ACTIONS as readonly string[]).includes(action)) {
    res.status(400).json({ error: 'Unknown action' });
    return;
  }
  if (action === 'status') {
    const result = await getServiceStatus(name as ServiceName);
    res.json(result);
    return;
  }

  try {
    await execFileAsync('/usr/bin/sudo', ['/usr/bin/systemctl', action, name]);
    const result = await getServiceStatus(name as ServiceName);
    res.json({ ok: true, service: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

export default router;
