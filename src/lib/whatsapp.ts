// ============================================================
// WHATSAPP HELPERS — genera links wa.me con mensajes pre-escritos
// wa.me es la URL oficial de WhatsApp para abrir conversaciones
// Formato: https://wa.me/NUMERO?text=MENSAJE_CODIFICADO
// ============================================================

import { Patient, Appointment } from '@/types'

export function mensajeRecordatorioCita(patient: Patient, appointment: Appointment): string {
  const fecha = new Date(appointment.fecha_inicio)
  const horaFormateada = fecha.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `Hola, ${patient.nombre}. Te escribo para recordarte nuestra sesión de mañana a las ${horaFormateada}. ¿Confirmamos?`
}

// Genera el link de WhatsApp para recordatorio de cita 24h antes
export function linkRecordatorioCita(patient: Patient, appointment: Appointment): string {
  return generarLink(patient.whatsapp, mensajeRecordatorioCita(patient, appointment))
}

export function mensajePagoPendiente(patient: Patient, appointment: Appointment): string {
  const fecha = new Date(appointment.fecha_inicio)
  const fechaFormateada = fecha.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
  })

  return `Hola, ${patient.nombre}, espero que estés bien. Te escribo para recordarte que sigue pendiente el pago de la sesión del ${fechaFormateada}. Cuando puedas, me confirmas por favor.`
}

// Genera el link para recordatorio de pago pendiente
export function linkPagoPendiente(patient: Patient, appointment: Appointment): string {
  return generarLink(patient.whatsapp, mensajePagoPendiente(patient, appointment))
}

export function mensajePacienteInactivo(patient: Patient, dias: number): string {
  return `Hola, ${patient.nombre}. Han pasado ${dias} días desde nuestra última sesión y quería saber cómo estás. ¿Quieres que agendemos una nueva cita?`
}

// Genera el link para paciente inactivo (más de 20 días sin cita)
export function linkPacienteInactivo(patient: Patient, dias: number): string {
  return generarLink(patient.whatsapp, mensajePacienteInactivo(patient, dias))
}

export function mensajeVerAgenda(patient: Patient): string {
  const agendaUrl = process.env.NEXT_PUBLIC_DOCTORALIA_URL ?? ''
  return `Hola, ${patient.nombre}. ¿Cuándo nos vemos? Te dejo el enlace a mi agenda para que mires qué horario te queda mejor y agendar una próxima sesión: ${agendaUrl}`
}

// Genera el link para invitar al paciente a revisar agenda y agendar
export function linkVerAgenda(patient: Patient): string {
  return generarLink(patient.whatsapp, mensajeVerAgenda(patient))
}

// Función base que construye el link wa.me
// encodeURIComponent convierte caracteres especiales (ñ, tildes, emojis) a formato URL
function generarLink(whatsapp: string | null, mensaje: string): string {
  if (!whatsapp) return '#'
  // Limpiamos el número: sacamos +, espacios, guiones
  const numero = whatsapp.replace(/[^0-9]/g, '')
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}
