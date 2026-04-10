'use client'

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Link2,
  PlugZap,
  RefreshCw,
} from 'lucide-react'
import type {
  DoctoraliaAutoSyncState,
  DoctoraliaConnectionSummary,
  DoctoraliaSyncExecutionResult,
  DoctoraliaSyncResultSummary,
  DoctoraliaSyncTrigger,
} from '@/lib/doctoralia/types'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import SectionHeader from '@/components/ui/SectionHeader'
import DoctoraliaConnectModal from './DoctoraliaConnectModal'
import DoctoraliaLoginModal from './DoctoraliaLoginModal'

interface DoctoraliaConnectionCardProps {
  connection: DoctoraliaConnectionSummary
  autoSync: DoctoraliaAutoSyncState
}

interface SyncFeedback {
  tone: 'success' | 'warning'
  text: string
}

interface SyncRoutePayload {
  outcome?: DoctoraliaSyncExecutionResult['outcome']
  trigger?: DoctoraliaSyncTrigger
  error?: string | null
  connection?: DoctoraliaConnectionSummary
  syncResult?: DoctoraliaSyncResultSummary | null
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null

  return new Date(value).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(value: string | null): string | null {
  if (!value) return null

  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return null

  const diffMs = timestamp - Date.now()
  const absMs = Math.abs(diffMs)
  const formatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

  if (absMs < 60 * 1000) return 'justo ahora'
  if (absMs < 60 * 60 * 1000) return formatter.format(Math.round(diffMs / (60 * 1000)), 'minute')
  if (absMs < 24 * 60 * 60 * 1000) return formatter.format(Math.round(diffMs / (60 * 60 * 1000)), 'hour')

  return formatter.format(Math.round(diffMs / (24 * 60 * 60 * 1000)), 'day')
}

function formatLastSyncLabel(value: string | null): string | null {
  const absolute = formatDateTime(value)
  if (!absolute) return null

  const relative = formatRelativeTime(value)
  return relative ? `${relative} · ${absolute}` : absolute
}

function formatCooldownLabel(value: string | null): string | null {
  const absolute = formatDateTime(value)
  if (!absolute) return null

  const relative = formatRelativeTime(value)
  return relative ? `${relative} · ${absolute}` : absolute
}

function getConnectionBadgeState(connectionStatus: DoctoraliaConnectionSummary['connectionStatus']) {
  switch (connectionStatus) {
    case 'connected':
      return { badge: 'success' as const, label: 'Conectado' }
    case 'expired':
      return { badge: 'warning' as const, label: 'Expirado' }
    case 'syncing':
      return { badge: 'pending' as const, label: 'Sincronizando' }
    case 'error':
      return { badge: 'cancel' as const, label: 'Con error' }
    default:
      return { badge: 'inactive' as const, label: 'Desconectado' }
  }
}

function getMainActionLabel(connectionStatus: DoctoraliaConnectionSummary['connectionStatus']) {
  switch (connectionStatus) {
    case 'connected':
      return 'Sincronizar ahora'
    case 'syncing':
      return 'Sincronizando…'
    case 'expired':
    case 'error':
      return 'Reconectar Doctoralia'
    default:
      return 'Conectar Doctoralia'
  }
}

function getConnectionCopy(
  connection: DoctoraliaConnectionSummary,
  autoSync: DoctoraliaAutoSyncState
) {
  switch (connection.connectionStatus) {
    case 'connected':
      if (autoSync.shouldAttempt) {
        return 'La conexión está lista. Agenda está lanzando una actualización silenciosa en segundo plano para ponerse al día.'
      }

      return 'La conexión está lista. Agenda puede actualizarse automáticamente al abrirse, con una pausa de 5 minutos para evitar solicitudes repetidas.'
    case 'expired':
      return 'La sesión guardada venció. Reconéctala desde aquí para volver a importar cambios sin interrumpir el resto de la Agenda.'
    case 'syncing':
      return 'Estamos trayendo los cambios más recientes desde Doctoralia. Puedes seguir usando Agenda mientras tanto.'
    case 'error':
      return 'La última operación con Doctoralia falló. Tus citas actuales siguen intactas en Lumi y puedes reconectar cuando quieras.'
    default:
      return 'Conecta una sesión temporal de Doctoralia para importar citas desde Agenda sin depender de un flujo oficial.'
  }
}

function getAutoSyncLine(
  connection: DoctoraliaConnectionSummary,
  autoSync: DoctoraliaAutoSyncState
) {
  if (connection.connectionStatus === 'connected') {
    if (autoSync.shouldAttempt) {
      return 'Auto-sync: iniciando ahora en segundo plano.'
    }

    if (autoSync.reason === 'cooldown') {
      return `Auto-sync: en pausa hasta ${formatCooldownLabel(autoSync.nextEligibleAt) ?? 'que termine el cooldown'} para no repetir solicitudes.`
    }

    return 'Auto-sync: disponible al abrir Agenda, con máximo una actualización útil cada 5 minutos.'
  }

  if (connection.connectionStatus === 'syncing') {
    return 'Auto-sync: en curso en segundo plano.'
  }

  return 'Auto-sync: inactivo hasta que haya una conexión válida.'
}

function buildSyncFeedback(
  outcome: DoctoraliaSyncExecutionResult['outcome'],
  syncResult: DoctoraliaSyncResultSummary | null
): SyncFeedback | null {
  if (outcome === 'success' && syncResult) {
    return {
      tone: 'success',
      text: `Sincronización completada: ${syncResult.importedCount} nuevas y ${syncResult.updatedCount} actualizadas.`,
    }
  }

  if (outcome === 'partial' && syncResult) {
    return {
      tone: 'warning',
      text: `Sincronización parcial: ${syncResult.importedCount} nuevas, ${syncResult.updatedCount} actualizadas y ${syncResult.failedCount} días con fallos.`,
    }
  }

  if (outcome === 'cooldown') {
    return {
      tone: 'warning',
      text: 'La actualización automática acaba de correr hace poco. Puedes volver a intentar manualmente en unos minutos si hace falta.',
    }
  }

  return null
}

export default function DoctoraliaConnectionCard({
  connection,
  autoSync,
}: DoctoraliaConnectionCardProps) {
  const router = useRouter()
  const autoSyncRequestedRef = useRef(false)
  const [currentConnection, setCurrentConnection] = useState(connection)
  const [currentAutoSync, setCurrentAutoSync] = useState(autoSync)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<SyncFeedback | null>(null)

  useEffect(() => {
    setCurrentConnection(connection)
    setCurrentAutoSync(autoSync)
  }, [autoSync, connection])

  const badge = getConnectionBadgeState(currentConnection.connectionStatus)
  const lastSyncLabel = formatLastSyncLabel(currentConnection.lastSyncAt)
  const sessionExpiryLabel = formatDateTime(currentConnection.sessionExpiresAt)
  const isSyncing = currentConnection.connectionStatus === 'syncing'

  const runSync = useCallback(async (trigger: DoctoraliaSyncTrigger) => {
    const isManual = trigger === 'manual'
    const previousConnection = currentConnection

    if (isManual && currentConnection.connectionStatus !== 'connected') {
      setShowLoginModal(true)
      return
    }

    if (currentConnection.connectionStatus === 'syncing') return

    setInlineError(null)
    if (isManual) {
      setFeedback(null)
    }

    setCurrentConnection((previous) => ({
      ...previous,
      connectionStatus: 'syncing',
      lastError: null,
    }))

    try {
      const response = await fetch(`/api/integrations/doctoralia/sync?trigger=${trigger}`, {
        method: 'POST',
      })

      const payload = await response.json().catch(() => null) as SyncRoutePayload | null
      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo sincronizar Doctoralia.')
      }

      if (payload?.connection) {
        setCurrentConnection(payload.connection)
      }

      if (!payload?.outcome) {
        throw new Error('No se pudo interpretar la respuesta de Doctoralia.')
      }

      if (payload.outcome === 'success' || payload.outcome === 'partial') {
        if (isManual) {
          const nextFeedback = buildSyncFeedback(payload.outcome, payload.syncResult ?? null)
          if (nextFeedback) setFeedback(nextFeedback)
        }

        startTransition(() => {
          router.refresh()
        })
        return
      }

      if (payload.outcome === 'cooldown') {
        if (isManual) {
          const nextFeedback = buildSyncFeedback(payload.outcome, null)
          if (nextFeedback) setFeedback(nextFeedback)
        }
        return
      }

      if (payload.outcome === 'conflict') {
        if (isManual) {
          setInlineError(payload.error ?? 'Ya hay una sincronización de Doctoralia en curso.')
        }
        return
      }

      if (isManual) {
        setInlineError(payload.error ?? 'No se pudo sincronizar Doctoralia.')
      }
    } catch (syncError) {
      setCurrentConnection(previousConnection)

      if (trigger === 'manual') {
        setInlineError(
          syncError instanceof Error
            ? syncError.message
            : 'No se pudo sincronizar Doctoralia.'
        )
      }
    }
  }, [currentConnection, router])

