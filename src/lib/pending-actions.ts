import type { Appointment, Patient } from '@/types'
import { formatDateTimeFull } from '@/lib/format'
import {
  appointmentNeedsConfirmation,
  getDaysInactive,
  getLastPastAppointment,
  getNextAppointment,
  getOldestPendingPayment,
  getPendingPayments,
  REACTIVATION_INACTIVITY_DAYS,
  getTodayAppointments,
  getTomorrowPendingAppointments,
} from '@/lib/appointments'
import { appendFirma, interpolate, type SettingsMap } from '@/lib/settings'
import { generarLinkWhatsApp, mensajeRecordatorioCita, resolveWhatsApp } from '@/lib/whatsapp'

type AppointmentWithPatient = Appointment & { patient?: Patient | null }

export type PendingActionType =
  | 'confirmar_cita_hoy'
  | 'confirmar_cita_manana'
  | 'cobrar_sesion_realizada'
  | 'paciente_sin_proxima'
  | 'reactivar_paciente'

export type PendingActionPriority = 1 | 2 | 3 | 4 | 5

export interface PendingAction {
  id: string
  type: PendingActionType
  priority: PendingActionPriority
  source: 'appointment' | 'patient'
  patient: Patient
  patientId: string
  appointment?: Appointment
  appointmentId?: string
  title: string
  description: string
  context: string
  preview?: string
  internalActions: Array<'open_patient' | 'update_session' | 'update_payment'>
  externalAction?: {
    label: string
    href: string
  }
}

export const PENDING_ACTION_SECTION_ORDER: PendingActionType[] = [
  'confirmar_cita_hoy',
  'confirmar_cita_manana',
  'cobrar_sesion_realizada',
  'paciente_sin_proxima',
  'reactivar_paciente',
]

export const PENDING_ACTION_SECTION_LABEL: Record<PendingActionType, string> = {
  confirmar_cita_hoy: 'Por confirmar hoy',
  confirmar_cita_manana: 'Por confirmar mañana',
  cobrar_sesion_realizada: 'Sin cobrar',
  paciente_sin_proxima: 'Sin próxima cita',
  reactivar_paciente: 'Reactivar',
}

export interface PatientWhatsAppQuickAction {
  key: 'payment' | 'no-next' | 'resume'
  label: string
  hint: string
  href: string
  accent: 'glass' | 'soft'
}

function previewMessage(message: string) {
  return message.length > 84 ? `${message.slice(0, 84)}...` : message
}

function hasPatient(appointment: AppointmentWithPatient): appointment is Appointment & { patient: Patient } {
  return !!appointment.patient
}

function buildWhatsAppAction(label: string, href: string | null | undefined) {
  if (!href || href === '#') return undefined
  return { label, href }
}

export function buildPatientWhatsAppQuickActions(
  patient: Patient,
  appointments: Appointment[],
  settings: SettingsMap,
  now = new Date()
): PatientWhatsAppQuickAction[] {
  const whatsapp = resolveWhatsApp(patient)
  if (!whatsapp) return []

  const nextAppointment = getNextAppointment(appointments, now)
  const lastPastAppointment = getLastPastAppointment(appointments, now)
  const oldestPendingPayment = getOldestPendingPayment(appointments)
  const daysInactive = getDaysInactive(lastPastAppointment, now)

  const actions: PatientWhatsAppQuickAction[] = []

  // Umbral de reactivación: usa el setting del usuario si está definido
  const reactivationDays = parseInt(settings['pacientes_dias_reactivar'] ?? String(REACTIVATION_INACTIVITY_DAYS))

  if (oldestPendingPayment) {
    const message = appendFirma(
      interpolate(settings['template_cobros'], {
        first_name:   patient.nombre,
        session_date: formatDateTimeFull(oldestPendingPayment.fecha_inicio),
      }),
      settings
    )
    const href = generarLinkWhatsApp(whatsapp, message)
    if (href !== '#') {
      actions.push({
        key: 'payment',
        label: 'Sin cobrar',
        hint: 'Sin cobrar',
        href,
        accent: 'soft',
      })
    }
  }

  if (lastPastAppointment && !nextAppointment) {
    const message = appendFirma(
      interpolate(settings['template_sin_proxima'], {
        first_name:  patient.nombre,
        booking_url: settings['booking_url'],
      }),
      settings
    )
    const href = generarLinkWhatsApp(whatsapp, message)
    if (href !== '#') {
      actions.push({
        key: 'no-next',
        label: 'Sin próxima cita',
        hint: 'Última cita asistida sin una nueva cita agendada.',
        href,
        accent: 'glass',
      })
    }
  }

  if (lastPastAppointment && !nextAppointment && daysInactive !== null && daysInactive > reactivationDays) {
    const message = appendFirma(
      interpolate(settings['template_retomar'], {
        first_name:    patient.nombre,
        days_inactive: String(daysInactive),
      }),
      settings
    )
    const href = generarLinkWhatsApp(whatsapp, message)
    if (href !== '#') {
      actions.push({
        key: 'resume',
        label: 'Reactivar',
        hint: `${daysInactive} días sin cita nueva.`,
        href,
        accent: 'glass',
      })
    }
  }

  return actions
}

