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
import { appendFirma, type SettingsMap } from '@/lib/settings'

export type AppointmentReminderLead = '1d' | '2h'

// whatsapp tiene prioridad; si está vacío, deriva el número de telefono.
// Punto único de verdad para toda la app — úsalo antes de generarLinkWhatsApp.
export function resolveWhatsApp(patient: Patient): string | null {
  return patient.whatsapp ?? (patient.telefono ? patient.telefono.replace(/[^0-9]/g, '') : null)
}

// Recordatorio de cita (no personalizable — se usa desde el modal de cita)
export function mensajeRecordatorioCita(
  patient: Patient,
  appointment: Appointment,
  lead: AppointmentReminderLead = '1d'
): string {
  const horaFormateada = formatInBogota(appointment.fecha_inicio, {
    hour: 'numeric',
    minute: '2-digit',
  })

  if (lead === '2h') {
    return `Hola, ${patient.nombre}. Te escribo para recordarte nuestra sesión de hoy a las ${horaFormateada}. ¿Seguimos en pie?`
  }

  return `Hola, ${patient.nombre}. Te escribo para recordarte nuestra sesión de mañana a las ${horaFormateada}. ¿Confirmamos?`
}

export function linkRecordatorioCita(
  patient: Patient,
  appointment: Appointment,
  settings?: SettingsMap,
  lead: AppointmentReminderLead = '1d'
): string {
  const message = settings
    ? appendFirma(mensajeRecordatorioCita(patient, appointment, lead), settings)
    : mensajeRecordatorioCita(patient, appointment, lead)

  return generarLinkWhatsApp(resolveWhatsApp(patient), message)
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
