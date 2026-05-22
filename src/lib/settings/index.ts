// ============================================================
// SETTINGS — configuración personalizable por usuario
// Se guarda en la tabla `settings` de Supabase (clave-valor)
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_APPOINTMENT_DURATION_MINUTES } from '@/lib/appointments'

export const SETTINGS_KEYS = [
  // ── Agenda pública ────────────────────────────────────────
  'booking_url',

  // ── Plantillas WhatsApp ───────────────────────────────────
  'template_cobros',
  'template_sin_proxima',
  'template_retomar',

  // ── Agenda ────────────────────────────────────────────────
  'agenda_duracion_cita',    // "60" (minutos: 15/30/45/60/90/120)
  'agenda_hora_inicio',      // "07:00"
  'agenda_hora_fin',         // "21:00"
  'agenda_dias_laborales',   // JSON: ["lun","mar","mie","jue","vie"]
  'agenda_mostrar_festivos', // "true"/"false"
  'agenda_vista_default',    // "day"/"week"/"month"
  'agenda_intervalo',        // "15"/"30"/"60" (minutos por celda)

  // ── WhatsApp manual ──────────────────────────────────────
  'recordatorio_firma',      // Texto de firma al final de los mensajes

  // ── Perfil ───────────────────────────────────────────────
  'perfil_nombre_mostrado',
  'perfil_nombre_consultorio',

  // ── Modalidades / Consultorios ────────────────────────────
  'modalidad_medellin_nombre',
  'modalidad_medellin_color',
  'modalidad_medellin_direccion',
  'modalidad_online_nombre',
  'modalidad_online_color',
  'modalidad_online_enlace',
  'modalidad_retiro_nombre',
  'modalidad_retiro_color',
  'modalidad_retiro_instrucciones',

  // ── Pacientes ─────────────────────────────────────────────
  'pacientes_whatsapp_principal',  // "true"/"false"
  'pacientes_dias_inactivo',       // "90" (días para marcar inactivo)
  'pacientes_dias_reactivar',      // "60" (días para mostrar "Reactivar")

  // ── Historial clínico ─────────────────────────────────────
  'historial_vista',           // "compacta"/"expandida"

  // ── Datos profesionales ───────────────────────────────────
  'professional_full_name',       // Nombre completo para encabezado de reporte
  'professional_title',           // Título / cargo (ej: "Psicóloga Clínica")
  'professional_license',         // Tarjeta profesional / registro
  'professional_email',           // Correo profesional para el reporte
  'professional_phone',           // Teléfono profesional (opcional)
  'professional_city',            // Ciudad (opcional)
  'professional_signature_path',  // Path en bucket professional-signatures (opcional)
] as const

export type SettingsKey = (typeof SETTINGS_KEYS)[number]
export type SettingsMap = Record<SettingsKey, string>
export type SettingsRow = {
  key: string
  value: string
}

// Valores por defecto si el usuario aún no ha personalizado
export const DEFAULT_SETTINGS: SettingsMap = {
  // Agenda pública
  booking_url: process.env.NEXT_PUBLIC_BOOKING_URL ?? '',

  // Plantillas
  template_cobros:
    'Hola, {first_name}, espero que estés bien. Te escribo para recordarte que sigue pendiente el pago de la última sesión. Cuando puedas, me confirmas por favor.',
  template_sin_proxima:
    'Hola, {first_name}. ¿Cuándo nos vemos? Te dejo el enlace a mi agenda para que mires qué horario te queda mejor y agendar una próxima sesión: {booking_url}',
  template_retomar:
    'Hola, {first_name}. Hace mucho no nos vemos y quería saber cómo estás.',

  // Agenda
  agenda_duracion_cita:    '60',
  agenda_hora_inicio:      '07:00',
  agenda_hora_fin:         '21:00',
  agenda_dias_laborales:   '["lun","mar","mie","jue","vie"]',
  agenda_mostrar_festivos: 'true',
  agenda_vista_default:    'week',
  agenda_intervalo:        '30',

  // WhatsApp manual
  recordatorio_firma: '',

  // Perfil
  perfil_nombre_mostrado: '',
  perfil_nombre_consultorio: 'Consultorio privado',

  // Modalidades
  modalidad_medellin_nombre:       'Medellín',
  modalidad_medellin_color:        '#9488B0',
  modalidad_medellin_direccion:    '',
  modalidad_online_nombre:         'Online',
  modalidad_online_color:          '#8FA5BD',
  modalidad_online_enlace:         '',
  modalidad_retiro_nombre:         'Retiro',
  modalidad_retiro_color:          '#7EA88F',
  modalidad_retiro_instrucciones:  '',

  // Pacientes
  pacientes_whatsapp_principal: 'true',
  pacientes_dias_inactivo:      '90',
  pacientes_dias_reactivar:     '60',

  // Historial
  historial_vista: 'expandida',

  // Datos profesionales
  professional_full_name: '',
  professional_title: '',
  professional_license: '',
  professional_email: '',
  professional_phone: '',
  professional_city: '',
  professional_signature_path: '',
}

/**
 * Sustituye {variables} en una plantilla con sus valores.
 * Ejemplo: interpolate("Hola, {first_name}", { first_name: "Ana" }) → "Hola, Ana"
 */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match)
}

/**
 * Añade la firma al final de un mensaje si está configurada.
 */
export function appendFirma(message: string, settings: SettingsMap): string {
  const firma = settings['recordatorio_firma']?.trim()
  if (!firma) return message
  return `${message}\n\n${firma}`
}

/**
 * Carga todos los settings del usuario desde Supabase.
 * Para cada clave que no exista en DB, usa el valor por defecto.
 */
export async function fetchSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<SettingsMap> {
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .eq('user_id', userId)

  return mergeSettingsRows(data)
}

export async function upsertSettingValue(
  supabase: SupabaseClient,
  userId: string,
  key: SettingsKey,
  value: string
) {
  return supabase
    .from('settings')
    .upsert(
      {
        user_id:    userId,
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,key' }
    )
}

export function resolveAgendaAppointmentDurationMinutes(
  settings: Partial<Pick<SettingsMap, 'agenda_duracion_cita'>> | null | undefined
): number {
  const rawValue = Number.parseInt(
    settings?.agenda_duracion_cita ?? DEFAULT_SETTINGS.agenda_duracion_cita,
    10
  )

  if (Number.isNaN(rawValue) || rawValue < 15) {
    return DEFAULT_APPOINTMENT_DURATION_MINUTES
  }

  return rawValue
}

export function mergeSettingsRows(
  rows: SettingsRow[] | null | undefined
): SettingsMap {
  const result: SettingsMap = { ...DEFAULT_SETTINGS }

  for (const row of rows ?? []) {
    if ((SETTINGS_KEYS as readonly string[]).includes(row.key)) {
      result[row.key as SettingsKey] = row.value
    }
  }

  return result
}