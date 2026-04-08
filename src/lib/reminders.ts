import type { Appointment, Patient } from '@/types'
import { appointmentNeedsConfirmation } from '@/lib/appointments'
import { appendFirma, DEFAULT_SETTINGS, type SettingsMap } from '@/lib/settings'
import { mensajeRecordatorioCita, resolveWhatsApp, type AppointmentReminderLead } from '@/lib/whatsapp'

type AppointmentWithPatient = Appointment & { patient?: Patient | null }

export const REMINDER_SCHEDULING_HORIZON_DAYS = 30
export const REMINDER_CHANNEL = 'whatsapp' as const
export const REMINDER_STATUS_READY = 'ready' as const

export type ReminderDispatchType = '1d' | '2h'
export type ReminderDispatchChannel = typeof REMINDER_CHANNEL
export type ReminderDispatchStatus = 'ready' | 'sent' | 'failed' | 'cancelled'

export interface ReminderDispatchPayload {
  appointmentId: string
  appointmentStart: string
  lead: ReminderDispatchType
  leadLabel: string
  message: string
  patientId: string
  patientName: string
  whatsapp: string
}

export interface ReminderDispatchRow {
  id: string
  user_id: string
  appointment_id: string
  patient_id: string | null
  reminder_type: ReminderDispatchType
  channel: ReminderDispatchChannel
  status: ReminderDispatchStatus
  scheduled_for: string
  payload: ReminderDispatchPayload
  sent_at: string | null
  created_at: string
  updated_at: string
}

export interface ReminderDispatchCandidate {
  key: string
  row: Omit<ReminderDispatchRow, 'id' | 'created_at' | 'updated_at' | 'sent_at'>
}

function reminderTypeToLead(reminderType: ReminderDispatchType): AppointmentReminderLead {
  return reminderType === '2h' ? '2h' : '1d'
}

function reminderTypeToLabel(reminderType: ReminderDispatchType): string {
  return reminderType === '2h' ? '2 horas antes' : '1 día antes'
}

export function getEnabledReminderTypes(
  settings: Partial<Pick<SettingsMap, 'recordatorio_activo' | 'recordatorio_cuando'>> | null | undefined
): ReminderDispatchType[] {
  if ((settings?.recordatorio_activo ?? DEFAULT_SETTINGS.recordatorio_activo) === 'false') {
    return []
  }

  const when = settings?.recordatorio_cuando ?? DEFAULT_SETTINGS.recordatorio_cuando

  if (when === 'ninguno') return []
  if (when === 'dia') return ['1d']
  if (when === 'horas') return ['2h']
  return ['1d', '2h']
}

export function getReminderScheduledFor(
  appointmentStartIso: string,
  reminderType: ReminderDispatchType
): Date {
  const start = new Date(appointmentStartIso)
  const deltaMinutes = reminderType === '2h' ? 120 : 24 * 60
  return new Date(start.getTime() - deltaMinutes * 60_000)
}

export function getReminderDispatchUniqueKey(
  appointmentId: string,
  reminderType: ReminderDispatchType,
  channel: ReminderDispatchChannel = REMINDER_CHANNEL
): string {
  return `${appointmentId}:${reminderType}:${channel}`
}

export function isAppointmentEligibleForReminder(
  appointment: AppointmentWithPatient,
  now = new Date()
): appointment is Appointment & { patient: Patient } {
  if (appointment.event_type !== 'patient') return false
  if (!appointment.patient) return false
  if (!appointmentNeedsConfirmation(appointment)) return false
  if (!resolveWhatsApp(appointment.patient)) return false
  return new Date(appointment.fecha_inicio).getTime() > now.getTime()
}

export function buildReminderDispatchCandidatesForAppointment(
  appointment: AppointmentWithPatient,
  settings: SettingsMap,
  now = new Date()
): ReminderDispatchCandidate[] {
  if (!isAppointmentEligibleForReminder(appointment, now)) return []

  const patient = appointment.patient
  const whatsapp = resolveWhatsApp(patient)
  if (!whatsapp) return []

  return getEnabledReminderTypes(settings).flatMap((reminderType) => {
    const scheduledFor = getReminderScheduledFor(appointment.fecha_inicio, reminderType)
    if (scheduledFor.getTime() <= now.getTime()) return []

    const payload: ReminderDispatchPayload = {
      appointmentId: appointment.id,
      appointmentStart: appointment.fecha_inicio,
      lead: reminderType,
      leadLabel: reminderTypeToLabel(reminderType),
      message: appendFirma(
        mensajeRecordatorioCita(patient, appointment, reminderTypeToLead(reminderType)),
        settings
      ),
      patientId: patient.id,
      patientName: `${patient.nombre} ${patient.apellido}`.trim(),
      whatsapp,
    }

    return [{
      key: getReminderDispatchUniqueKey(appointment.id, reminderType),
      row: {
        user_id: appointment.user_id,
        appointment_id: appointment.id,
        patient_id: patient.id,
        reminder_type: reminderType,
        channel: REMINDER_CHANNEL,
        status: REMINDER_STATUS_READY,
        scheduled_for: scheduledFor.toISOString(),
        payload,
      },
    }]
  })
}
