import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DoctoraliaNetworkError,
  DoctoraliaRequestError,
  DoctoraliaSessionExpiredError,
  fetchDoctoraliaDayAppointments,
  validateDoctoraliaConnection,
} from '@/lib/doctoralia/client'
import {
  buildDoctoraliaCandidateKey,
  buildDoctoraliaSyncWindow,
  normalizeDoctoraliaAppointment,
} from '@/lib/doctoralia/normalize'
import { getDoctoraliaSyncStartReason } from '@/lib/doctoralia/policy'
import { isDoctoraliaSessionExpired, normalizeDoctoraliaSessionInput } from '@/lib/doctoralia/session'
import {
  fetchDoctoraliaConnectionSummary,
  fetchDoctoraliaStoredConnection,
  saveDoctoraliaConnection,
} from '@/lib/doctoralia/persistence'
import type {
  DoctoraliaAppointmentLinkRow,
  DoctoraliaConnectionAttemptResult,
  DoctoraliaNormalizedAppointment,
  DoctoraliaStoredConnection,
  DoctoraliaSyncExecutionResult,
  DoctoraliaSyncDayFailure,
  DoctoraliaSyncResultSummary,
  DoctoraliaSyncTrigger,
} from '@/lib/doctoralia/types'
import {
  buildAppointmentDisplayTitle,
  getAppointmentEnd,
} from '@/lib/appointments'
import { isSameInstant } from '@/lib/datetime'
import { serializeAppointmentRecurrenceRule } from '@/lib/appointment-recurrence'
import { APPOINTMENT_SELECT, mapAppointmentRows } from '@/lib/supabase/mappers'
import type { Appointment } from '@/types'

const DEFAULT_DAYS_AHEAD = 30
const DEFAULT_DAYS_BEHIND = 1
const MAX_CONCURRENT_DAY_REQUESTS = 5

