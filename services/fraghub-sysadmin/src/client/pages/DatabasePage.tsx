import { useEffect, useState } from 'react';

interface TableInfo {
  name: string;
  rows: number;
  engine: string;
}

interface TableData {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default function DatabasePage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/db/tables');
        if (!res.ok) throw new Error('Falha ao buscar tabelas');
        setTables(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const loadTable = async (name: string, p = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/db/tables/${name}?page=${p}&limit=50`);
      if (!res.ok) throw new Error('Falha ao buscar dados');
      setTableData(await res.json());
      setSelectedTable(name);
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const columns = tableData && tableData.rows.length > 0 ? Object.keys(tableData.rows[0]!) : [];

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 120px)' }}>
      {/* Sidebar de tabelas */}
      <div
        className="card"
        style={{ width: 200, overflowY: 'auto', flexShrink: 0, padding: 0 }}
      >
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--border)',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Tabelas ({tables.length})
        </div>
        {tables.map((t) => (
          <button
            key={t.name}
            onClick={() => void loadTable(t.name, 1)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '9px 14px',
              background: selectedTable === t.name ? 'rgba(99,102,241,0.12)' : 'transparent',
              color: selectedTable === t.name ? 'var(--accent)' : 'var(--text)',
              borderRadius: 0,
              borderBottom: '1px solid var(--border)',
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 500 }}>{t.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              ~{t.rows?.toLocaleString() ?? '?'} rows
            </div>
          </button>
        ))}
      </div>

      {/* Área principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2>Banco de Dados</h2>
          <p>Somente leitura — {selectedTable ? `tabela: ${selectedTable}` : 'selecione uma tabela'}</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {!selectedTable && !loading && (
          <div className="card" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
            Selecione uma tabela na barra lateral
          </div>
        )}

        {loading && <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>}

        {tableData && !loading && (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              <span>{tableData.total.toLocaleString()} registros</span>
              <span>·</span>
              <span>
                Página {tableData.page} de {tableData.pages}
              </span>
              <button
                className="ghost"
                disabled={page <= 1}
                onClick={() => void loadTable(selectedTable!, page - 1)}
                style={{ padding: '4px 10px' }}
              >
                ← Anterior
              </button>
              <button
                className="ghost"
                disabled={page >= tableData.pages}
                onClick={() => void loadTable(selectedTable!, page + 1)}
                style={{ padding: '4px 10px' }}
              >
                Próxima →
              </button>
            </div>

            <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                  fontFamily: 'var(--font)',
                }}
              >
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          background: 'var(--bg3)',
                          borderBottom: '1px solid var(--border)',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          position: 'sticky',
                          top: 0,
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg2)',
                      }}
                    >
                      {columns.map((col) => (
                        <td
                          key={col}
                          style={{
                            padding: '7px 12px',
                            color: row[col] === null ? 'var(--text-muted)' : 'var(--text)',
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={formatValue(row[col])}
                        >
                          {formatValue(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
