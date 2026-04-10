import type { Appointment } from '@/types'

export const DOCTORALIA_CONNECTION_STATUS = [
  'disconnected',
  'connected',
  'expired',
  'syncing',
  'error',
] as const

export type DoctoraliaConnectionStatus = (typeof DOCTORALIA_CONNECTION_STATUS)[number]
export type DoctoraliaSessionKind = 'authorization' | 'cookie'
export type DoctoraliaSyncStatus = 'success' | 'partial' | 'failed'
export type DoctoraliaDedupeMode = 'external-id' | 'fingerprint'
export type DoctoraliaSyncTrigger = 'manual' | 'auto'
export type DoctoraliaSyncStartReason =
  | 'ready'
  | 'disconnected'
  | 'expired'
  | 'error'
  | 'syncing'
  | 'cooldown'

export interface DoctoraliaSyncDayFailure {
  date: string
  message: string
}

export interface DoctoraliaSyncResultSummary {
  status: DoctoraliaSyncStatus
  startedAt: string
  finishedAt: string
  requestedDays: number
  successfulDays: string[]
  failedDays: DoctoraliaSyncDayFailure[]
  totalExternalAppointments: number
  importedCount: number
  updatedCount: number
  linkedCount: number
  fallbackMatchCount: number
  failedCount: number
}

export interface DoctoraliaConnectionSummary {
  connectionStatus: DoctoraliaConnectionStatus
  lastSyncAt: string | null
  lastSyncResult: DoctoraliaSyncResultSummary | null
  lastError: string | null
  importedCount: number
  updatedCount: number
  failedCount: number
  sessionExpiresAt: string | null
  updatedAt: string | null
}

export interface DoctoraliaAutoSyncState {
  shouldAttempt: boolean
  reason: DoctoraliaSyncStartReason
  nextEligibleAt: string | null
  cooldownRemainingMs: number
}

export interface DoctoraliaAgendaConnectionState {
  connection: DoctoraliaConnectionSummary
  autoSync: DoctoraliaAutoSyncState
}

export interface DoctoraliaStoredConnection extends DoctoraliaConnectionSummary {
  userId: string
  sessionKind: DoctoraliaSessionKind | null
  sessionSecret: string | null
}

export interface DoctoraliaExternalAppointment {
  id?: number | string | null
  start: string
  end: string
  attendance: number
  scheduledBy?: number
  patient?: {
    firstName?: string | null
    lastName?: string | null
  } | null
}

export interface DoctoraliaNormalizedAppointment {
  externalKey: string
  externalId: string | null
  dedupeMode: DoctoraliaDedupeMode
  sourceDay: string
  title: string
  patientName: string
  fechaInicio: string
  fechaFin: string
  estadoSesion: Appointment['estado_sesion']
  payloadHash: string
}

export interface DoctoraliaAppointmentLinkRow {
  external_key: string
  appointment_id: string
  payload_hash: string
}

export interface DoctoraliaConnectionAttemptResult {
  connection: DoctoraliaConnectionSummary
  outcome: 'connected' | 'expired' | 'error'
}

export interface DoctoraliaSyncExecutionResult {
  connection: DoctoraliaConnectionSummary
  syncResult: DoctoraliaSyncResultSummary | null
  outcome:
    | 'success'
    | 'partial'
    | 'expired'
    | 'error'
    | 'disconnected'
    | 'conflict'
    | 'cooldown'
  trigger: DoctoraliaSyncTrigger
}