export function buildPendingActions(
  appointments: AppointmentWithPatient[],
  patients: Patient[],
  settings: SettingsMap,
  now = new Date()
): PendingAction[] {
  const actions: PendingAction[] = []
  const appointmentActions = appointments.filter(hasPatient)

  // Umbral de reactivación configurable por el usuario
  const reactivationDays = parseInt(settings['pacientes_dias_reactivar'] ?? String(REACTIVATION_INACTIVITY_DAYS))

  getTodayAppointments(appointmentActions, now)
    .filter(appointmentNeedsConfirmation)
    .forEach((appointment) => {
      if (!appointment.patient) return
      const patient = appointment.patient
      const rawMsg = mensajeRecordatorioCita(patient, appointment, '2h')
      actions.push({
        id: `confirmar-hoy-${appointment.id}`,
        type: 'confirmar_cita_hoy',
        priority: 1,
        source: 'appointment',
        patient,
        patientId: patient.id,
        appointment,
        appointmentId: appointment.id,
        title: 'Confirmar hoy',
        description: 'Hoy sin confirmar',
        context: formatDateTimeFull(appointment.fecha_inicio),
        preview: previewMessage(appendFirma(rawMsg, settings)),
        internalActions: ['open_patient', 'update_session', 'update_payment'],
        externalAction: buildWhatsAppAction(
          'Abrir WhatsApp',
          generarLinkWhatsApp(resolveWhatsApp(patient), appendFirma(rawMsg, settings))
        ),
      })
    })

  getTomorrowPendingAppointments(appointmentActions, now)
    .forEach((appointment) => {
      if (!appointment.patient) return
      const patient = appointment.patient
      const rawMsg = mensajeRecordatorioCita(patient, appointment, '1d')
      actions.push({
        id: `confirmar-manana-${appointment.id}`,
        type: 'confirmar_cita_manana',
        priority: 2,
        source: 'appointment',
        patient,
        patientId: patient.id,
        appointment,
        appointmentId: appointment.id,
        title: 'Confirmar mañana',
        description: 'Mañana sin confirmar',
        context: formatDateTimeFull(appointment.fecha_inicio),
        preview: previewMessage(appendFirma(rawMsg, settings)),
        internalActions: ['open_patient', 'update_session', 'update_payment'],
        externalAction: buildWhatsAppAction(
          'Abrir WhatsApp',
          generarLinkWhatsApp(resolveWhatsApp(patient), appendFirma(rawMsg, settings))
        ),
      })
    })

  getPendingPayments(appointmentActions).forEach((appointment) => {
    if (!appointment.patient) return
    const patient = appointment.patient
    const message = appendFirma(
      interpolate(settings['template_cobros'], {
        first_name:   patient.nombre,
        session_date: formatDateTimeFull(appointment.fecha_inicio),
      }),
      settings
    )

    actions.push({
      id: `cobro-${appointment.id}`,
      type: 'cobrar_sesion_realizada',
      priority: 3,
      source: 'appointment',
      patient,
      patientId: patient.id,
      appointment,
      appointmentId: appointment.id,
      title: 'Cobrar',
      description: 'Realizada · sin cobrar',
      context: `Cita del ${formatDateTimeFull(appointment.fecha_inicio)}`,
      preview: previewMessage(message),
      internalActions: ['open_patient', 'update_session', 'update_payment'],
      externalAction: buildWhatsAppAction(
        'Abrir WhatsApp',
        generarLinkWhatsApp(resolveWhatsApp(patient), message)
      ),
    })
  })

  patients.forEach((patient) => {
    const patientAppointments = appointmentActions.filter((appointment) => appointment.patient.id === patient.id)
    const futureAppointment = getNextAppointment(patientAppointments, now)
    const lastPastAppointment = getLastPastAppointment(patientAppointments, now)

    if (!lastPastAppointment || futureAppointment) return

    const daysWithoutSchedule = getDaysInactive(lastPastAppointment, now)
    if (daysWithoutSchedule === null) return

    if (daysWithoutSchedule > reactivationDays) {
      const message = appendFirma(
        interpolate(settings['template_retomar'], {
          first_name:    patient.nombre,
          days_inactive: String(daysWithoutSchedule),
        }),
        settings
      )

      actions.push({
        id: `reactivar-${patient.id}`,
        type: 'reactivar_paciente',
        priority: 5,
        source: 'patient',
        patient,
        patientId: patient.id,
        title: 'Reactivar',
        description: `${daysWithoutSchedule} días sin cita nueva.`,
        context: `Última cita ${formatDateTimeFull(lastPastAppointment.fecha_inicio)}`,
        preview: previewMessage(message),
        internalActions: ['open_patient'],
        externalAction: buildWhatsAppAction(
          'Abrir WhatsApp',
          generarLinkWhatsApp(resolveWhatsApp(patient), message)
        ),
      })
      return
    }

    const message = appendFirma(
      interpolate(settings['template_sin_proxima'], {
        first_name:  patient.nombre,
        booking_url: settings['booking_url'],
      }),
      settings
    )

    actions.push({
      id: `sin-proxima-${patient.id}`,
      type: 'paciente_sin_proxima',
      priority: 4,
      source: 'patient',
      patient,
      patientId: patient.id,
      title: 'Sin próxima cita',
      description: 'No tiene una próxima cita agendada después de su última cita.',
      context: `Última sesión ${formatDateTimeFull(lastPastAppointment.fecha_inicio)}`,
      preview: previewMessage(message),
      internalActions: ['open_patient'],
      externalAction: buildWhatsAppAction(
        'Abrir WhatsApp',
        generarLinkWhatsApp(resolveWhatsApp(patient), message)
      ),
    })
  })

  return actions.sort((a, b) => a.priority - b.priority)
}
