// ============================================================
// SETTINGS — configuración personalizable por usuario
// Se guarda en la tabla `settings` de Supabase (clave-valor)
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'

export type SettingsMap = Record<string, string>

// Valores por defecto si el usuario aún no ha personalizado
export const DEFAULT_SETTINGS: SettingsMap = {
  doctoralia_url: process.env.NEXT_PUBLIC_DOCTORALIA_URL ?? '',

  template_cobros:
    'Hola, {first_name}, espero que estés bien. Te escribo para recordarte que sigue pendiente el pago de la sesión del {session_date}. Cuando puedas, me confirmas por favor.',

  template_sin_proxima:
    'Hola, {first_name}. ¿Cuándo nos vemos? Te dejo el enlace a mi agenda para que mires qué horario te queda mejor y agendar una próxima sesión: {booking_url}',

  template_retomar:
    'Hola, {first_name}. Han pasado {days_inactive} días desde nuestra última sesión y quería saber cómo estás. ¿Quieres que agendemos una nueva cita?',
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
    result[row.key] = row.value
  }
  return result
}
