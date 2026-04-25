import { useEffect, useRef, useState } from 'react';

interface GameInfo {
  game: string;
  name: string;
  scriptExists: boolean;
}

type UpdateStatus = 'idle' | 'running' | 'success' | 'error';

interface GameState {
  status: UpdateStatus;
  output: string[];
  exitCode: number | null;
}

const INITIAL_STATE: GameState = { status: 'idle', output: [], exitCode: null };

export default function UpdatesPage() {
  const [games, setGames] = useState<GameInfo[]>([]);
  const [states, setStates] = useState<Record<string, GameState>>({});
  const esRefs = useRef<Record<string, EventSource>>({});
  const termRefs = useRef<Record<string, HTMLPreElement | null>>({});

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/updates/status');
      if (res.ok) {
        const data = (await res.json()) as GameInfo[];
        setGames(data);
        const init: Record<string, GameState> = {};
        for (const g of data) init[g.game] = { ...INITIAL_STATE };
        setStates(init);
      }
    })();

    return () => {
      for (const es of Object.values(esRefs.current)) es.close();
    };
  }, []);

  const scrollBottom = (game: string) => {
    const el = termRefs.current[game];
    if (el) el.scrollTop = el.scrollHeight;
  };

  const startUpdate = (game: string) => {
    if (states[game]?.status === 'running') return;

    setStates((prev) => ({
      ...prev,
      [game]: { status: 'running', output: [], exitCode: null },
    }));

    const es = new EventSource(`/api/updates/${game}`);
    esRefs.current[game] = es;

    es.addEventListener('start', (e: Event) => {
      const me = e as MessageEvent<string>;
      const msg = JSON.parse(me.data) as string;
      setStates((prev) => ({
        ...prev,
        [game]: { ...prev[game]!, output: [msg] },
      }));
    });

    es.addEventListener('line', (e: Event) => {
      const me = e as MessageEvent<string>;
      const line = JSON.parse(me.data) as string;
      setStates((prev) => ({
        ...prev,
        [game]: {
          ...prev[game]!,
          output: [...(prev[game]?.output ?? []).slice(-3000), line],
        },
      }));
      scrollBottom(game);
    });

    es.addEventListener('done', (e: Event) => {
      const me = e as MessageEvent<string>;
      const code = Number(JSON.parse(me.data));
      setStates((prev) => ({
        ...prev,
        [game]: {
          ...prev[game]!,
          status: code === 0 ? 'success' : 'error',
          exitCode: code,
        },
      }));
      es.close();
      delete esRefs.current[game];
    });

    es.onerror = () => {
      setStates((prev) => ({
        ...prev,
        [game]: { ...prev[game]!, status: 'error' },
      }));
      es.close();
    };
  };

  const STATUS_COLORS: Record<UpdateStatus, string> = {
    idle: 'var(--text-muted)',
    running: 'var(--yellow)',
    success: 'var(--green)',
    error: 'var(--red)',
  };

  const STATUS_LABELS: Record<UpdateStatus, string> = {
    idle: 'aguardando',
    running: 'atualizando...',
    success: 'concluído',
    error: 'erro',
  };

  return (
    <div>
      <div className="page-header">
        <h2>Atualizações de Jogos</h2>
        <p>Atualiza servidores via LinuxGSM</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {games.map((g) => {
          const state = states[g.game] ?? INITIAL_STATE;
          const busy = state.status === 'running';

          return (
            <div key={g.game} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {g.scriptExists ? 'LinuxGSM instalado' : 'LinuxGSM não encontrado'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: STATUS_COLORS[state.status] }}>
                    {busy && <span className="spin">↻ </span>}
                    {STATUS_LABELS[state.status]}
                    {state.exitCode !== null && state.status !== 'success' && ` (exit ${state.exitCode})`}
                  </span>
                  <button
                    className="primary"
                    disabled={busy || !g.scriptExists}
                    onClick={() => startUpdate(g.game)}
                  >
                    {busy ? 'Atualizando...' : '↑ Atualizar'}
                  </button>
                </div>
              </div>

              {state.output.length > 0 && (
                <pre
                  ref={(el) => { termRefs.current[g.game] = el; }}
                  className="terminal"
                  style={{ maxHeight: 300, fontSize: 11 }}
                >
                  {state.output.join('\n')}
                </pre>
              )}
            </div>
          );
        })}

        {games.length === 0 && (
          <div className="card" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
            Nenhum servidor de jogo configurado
          </div>
        )}
      </div>
    </div>
  );
}
