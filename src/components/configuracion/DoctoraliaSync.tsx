'use client'
// ============================================================
// DOCTORALIA SYNC — importa citas desde el feed iCal de Doctoralia
// Permite guardar la URL del feed y disparar una sincronización manual.
// ============================================================

import { useState } from 'react'
import { RefreshCw, Check, AlertCircle, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { upsertSettingValue, type SettingsMap } from '@/lib/settings'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import SectionHeader from '@/components/ui/SectionHeader'

interface Props {
  settings: SettingsMap
  userId: string
}

interface LastSync {
  synced_at: string
  total: number
  imported: number
}

function parseLastSync(raw: string): LastSync | null {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function formatSyncDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type SyncState = 'idle' | 'syncing' | 'done' | 'error'

export default function DoctoraliaSync({ settings, userId }: Props) {
  const supabase = createClient()

  const [icalUrl, setIcalUrl] = useState(settings['doctoralia_ical_url'] ?? '')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<LastSync | null>(
    parseLastSync(settings['doctoralia_last_sync'] ?? '')
  )

  async function saveUrl() {
    setSaveState('saving')
    try {
      const { error } = await upsertSettingValue(supabase, userId, 'doctoralia_ical_url', icalUrl)
      if (error) throw error
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch {
      setSaveState('error')
    }
  }

  async function runSync() {
    setSyncState('syncing')
    setSyncError(null)
    try {
      const res = await fetch('/api/sync/doctoralia', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error desconocido')
      setLastSync({
        synced_at: new Date().toISOString(),
        total: json.total,
        imported: json.imported,
      })
      setSyncState('done')
      setTimeout(() => setSyncState('idle'), 3500)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Error al sincronizar')
      setSyncState('error')
    }
  }

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h2 className="editorial-panel-title text-[1.05rem] mb-0.5" style={{ color: 'var(--ink-cool-strong)' }}>
          Sincronización con Doctoralia
        </h2>
        <p className="text-[12px]" style={{ color: 'var(--ink-cool-soft)' }}>
          Pega la URL del feed iCal de tu agenda de Doctoralia para importar citas automáticamente.
          La encuentras en <strong>Doctoralia → Mi agenda → Exportar → iCal</strong>.
        </p>
      </div>

      {/* URL del feed iCal */}
      <div className="space-y-2">
        <SectionHeader label="URL del feed iCal" />
        <Input
          type="url"
          value={icalUrl}
          onChange={e => setIcalUrl(e.target.value)}
          placeholder="webcal://www.doctoralia.co/…/ical/…"
        />
        <div className="flex items-center justify-end pt-0.5">
          {saveState === 'saved' && (
            <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--state-success-text)' }}>
              <Check size={13} />
              Guardado
            </span>
          )}
          {saveState === 'error' && (
            <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--state-cancel-text)' }}>
              <AlertCircle size={13} />
              No se pudo guardar
            </span>
          )}
          {(saveState === 'idle' || saveState === 'saving') && (
            <Button
              variant="subtle"
              onClick={saveUrl}
              disabled={saveState === 'saving' || !icalUrl.trim()}
              className="px-5 py-2.5 text-xs tracking-[0.06em] uppercase"
            >
              {saveState === 'saving' ? 'Guardando…' : 'Guardar URL'}
            </Button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-soft)' }} />

      {/* Última sincronización */}
      {lastSync && (
        <div
          className="flex items-start gap-2.5 rounded-[12px] px-3.5 py-3"
          style={{ background: 'var(--state-success-bg)', border: '1px solid var(--border-soft)' }}
        >
          <Calendar size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--state-success-text)' }} />
          <div className="text-[12px] leading-snug" style={{ color: 'var(--state-success-text)' }}>
            <span className="font-semibold">
              {syncState === 'done'
                ? `${lastSync.imported} cita${lastSync.imported !== 1 ? 's' : ''} nueva${lastSync.imported !== 1 ? 's' : ''} importada${lastSync.imported !== 1 ? 's' : ''}`
                : `Última sync: ${formatSyncDate(lastSync.synced_at)}`}
            </span>
            {syncState !== 'done' && (
              <span className="block" style={{ color: 'var(--state-success-text)', opacity: 0.8 }}>
                {lastSync.imported} nueva{lastSync.imported !== 1 ? 's' : ''} de {lastSync.total} cita{lastSync.total !== 1 ? 's' : ''} en el feed
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error de sync */}
      {syncState === 'error' && syncError && (
        <div
          className="flex items-center gap-2 rounded-[12px] px-3.5 py-3"
          style={{ background: 'var(--state-cancel-bg)', border: '1px solid var(--border-soft)' }}
        >
          <AlertCircle size={14} className="shrink-0" style={{ color: 'var(--state-cancel-text)' }} />
          <p className="text-[12px]" style={{ color: 'var(--state-cancel-text)' }}>
            {syncError}
          </p>
        </div>
      )}

      {/* Botón sincronizar */}
      <div className="flex justify-end">
        <Button
          variant="action"
          onClick={runSync}
          disabled={syncState === 'syncing' || !icalUrl.trim()}
          className="flex items-center gap-2 px-5 py-2.5 text-xs tracking-[0.06em] uppercase"
        >
          <RefreshCw size={13} className={syncState === 'syncing' ? 'animate-spin' : ''} />
          {syncState === 'syncing' ? 'Sincronizando…' : 'Sincronizar ahora'}
        </Button>
      </div>
    </Card>
  )
}
