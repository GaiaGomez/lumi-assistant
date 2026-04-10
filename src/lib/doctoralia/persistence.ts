import { getDoctoraliaAutoSyncState, isDoctoraliaSyncLockStale } from '@/lib/doctoralia/policy'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isDoctoraliaSessionExpired } from '@/lib/doctoralia/session'
import type {
  DoctoraliaAgendaConnectionState,
  DoctoraliaConnectionStatus,
  DoctoraliaConnectionSummary,
  DoctoraliaStoredConnection,
  DoctoraliaSyncResultSummary,
  DoctoraliaSessionKind,
} from '@/lib/doctoralia/types'

interface DoctoraliaConnectionRow {
  user_id: string
  connection_status: string | null
  session_kind: string | null
  session_secret: string | null
  session_expires_at: string | null
  last_sync_at: string | null
  last_sync_result: unknown
  last_error: string | null
  imported_count: number | null
  updated_count: number | null
  failed_count: number | null
  updated_at: string | null
}

type DoctoraliaConnectionPatch = Partial<{
  connection_status: DoctoraliaConnectionStatus
  session_kind: DoctoraliaSessionKind | null
  session_secret: string | null
  session_expires_at: string | null
  connected_at: string | null
  last_sync_at: string | null
  last_sync_result: DoctoraliaSyncResultSummary | null
  last_error: string | null
  imported_count: number
  updated_count: number
  failed_count: number
}>

function isMissingFoundationError(message: string): boolean {
  return /doctoralia_connections/i.test(message) && /does not exist|could not find/i.test(message)
}

function normalizeConnectionStatus(
  value: string | null | undefined
): DoctoraliaConnectionStatus {
  if (
    value === 'disconnected' ||
    value === 'connected' ||
    value === 'expired' ||
    value === 'syncing' ||
    value === 'error'
  ) {
    return value
  }

  return 'disconnected'
}

function normalizeSyncResult(value: unknown): DoctoraliaSyncResultSummary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const record = value as Record<string, unknown>
  const status = record.status
  if (status !== 'success' && status !== 'partial' && status !== 'failed') return null

  const successfulDays = Array.isArray(record.successfulDays)
    ? record.successfulDays.filter((day): day is string => typeof day === 'string')
    : []
  const failedDays = Array.isArray(record.failedDays)
    ? record.failedDays.flatMap((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
        const failure = entry as Record<string, unknown>
        if (typeof failure.date !== 'string' || typeof failure.message !== 'string') return []
        return [{ date: failure.date, message: failure.message }]
      })
    : []

  return {
    status,
    startedAt: typeof record.startedAt === 'string' ? record.startedAt : new Date().toISOString(),
    finishedAt: typeof record.finishedAt === 'string' ? record.finishedAt : new Date().toISOString(),
    requestedDays: typeof record.requestedDays === 'number' ? record.requestedDays : successfulDays.length + failedDays.length,
    successfulDays,
    failedDays,
    totalExternalAppointments: typeof record.totalExternalAppointments === 'number' ? record.totalExternalAppointments : 0,
    importedCount: typeof record.importedCount === 'number' ? record.importedCount : 0,
    updatedCount: typeof record.updatedCount === 'number' ? record.updatedCount : 0,
    linkedCount: typeof record.linkedCount === 'number' ? record.linkedCount : 0,
    fallbackMatchCount: typeof record.fallbackMatchCount === 'number' ? record.fallbackMatchCount : 0,
    failedCount: typeof record.failedCount === 'number' ? record.failedCount : failedDays.length,
  }
}

export function createDisconnectedDoctoraliaSummary(): DoctoraliaConnectionSummary {
  return {
    connectionStatus: 'disconnected',
    lastSyncAt: null,
    lastSyncResult: null,
    lastError: null,
    importedCount: 0,
    updatedCount: 0,
    failedCount: 0,
    sessionExpiresAt: null,
    updatedAt: null,
  }
}

function toDoctoraliaConnectionSummary(row: DoctoraliaConnectionRow | null | undefined): DoctoraliaConnectionSummary {
  if (!row) return createDisconnectedDoctoraliaSummary()

  const baseStatus = normalizeConnectionStatus(row.connection_status)
  const isExpired = isDoctoraliaSessionExpired(row.session_expires_at)
  const hasStaleSyncLock = isDoctoraliaSyncLockStale(baseStatus, row.updated_at ?? null)

  const connectionStatus = isExpired
    ? 'expired'
    : hasStaleSyncLock
      ? 'connected'
      : baseStatus

  const lastError = hasStaleSyncLock
    ? row.last_error ?? 'La última sincronización se interrumpió. Puedes volver a intentarlo desde Agenda.'
    : row.last_error ?? null

  return {
    connectionStatus,
    lastSyncAt: row.last_sync_at ?? null,
    lastSyncResult: normalizeSyncResult(row.last_sync_result),
    lastError,
    importedCount: row.imported_count ?? 0,
    updatedCount: row.updated_count ?? 0,
    failedCount: row.failed_count ?? 0,
    sessionExpiresAt: row.session_expires_at ?? null,
    updatedAt: row.updated_at ?? null,
  }
}

export async function fetchDoctoraliaConnectionSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<DoctoraliaConnectionSummary> {
  const { data, error } = await supabase
    .from('doctoralia_connections')
    .select('user_id, connection_status, session_kind, session_secret, session_expires_at, last_sync_at, last_sync_result, last_error, imported_count, updated_count, failed_count, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    if (isMissingFoundationError(error.message)) {
      console.warn('[Doctoralia] doctoralia_connections no existe todavía; Agenda sigue operativa.')
      return createDisconnectedDoctoraliaSummary()
    }

    throw error
  }

  return toDoctoraliaConnectionSummary(data as DoctoraliaConnectionRow | null)
}

export async function fetchDoctoraliaAgendaConnectionState(
  supabase: SupabaseClient,
  userId: string
): Promise<DoctoraliaAgendaConnectionState> {
  const connection = await fetchDoctoraliaConnectionSummary(supabase, userId)

  return {
    connection,
    autoSync: getDoctoraliaAutoSyncState(connection),
  }
}

export async function fetchDoctoraliaStoredConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<DoctoraliaStoredConnection | null> {
  const { data, error } = await supabase
    .from('doctoralia_connections')
    .select('user_id, connection_status, session_kind, session_secret, session_expires_at, last_sync_at, last_sync_result, last_error, imported_count, updated_count, failed_count, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    if (isMissingFoundationError(error.message)) {
      return null
    }

    throw error
  }

  if (!data) return null

  const row = data as DoctoraliaConnectionRow
  const summary = toDoctoraliaConnectionSummary(row)

  return {
    userId,
    sessionKind: row.session_kind === 'authorization' || row.session_kind === 'cookie'
      ? row.session_kind
      : null,
    sessionSecret: row.session_secret ?? null,
    ...summary,
  }
}

export async function saveDoctoraliaConnection(
  supabase: SupabaseClient,
  userId: string,
  patch: DoctoraliaConnectionPatch
) {
  const payload = {
    user_id: userId,
    ...patch,
    updated_at: new Date().toISOString(),
  }

  return supabase
    .from('doctoralia_connections')
    .upsert(payload, { onConflict: 'user_id' })
}
