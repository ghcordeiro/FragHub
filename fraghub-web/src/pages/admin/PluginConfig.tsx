import { useCallback, useEffect, useState } from 'react'
import { adminService } from '@/services/adminService'
import './Admin.css'

const SERVERS = [
  { id: 'cs2', label: 'CS2' },
  { id: 'csgo', label: 'CS:GO' },
]

export function AdminPluginConfig() {
  const [serverId, setServerId] = useState('cs2')
  const [plugins, setPlugins] = useState<string[]>([])
  const [selectedPlugin, setSelectedPlugin] = useState<string>('')
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchPlugins = useCallback(async (id: string) => {
    try {
      setError(null)
      const res = await adminService.getPluginList(id)
      setPlugins(res.data.plugins ?? [])
      setSelectedPlugin('')
      setContent('')
      setOriginalContent('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load plugins')
    }
  }, [])

  useEffect(() => {
    void fetchPlugins(serverId)
  }, [serverId, fetchPlugins])

  const loadConfig = async (plugin: string) => {
    if (!plugin) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await adminService.getPluginConfig(serverId, plugin)
      setContent(res.data.content ?? '')
      setOriginalContent(res.data.content ?? '')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load config')
    } finally {
      setLoading(false)
    }
  }

  const handlePluginChange = (plugin: string) => {
    setSelectedPlugin(plugin)
    void loadConfig(plugin)
  }

  const handleSave = async () => {
    if (!selectedPlugin) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await adminService.savePluginConfig(serverId, selectedPlugin, content)
      setOriginalContent(content)
      setSuccess('Configuração salva com sucesso.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  const isDirty = content !== originalContent

  return (
    <div className="admin-page">
      <h1>Plugin Config</h1>

      <div className="filter-box" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: '#888' }}>
            Servidor
          </label>
          <select className="select-input" value={serverId} onChange={(e) => setServerId(e.target.value)}>
            {SERVERS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: '#888' }}>
            Plugin
          </label>
          <select
            className="select-input"
            value={selectedPlugin}
            onChange={(e) => handlePluginChange(e.target.value)}
            disabled={plugins.length === 0}
          >
            <option value="">Selecionar plugin…</option>
            {plugins.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{success}</div>}
      {loading && <div className="loading">Carregando config…</div>}

      {!loading && selectedPlugin && (
        <>
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setSuccess(null) }}
            rows={24}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              background: '#0d0d1a',
              color: '#e0e0e0',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '0.75rem',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            {isDirty && (
              <button className="btn btn-secondary" onClick={() => { setContent(originalContent); setSuccess(null) }}>
                Descartar
              </button>
            )}
            {isDirty && <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>Alterações não salvas</span>}
          </div>
        </>
      )}

      {!loading && !selectedPlugin && plugins.length > 0 && (
        <p style={{ color: '#888' }}>Selecione um plugin para editar a configuração.</p>
      )}
    </div>
  )
}
