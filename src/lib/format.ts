// ============================================================
// FORMAT — utilidades de formateo de fechas en español (es-CO)
// Centraliza los formatos que estaban repetidos en múltiples páginas
// ============================================================

import { formatInBogota, getBogotaDateParts } from '@/lib/datetime'

/**
 * Formato completo: día de semana + fecha corta + hora.
 * Ejemplo: "Lunes 24/03/26 · 10:00 a. m."
 * Usado en: historial de citas, sección de pendientes de WhatsApp.
 */
export function formatDateTimeFull(date: string): string {
  const weekdayRaw = formatInBogota(date, { weekday: 'long' })
  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1)
  const parts = getBogotaDateParts(date)
  const day = String(parts.day).padStart(2, '0')
  const month = String(parts.month).padStart(2, '0')
  const year = String(parts.year).slice(-2)
  const time = formatInBogota(date, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${weekday} ${day}/${month}/${year} · ${time}`
}

/**
 * Formato de solo fecha: día de semana + fecha corta, sin hora.
 * Ejemplo: "Lunes 24/03/26"
 * Usado en: notas clínicas (fecha de creación).
 */
export function formatDateOnly(date: string): string {
  const weekdayRaw = formatInBogota(date, { weekday: 'long' })
  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1)
  const parts = getBogotaDateParts(date)
  const day = String(parts.day).padStart(2, '0')
  const month = String(parts.month).padStart(2, '0')
  const year = String(parts.year).slice(-2)
  return `${weekday} ${day}/${month}/${year}`
}
