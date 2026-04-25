import { useEffect, useState } from 'react';

interface SystemInfo {
  cpu: { load1: number; load5: number; load15: number; cores: number };
  mem: { total: number; free: number; used: number; percentUsed: number };
  disk: { total: string; used: string; free: string; percent: string };
  uptime: number;
  hostname: string;
  platform: string;
  arch: string;
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function Bar({ value, color = 'var(--accent)' }: { value: number; color?: string }) {
  return (
    <div
      style={{
        background: 'var(--bg3)',
        borderRadius: 99,
        height: 8,
        overflow: 'hidden',
        marginTop: 8,
      }}
    >
      <div
        style={{
          width: `${Math.min(100, value)}%`,
          height: '100%',
          background: value > 85 ? 'var(--red)' : value > 65 ? 'var(--yellow)' : color,
          borderRadius: 99,
          transition: 'width 0.4s',
        }}
      />
    </div>
  );
}

export default function SystemPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState('');

  const fetch_ = async () => {
    try {
      const res = await fetch('/api/system');
      if (!res.ok) throw new Error('Falha');
      setInfo(await res.json());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void fetch_();
    const id = setInterval(fetch_, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div className="page-header">
        <h2>Status do Sistema</h2>
        <p>Atualiza a cada 5 segundos</p>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {!info ? (
        <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Info geral */}
          <div className="grid-3">
            <InfoCard label="Hostname" value={info.hostname} />
            <InfoCard label="Uptime" value={formatUptime(info.uptime)} />
            <InfoCard label="Plataforma" value={`${info.platform} ${info.arch}`} />
          </div>

          {/* CPU */}
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>CPU — {info.cpu.cores} cores</div>
            <div className="grid-3">
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Load 1m</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                  {info.cpu.load1.toFixed(2)}
                </div>
                <Bar value={(info.cpu.load1 / info.cpu.cores) * 100} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Load 5m</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                  {info.cpu.load5.toFixed(2)}
                </div>
                <Bar value={(info.cpu.load5 / info.cpu.cores) * 100} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Load 15m</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                  {info.cpu.load15.toFixed(2)}
                </div>
                <Bar value={(info.cpu.load15 / info.cpu.cores) * 100} color="var(--accent)" />
              </div>
            </div>
          </div>

          {/* Memória */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600 }}>Memória RAM</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {formatBytes(info.mem.used)} / {formatBytes(info.mem.total)}
              </div>
            </div>
            <Bar value={info.mem.percentUsed} />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {info.mem.percentUsed}% em uso · {formatBytes(info.mem.free)} livre
            </div>
          </div>

          {/* Disco */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600 }}>Disco ( / )</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {info.disk.used} / {info.disk.total}
              </div>
            </div>
            <Bar value={Number(info.disk.percent.replace('%', '') || 0)} />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {info.disk.percent} em uso · {info.disk.free} livre
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontWeight: 600, marginTop: 4, fontFamily: 'var(--font)' }}>{value}</div>
    </div>
  );
}
