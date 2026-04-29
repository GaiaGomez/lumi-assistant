import type React from 'react'
import {
  BriefcaseMedical,
  Building2,
  Globe,
  Hospital,
  House,
  Landmark,
  Leaf,
  MapPin,
  Monitor,
  Stethoscope,
  Trees,
} from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Appointment,
  AppointmentModalidad,
  Consultorio,
  ConsultorioPrimaryType,
} from '@/types'
import type { SettingsMap } from '@/lib/settings'
import { mapConsultorioRows } from '@/lib/supabase/mappers'

export type ConsultorioIconKey =
  | 'map-pin'
  | 'monitor'
  | 'leaf'
  | 'building-2'
  | 'house'
  | 'hospital'
  | 'stethoscope'
  | 'trees'
  | 'globe'
  | 'landmark'
  | 'briefcase-medical'

type IconComponent = React.ComponentType<{ size?: number; style?: React.CSSProperties }>

export interface ConsultorioDisplayConfig {
  key: string
  label: string
  color: string
  bg: string
  textColor: string
  Icon: IconComponent
  primaryType: ConsultorioPrimaryType | null
  primaryValue: string | null
}

export interface ConsultorioFilterOption extends ConsultorioDisplayConfig {
  isLegacy: boolean
}

const CONSULTORIO_ICON_COMPONENTS: Record<ConsultorioIconKey, IconComponent> = {
  'map-pin': MapPin,
  monitor: Monitor,
  leaf: Leaf,
  'building-2': Building2,
  house: House,
  hospital: Hospital,
  stethoscope: Stethoscope,
  trees: Trees,
  globe: Globe,
  landmark: Landmark,
  'briefcase-medical': BriefcaseMedical,
}

export const CONSULTORIO_ICON_OPTIONS: Array<{
  value: ConsultorioIconKey
  label: string
  Icon: IconComponent
}> = [
  { value: 'map-pin', label: 'Ubicación', Icon: MapPin },
  { value: 'monitor', label: 'Online', Icon: Monitor },
  { value: 'leaf', label: 'Retiro', Icon: Leaf },
  { value: 'building-2', label: 'Consultorio', Icon: Building2 },
  { value: 'house', label: 'Casa', Icon: House },
  { value: 'hospital', label: 'Clínica', Icon: Hospital },
  { value: 'stethoscope', label: 'Terapia', Icon: Stethoscope },
  { value: 'trees', label: 'Naturaleza', Icon: Trees },
  { value: 'globe', label: 'Virtual', Icon: Globe },
  { value: 'landmark', label: 'Sede', Icon: Landmark },
  { value: 'briefcase-medical', label: 'Atención', Icon: BriefcaseMedical },
]

const LEGACY_MODALIDAD_META: Record<AppointmentModalidad, {
  labelFallback: string
  colorFallback: string
  textFallback: string
  iconKey: ConsultorioIconKey
  labelKey: keyof Pick<
    SettingsMap,
    'modalidad_online_nombre' | 'modalidad_medellin_nombre' | 'modalidad_retiro_nombre'
  >
  colorKey: keyof Pick<
    SettingsMap,
    'modalidad_online_color' | 'modalidad_medellin_color' | 'modalidad_retiro_color'
  >
  primaryKey: keyof Pick<
    SettingsMap,
    'modalidad_online_enlace' | 'modalidad_medellin_direccion' | 'modalidad_retiro_instrucciones'
  >
  primaryType: ConsultorioPrimaryType
}> = {
  online: {
    labelFallback: 'Online',
    colorFallback: '#8FA5BD',
    textFallback: '#273847',
    iconKey: 'monitor',
    labelKey: 'modalidad_online_nombre',
    colorKey: 'modalidad_online_color',
    primaryKey: 'modalidad_online_enlace',
    primaryType: 'enlace',
  },
  medellin: {
    labelFallback: 'Medellín',
    colorFallback: '#9488B0',
    textFallback: '#302944',
    iconKey: 'map-pin',
    labelKey: 'modalidad_medellin_nombre',
    colorKey: 'modalidad_medellin_color',
    primaryKey: 'modalidad_medellin_direccion',
    primaryType: 'direccion',
  },
  retiro: {
    labelFallback: 'Retiro',
    colorFallback: '#7EA88F',
    textFallback: '#284236',
    iconKey: 'leaf',
    labelKey: 'modalidad_retiro_nombre',
    colorKey: 'modalidad_retiro_color',
    primaryKey: 'modalidad_retiro_instrucciones',
    primaryType: 'nota',
  },
}

