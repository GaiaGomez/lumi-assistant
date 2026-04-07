import type React from 'react'
import { Briefcase, Leaf, MapPin, Monitor, Sparkles } from 'lucide-react'
import type { Appointment, AppointmentModalidad } from '@/types'
import {
  appointmentNeedsAttention as appointmentNeedsAttentionDomain,
  isConfirmedAppointment,
} from '@/lib/appointments'

export type AppointmentCategory = AppointmentModalidad | 'general' | 'default'

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
  general: {
    bg: '#A996A9',
    label: 'Evento',
    textColor: '#433946',
    Icon: Briefcase,
  },
  default: {
    bg: '#B2A8B4',
    label: 'Sesión',
    textColor: '#3C3344',
    Icon: null,
  },
}

export const GENERAL_EVENT_COLOR_PRESETS = [
  { value: '#A996A9', label: 'Lavanda', textColor: '#433946', Icon: Sparkles },
  { value: '#8FA5BD', label: 'Bruma', textColor: '#273847', Icon: Monitor },
  { value: '#7EA88F', label: 'Salvia', textColor: '#284236', Icon: Leaf },
  { value: '#C29A8B', label: 'Arcilla', textColor: '#543A32', Icon: Briefcase },
  { value: '#B98F95', label: 'Rosa', textColor: '#593942', Icon: MapPin },
] as const

export function inferAppointmentCategory(notes: string | null): AppointmentCategory {
  const normalized = notes?.toLowerCase() ?? ''
  if (normalized.includes('retiro')) return 'retiro'
  if (normalized.includes('online') || normalized.includes('virtual')) return 'online'
  if (normalized.includes('medell')) return 'medellin'
  return 'default'
}

export function resolveAppointmentCategory(
  appointment: Pick<Appointment, 'event_type' | 'modalidad' | 'notas'>
): AppointmentCategory {
  if (appointment.event_type === 'general') return 'general'
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

export function appointmentNeedsAttention(
  appointment: Pick<Appointment, 'estado_sesion' | 'estado_pago'>
): boolean {
  return appointmentNeedsAttentionDomain(appointment)
}
