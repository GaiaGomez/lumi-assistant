// ============================================================
// APPOINTMENTS — lógica de dominio sobre citas
// Centraliza los cálculos derivados que estaban duplicados en
// pacientes/[id]/page.tsx, whatsapp/page.tsx y agenda/page.tsx
// ============================================================

import type { Appointment } from '@/types'

/**
 * Próxima cita futura (la más cercana en el tiempo).
 */
export function getNextAppointment(
  appointments: Appointment[],
  now = new Date()
): Appointment | null {
  return (
    appointments
      .filter((a) => new Date(a.fecha_inicio) > now)
      .sort((a, b) => +new Date(a.fecha_inicio) - +new Date(b.fecha_inicio))[0] ?? null
  )
}

/**
 * Cita pasada más reciente.
 */
export function getLastPastAppointment(
  appointments: Appointment[],
  now = new Date()
): Appointment | null {
  return (
    appointments
      .filter((a) => new Date(a.fecha_inicio) <= now)
      .sort((a, b) => +new Date(b.fecha_inicio) - +new Date(a.fecha_inicio))[0] ?? null
  )
}

/**
 * Citas con sesión asistida pero pago pendiente.
 */
export function getPendingPayments(appointments: Appointment[]): Appointment[] {
  return appointments.filter(
    (a) => a.estado_sesion === 'asistio' && a.estado_pago === 'pendiente'
  )
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
 * Días completos desde la última cita pasada, null si no hay ninguna.
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
 * Citas de hoy (dentro del día calendario actual).
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
    return a.estado_sesion === 'pendiente' && d >= start && d <= end
  })
}
