'use client'
// ============================================================
// DOCTORALIA SYNC — conecta Lumi con la agenda de Doctoralia
// El usuario pega su Bearer token (sacado de DevTools) y Lumi
// importa citas nuevas a appointments y deja que Lumi
// controle el seguimiento operativo después del ingreso.
// ============================================================

import { useState } from 'react'
import { RefreshCw, Check, AlertCircle, Calendar, Key, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { upsertSettingValue, type SettingsMap } from '@/lib/settings'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import SectionHeader from '@/components/ui/SectionHeader'

interface Props {
  settings: SettingsMap
  userId: string
}

interface LastSync {
  synced_at: string
  total: number
  imported: number
  created?: number
  updated?: number
  repaired?: number
  patients_created?: number
  linked?: number
  unmatched?: number
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

// El token viene con o sin el prefijo "bearer " — limpiamos ambos casos
function extractToken(raw: string): string {
  return raw.trim().replace(/^bearer\s+/i, '')
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type SyncState = 'idle' | 'syncing' | 'done' | 'error'

export default function DoctoraliaSync({ settings, userId }: Props) {
  const supabase = createClient()

  const [token, setToken] = useState(settings['doctoralia_token'] ?? '')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [syncError, setSyncError] = useState<string | null>(settings['doctoralia_sync_error'] || null)
  const [lastSync, setLastSync] = useState<LastSync | null>(
    parseLastSync(settings['doctoralia_last_sync'] ?? '')
  )

  async function saveToken() {
    setSaveState('saving')
    try {
      const clean = extractToken(token)
      setToken(clean)
      const { error } = await upsertSettingValue(supabase, userId, 'doctoralia_token', clean)
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
        created: json.created,
        updated: json.updated,
        repaired: json.repaired,
        patients_created: json.patients_created,
        linked: json.linked,
        unmatched: json.unmatched,
      })
      setSyncState('done')
      setTimeout(() => setSyncState('idle'), 3500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al importar'
      setSyncError(msg)
      setSyncState('error')
    }
  }

  const hasToken = token.trim().length > 0

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h2 className="editorial-panel-title text-[1.05rem] mb-0.5">
          Sincronización con Doctoralia
        </h2>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-cool-soft)' }}>
          Lumi usa Doctoralia para importar citas nuevas.
          Si una cita ya existe, el import conserva los cambios locales y solo refresca metadatos de seguimiento.
        </p>
      </div>

      {/* Instrucciones para obtener el token */}
      <div
        className="rounded-[12px] px-3.5 py-3 space-y-1.5"
        style={{ background: 'var(--surface-glass)', border: '1px solid var(--border-soft)' }}
      >
        <p className="section-kicker">
          Cómo obtener el token
        </p>
        <ol className="text-[13px] space-y-1 list-decimal list-inside leading-relaxed" style={{ color: 'var(--ink-cool-soft)' }}>
          <li>Abre Doctoralia y ve a tu agenda semanal</li>
          <li>Presiona <strong>Cmd + Option + I</strong> → pestaña <strong>Network</strong></li>
          <li>Filtra por <strong>Fetch/XHR</strong> y recarga la página</li>
          <li>Haz click en cualquier request a <strong>docplanner.doctoralia.co</strong></li>
          <li>Ve a <strong>Request Headers → Authorization</strong></li>
          <li>Copia el valor (empieza con <code>MWY2...</code>)</li>
        </ol>
      </div>

      {/* Input del token */}
      <div className="space-y-2">
        <SectionHeader label="Token de acceso" />
        <div className="flex items-center gap-2">
          <Key size={14} className="shrink-0" style={{ color: 'var(--ink-cool-muted)' }} />
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="MWY2N2I1MGYz…"
            className="flex-1 rounded-[10px] px-3 py-2 text-[14px] outline-none"
            style={{
              background: 'var(--surface-glass)',
              border: '1px solid var(--border-soft)',
              color: 'var(--ink-cool-strong)',
            }}
          />
        </div>
        <p className="text-[11px]" style={{ color: 'var(--ink-cool-muted)' }}>
          El token expira cada pocos días. Si el import falla, pega uno nuevo.
        </p>
        <div className="flex items-center justify-end pt-0.5">
          {saveState === 'saved' && (
            <span className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: 'var(--state-success-text)' }}>
              <Check size={13} /> Token guardado
            </span>
          )}
          {saveState === 'error' && (
            <span className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: 'var(--state-cancel-text)' }}>
              <AlertCircle size={13} /> No se pudo guardar
            </span>
          )}
          {(saveState === 'idle' || saveState === 'saving') && (
            <Button
              variant="subtle"
              onClick={saveToken}
              disabled={saveState === 'saving' || !hasToken}
              className="px-5 py-2.5 text-[14px] tracking-[0.06em] uppercase"
            >
              {saveState === 'saving' ? 'Guardando…' : 'Guardar token'}
            </Button>
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-soft)' }} />

      {/* Último import exitoso */}
      {lastSync && syncState !== 'error' && (
        <div
          className="flex items-start gap-2.5 rounded-[12px] px-3.5 py-3"
          style={{ background: 'var(--state-success-bg)', border: '1px solid var(--border-soft)' }}
        >
          <Calendar size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--state-success-text)' }} />
          <div className="text-[13px] leading-snug" style={{ color: 'var(--state-success-text)' }}>
            <span className="font-semibold block">
              {syncState === 'done'
                ? `${lastSync.created ?? 0} nueva${(lastSync.created ?? 0) !== 1 ? 's' : ''} importada${(lastSync.created ?? 0) !== 1 ? 's' : ''} · ${lastSync.updated ?? 0} ya existente${(lastSync.updated ?? 0) !== 1 ? 's' : ''} detectada${(lastSync.updated ?? 0) !== 1 ? 's' : ''}${typeof lastSync.repaired === 'number' ? ` · ${lastSync.repaired} reparada${lastSync.repaired !== 1 ? 's' : ''}` : ''}${typeof lastSync.patients_created === 'number' ? ` · ${lastSync.patients_created} paciente${lastSync.patients_created !== 1 ? 's' : ''} creado${lastSync.patients_created !== 1 ? 's' : ''}` : ''}`
                : `Último import: ${formatSyncDate(lastSync.synced_at)}`}
            </span>
            {syncState !== 'done' && (
              <div style={{ opacity: 0.8 }}>
                <p>{lastSync.total} cita{lastSync.total !== 1 ? 's' : ''} revisada{lastSync.total !== 1 ? 's' : ''} en el último import</p>
                {typeof lastSync.linked === 'number' && typeof lastSync.unmatched === 'number' && (
                  <p>{lastSync.linked} vinculada{lastSync.linked !== 1 ? 's' : ''} · {lastSync.unmatched} sin vincular</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {(syncState === 'error' || syncError) && (
        <div
          className="flex items-start gap-2 rounded-[12px] px-3.5 py-3"
          style={{ background: 'var(--state-cancel-bg)', border: '1px solid var(--border-soft)' }}
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--state-cancel-text)' }} />
          <div className="text-[13px]" style={{ color: 'var(--state-cancel-text)' }}>
            <p className="font-semibold">Error de importación</p>
            <p>{syncError}</p>
            {syncError?.includes('expiró') && (
              <p className="mt-1 opacity-80">Obtén un token nuevo siguiendo las instrucciones de arriba.</p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <a
          href="https://docplanner.doctoralia.co/#/calendar/week"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[13px]"
          style={{ color: 'var(--ink-cool-muted)' }}
        >
          <ExternalLink size={12} />
          Abrir Doctoralia
        </a>
        <Button
          variant="action"
          onClick={runSync}
          disabled={syncState === 'syncing' || !hasToken}
          className="flex items-center gap-2 px-5 py-2.5 text-[14px] tracking-[0.06em] uppercase"
        >
          <RefreshCw size={13} className={syncState === 'syncing' ? 'animate-spin' : ''} />
          {syncState === 'syncing' ? 'Importando…' : 'Importar ahora'}
        </Button>
      </div>
    </Card>
  )
}
