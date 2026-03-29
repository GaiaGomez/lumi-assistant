import type { Appointment } from '@/types'

export type AppointmentSessionState = Appointment['estado_sesion']
export type AppointmentPaymentState = Appointment['estado_pago']

export const APPOINTMENT_SESSION_STATES: AppointmentSessionState[] = [
  'pendiente',
  'confirmada',
  'realizada',
  'cancelo',
]

export const APPOINTMENT_SESSION_LABEL: Record<AppointmentSessionState, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  realizada: 'Realizada',
  cancelo: 'Canceló',
}

export const APPOINTMENT_PAYMENT_STATES: AppointmentPaymentState[] = [
  'pendiente',
  'pagado',
]

export const APPOINTMENT_PAYMENT_LABEL: Record<AppointmentPaymentState, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
}

export function getAppointmentSessionBadgeStatus(
  estado: AppointmentSessionState
): 'success' | 'pending' | 'cancel' | 'inactive' {
  if (estado === 'realizada') return 'success'
  if (estado === 'cancelo') return 'cancel'
  if (estado === 'confirmada') return 'pending'
  return 'inactive'
}

export function getAppointmentPaymentBadgeStatus(
  estado: AppointmentPaymentState
): 'success' | 'pending' {
  return estado === 'pagado' ? 'success' : 'pending'
}
