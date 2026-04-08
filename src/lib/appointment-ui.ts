import type React from 'react'
import { Briefcase, Leaf, MapPin, Monitor, Sparkles } from 'lucide-react'
import type { Appointment, AppointmentModalidad } from '@/types'
import type { SettingsMap } from '@/lib/settings'
import {
  appointmentNeedsAttention as appointmentNeedsAttentionDomain,
  isConfirmedAppointment,
} from '@/lib/appointments'

export type AppointmentCategory = AppointmentModalidad | 'general' | 'default'

type AppointmentConfig = {
  bg: string
  label: string
  color: string
  textColor: string
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
}

const MODALIDAD_SETTING_KEYS: Record<AppointmentModalidad, {
  colorKey: keyof Pick<
    SettingsMap,
    'modalidad_online_color' | 'modalidad_medellin_color' | 'modalidad_retiro_color'
  >
  labelKey: keyof Pick<
    SettingsMap,
    'modalidad_online_nombre' | 'modalidad_medellin_nombre' | 'modalidad_retiro_nombre'
  >
}> = {
  online: {
    colorKey: 'modalidad_online_color',
    labelKey: 'modalidad_online_nombre',
  },
  medellin: {
    colorKey: 'modalidad_medellin_color',
    labelKey: 'modalidad_medellin_nombre',
  },
  retiro: {
    colorKey: 'modalidad_retiro_color',
    labelKey: 'modalidad_retiro_nombre',
  },
}

export const APPOINTMENT_MODALIDAD_CONFIG: Record<AppointmentModalidad, AppointmentConfig> = {
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

function normalizeHexColor(value: string | undefined, fallback: string): string {
  const normalized = value?.trim()
  if (!normalized) return fallback

  const withHash = normalized.startsWith('#') ? normalized : `#${normalized}`
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(withHash)) {
    return withHash.toUpperCase()
  }

  return fallback
}

function toHexChannels(hexColor: string): [number, number, number] | null {
  const raw = hexColor.replace('#', '')
  if (raw.length !== 3 && raw.length !== 6) return null

  const expanded = raw.length === 3
    ? raw.split('').map((char) => char + char).join('')
    : raw

  const r = Number.parseInt(expanded.slice(0, 2), 16)
  const g = Number.parseInt(expanded.slice(2, 4), 16)
  const b = Number.parseInt(expanded.slice(4, 6), 16)

  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null
  return [r, g, b]
}

function resolveTextColor(backgroundColor: string, fallback: string): string {
  const channels = toHexChannels(backgroundColor)
  if (!channels) return fallback

  const [r, g, b] = channels
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance >= 0.66 ? '#243142' : '#F8F5F1'
}

export function resolveAppointmentModalidadConfig(
  modalidad: AppointmentModalidad,
  settings?: Partial<SettingsMap> | null
): AppointmentConfig {
  const base = APPOINTMENT_MODALIDAD_CONFIG[modalidad]
  const keys = MODALIDAD_SETTING_KEYS[modalidad]
  const color = normalizeHexColor(settings?.[keys.colorKey], base.color)
  const label = settings?.[keys.labelKey]?.trim() || base.label

  return {
    ...base,
    bg: color,
    color,
    label,
    textColor: color === base.color ? base.textColor : resolveTextColor(color, base.textColor),
  }
}

export function resolveAppointmentCategoryConfig(
  category: AppointmentCategory,
  settings?: Partial<SettingsMap> | null
) {
  if (category === 'general' || category === 'default') {
    return APPOINTMENT_CATEGORY_CONFIG[category]
  }

  return resolveAppointmentModalidadConfig(category, settings)
}

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