  useEffect(() => {
    if (!currentAutoSync.shouldAttempt || autoSyncRequestedRef.current) return

    autoSyncRequestedRef.current = true
    void runSync('auto')
  }, [currentAutoSync.shouldAttempt, runSync])

  function handleSyncNow() {
    if (currentConnection.connectionStatus !== 'connected') {
      setShowLoginModal(true)
      return
    }

    void runSync('manual')
  }

  function handleConnectionResolved(
    nextConnection: DoctoraliaConnectionSummary,
    shouldClose: boolean
  ) {
    setCurrentConnection(nextConnection)
    setInlineError(nextConnection.lastError)
    setFeedback(null)

    if (shouldClose) {
      setShowLoginModal(false)
      setShowConnectModal(false)
      startTransition(() => {
        router.refresh()
      })
    }
  }

  const loginModalMode = currentConnection.connectionStatus === 'disconnected'
    ? 'connect'
    : 'reconnect'

  const pasteModalMode = currentConnection.connectionStatus === 'connected'
    ? 'refresh'
    : currentConnection.connectionStatus === 'disconnected'
      ? 'connect'
      : 'reconnect'

  return (
    <>
      <Card className="p-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SectionHeader label="Doctoralia" className="mb-1" />
            <div className="flex items-center gap-2">
              <h2 className="editorial-panel-title text-[1.05rem]">Conexión de agenda</h2>
              <Badge status={badge.badge}>{badge.label}</Badge>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--ink-cool-soft)' }}>
              {getConnectionCopy(currentConnection, currentAutoSync)}
            </p>
          </div>
        </div>

