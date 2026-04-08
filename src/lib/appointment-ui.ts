import type React from 'react'
import { Briefcase, Leaf, MapPin, Monitor, Sparkles } from 'lucide-react'
import type { Appointment } from '@/types'
import type { ConsultorioDisplayConfig } from '@/lib/consultorios'
import {
  resolveAppointmentConsultorioDisplayConfig,
} from '@/lib/consultorios'
import type { SettingsMap } from '@/lib/settings'
import {
  appointmentNeedsAttention as appointmentNeedsAttentionDomain,
  isConfirmedAppointment,
} from '@/lib/appointments'

export type AppointmentVisualConfig = ConsultorioDisplayConfig | {
  key: 'general' | 'default'
  bg: string
  label: string
  color: string
  textColor: string
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> | null
  primaryType: null
  primaryValue: null
}

export const GENERAL_EVENT_COLOR_PRESETS = [
  { value: '#A996A9', label: 'Lavanda', textColor: '#433946', Icon: Sparkles },
  { value: '#8FA5BD', label: 'Bruma', textColor: '#273847', Icon: Monitor },
  { value: '#7EA88F', label: 'Salvia', textColor: '#284236', Icon: Leaf },
  { value: '#C29A8B', label: 'Arcilla', textColor: '#543A32', Icon: Briefcase },
  { value: '#B98F95', label: 'Rosa', textColor: '#593942', Icon: MapPin },
] as const

const DEFAULT_APPOINTMENT_VISUAL: AppointmentVisualConfig = {
  key: 'default',
  bg: '#B2A8B4',
  label: 'Sesión',
  color: '#B2A8B4',
  textColor: '#3C3344',
  Icon: null,
  primaryType: null,
  primaryValue: null,
}

const GENERAL_EVENT_VISUAL: AppointmentVisualConfig = {
  key: 'general',
  bg: '#A996A9',
  label: 'Evento',
  color: '#A996A9',
  textColor: '#433946',
  Icon: Briefcase,
  primaryType: null,
  primaryValue: null,
}

export function resolveAppointmentVisualConfig(
  appointment: Pick<
    Appointment,
    'event_type' | 'consultorio_id' | 'consultorio' | 'modalidad' | 'notas'
  >,
  consultorios: Parameters<typeof resolveAppointmentConsultorioDisplayConfig>[1],
  settings?: Partial<SettingsMap> | null
): AppointmentVisualConfig {
  if (appointment.event_type === 'general') {
    return GENERAL_EVENT_VISUAL
  }

  return resolveAppointmentConsultorioDisplayConfig(appointment, consultorios, settings)
    ?? DEFAULT_APPOINTMENT_VISUAL
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