function normalizeHexColor(value: string | undefined | null, fallback: string): string {
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

function sanitizePrimaryValue(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function inferLegacyModalidad(notes: string | null): AppointmentModalidad | null {
  const normalized = notes?.toLowerCase() ?? ''
  if (normalized.includes('retiro')) return 'retiro'
  if (normalized.includes('online') || normalized.includes('virtual')) return 'online'
  if (normalized.includes('medell')) return 'medellin'
  return null
}

export function resolveConsultorioIcon(icono: string | null | undefined): IconComponent {
  return CONSULTORIO_ICON_COMPONENTS[(icono as ConsultorioIconKey) ?? 'map-pin'] ?? MapPin
}

export function resolveConsultorioDisplayConfig(
  consultorio: Pick<
    Consultorio,
    'id' | 'nombre' | 'color' | 'icono' | 'dato_principal_tipo' | 'dato_principal'
  >
): ConsultorioDisplayConfig {
  const color = normalizeHexColor(consultorio.color, '#9488B0')

  return {
    key: consultorio.id,
    label: consultorio.nombre.trim() || 'Consultorio',
    color,
    bg: color,
    textColor: resolveTextColor(color, '#243142'),
    Icon: resolveConsultorioIcon(consultorio.icono),
    primaryType: consultorio.dato_principal_tipo,
    primaryValue: sanitizePrimaryValue(consultorio.dato_principal),
  }
}

export function resolveLegacyConsultorioDisplayConfig(
  modalidad: AppointmentModalidad,
  settings?: Partial<SettingsMap> | null
): ConsultorioDisplayConfig {
  const meta = LEGACY_MODALIDAD_META[modalidad]
  const color = normalizeHexColor(settings?.[meta.colorKey], meta.colorFallback)

  return {
    key: `legacy:${modalidad}`,
    label: settings?.[meta.labelKey]?.trim() || meta.labelFallback,
    color,
    bg: color,
    textColor: color === meta.colorFallback
      ? meta.textFallback
      : resolveTextColor(color, meta.textFallback),
    Icon: resolveConsultorioIcon(meta.iconKey),
    primaryType: meta.primaryType,
    primaryValue: sanitizePrimaryValue(settings?.[meta.primaryKey]),
  }
}

export function findLegacyConsultorio(
  consultorios: Consultorio[],
  legacyKey: AppointmentModalidad | null | undefined
): Consultorio | null {
  if (!legacyKey) return null
  return consultorios.find((consultorio) => consultorio.legacy_key === legacyKey) ?? null
}

export function resolveAppointmentConsultorioDisplayConfig(
  appointment: Pick<
    Appointment,
    'consultorio_id' | 'consultorio' | 'modalidad' | 'notas'
  >,
  consultorios: Consultorio[],
  settings?: Partial<SettingsMap> | null
): ConsultorioDisplayConfig | null {
  if (appointment.consultorio) {
    return resolveConsultorioDisplayConfig(appointment.consultorio)
  }

  if (appointment.consultorio_id) {
    const matched = consultorios.find((consultorio) => consultorio.id === appointment.consultorio_id)
    if (matched) return resolveConsultorioDisplayConfig(matched)
  }

  const legacyModalidad = appointment.modalidad ?? inferLegacyModalidad(appointment.notas)
  if (!legacyModalidad) return null

  const migratedLegacy = findLegacyConsultorio(consultorios, legacyModalidad)
  if (migratedLegacy) {
    return resolveConsultorioDisplayConfig(migratedLegacy)
  }

  return resolveLegacyConsultorioDisplayConfig(legacyModalidad, settings)
}

export function resolveAppointmentConsultorioFilterKey(
  appointment: Pick<
    Appointment,
    'consultorio_id' | 'consultorio' | 'modalidad' | 'notas'
  >,
  consultorios: Consultorio[]
): string | null {
  if (appointment.consultorio?.id) return appointment.consultorio.id
  if (appointment.consultorio_id) return appointment.consultorio_id

  const legacyModalidad = appointment.modalidad ?? inferLegacyModalidad(appointment.notas)
  if (!legacyModalidad) return null

  const migratedLegacy = findLegacyConsultorio(consultorios, legacyModalidad)
  if (migratedLegacy) return migratedLegacy.id

  return `legacy:${legacyModalidad}`
}

export function buildConsultorioFilterOptions(
  consultorios: Consultorio[],
  appointments: Array<Pick<Appointment, 'event_type' | 'consultorio_id' | 'consultorio' | 'modalidad' | 'notas'>>,
  settings?: Partial<SettingsMap> | null
): ConsultorioFilterOption[] {
  const options: ConsultorioFilterOption[] = consultorios.map((consultorio) => ({
    ...resolveConsultorioDisplayConfig(consultorio),
    isLegacy: false,
  }))

  const existingKeys = new Set(options.map((option) => option.key))

  appointments
    .filter((appointment) => appointment.event_type === 'patient')
    .forEach((appointment) => {
      const filterKey = resolveAppointmentConsultorioFilterKey(appointment, consultorios)
      if (!filterKey || existingKeys.has(filterKey)) return

      const legacyModalidad = appointment.modalidad ?? inferLegacyModalidad(appointment.notas)
      if (!legacyModalidad) return

      options.push({
        ...resolveLegacyConsultorioDisplayConfig(legacyModalidad, settings),
        isLegacy: true,
      })
      existingKeys.add(filterKey)
    })

  return options
}

export function resolveAppointmentConsultorioSelectionId(
  appointment: Pick<Appointment, 'consultorio_id' | 'modalidad'>,
  consultorios: Consultorio[]
): string | null {
  if (appointment.consultorio_id) return appointment.consultorio_id
  return findLegacyConsultorio(consultorios, appointment.modalidad)?.id ?? null
}

export async function fetchConsultorios(
  supabase: SupabaseClient,
  userId: string
): Promise<Consultorio[]> {
  const { data, error } = await supabase
    .from('consultorios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Error cargando consultorios: ${error.message}`)
  }

  return mapConsultorioRows(data)
}
