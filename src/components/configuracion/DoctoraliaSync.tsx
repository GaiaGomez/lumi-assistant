'use client'
// ============================================================
// DOCTORALIA SYNC — Panel de conexión y sincronización
// Archivo: src/components/configuracion/DoctoraliaSync.tsx
//
// Flujo:
//  - Primera vez: usuario pega token → se guarda en DB → sync corre
//  - Visitas siguientes: muestra estado guardado, NO pide token si está conectado
//  - Cuando expira: muestra aviso y pide token nuevo
// ============================================================

import { useState, useTransition, useEffect } from 'react'
import {
  RefreshCw, Link2, Link2Off, AlertCircle,
  CheckCircle2, Loader2, ChevronDown, ChevronUp,
  Info, Copy, Check, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ConnectionStatus {
  status: 'disconnected' | 'connected' | 'expired' | 'syncing' | 'error'
  last_sync_at: string | null
  last_sync_result: SyncResult | null
  last_error: string | null
  has_token: boolean
}

interface SyncResult {
  total: number
  created: number
  updated: number
  repaired: number
  patientsCreated: number
  linked: number
  unmatched: number
  syncedAt: string
}

interface Props {
  userId: string
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(iso))
}

export default function DoctoraliaSync({ userId }: Props) {
  const [connection, setConnection] = useState<ConnectionStatus | null>(null)
  const [loadingConnection, setLoadingConnection] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)

  const [syncing, startSync] = useTransition()
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  const [showInstructions, setShowInstructions] = useState(false)

  // Carga el estado de conexión al montar el componente
  useEffect(() => {
    loadConnection()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadConnection() {
    setLoadingConnection(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('doctoralia_connections')
        .select('connection_status, last_sync_at, last_sync_result, last_error, session_secret')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error

      setConnection(data ? {
        status:           data.connection_status as ConnectionStatus['status'],
        last_sync_at:     data.last_sync_at,
        last_sync_result: data.last_sync_result as SyncResult | null,
        last_error:       data.last_error,
        has_token:        !!data.session_secret,
      } : {
        status:           'disconnected',
        last_sync_at:     null,
        last_sync_result: null,
        last_error:       null,
        has_token:        false,
      })
    } catch (err) {
      console.error('[DoctoraliaSync] Error cargando conexión:', err)
    } finally {
      setLoadingConnection(false)
      setInitialized(true)
    }
  }

  function handleSync() {
    // Si hay token guardado Y el estado no es expirado/desconectado, puede sincronizar sin pegar token nuevo
    const needsToken = !connection?.has_token || connection?.status === 'expired' || connection?.status === 'disconnected'

    if (needsToken && !token.trim()) {
      setSyncError('Pega tu Bearer token de Doctoralia para continuar.')
      return
    }

    setSyncError(null)
    setSyncResult(null)

    startSync(async () => {
      try {
        const body: Record<string, string> = {}
        // Solo enviamos el token en el body si el usuario pegó uno nuevo
        if (token.trim()) body.token = token.trim()

        const response = await fetch('/api/sync/doctoralia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await response.json()

        if (!response.ok) {
          if (data?.code === 'TOKEN_EXPIRADO' || response.status === 401) {
            setSyncError('El token venció. Abre Doctoralia en Chrome, ve a DevTools → Network y copia un token fresco.')
          } else if (data?.code === 'NO_TOKEN') {
            setSyncError('No hay token guardado. Pega el Bearer token de Doctoralia para empezar.')
          } else {
            setSyncError(data?.error ?? `Error ${response.status} al sincronizar.`)
          }
          await loadConnection()
          return
        }

        setSyncResult(data.result as SyncResult)
        setToken('') // Limpiar el input después de guardar
        await loadConnection()
      } catch (err) {
        setSyncError('No se pudo conectar con el servidor. Revisa tu conexión.')
        console.error('[DoctoraliaSync] Error en sync:', err)
      }
    })
  }

  function copyToken() {
    navigator.clipboard.writeText(token)
    setTokenCopied(true)
    setTimeout(() => setTokenCopied(false), 2000)
  }

  const statusConfig = {
    disconnected: { label: 'Sin conexión',   color: 'text-zinc-400',    icon: Link2Off },
    connected:    { label: 'Conectado',       color: 'text-emerald-400', icon: Link2 },
    expired:      { label: 'Token vencido',   color: 'text-amber-400',   icon: AlertCircle },
    syncing:      { label: 'Sincronizando',   color: 'text-blue-400',    icon: RefreshCw },
    error:        { label: 'Error',           color: 'text-red-400',     icon: AlertCircle },
  }

  const currentStatus = connection ? statusConfig[connection.status] : null
  const StatusIcon = currentStatus?.icon ?? Link2Off

  // El usuario necesita pegar un token si:
  // - nunca ha conectado (disconnected sin token)
  // - el token expiró
  const needsNewToken = !connection?.has_token || connection?.status === 'expired'

  return (
    <div className="space-y-4">

      {/* Estado de conexión */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {loadingConnection
            ? <Loader2 className="size-4 animate-spin text-zinc-400" />
            : <StatusIcon className={`size-4 ${currentStatus?.color ?? 'text-zinc-400'} ${connection?.status === 'syncing' ? 'animate-spin' : ''}`} />
          }
          <span className="text-sm font-medium text-zinc-200">
            {loadingConnection ? 'Verificando...' : (currentStatus?.label ?? 'Sin conexión')}
          </span>
        </div>
        {connection?.last_sync_at && (
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <Clock className="size-3" />
            Última sync: {formatDate(connection.last_sync_at)}
          </span>
        )}
      </div>

      {/* Banner: token vencido o primera conexión */}
      {initialized && needsNewToken && !syncResult && (
        <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${
          connection?.status === 'expired'
            ? 'border-amber-500/20 bg-amber-500/10'
            : 'border-blue-500/20 bg-blue-500/10'
        }`}>
          <Info className={`size-4 mt-0.5 shrink-0 ${connection?.status === 'expired' ? 'text-amber-400' : 'text-blue-400'}`} />
          <p className={`text-sm ${connection?.status === 'expired' ? 'text-amber-300' : 'text-blue-300'}`}>
            {connection?.status === 'expired'
              ? 'El token de Doctoralia venció. Pega uno nuevo y haz clic en Sincronizar.'
              : 'Primera vez: pega el Bearer token de Doctoralia para conectar y sincronizar tus citas.'}
          </p>
        </div>
      )}

      {/* Instrucciones */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <button
          type="button"
          onClick={() => setShowInstructions(!showInstructions)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm text-zinc-300 hover:text-white"
        >
          <div className="flex items-center gap-2">
            <Info className="size-4 text-blue-400" />
            <span>¿Cómo obtengo el token?</span>
          </div>
          {showInstructions
            ? <ChevronUp className="size-4 text-zinc-500" />
            : <ChevronDown className="size-4 text-zinc-500" />
          }
        </button>
        {showInstructions && (
          <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-2 text-sm text-zinc-400">
            <p>El token dura entre 1 y 24 horas. Se guarda automáticamente — solo necesitas pegarlo de nuevo cuando expire.</p>
            <ol className="space-y-1.5 pl-4 list-decimal">
              <li>Abre <strong className="text-zinc-200">Doctoralia</strong> en Chrome con tu cuenta.</li>
              <li>Abre <strong className="text-zinc-200">DevTools</strong> (F12 o Cmd+Option+I).</li>
              <li>Ve a la pestaña <strong className="text-zinc-200">Network</strong>, filtra por <code className="text-blue-300">appointments</code>.</li>
              <li>Navega a la <strong className="text-zinc-200">Agenda</strong> en Doctoralia.</li>
              <li>Clic en cualquier llamada a <code className="text-blue-300">api/appointments/day/</code>.</li>
              <li>En <strong className="text-zinc-200">Headers → Request Headers</strong>, copia el valor de <code className="text-blue-300">Authorization</code> (sin el prefijo &quot;bearer &quot;).</li>
            </ol>
            <p className="text-xs text-zinc-500 mt-2">
              ⚠️ El token se guarda encriptado y nunca se muestra. Solo funciona mientras tu sesión en Doctoralia esté activa.
            </p>
          </div>
        )}
      </div>

      {/* Input del token — solo si se necesita uno nuevo */}
      {needsNewToken && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">
            Bearer token de Doctoralia
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => { setToken(e.target.value); setSyncError(null) }}
              placeholder="Pega aquí el token copiado de DevTools"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-20 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {token && (
                <button type="button" onClick={copyToken} title="Copiar token"
                  className="rounded p-1 text-zinc-500 hover:text-zinc-300">
                  {tokenCopied
                    ? <Check className="size-3.5 text-emerald-400" />
                    : <Copy className="size-3.5" />
                  }
                </button>
              )}
              <button type="button" onClick={() => setShowToken(!showToken)}
                className="rounded px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300">
                {showToken ? 'ocultar' : 'ver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Si ya hay token guardado y no expiró: botón de sync directo */}
      {!needsNewToken && (
        <p className="text-xs text-zinc-500 flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-emerald-500" />
          Token guardado — la sincronización automática corre cada hora.
          <button
            type="button"
            onClick={() => setConnection(prev => prev ? { ...prev, status: 'expired', has_token: false } : prev)}
            className="text-zinc-400 underline hover:text-zinc-300 ml-1"
          >
            Actualizar token
          </button>
        </p>
      )}

      {/* Error */}
      {syncError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <AlertCircle className="size-4 mt-0.5 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{syncError}</p>
        </div>
      )}

      {/* Resultado exitoso */}
      {syncResult && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-300">Sincronización completada</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: 'Nuevas',       value: syncResult.created },
              { label: 'Actualizadas', value: syncResult.updated },
              { label: 'Pacientes',    value: syncResult.patientsCreated },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-white/5 px-3 py-2 text-center">
                <div className="text-xl font-bold text-emerald-300">{value}</div>
                <div className="text-xs text-zinc-500">{label}</div>
              </div>
            ))}
          </div>
          {syncResult.unmatched > 0 && (
            <p className="text-xs text-zinc-500">
              {syncResult.unmatched} cita{syncResult.unmatched !== 1 ? 's' : ''} sin paciente vinculado
              (nombre de Doctoralia no coincide con ningún paciente en Lumi).
            </p>
          )}
        </div>
      )}

      {/* Último error guardado en DB */}
      {connection?.last_error && !syncResult && connection.status === 'error' && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <AlertCircle className="size-4 mt-0.5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm text-amber-300">Error en la última sync automática:</p>
            <p className="text-xs text-zinc-400 mt-0.5">{connection.last_error}</p>
          </div>
        </div>
      )}

      {/* Botón sync */}
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing || (needsNewToken && !token.trim())}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {syncing
          ? <><Loader2 className="size-4 animate-spin" />Sincronizando...</>
          : <><RefreshCw className="size-4" />{needsNewToken ? 'Conectar y sincronizar' : 'Sincronizar ahora'}</>
        }
      </button>

      {/* Stats de la última sync guardada */}
      {connection?.last_sync_result && !syncResult && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs text-zinc-500 mb-2">Última sincronización guardada — {formatDate(connection.last_sync_at)}</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Nuevas',       value: connection.last_sync_result.created },
              { label: 'Actualizadas', value: connection.last_sync_result.updated },
              { label: 'Pacientes',    value: connection.last_sync_result.patientsCreated },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-lg font-bold text-zinc-200">{value}</div>
                <div className="text-xs text-zinc-600">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