        <div className="grid gap-1.5 text-[13px]" style={{ color: 'var(--ink-cool-soft)' }}>
          <div className="flex items-center gap-2">
            <Link2 size={13} style={{ color: 'var(--ink-cool-muted)' }} />
            <span>Estado actual: <strong style={{ color: 'var(--ink-cool-strong)' }}>{badge.label}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} style={{ color: 'var(--ink-cool-muted)' }} />
            <span>Última sincronización útil: <strong style={{ color: 'var(--ink-cool-strong)' }}>{lastSyncLabel ?? 'Todavía no hay una sincronización exitosa'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw size={13} style={{ color: 'var(--ink-cool-muted)' }} />
            <span>{getAutoSyncLine(currentConnection, currentAutoSync)}</span>
          </div>
          {sessionExpiryLabel && (
            <div className="flex items-center gap-2">
              <Clock3 size={13} style={{ color: 'var(--ink-cool-muted)' }} />
              <span>Sesión inferida hasta: <strong style={{ color: 'var(--ink-cool-strong)' }}>{sessionExpiryLabel}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <RefreshCw size={13} style={{ color: 'var(--ink-cool-muted)' }} />
            <span>
              Último resultado: <strong style={{ color: 'var(--ink-cool-strong)' }}>
                {currentConnection.importedCount} nuevas · {currentConnection.updatedCount} actualizadas · {currentConnection.failedCount} fallidas
              </strong>
            </span>
          </div>
        </div>

        {feedback && (
          <div
            className="flex items-start gap-2 rounded-[14px] px-3 py-2.5"
            style={{
              background:
                feedback.tone === 'success'
                  ? 'var(--state-success-bg)'
                  : 'var(--state-warning-bg)',
              border: '1px solid var(--border-soft)',
            }}
          >
            <CheckCircle2
              size={14}
              className="mt-0.5 shrink-0"
              style={{
                color:
                  feedback.tone === 'success'
                    ? 'var(--state-success-text)'
                    : 'var(--state-warning-text)',
              }}
            />
            <p
              className="text-[13px] leading-relaxed"
              style={{
                color:
                  feedback.tone === 'success'
                    ? 'var(--state-success-text)'
                    : 'var(--state-warning-text)',
              }}
            >
              {feedback.text}
            </p>
          </div>
        )}

        {(inlineError || currentConnection.lastError) && (
          <div
            className="flex items-start gap-2 rounded-[14px] px-3 py-2.5"
            style={{
              background: 'var(--state-cancel-bg)',
              border: '1px solid var(--border-soft)',
            }}
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--state-cancel-text)' }} />
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--state-cancel-text)' }}>
              {inlineError ?? currentConnection.lastError}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="action"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="px-4 py-2 text-[11px] tracking-[0.06em] uppercase flex items-center gap-2"
          >
            {isSyncing ? <RefreshCw size={13} className="animate-spin" /> : <PlugZap size={13} />}
            {getMainActionLabel(currentConnection.connectionStatus)}
          </Button>

          <Button
            variant="subtle"
            onClick={() => setShowConnectModal(true)}
            disabled={isSyncing}
            className="px-4 py-2 text-[11px] tracking-[0.06em] uppercase"
          >
            Credencial manual
          </Button>
        </div>
      </Card>

      {showLoginModal && (
        <DoctoraliaLoginModal
          mode={loginModalMode}
          onClose={() => setShowLoginModal(false)}
          onResolved={handleConnectionResolved}
        />
      )}

      {showConnectModal && (
        <DoctoraliaConnectModal
          mode={pasteModalMode}
          onClose={() => setShowConnectModal(false)}
          onResolved={handleConnectionResolved}
        />
      )}
    </>
  )
}