function buildDoctoraliaErrorMessage(error: unknown): string {
  if (error instanceof DoctoraliaSessionExpiredError) return error.message
  if (error instanceof DoctoraliaNetworkError) return error.message
  if (error instanceof DoctoraliaRequestError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'No se pudo completar la operación con Doctoralia.'
}

// Network errors are transient — the session is still valid.
// We keep the previous connection_status so the user is not forced to reconnect.
function isTransientError(error: unknown): boolean {
  return error instanceof DoctoraliaNetworkError
}

async function fetchDoctoraliaAppointmentsBatched(
  connection: DoctoraliaStoredConnection,
  dates: string[]
) {
  const successfulDays: string[] = []
  const failedDays: DoctoraliaSyncDayFailure[] = []
  const appointments: DoctoraliaNormalizedAppointment[] = []

  for (let index = 0; index < dates.length; index += MAX_CONCURRENT_DAY_REQUESTS) {
    const batch = dates.slice(index, index + MAX_CONCURRENT_DAY_REQUESTS)
    const settled = await Promise.allSettled(
      batch.map(async (date) => ({
        date,
        appointments: await fetchDoctoraliaDayAppointments(connection, date),
      }))
    )

    settled.forEach((result, batchIndex) => {
      if (result.status === 'rejected') {
        if (result.reason instanceof DoctoraliaSessionExpiredError) {
          throw result.reason
        }

        failedDays.push({
          date: batch[batchIndex] ?? 'desconocido',
          message: buildDoctoraliaErrorMessage(result.reason),
        })
        return
      }

      successfulDays.push(result.value.date)
      for (const rawAppointment of result.value.appointments) {
        appointments.push(normalizeDoctoraliaAppointment(rawAppointment, result.value.date))
      }
    })
  }

  return { appointments, successfulDays, failedDays }
}

function buildPersistedAppointmentRow(
  userId: string,
  appointmentId: string,
  normalized: DoctoraliaNormalizedAppointment,
  existing: Appointment | null
) {
  return {
    id: appointmentId,
    user_id: userId,
    patient_id: existing?.patient_id ?? null,
    consultorio_id: existing?.consultorio_id ?? null,
    event_type: 'patient' as const,
    title: normalized.title,
    category: existing?.category ?? null,
    color: existing?.color ?? null,
    recurrence_group_id: existing?.recurrence_group_id ?? null,
    recurrence_rule: serializeAppointmentRecurrenceRule(existing?.recurrence_rule ?? null),
    fecha_inicio: normalized.fechaInicio,
    fecha_fin: normalized.fechaFin,
    estado_sesion: normalized.estadoSesion,
    estado_pago: existing?.estado_pago ?? 'pendiente',
    notas: existing?.notas ?? null,
    modalidad: existing?.modalidad ?? null,
  }
}

function buildExistingAppointmentLookup(appointments: Appointment[]) {
  const appointmentById = new Map(appointments.map((appointment) => [appointment.id, appointment]))
  const candidatesByKey = new Map<string, Appointment[]>()

  for (const appointment of appointments) {
    if (appointment.event_type !== 'patient') continue

    const candidateKey = buildDoctoraliaCandidateKey({
      title: buildAppointmentDisplayTitle(appointment),
      fechaInicio: appointment.fecha_inicio,
      fechaFin: getAppointmentEnd(appointment).toISOString(),
    })

    const candidates = candidatesByKey.get(candidateKey) ?? []
    candidates.push(appointment)
    candidatesByKey.set(candidateKey, candidates)
  }

  return { appointmentById, candidatesByKey }
}

function didManagedFieldsChange(
  appointment: Appointment,
  normalized: DoctoraliaNormalizedAppointment
): boolean {
  return (
    appointment.title !== normalized.title ||
    appointment.estado_sesion !== normalized.estadoSesion ||
    !isSameInstant(appointment.fecha_inicio, normalized.fechaInicio) ||
    !isSameInstant(getAppointmentEnd(appointment).toISOString(), normalized.fechaFin)
  )
}

async function persistDoctoraliaAppointments(
  supabase: SupabaseClient,
  userId: string,
  appointments: DoctoraliaNormalizedAppointment[],
  rangeStartIso: string,
  rangeEndIso: string
) {
  const uniqueAppointments = Array.from(
    new Map(appointments.map((appointment) => [appointment.externalKey, appointment])).values()
  )

  const externalKeys = uniqueAppointments.map((appointment) => appointment.externalKey)

  const [linksResult, appointmentsResult] = await Promise.all([
    supabase
      .from('doctoralia_appointment_links')
      .select('external_key, appointment_id, payload_hash')
      .eq('user_id', userId)
      .in('external_key', externalKeys),
    supabase
      .from('appointments')
      .select(APPOINTMENT_SELECT)
      .eq('user_id', userId)
      .eq('event_type', 'patient')
      .gte('fecha_inicio', rangeStartIso)
      .lte('fecha_inicio', rangeEndIso)
      .order('fecha_inicio', { ascending: true }),
  ])

  if (linksResult.error) throw linksResult.error
  if (appointmentsResult.error) throw appointmentsResult.error

  const existingLinks = new Map(
    ((linksResult.data ?? []) as DoctoraliaAppointmentLinkRow[]).map((row) => [row.external_key, row])
  )
  const existingAppointments = mapAppointmentRows(appointmentsResult.data)
  const { appointmentById, candidatesByKey } = buildExistingAppointmentLookup(existingAppointments)
  const claimedAppointmentIds = new Set<string>()
  const appointmentUpserts: Array<Record<string, unknown>> = []
  const linkUpserts: Array<Record<string, unknown>> = []

  let importedCount = 0
  let updatedCount = 0
  let linkedCount = 0
  let fallbackMatchCount = 0

  for (const normalized of uniqueAppointments) {
    const existingLink = existingLinks.get(normalized.externalKey)
    let existingAppointment = existingLink?.appointment_id
      ? appointmentById.get(existingLink.appointment_id) ?? null
      : null
    let matchedViaFallback = false

    if (!existingAppointment) {
      const candidateKey = buildDoctoraliaCandidateKey({
        title: normalized.title,
        fechaInicio: normalized.fechaInicio,
        fechaFin: normalized.fechaFin,
      })
      const candidates = (candidatesByKey.get(candidateKey) ?? [])
        .filter((candidate) => !claimedAppointmentIds.has(candidate.id))

      if (candidates.length === 1) {
        existingAppointment = candidates[0]
        matchedViaFallback = true
        fallbackMatchCount += 1
      }
    }

    const appointmentId = existingAppointment?.id ?? randomUUID()

    if (existingAppointment) {
      claimedAppointmentIds.add(existingAppointment.id)
    }

    const shouldWriteAppointment = !existingAppointment
      || !existingLink
      || existingLink.payload_hash !== normalized.payloadHash
      || didManagedFieldsChange(existingAppointment, normalized)

    if (shouldWriteAppointment) {
      appointmentUpserts.push(
        buildPersistedAppointmentRow(userId, appointmentId, normalized, existingAppointment)
      )

      if (existingAppointment) {
        updatedCount += 1
      } else {
        importedCount += 1
      }
    } else if (!existingLink && existingAppointment) {
      linkedCount += 1
    }

    if (existingAppointment && matchedViaFallback && shouldWriteAppointment) {
      linkedCount += 1
    }

    linkUpserts.push({
      user_id: userId,
      external_key: normalized.externalKey,
      external_id: normalized.externalId,
      dedupe_mode: normalized.dedupeMode,
      appointment_id: appointmentId,
      payload_hash: normalized.payloadHash,
      last_seen_at: new Date().toISOString(),
    })
  }

  if (appointmentUpserts.length > 0) {
    const { error } = await supabase
      .from('appointments')
      .upsert(appointmentUpserts)

    if (error) throw error
  }

  if (linkUpserts.length > 0) {
    const { error } = await supabase
      .from('doctoralia_appointment_links')
      .upsert(linkUpserts, { onConflict: 'user_id,external_key' })

    if (error) throw error
  }

  return {
    importedCount,
    updatedCount,
    linkedCount,
    fallbackMatchCount,
  }
}

export async function connectDoctoraliaSession(
  supabase: SupabaseClient,
  userId: string,
  rawSessionInput: string
): Promise<DoctoraliaConnectionAttemptResult> {
  const normalizedSession = normalizeDoctoraliaSessionInput(rawSessionInput)
  const nowIso = new Date().toISOString()

  const provisionalConnection: DoctoraliaStoredConnection = {
    userId,
    connectionStatus: 'connected',
    lastSyncAt: null,
    lastSyncResult: null,
    lastError: null,
    importedCount: 0,
    updatedCount: 0,
    failedCount: 0,
    sessionExpiresAt: normalizedSession.sessionExpiresAt,
    updatedAt: nowIso,
    sessionKind: normalizedSession.sessionKind,
    sessionSecret: normalizedSession.sessionSecret,
  }

  if (isDoctoraliaSessionExpired(normalizedSession.sessionExpiresAt)) {
    await saveDoctoraliaConnection(supabase, userId, {
      connection_status: 'expired',
      session_kind: normalizedSession.sessionKind,
      session_secret: normalizedSession.sessionSecret,
      session_expires_at: normalizedSession.sessionExpiresAt,
      last_error: 'La sesión ya está vencida. Genera una credencial nueva y vuelve a intentarlo.',
    })

    return {
      connection: await fetchDoctoraliaConnectionSummary(supabase, userId),
      outcome: 'expired',
    }
  }

  try {
    await validateDoctoraliaConnection(provisionalConnection)

    await saveDoctoraliaConnection(supabase, userId, {
      connection_status: 'connected',
      session_kind: normalizedSession.sessionKind,
      session_secret: normalizedSession.sessionSecret,
      session_expires_at: normalizedSession.sessionExpiresAt,
      connected_at: nowIso,
      last_error: null,
      failed_count: 0,
    })

    console.info(`[Doctoralia] user=${userId} sesión validada correctamente`)

    return {
      connection: await fetchDoctoraliaConnectionSummary(supabase, userId),
      outcome: 'connected',
    }
  } catch (error) {
    const outcome = error instanceof DoctoraliaSessionExpiredError ? 'expired' : 'error'
    const status = outcome === 'expired' ? 'expired' : 'error'
    const message = buildDoctoraliaErrorMessage(error)

    await saveDoctoraliaConnection(supabase, userId, {
      connection_status: status,
      session_kind: normalizedSession.sessionKind,
      session_secret: normalizedSession.sessionSecret,
      session_expires_at: normalizedSession.sessionExpiresAt,
      last_error: message,
    })

    console.warn(`[Doctoralia] user=${userId} no se pudo validar la sesión: ${message}`)

    return {
      connection: await fetchDoctoraliaConnectionSummary(supabase, userId),
      outcome,
    }
  }
}

export async function syncDoctoraliaConnectionForUser(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    trigger?: DoctoraliaSyncTrigger
  }
): Promise<DoctoraliaSyncExecutionResult> {
  const trigger = options?.trigger ?? 'manual'
  const connection = await fetchDoctoraliaStoredConnection(supabase, userId)

  if (!connection || !connection.sessionSecret || !connection.sessionKind) {
    if (trigger === 'manual') {
      await saveDoctoraliaConnection(supabase, userId, {
        connection_status: 'disconnected',
        last_error: 'Conecta Doctoralia antes de sincronizar.',
      })
    }

    const nextConnection = await fetchDoctoraliaConnectionSummary(supabase, userId)

    return {
      connection: nextConnection,
      syncResult: null,
      outcome: 'disconnected',
      trigger,
    }
  }

  const startReason = getDoctoraliaSyncStartReason(connection, trigger)

  if (startReason !== 'ready') {
    return {
      connection,
      syncResult: null,
      outcome:
        startReason === 'syncing'
          ? 'conflict'
          : startReason === 'cooldown'
            ? 'cooldown'
            : startReason,
      trigger,
    }
  }

  if (isDoctoraliaSessionExpired(connection.sessionExpiresAt)) {
    await saveDoctoraliaConnection(supabase, userId, {
      connection_status: 'expired',
      last_error: 'La sesión guardada ya expiró. Reconéctala desde Agenda.',
    })

    return {
      connection: await fetchDoctoraliaConnectionSummary(supabase, userId),
      syncResult: null,
      outcome: 'expired',
      trigger,
    }
  }

  const syncWindow = buildDoctoraliaSyncWindow(DEFAULT_DAYS_AHEAD, DEFAULT_DAYS_BEHIND)
  const startedAt = new Date().toISOString()

  await saveDoctoraliaConnection(supabase, userId, {
    connection_status: 'syncing',
    last_error: null,
  })

  try {
    console.info(`[Doctoralia sync] user=${userId} start days=${syncWindow.dates.length}`)

    const fetched = await fetchDoctoraliaAppointmentsBatched(connection, syncWindow.dates)
    const persistence = await persistDoctoraliaAppointments(
      supabase,
      userId,
      fetched.appointments,
      syncWindow.rangeStartIso,
      syncWindow.rangeEndIso
    )

    const finishedAt = new Date().toISOString()
    const failedCount = fetched.failedDays.length
    const status = failedCount > 0 ? 'partial' : 'success'
    const syncResult: DoctoraliaSyncResultSummary = {
      status,
      startedAt,
      finishedAt,
      requestedDays: syncWindow.dates.length,
      successfulDays: fetched.successfulDays,
      failedDays: fetched.failedDays,
      totalExternalAppointments: fetched.appointments.length,
      importedCount: persistence.importedCount,
      updatedCount: persistence.updatedCount,
      linkedCount: persistence.linkedCount,
      fallbackMatchCount: persistence.fallbackMatchCount,
      failedCount,
    }

    await saveDoctoraliaConnection(supabase, userId, {
      connection_status: 'connected',
      last_sync_at: fetched.successfulDays.length > 0 ? finishedAt : connection.lastSyncAt,
      last_sync_result: syncResult,
      last_error: failedCount > 0 ? 'La sincronización terminó con fallos parciales. Conservamos los datos válidos previos.' : null,
      imported_count: persistence.importedCount,
      updated_count: persistence.updatedCount,
      failed_count: failedCount,
    })

    console.info(
      `[Doctoralia sync] user=${userId} status=${status} imported=${persistence.importedCount} updated=${persistence.updatedCount} failed=${failedCount}`
    )

    return {
      connection: await fetchDoctoraliaConnectionSummary(supabase, userId),
      syncResult,
      outcome: status === 'partial' ? 'partial' : 'success',
      trigger,
    }
  } catch (error) {
    const message = buildDoctoraliaErrorMessage(error)
    const isAuth = error instanceof DoctoraliaSessionExpiredError
    const isNetwork = isTransientError(error)

    // Network errors are transient — preserve the existing connection_status
    // so the user is not forced to reconnect after a momentary outage.
    const outcome = isAuth ? 'expired' : 'error'
    await saveDoctoraliaConnection(supabase, userId, {
      connection_status: isAuth
        ? 'expired'
        : isNetwork
          ? connection.connectionStatus  // preserve: session still valid
          : 'error',
      last_error: message,
      failed_count: isNetwork ? connection.failedCount : connection.failedCount + 1,
    })

    console.warn(
      `[Doctoralia sync] user=${userId} outcome=${outcome} isNetwork=${isNetwork} message=${message}`
    )

    return {
      connection: await fetchDoctoraliaConnectionSummary(supabase, userId),
      syncResult: null,
      outcome,
      trigger,
    }
  }
}
