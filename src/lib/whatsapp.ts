// ============================================================
// WHATSAPP HELPERS — genera links wa.me con mensajes
// wa.me es la URL oficial de WhatsApp para abrir conversaciones
// Formato: https://wa.me/NUMERO?text=MENSAJE_CODIFICADO
//
// Los mensajes personalizables (cobros, sin próxima, retomar)
// ya no viven aquí — se editan en /configuracion y se
// almacenan en la tabla `settings` de Supabase.
// ============================================================

import { Patient, Appointment } from '@/types'
import { formatInBogota } from '@/lib/datetime'

// Recordatorio de cita (no personalizable — se usa desde el modal de cita)
export function mensajeRecordatorioCita(patient: Patient, appointment: Appointment): string {
  const horaFormateada = formatInBogota(appointment.fecha_inicio, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `Hola, ${patient.nombre}. Te escribo para recordarte nuestra sesión de mañana a las ${horaFormateada}. ¿Confirmamos?`
}

export function linkRecordatorioCita(patient: Patient, appointment: Appointment): string {
  return generarLinkWhatsApp(patient.whatsapp, mensajeRecordatorioCita(patient, appointment))
}

/**
 * Construye un link wa.me con el mensaje pre-escrito.
 * Limpia el número (saca +, espacios, guiones) y codifica el texto.
 * Si no hay número, devuelve '#'.
 */
export function generarLinkWhatsApp(whatsapp: string | null, mensaje: string): string {
  if (!whatsapp) return '#'
  const numero = whatsapp.replace(/[^0-9]/g, '')
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}
