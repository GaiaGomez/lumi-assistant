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
export type ConsultorioPrimaryType = 'direccion' | 'enlace' | 'nota'
export type AppointmentEventType = 'patient' | 'general'
export type AppointmentRecurrencePreset =
  | 'none'
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'selected-weekdays'
  | 'every-2-weeks'
  | 'monthly'
  | 'custom'
export type AppointmentRecurrenceUnit = 'day' | 'week' | 'month'
export type AppointmentWeekday = 'mo' | 'tu' | 'we' | 'th' | 'fr' | 'sa' | 'su'

export interface AppointmentRecurrenceRule {
  preset: AppointmentRecurrencePreset
  untilDate: string | null
  interval?: number | null
  unit?: AppointmentRecurrenceUnit | null
  weekdays?: AppointmentWeekday[] | null
}

export interface ClinicalCanvasPoint {
  x: number
  y: number
  pressure?: number  // 0–1; present on Apple Pencil strokes
}

export interface ClinicalCanvasPath {
  drawMode: boolean
  strokeColor: string
  strokeWidth: number
  paths: ClinicalCanvasPoint[]
  startTimestamp?: number
  endTimestamp?: number
}

export interface Consultorio {
  id: string
  user_id: string
  nombre: string
  color: string
  icono: string
  dato_principal_tipo: ConsultorioPrimaryType | null
  dato_principal: string | null
  legacy_key: AppointmentModalidad | null
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  patient_id: string | null
  consultorio_id: string | null
  user_id: string
  event_type: AppointmentEventType
  title: string | null
  category: string | null
  color: string | null
  recurrence_group_id: string | null
  recurrence_rule: AppointmentRecurrenceRule | null
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
  consultorio?: Consultorio
}

export type SessionNote = {
  id: string
  appointmentId: string | null
  patientId: string
  psychologistId: string
  quickNote: string | null
  comoLlego: string | null
  queTrabajaron: string | null
  comoVaProceso: string | null
  queSigue: string | null
  canvasPaths: ClinicalCanvasPath[] | null
  canvasUrl: string | null
  sessionNumber: number | null
  isDraft: boolean
  signedAt: string | null
  createdAt: string
  updatedAt: string
}

// Tipo para el calendario — react-big-calendar necesita esta forma
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Appointment  // el objeto completo de la cita vive acá
}
