// ============================================================
// APPOINTMENTS — lógica de dominio sobre citas
// Centraliza los cálculos derivados que estaban duplicados en
// pacientes/[id]/page.tsx, pendientes y agenda/page.tsx
// ============================================================

import type { Appointment } from '@/types'

export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 60

const BASE_APPOINTMENT_DURATION_OPTIONS = [30, 45, 60, 90, 120, 150, 180]

export function isCancelledAppointment(
  appointment: Pick<Appointment, 'estado_sesion'>
): boolean {
  return appointment.estado_sesion === 'cancelo'
}

export function isCompletedAppointment(
  appointment: Pick<Appointment, 'estado_sesion'>
): boolean {
  return appointment.estado_sesion === 'realizada'
}

export function isConfirmedAppointment(
  appointment: Pick<Appointment, 'estado_sesion'>
): boolean {
  return appointment.estado_sesion === 'confirmada' || appointment.estado_sesion === 'realizada'
}

export function isOperationalAppointment(
  appointment: Pick<Appointment, 'estado_sesion'>
): boolean {
  return !isCancelledAppointment(appointment)
}

export function appointmentNeedsConfirmation(
  appointment: Pick<Appointment, 'estado_sesion'>
): boolean {
  return appointment.estado_sesion === 'pendiente'
}

export function appointmentHasPendingPayment(
  appointment: Pick<Appointment, 'estado_pago'>
): boolean {
  return appointment.estado_pago === 'pendiente'
}

export function appointmentHasCollectablePendingPayment(
  appointment: Pick<Appointment, 'estado_sesion' | 'estado_pago'>
): boolean {
  return isCompletedAppointment(appointment) && appointmentHasPendingPayment(appointment)
}

export function appointmentNeedsAttention(
  appointment: Pick<Appointment, 'estado_sesion' | 'estado_pago'>
): boolean {
  return appointmentNeedsConfirmation(appointment) || appointmentHasPendingPayment(appointment)
}

export function buildLocalAppointmentStart(
  dateValue: string,
  timeValue: string
): Date | null {
  if (!dateValue || !timeValue) return null
  const parsed = new Date(`${dateValue}T${timeValue}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getAppointmentEnd(
  appointment: Pick<Appointment, 'fecha_inicio' | 'fecha_fin'>
): Date {
  const start = new Date(appointment.fecha_inicio)
  if (appointment.fecha_fin) return new Date(appointment.fecha_fin)
  return new Date(start.getTime() + DEFAULT_APPOINTMENT_DURATION_MINUTES * 60000)
}

export function getAppointmentEndFromDuration(
  start: Date,
  durationMinutes: number
): Date {
  return new Date(start.getTime() + durationMinutes * 60000)
}

export function getAppointmentDurationOptions(currentDuration: number): number[] {
  return Array.from(new Set([...BASE_APPOINTMENT_DURATION_OPTIONS, currentDuration]))
    .filter((value) => value >= 15)
    .sort((a, b) => a - b)
}

export function getAppointmentScheduleError(
  start: Date | null,
  end: Date | null,
  durationMinutes: number
): string | null {
  if (!start || !end) return 'Completa fecha y hora.'
  if (durationMinutes < 15) return 'La duración mínima es de 15 minutos.'
  if (end <= start) return 'La cita debe terminar después de la hora de inicio.'
  return null
}

export function findAppointmentConflict(
  appointments: Appointment[],
  start: Date,
  end: Date,
  ignoreAppointmentId?: string
): Appointment | undefined {
  return appointments.find((appointment) => {
    if (ignoreAppointmentId && appointment.id === ignoreAppointmentId) return false
    if (isCancelledAppointment(appointment)) return false

    const appointmentStart = new Date(appointment.fecha_inicio)
    const appointmentEnd = getAppointmentEnd(appointment)
    return start < appointmentEnd && end > appointmentStart
  })
}

/**
 * Próxima cita futura realmente activa (excluye canceladas).
 */
export function getNextAppointment(
  appointments: Appointment[],
  now = new Date()
): Appointment | null {
  return (
    appointments
      .filter((a) => new Date(a.fecha_inicio) > now && !isCancelledAppointment(a))
      .sort((a, b) => +new Date(a.fecha_inicio) - +new Date(b.fecha_inicio))[0] ?? null
  )
}

/**
 * Última cita pasada que sí fue realizada.
 */
export function getLastPastAppointment(
  appointments: Appointment[],
  now = new Date()
): Appointment | null {
  return (
    appointments
      .filter((a) => new Date(a.fecha_inicio) <= now && isCompletedAppointment(a))
      .sort((a, b) => +new Date(b.fecha_inicio) - +new Date(a.fecha_inicio))[0] ?? null
  )
}

/**
 * Citas realizadas pero con pago pendiente.
 */
export function getPendingPayments(appointments: Appointment[]): Appointment[] {
  return appointments.filter(appointmentHasCollectablePendingPayment)
}

/**
 * La cita pendiente de pago más antigua (para el mensaje de cobro de WhatsApp).
 */
export function getOldestPendingPayment(appointments: Appointment[]): Appointment | null {
  return (
    getPendingPayments(appointments).sort(
      (a, b) => +new Date(a.fecha_inicio) - +new Date(b.fecha_inicio)
    )[0] ?? null
  )
}

/**
 * Días completos desde la última cita pasada realizada, null si no hay ninguna.
 */
export function getDaysInactive(
  lastPastAppointment: Appointment | null,
  now = new Date()
): number | null {
  if (!lastPastAppointment) return null
  return Math.floor(
    (now.getTime() - new Date(lastPastAppointment.fecha_inicio).getTime()) /
      (1000 * 60 * 60 * 24)
  )
}

/**
 * Citas de hoy operativas (excluye canceladas).
 */
export function getTodayAppointments(
  appointments: Appointment[],
  now = new Date()
): Appointment[] {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  return appointments.filter((a) => {
    if (isCancelledAppointment(a)) return false
    const d = new Date(a.fecha_inicio)
    return d >= start && d <= end
  })
}

/**
 * Citas de mañana con estado_sesion 'pendiente' (para recordatorios urgentes).
 */
export function getTomorrowPendingAppointments(
  appointments: Appointment[],
  now = new Date()
): Appointment[] {
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const start = new Date(tomorrow)
  start.setHours(0, 0, 0, 0)
  const end = new Date(tomorrow)
  end.setHours(23, 59, 59, 999)

  return appointments.filter((a) => {
    const d = new Date(a.fecha_inicio)
    return isOperationalAppointment(a) && appointmentNeedsConfirmation(a) && d >= start && d <= end
  })
}
