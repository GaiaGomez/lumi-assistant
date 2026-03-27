// ============================================================
// FORMAT — utilidades de formateo de fechas en español (es-CO)
// Centraliza los formatos que estaban repetidos en múltiples páginas
// ============================================================

/**
 * Formato completo: día de semana + fecha corta + hora.
 * Ejemplo: "Lunes 24/03/26 · 10:00 a. m."
 * Usado en: historial de citas, sección de pendientes de WhatsApp.
 */
export function formatDateTimeFull(date: string): string {
  const parsed = new Date(date)
  const weekdayRaw = parsed.toLocaleDateString('es-CO', { weekday: 'long' })
  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1)
  const day = String(parsed.getDate()).padStart(2, '0')
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const year = String(parsed.getFullYear()).slice(-2)
  const time = parsed.toLocaleTimeString('es-CO', {
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
  const parsed = new Date(date)
  const weekdayRaw = parsed.toLocaleDateString('es-CO', { weekday: 'long' })
  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1)
  const day = String(parsed.getDate()).padStart(2, '0')
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const year = String(parsed.getFullYear()).slice(-2)
  return `${weekday} ${day}/${month}/${year}`
}
