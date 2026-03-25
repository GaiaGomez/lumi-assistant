// ============================================================
// WHATSAPP HELPERS — genera links wa.me con mensajes pre-escritos
// wa.me es la URL oficial de WhatsApp para abrir conversaciones
// Formato: https://wa.me/NUMERO?text=MENSAJE_CODIFICADO
// ============================================================

import { Patient, Appointment } from '@/types'

// Genera el link de WhatsApp para recordatorio de cita 24h antes
export function linkRecordatorioCita(patient: Patient, appointment: Appointment): string {
  const fecha = new Date(appointment.fecha_inicio)
  // Formateamos la fecha en español para que se vea natural en el mensaje
  const fechaFormateada = fecha.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const horaFormateada = fecha.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const mensaje = `Hola ${patient.nombre} 😊 Te recuerdo que mañana tienes cita conmigo el ${fechaFormateada} a las ${horaFormateada}. ¡Nos vemos! Cualquier cambio avísame con tiempo 🙏`

  return generarLink(patient.whatsapp, mensaje)
}

// Genera el link para recordatorio de pago pendiente
export function linkPagoPendiente(patient: Patient, appointment: Appointment): string {
  const fecha = new Date(appointment.fecha_inicio)
  const fechaFormateada = fecha.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
  })

  const mensaje = `Hola ${patient.nombre}, espero que estés bien 😊 Te recuerdo que queda pendiente el pago de la sesión del ${fechaFormateada}. Cuando puedas me confirmas, ¡gracias!`

  return generarLink(patient.whatsapp, mensaje)
}

// Genera el link para paciente inactivo (más de 20 días sin cita)
export function linkPacienteInactivo(patient: Patient, dias: number): string {
  const mensaje = `Hola ${patient.nombre} 😊 Han pasado ${dias} días desde nuestra última sesión y quería saber cómo estás. ¿Quieres que agendemos una nueva cita? Estoy disponible para lo que necesites 🌿`

  return generarLink(patient.whatsapp, mensaje)
}

// Función base que construye el link wa.me
// encodeURIComponent convierte caracteres especiales (ñ, tildes, emojis) a formato URL
function generarLink(whatsapp: string | null, mensaje: string): string {
  if (!whatsapp) return '#'
  // Limpiamos el número: sacamos +, espacios, guiones
  const numero = whatsapp.replace(/[^0-9]/g, '')
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}
