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
export type AppointmentEventType = 'patient' | 'general'
export type AppointmentSourceSystem = 'manual' | 'doctoralia'
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

export type ClinicalNoteTemplateKind = 'dap'
export type ClinicalNoteRiskLevel = 'sin-riesgo-agudo' | 'monitoreo' | 'atencion-prioritaria'

export interface ClinicalNoteTemplateData {
  format: ClinicalNoteTemplateKind
  focus: string
  riskLevel: ClinicalNoteRiskLevel | null
  data: string
  assessment: string
  plan: string
}

export interface ClinicalCanvasPoint {
  x: number
  y: number
}

export interface ClinicalCanvasPath {
  drawMode: boolean
  strokeColor: string
  strokeWidth: number
  paths: ClinicalCanvasPoint[]
  startTimestamp?: number
  endTimestamp?: number
}

export interface Appointment {
  id: string
  patient_id: string | null
  user_id: string
  source_system: AppointmentSourceSystem
  event_type: AppointmentEventType
  title: string | null
  category: string | null
  color: string | null
  recurrence_group_id: string | null
  recurrence_rule: AppointmentRecurrenceRule | null
  doctoralia_uid: string | null  // ID único del evento en la API REST de Doctoralia, evita duplicados
  doctoralia_estado_sesion: 'pendiente' | 'confirmada' | 'realizada' | 'cancelo' | null
  estado_sesion_override: 'pendiente' | 'confirmada' | 'realizada' | 'cancelo' | null
  doctoralia_paciente_nombre: string | null
  doctoralia_last_synced_at: string | null
  doctoralia_last_seen_at: string | null
  doctoralia_removed_at: string | null
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
  canvas_url: string | null      // path privado del canvas en Storage (o URL legacy)
  canvas_paths: ClinicalCanvasPath[] | null
  template_kind: ClinicalNoteTemplateKind | null
  template_data: ClinicalNoteTemplateData | null
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

