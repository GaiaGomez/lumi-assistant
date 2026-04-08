// ============================================================
// CRON: RECORDATORIOS — prepara recordatorios despachables
// con deduplicación real, pero sin fingir un envío automático
// cuando el canal de salida aún no existe.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { APPOINTMENT_SELECT, mapAppointmentRows } from '@/lib/supabase/mappers'
import {
  buildReminderDispatchCandidatesForAppointment,
  getReminderDispatchUniqueKey,
  REMINDER_CHANNEL,
  REMINDER_SCHEDULING_HORIZON_DAYS,
  type ReminderDispatchCandidate,
  type ReminderDispatchRow,
} from '@/lib/reminders'
import { mergeSettingsRows, type SettingsMap } from '@/lib/settings'

const REMINDER_SETTING_KEYS = [
  'recordatorio_activo',
  'recordatorio_cuando',
  'recordatorio_firma',
] as const

type ReminderSettingKey = (typeof REMINDER_SETTING_KEYS)[number]
type ReminderSettingsRow = {
  user_id: string
  key: ReminderSettingKey
  value: string
}

type ReminderDispatchDbRow = Pick<
  ReminderDispatchRow,
  | 'id'
  | 'user_id'
  | 'appointment_id'
  | 'patient_id'
  | 'reminder_type'
  | 'channel'
  | 'status'
  | 'scheduled_for'
  | 'payload'
>

function buildSettingsByUser(
  rows: ReminderSettingsRow[],
  userIds: string[]
): Record<string, SettingsMap> {
  const grouped = new Map<string, ReminderSettingsRow[]>()

  rows.forEach((row) => {
    const bucket = grouped.get(row.user_id)
    if (bucket) {
      bucket.push(row)
      return
    }
    grouped.set(row.user_id, [row])
  })

  return Object.fromEntries(
    userIds.map((userId) => [userId, mergeSettingsRows(grouped.get(userId))])
  )
}

function buildCandidateMap(candidates: ReminderDispatchCandidate[]) {
  return new Map(candidates.map((candidate) => [candidate.key, candidate]))
}

function payloadSignature(value: unknown) {
  return JSON.stringify(value ?? null)
}

