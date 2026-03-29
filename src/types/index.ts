// ============================================================
// TIPOS GLOBALES — Lu Assistant
// Cada tipo refleja exactamente una tabla en Supabase
// ============================================================

export interface Patient {
  id: string
  user_id: string
  nombre: string
  apellido: string
  telefono: string | null
  whatsapp: string | null  // número en formato internacional, ej: 573001234567
  email: string | null
  fecha_inicio: string | null  // ISO date string
  notas_generales: string | null
  created_at: string
}

export type AppointmentModalidad = 'online' | 'medellin' | 'retiro'

export interface Appointment {
  id: string
  patient_id: string | null
  user_id: string
  doctoralia_uid: string | null  // UID del evento iCal de Doctoralia, evita duplicados
  fecha_inicio: string           // ISO datetime
  fecha_fin: string | null
  // Estado de la sesión: si el paciente asistió, canceló, etc.
  estado_sesion: 'pendiente' | 'confirmada' | 'realizada' | 'cancelo'
  // Estado del pago
  estado_pago: 'pendiente' | 'pagado'
  notas: string | null
  // Modalidad de la sesión — fuente de verdad para categoría/color
  // NULL = dato previo a esta migración; se resuelve con fallback a notas
  modalidad: AppointmentModalidad | null
  created_at: string
  updated_at?: string
  // Relación expandida — viene del JOIN con patients
  patient?: Patient
}

export interface ClinicalNote {
  id: string
  patient_id: string
  appointment_id: string | null
  user_id: string
  texto: string | null           // notas escritas con teclado
  canvas_url: string | null      // URL de la imagen del canvas en Supabase Storage
  created_at: string
  updated_at: string
  // Relaciones expandidas
  patient?: Patient
  appointment?: Appointment
}

// Tipo para el calendario — react-big-calendar necesita esta forma
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Appointment  // el objeto completo de la cita vive acá
}

// Estado de las alertas de WhatsApp
export interface WhatsAppAlert {
  patient: Patient
  tipo: 'recordatorio_cita' | 'pago_pendiente' | 'paciente_inactivo'
  appointment?: Appointment
  diasSinCita?: number
  mensaje: string  // mensaje pre-escrito listo para enviar
}
