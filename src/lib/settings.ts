// ============================================================
// SETTINGS — configuración personalizable por usuario
// Se guarda en la tabla `settings` de Supabase (clave-valor)
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'

export const SETTINGS_KEYS = [
  'doctoralia_url',
  'doctoralia_token',       // Bearer token de la API interna de Doctoralia
  'doctoralia_last_sync',
  'doctoralia_sync_error',  // último error de sync, para mostrarlo en UI
  'template_cobros',
  'template_sin_proxima',
  'template_retomar',
] as const

export type SettingsKey = (typeof SETTINGS_KEYS)[number]
export type SettingsMap = Record<SettingsKey, string>

// Valores por defecto si el usuario aún no ha personalizado
export const DEFAULT_SETTINGS: SettingsMap = {
  doctoralia_url: process.env.NEXT_PUBLIC_DOCTORALIA_URL ?? '',
  doctoralia_token: '',
  doctoralia_last_sync: '',
  doctoralia_sync_error: '',

  template_cobros:
    'Hola, {first_name}, espero que estés bien. Te escribo para recordarte que sigue pendiente el pago de la última sesión. Cuando puedas, me confirmas por favor.',

  template_sin_proxima:
    'Hola, {first_name}. ¿Cuándo nos vemos? Te dejo el enlace a mi agenda para que mires qué horario te queda mejor y agendar una próxima sesión: {booking_url}',

  template_retomar:
    'Hola, {first_name}. Hace mucho no nos vemos y quería saber cómo estás.',
}

/**
 * Sustituye {variables} en una plantilla con sus valores.
 * Si una variable no existe en `vars`, la deja sin cambiar.
 * Ejemplo: interpolate("Hola, {first_name}", { first_name: "Ana" }) → "Hola, Ana"
 */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match)
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

  const result: SettingsMap = { ...DEFAULT_SETTINGS }
  for (const row of data ?? []) {
    if ((SETTINGS_KEYS as readonly string[]).includes(row.key)) {
      result[row.key as SettingsKey] = row.value
    }
  }
  return result
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
        user_id: userId,
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,key' }
    )
}
