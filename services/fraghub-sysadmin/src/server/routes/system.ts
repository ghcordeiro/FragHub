import { Router } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execFileAsync = promisify(execFile);
const router = Router();

async function getDiskInfo(): Promise<{ total: string; used: string; free: string; percent: string }> {
  try {
    const { stdout } = await execFileAsync('/bin/df', ['-h', '/']);
    const lines = stdout.trim().split('\n');
    const parts = lines[1]?.split(/\s+/) ?? [];
    return {
      total: parts[1] ?? '-',
      used: parts[2] ?? '-',
      free: parts[3] ?? '-',
      percent: parts[4] ?? '-',
    };
  } catch {
    return { total: '-', used: '-', free: '-', percent: '-' };
  }
}

router.get('/', async (_req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const disk = await getDiskInfo();

  res.json({
    cpu: {
      load1: os.loadavg()[0],
      load5: os.loadavg()[1],
      load15: os.loadavg()[2],
      cores: os.cpus().length,
    },
    mem: {
      total: totalMem,
      free: freeMem,
      used: totalMem - freeMem,
      percentUsed: Math.round(((totalMem - freeMem) / totalMem) * 100),
    },
    disk,
    uptime: os.uptime(),
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
  });
});

export default router;
