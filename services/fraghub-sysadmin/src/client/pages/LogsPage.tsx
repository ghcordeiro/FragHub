import { useEffect, useRef, useState } from 'react';

const SERVICES = [
  'fraghub-api',
  'fraghub-sysadmin',
  'mariadb',
  'nginx',
  'fraghub-cs2',
  'fraghub-csgo',
];

export default function LogsPage() {
  const [service, setService] = useState(SERVICES[0]!);
  const [lines, setLines] = useState<string[]>([]);
  const [follow, setFollow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const termRef = useRef<HTMLPreElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const fetchLogs = async (svc: string, count = 200) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/logs/${svc}?lines=${count}`);
      if (!res.ok) throw new Error('Falha ao buscar logs');
      const data = (await res.json()) as { lines: string[] };
      setLines(data.lines);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFollow(false);
    void fetchLogs(service);
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [service]);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [lines]);

  const toggleFollow = () => {
    if (follow) {
      esRef.current?.close();
      esRef.current = null;
      setFollow(false);
      return;
    }

    setFollow(true);
    setLines([]);
    const es = new EventSource(`/api/logs/${service}/stream`);
    esRef.current = es;

    es.onmessage = (e: MessageEvent<string>) => {
      const line = JSON.parse(e.data) as string;
      setLines((prev) => [...prev.slice(-2000), line]);
    };

    es.addEventListener('error', (e: Event) => {
      const me = e as MessageEvent<string>;
      if (me.data) {
        const msg = JSON.parse(me.data) as string;
        setError(msg);
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
      <div className="page-header">
        <h2>Logs do Sistema</h2>
        <p>Logs via journalctl com suporte a follow em tempo real</p>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={service}
          onChange={(e) => setService(e.target.value)}
        >
          {SERVICES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button className="ghost" onClick={() => void fetchLogs(service)} disabled={loading || follow}>
          {loading ? <span className="spin">↻</span> : '↻'} Atualizar
        </button>

        <button className="ghost" onClick={() => void fetchLogs(service, 500)} disabled={loading || follow}>
          Carregar 500 linhas
        </button>

        <button
          className={follow ? 'danger' : 'primary'}
          onClick={toggleFollow}
        >
          {follow ? '■ Parar Follow' : '▶ Follow'}
        </button>

        {follow && (
          <span style={{ fontSize: 12, color: 'var(--green)' }}>
            <span className="spin">◉</span> ao vivo
          </span>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}

      <pre
        ref={termRef}
        className="terminal"
        style={{ flex: 1, minHeight: 400, maxHeight: 'calc(100vh - 260px)' }}
      >
        {lines.length === 0
          ? loading
            ? 'Carregando...'
            : '(sem logs)'
          : lines.join('\n')}
      </pre>
    </div>
  );
}
