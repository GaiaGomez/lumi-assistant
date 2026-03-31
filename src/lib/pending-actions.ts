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
import { interpolate, type SettingsMap } from '@/lib/settings'
import { generarLinkWhatsApp, linkRecordatorioCita, mensajeRecordatorioCita } from '@/lib/whatsapp'

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
  confirmar_cita_hoy: 'Hoy por confirmar',
  confirmar_cita_manana: 'Mañana por confirmar',
  cobrar_sesion_realizada: 'Cobros pendientes',
  paciente_sin_proxima: 'Sin próxima sesión',
  reactivar_paciente: 'Reactivar seguimiento',
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
  if (!patient.whatsapp) return []

  const nextAppointment = getNextAppointment(appointments, now)
  const lastPastAppointment = getLastPastAppointment(appointments, now)
  const oldestPendingPayment = getOldestPendingPayment(appointments)
  const daysInactive = getDaysInactive(lastPastAppointment, now)

  const actions: PatientWhatsAppQuickAction[] = []

  if (oldestPendingPayment) {
    const message = interpolate(settings['template_cobros'], {
      first_name: patient.nombre,
      session_date: formatDateTimeFull(oldestPendingPayment.fecha_inicio),
    })

    const href = generarLinkWhatsApp(patient.whatsapp, message)
    if (href !== '#') {
      actions.push({
        key: 'payment',
        label: 'Cobro pendiente',
        hint: 'Cobro pendiente',
        href,
        accent: 'soft',
      })
    }
  }

  if (lastPastAppointment && !nextAppointment) {
    const message = interpolate(settings['template_sin_proxima'], {
      first_name: patient.nombre,
      booking_url: settings['doctoralia_url'],
    })

    const href = generarLinkWhatsApp(patient.whatsapp, message)
    if (href !== '#') {
      actions.push({
        key: 'no-next',
        label: 'Sin próxima sesión',
        hint: 'Última sesión asistida sin una nueva cita agendada.',
        href,
        accent: 'glass',
      })
    }
  }

  if (lastPastAppointment && !nextAppointment && daysInactive !== null && daysInactive > REACTIVATION_INACTIVITY_DAYS) {
    const message = interpolate(settings['template_retomar'], {
      first_name: patient.nombre,
      days_inactive: String(daysInactive),
    })

    const href = generarLinkWhatsApp(patient.whatsapp, message)
    if (href !== '#') {
      actions.push({
        key: 'resume',
        label: 'Retomar proceso',
        hint: `${daysInactive} días sin una nueva cita agendada.`,
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

  getTodayAppointments(appointmentActions, now)
    .filter(appointmentNeedsConfirmation)
    .forEach((appointment) => {
      if (!appointment.patient) return
      const patient = appointment.patient
      actions.push({
        id: `confirmar-hoy-${appointment.id}`,
        type: 'confirmar_cita_hoy',
        priority: 1,
        source: 'appointment',
        patient,
        patientId: patient.id,
        appointment,
        appointmentId: appointment.id,
        title: 'Confirmar cita de hoy',
        description: 'La sesión de hoy sigue pendiente de confirmación.',
        context: formatDateTimeFull(appointment.fecha_inicio),
        preview: previewMessage(mensajeRecordatorioCita(patient, appointment)),
        internalActions: ['open_patient', 'update_session', 'update_payment'],
        externalAction: buildWhatsAppAction(
          'Abrir WhatsApp',
          linkRecordatorioCita(patient, appointment)
        ),
      })
    })

  getTomorrowPendingAppointments(appointmentActions, now)
    .forEach((appointment) => {
      if (!appointment.patient) return
      const patient = appointment.patient
      actions.push({
        id: `confirmar-manana-${appointment.id}`,
        type: 'confirmar_cita_manana',
        priority: 2,
        source: 'appointment',
        patient,
        patientId: patient.id,
        appointment,
        appointmentId: appointment.id,
        title: 'Confirmar cita de mañana',
        description: 'La sesión de mañana sigue pendiente de confirmación.',
        context: formatDateTimeFull(appointment.fecha_inicio),
        preview: previewMessage(mensajeRecordatorioCita(patient, appointment)),
        internalActions: ['open_patient', 'update_session', 'update_payment'],
        externalAction: buildWhatsAppAction(
          'Abrir WhatsApp',
          linkRecordatorioCita(patient, appointment)
        ),
      })
    })

  getPendingPayments(appointmentActions).forEach((appointment) => {
    if (!appointment.patient) return
    const patient = appointment.patient
    const message = interpolate(settings['template_cobros'], {
      first_name: patient.nombre,
      session_date: formatDateTimeFull(appointment.fecha_inicio),
    })

    actions.push({
      id: `cobro-${appointment.id}`,
      type: 'cobrar_sesion_realizada',
      priority: 3,
      source: 'appointment',
      patient,
      patientId: patient.id,
      appointment,
      appointmentId: appointment.id,
      title: 'Cobrar sesión realizada',
      description: 'La sesión ya fue realizada y el pago sigue pendiente.',
      context: `Sesión del ${formatDateTimeFull(appointment.fecha_inicio)}`,
      preview: previewMessage(message),
      internalActions: ['open_patient', 'update_session', 'update_payment'],
      externalAction: buildWhatsAppAction(
        'Abrir WhatsApp',
        generarLinkWhatsApp(patient.whatsapp, message)
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

    if (daysWithoutSchedule > REACTIVATION_INACTIVITY_DAYS) {
      const message = interpolate(settings['template_retomar'], {
        first_name: patient.nombre,
        days_inactive: String(daysWithoutSchedule),
      })

      actions.push({
        id: `reactivar-${patient.id}`,
        type: 'reactivar_paciente',
        priority: 5,
        source: 'patient',
        patient,
        patientId: patient.id,
        title: 'Reactivar paciente',
        description: `Han pasado ${daysWithoutSchedule} días sin una nueva cita agendada.`,
        context: `Última sesión ${formatDateTimeFull(lastPastAppointment.fecha_inicio)}`,
        preview: previewMessage(message),
        internalActions: ['open_patient'],
        externalAction: buildWhatsAppAction(
          'Abrir WhatsApp',
          generarLinkWhatsApp(patient.whatsapp, message)
        ),
      })
      return
    }

    const bookingUrl = settings['doctoralia_url']
    const message = interpolate(settings['template_sin_proxima'], {
      first_name: patient.nombre,
      booking_url: bookingUrl,
    })

    actions.push({
      id: `sin-proxima-${patient.id}`,
      type: 'paciente_sin_proxima',
      priority: 4,
      source: 'patient',
      patient,
      patientId: patient.id,
      title: 'Paciente sin próxima sesión',
      description: 'No tiene una próxima cita agendada después de su última sesión.',
      context: `Última sesión ${formatDateTimeFull(lastPastAppointment.fecha_inicio)}`,
      preview: previewMessage(message),
      internalActions: ['open_patient'],
      externalAction: buildWhatsAppAction(
        'Abrir WhatsApp',
        generarLinkWhatsApp(patient.whatsapp, message)
      ),
    })
  })

  return actions.sort((a, b) => a.priority - b.priority)
}
