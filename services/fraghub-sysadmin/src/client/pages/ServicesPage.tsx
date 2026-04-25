import { useEffect, useState, useCallback } from 'react';

interface ServiceStatus {
  name: string;
  active: boolean;
  status: string;
  description: string;
}

const ACTION_LABELS: Record<string, string> = {
  start: 'Iniciar',
  stop: 'Parar',
  restart: 'Reiniciar',
};

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services');
      if (!res.ok) throw new Error('Falha ao buscar serviços');
      setServices(await res.json());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchServices();
    const id = setInterval(fetchServices, 5000);
    return () => clearInterval(id);
  }, [fetchServices]);

  const handleAction = async (name: string, action: string) => {
    if (action === 'stop' || action === 'restart') {
      if (!confirm(`Confirmar ${ACTION_LABELS[action]?.toLowerCase()} de "${name}"?`)) return;
    }
    setPending((p) => ({ ...p, [name]: action }));
    try {
      const res = await fetch(`/api/services/${name}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json()) as { error: string };
        alert(`Erro: ${body.error}`);
      }
      await fetchServices();
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[name];
        return next;
      });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Serviços do Sistema</h2>
        <p>Status e controle dos serviços systemd</p>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      ) : (
        <div className="grid-2">
          {services.map((svc) => (
            <ServiceCard
              key={svc.name}
              svc={svc}
              pendingAction={pending[svc.name]}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  svc,
  pendingAction,
  onAction,
}: {
  svc: ServiceStatus;
  pendingAction: string | undefined;
  onAction: (name: string, action: string) => Promise<void>;
}) {
  const busy = !!pendingAction;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{svc.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{svc.description}</div>
        </div>
        <span className={`badge ${svc.active ? 'active' : 'inactive'}`}>
          <span className={`dot ${svc.active ? 'green' : 'red'}`} />
          {svc.active ? 'ativo' : 'inativo'}
        </span>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
        {svc.status}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {!svc.active && (
          <button
            className="success"
            disabled={busy}
            onClick={() => void onAction(svc.name, 'start')}
          >
            {pendingAction === 'start' ? <span className="spin">↻</span> : null} Iniciar
          </button>
        )}
        {svc.active && (
          <button
            className="danger"
            disabled={busy}
            onClick={() => void onAction(svc.name, 'stop')}
          >
            {pendingAction === 'stop' ? <span className="spin">↻</span> : null} Parar
          </button>
        )}
        <button
          className="ghost"
          disabled={busy}
          onClick={() => void onAction(svc.name, 'restart')}
        >
          {pendingAction === 'restart' ? <span className="spin">↻</span> : '↻'} Reiniciar
        </button>
      </div>
    </div>
  );
}