function candidateNeedsUpdate(
  existing: ReminderDispatchDbRow,
  candidate: ReminderDispatchCandidate
): boolean {
  return (
    existing.status !== 'ready' ||
    existing.patient_id !== candidate.row.patient_id ||
    existing.scheduled_for !== candidate.row.scheduled_for ||
    payloadSignature(existing.payload) !== payloadSignature(candidate.row.payload)
  )
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const reminderHorizon = new Date(now.getTime() + REMINDER_SCHEDULING_HORIZON_DAYS * 24 * 60 * 60 * 1000)
  const appointmentHorizon = new Date(reminderHorizon.getTime() + 24 * 60 * 60 * 1000)

  const { data: existingReminderRows, error: existingReminderError } = await supabase
    .from('reminder_dispatches')
    .select('id, user_id, appointment_id, patient_id, reminder_type, channel, status, scheduled_for, payload')
    .eq('channel', REMINDER_CHANNEL)
    .gte('scheduled_for', now.toISOString())
    .lte('scheduled_for', reminderHorizon.toISOString())

  if (existingReminderError) {
    console.error('[Cron recordatorio] Error leyendo reminder_dispatches:', existingReminderError.message)
    return NextResponse.json({ error: existingReminderError.message }, { status: 500 })
  }

  const existingRows = (existingReminderRows ?? []) as ReminderDispatchDbRow[]
  const existingAppointmentIds = Array.from(new Set(existingRows.map((row) => row.appointment_id)))

  const upcomingAppointmentsPromise = supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('event_type', 'patient')
    .not('patient_id', 'is', null)
    .gte('fecha_inicio', now.toISOString())
    .lte('fecha_inicio', appointmentHorizon.toISOString())

  const existingAppointmentsPromise = existingAppointmentIds.length > 0
    ? supabase
        .from('appointments')
        .select(APPOINTMENT_SELECT)
        .in('id', existingAppointmentIds)
    : Promise.resolve({ data: [], error: null })

  const [upcomingAppointmentsResult, existingAppointmentsResult] = await Promise.all([
    upcomingAppointmentsPromise,
    existingAppointmentsPromise,
  ])

  if (upcomingAppointmentsResult.error) {
    console.error('[Cron recordatorio] Error leyendo citas futuras:', upcomingAppointmentsResult.error.message)
    return NextResponse.json({ error: upcomingAppointmentsResult.error.message }, { status: 500 })
  }

  if (existingAppointmentsResult.error) {
    console.error('[Cron recordatorio] Error leyendo citas con recordatorios existentes:', existingAppointmentsResult.error.message)
    return NextResponse.json({ error: existingAppointmentsResult.error.message }, { status: 500 })
  }

  const appointmentMap = new Map(
    [...mapAppointmentRows(upcomingAppointmentsResult.data), ...mapAppointmentRows(existingAppointmentsResult.data)]
      .map((appointment) => [appointment.id, appointment])
  )
  const appointments = Array.from(appointmentMap.values())
  const userIds = Array.from(new Set(appointments.map((appointment) => appointment.user_id)))

  if (appointments.length === 0 && existingRows.length === 0) {
    return NextResponse.json({
      success: true,
      deliveryMode: 'queue-only',
      prepared: 0,
      updated: 0,
      cancelled: 0,
      unchanged: 0,
      lockedSent: 0,
      message: 'No hay citas futuras ni recordatorios pendientes en el horizonte actual.',
    })
  }

  const { data: reminderSettingsRows, error: reminderSettingsError } = userIds.length > 0
    ? await supabase
        .from('settings')
        .select('user_id, key, value')
        .in('user_id', userIds)
        .in('key', [...REMINDER_SETTING_KEYS])
    : { data: [], error: null }

  if (reminderSettingsError) {
    console.error('[Cron recordatorio] Error leyendo settings:', reminderSettingsError.message)
    return NextResponse.json({ error: reminderSettingsError.message }, { status: 500 })
  }

  const settingsByUser = buildSettingsByUser(
    (reminderSettingsRows ?? []) as ReminderSettingsRow[],
    userIds
  )

  const candidates = appointments.flatMap((appointment) =>
    buildReminderDispatchCandidatesForAppointment(
      appointment,
      settingsByUser[appointment.user_id],
      now
    )
  )

  const candidateMap = buildCandidateMap(candidates)
  const existingMap = new Map(
    existingRows.map((row) => [
      getReminderDispatchUniqueKey(row.appointment_id, row.reminder_type, row.channel),
      row,
    ])
  )

  const inserts = candidates
    .filter((candidate) => !existingMap.has(candidate.key))
    .map((candidate) => candidate.row)

  const updates = candidates
    .flatMap((candidate) => {
      const existing = existingMap.get(candidate.key)
      if (!existing || existing.status === 'sent') return []
      if (!candidateNeedsUpdate(existing, candidate)) return []
      return [{
        id: existing.id,
        patient_id: candidate.row.patient_id,
        scheduled_for: candidate.row.scheduled_for,
        status: candidate.row.status,
        payload: candidate.row.payload,
      }]
    })

  const cancelIds = existingRows
    .filter((row) => row.status === 'ready')
    .filter((row) => !candidateMap.has(
      getReminderDispatchUniqueKey(row.appointment_id, row.reminder_type, row.channel)
    ))
    .map((row) => row.id)

  const unchanged = candidates.filter((candidate) => {
    const existing = existingMap.get(candidate.key)
    return !!existing && existing.status === 'ready' && !candidateNeedsUpdate(existing, candidate)
  }).length

  const lockedSent = candidates.filter((candidate) => {
    const existing = existingMap.get(candidate.key)
    return existing?.status === 'sent'
  }).length

  if (inserts.length > 0) {
    const { error } = await supabase
      .from('reminder_dispatches')
      .upsert(inserts, {
        onConflict: 'user_id,appointment_id,reminder_type,channel',
        ignoreDuplicates: true,
      })

    if (error) {
      console.error('[Cron recordatorio] Error insertando recordatorios:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  if (updates.length > 0) {
    const results = await Promise.all(
      updates.map((row) =>
        supabase
          .from('reminder_dispatches')
          .update({
            patient_id: row.patient_id,
            scheduled_for: row.scheduled_for,
            status: row.status,
            payload: row.payload,
          })
          .eq('id', row.id)
      )
    )

    const firstError = results.find((result) => result.error)?.error
    if (firstError) {
      console.error('[Cron recordatorio] Error actualizando recordatorios:', firstError.message)
      return NextResponse.json({ error: firstError.message }, { status: 500 })
    }
  }

  if (cancelIds.length > 0) {
    const { error } = await supabase
      .from('reminder_dispatches')
      .update({ status: 'cancelled' })
      .in('id', cancelIds)

    if (error) {
      console.error('[Cron recordatorio] Error cancelando recordatorios obsoletos:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  console.log('[Cron recordatorio] Queue sync', {
    appointments: appointments.length,
    prepared: inserts.length,
    updated: updates.length,
    cancelled: cancelIds.length,
    unchanged,
    lockedSent,
  })

  return NextResponse.json({
    success: true,
    deliveryMode: 'queue-only',
    prepared: inserts.length,
    updated: updates.length,
    cancelled: cancelIds.length,
    unchanged,
    lockedSent,
    queueChannel: REMINDER_CHANNEL,
    message: 'Recordatorios preparados de forma segura para un canal de despacho futuro.',
  })
}
