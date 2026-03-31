import type React from 'react'
import { Leaf, MapPin, Monitor } from 'lucide-react'
import type { Appointment, AppointmentModalidad } from '@/types'
import {
  appointmentHasPendingPayment as appointmentHasPendingPaymentDomain,
  appointmentNeedsChargeCollection as appointmentNeedsChargeCollectionDomain,
  appointmentNeedsAttention as appointmentNeedsAttentionDomain,
  appointmentNeedsConfirmation as appointmentNeedsConfirmationDomain,
  isConfirmedAppointment,
} from '@/lib/appointments'

export type AppointmentCategory = AppointmentModalidad | 'default'

export const APPOINTMENT_MODALIDAD_CONFIG: Record<AppointmentModalidad, {
  bg: string
  label: string
  color: string
  textColor: string
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
}> = {
  online: {
    bg: '#8FA5BD',
    label: 'Online',
    color: '#8FA5BD',
    textColor: '#273847',
    Icon: Monitor,
  },
  medellin: {
    bg: '#9488B0',
    label: 'Medellín',
    color: '#9488B0',
    textColor: '#302944',
    Icon: MapPin,
  },
  retiro: {
    bg: '#7EA88F',
    label: 'Retiro',
    color: '#7EA88F',
    textColor: '#284236',
    Icon: Leaf,
  },
}

export const APPOINTMENT_CATEGORY_CONFIG: Record<AppointmentCategory, {
  bg: string
  label: string
  textColor: string
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> | null
}> = {
  online: APPOINTMENT_MODALIDAD_CONFIG.online,
  medellin: APPOINTMENT_MODALIDAD_CONFIG.medellin,
  retiro: APPOINTMENT_MODALIDAD_CONFIG.retiro,
  default: {
    bg: '#B2A8B4',
    label: 'Sesión',
    textColor: '#3C3344',
    Icon: null,
  },
}

export function inferAppointmentCategory(notes: string | null): AppointmentCategory {
  const normalized = notes?.toLowerCase() ?? ''
  if (normalized.includes('retiro')) return 'retiro'
  if (normalized.includes('online') || normalized.includes('virtual')) return 'online'
  if (normalized.includes('medell')) return 'medellin'
  return 'default'
}

export function resolveAppointmentCategory(
  appointment: Pick<Appointment, 'modalidad' | 'notas'>
): AppointmentCategory {
  if (appointment.modalidad) return appointment.modalidad
  return inferAppointmentCategory(appointment.notas)
}

export function isAppointmentConfirmed(
  appointment: Pick<Appointment, 'estado_sesion'>
): boolean {
  return isConfirmedAppointment(appointment)
}

export function isAppointmentPaid(
  appointment: Pick<Appointment, 'estado_pago'>
): boolean {
  return appointment.estado_pago === 'pagado'
}

export function appointmentNeedsConfirmation(
  appointment: Pick<Appointment, 'estado_sesion'>
): boolean {
  return appointmentNeedsConfirmationDomain(appointment)
}

export function appointmentHasPendingPayment(
  appointment: Pick<Appointment, 'estado_pago'>
): boolean {
  return appointmentHasPendingPaymentDomain(appointment)
}

export function appointmentNeedsChargeCollection(
  appointment: Pick<Appointment, 'estado_sesion' | 'estado_pago'>
): boolean {
  return appointmentNeedsChargeCollectionDomain(appointment)
}

export function appointmentNeedsAttention(
  appointment: Pick<Appointment, 'estado_sesion' | 'estado_pago'>
): boolean {
  return appointmentNeedsAttentionDomain(appointment)
}
