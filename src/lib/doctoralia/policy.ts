import type {
  DoctoraliaAutoSyncState,
  DoctoraliaConnectionSummary,
  DoctoraliaSyncStartReason,
  DoctoraliaSyncTrigger,
} from '@/lib/doctoralia/types'

export const DOCTORALIA_AUTO_SYNC_COOLDOWN_MS = 5 * 60 * 1000
export const DOCTORALIA_SYNC_LOCK_MS = 10 * 60 * 1000

function toTimestamp(value: string | null | undefined): number | null {
  if (!value) return null

  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

export function isDoctoraliaSyncLockActive(
  connectionStatus: DoctoraliaConnectionSummary['connectionStatus'],
  updatedAt: string | null
): boolean {
  if (connectionStatus !== 'syncing') return false

  const updatedAtTimestamp = toTimestamp(updatedAt)
  if (!updatedAtTimestamp) return false

  return Date.now() - updatedAtTimestamp < DOCTORALIA_SYNC_LOCK_MS
}

export function isDoctoraliaSyncLockStale(
  connectionStatus: DoctoraliaConnectionSummary['connectionStatus'],
  updatedAt: string | null
): boolean {
  if (connectionStatus !== 'syncing') return false

  const updatedAtTimestamp = toTimestamp(updatedAt)
  if (!updatedAtTimestamp) return true

  return Date.now() - updatedAtTimestamp >= DOCTORALIA_SYNC_LOCK_MS
}

function resolveCooldownWindow(connection: DoctoraliaConnectionSummary) {
  const lastSyncTimestamp = toTimestamp(connection.lastSyncAt)
  if (!lastSyncTimestamp) {
    return {
      nextEligibleAt: null,
      cooldownRemainingMs: 0,
    }
  }

  const nextEligibleTimestamp = lastSyncTimestamp + DOCTORALIA_AUTO_SYNC_COOLDOWN_MS
  const cooldownRemainingMs = Math.max(0, nextEligibleTimestamp - Date.now())

  return {
    nextEligibleAt: new Date(nextEligibleTimestamp).toISOString(),
    cooldownRemainingMs,
  }
}

export function getDoctoraliaSyncStartReason(
  connection: DoctoraliaConnectionSummary,
  trigger: DoctoraliaSyncTrigger
): DoctoraliaSyncStartReason {
  if (connection.connectionStatus === 'disconnected') return 'disconnected'
  if (connection.connectionStatus === 'expired') return 'expired'
  if (connection.connectionStatus === 'error') return 'error'
  if (isDoctoraliaSyncLockActive(connection.connectionStatus, connection.updatedAt)) return 'syncing'

  if (trigger === 'auto') {
    const { cooldownRemainingMs } = resolveCooldownWindow(connection)
    if (cooldownRemainingMs > 0) return 'cooldown'
  }

  return 'ready'
}

export function getDoctoraliaAutoSyncState(
  connection: DoctoraliaConnectionSummary
): DoctoraliaAutoSyncState {
  const reason = getDoctoraliaSyncStartReason(connection, 'auto')
  const cooldown = resolveCooldownWindow(connection)

  return {
    shouldAttempt: reason === 'ready',
    reason,
    nextEligibleAt: reason === 'cooldown' ? cooldown.nextEligibleAt : null,
    cooldownRemainingMs: reason === 'cooldown' ? cooldown.cooldownRemainingMs : 0,
  }
}
