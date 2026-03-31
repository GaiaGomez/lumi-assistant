import type { Appointment, ClinicalNote, Patient } from '@/types'

type SupabaseRow = Record<string, unknown>

function expectRecord(value: unknown, label: string): SupabaseRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid ${label} row`)
  }
  return value as SupabaseRow
}

function expectString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${field}`)
  }
  return value
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function optionalPatient(value: unknown): Patient | undefined {
  if (!value) return undefined
  return mapPatientRow(value)
}

function optionalAppointment(value: unknown): Appointment | undefined {
  if (!value) return undefined
  return mapAppointmentRow(value)
}

export function mapPatientRow(row: unknown): Patient {
  const record = expectRecord(row, 'patient')
  return {
    id: expectString(record.id, 'patient.id'),
    user_id: expectString(record.user_id, 'patient.user_id'),
    nombre: expectString(record.nombre, 'patient.nombre'),
    apellido: expectString(record.apellido, 'patient.apellido'),
    telefono: optionalString(record.telefono),
    whatsapp: optionalString(record.whatsapp),
    email: optionalString(record.email),
    fecha_inicio: optionalString(record.fecha_inicio),
    notas_generales: optionalString(record.notas_generales),
    created_at: expectString(record.created_at, 'patient.created_at'),
  }
}

export function mapPatientRows(rows: unknown): Patient[] {
  if (!Array.isArray(rows)) return []
  return rows.map(mapPatientRow)
}

export function mapAppointmentRow(row: unknown): Appointment {
  const record = expectRecord(row, 'appointment')
  return {
    id: expectString(record.id, 'appointment.id'),
    patient_id: optionalString(record.patient_id),
    user_id: expectString(record.user_id, 'appointment.user_id'),
    doctoralia_uid: optionalString(record.doctoralia_uid),
    fecha_inicio: expectString(record.fecha_inicio, 'appointment.fecha_inicio'),
    fecha_fin: optionalString(record.fecha_fin),
    estado_sesion: record.estado_sesion as Appointment['estado_sesion'],
    estado_pago: record.estado_pago as Appointment['estado_pago'],
    notas: optionalString(record.notas),
    modalidad: (record.modalidad as Appointment['modalidad']) ?? null,
    created_at: expectString(record.created_at, 'appointment.created_at'),
    updated_at: optionalString(record.updated_at) ?? undefined,
    patient: optionalPatient(record.patient),
  }
}

export function mapAppointmentRows(rows: unknown): Appointment[] {
  if (!Array.isArray(rows)) return []
  return rows.map(mapAppointmentRow)
}

export function mapClinicalNoteRow(row: unknown): ClinicalNote {
  const record = expectRecord(row, 'clinical note')
  return {
    id: expectString(record.id, 'clinical_note.id'),
    patient_id: expectString(record.patient_id, 'clinical_note.patient_id'),
    appointment_id: optionalString(record.appointment_id),
    user_id: expectString(record.user_id, 'clinical_note.user_id'),
    texto: optionalString(record.texto),
    canvas_url: optionalString(record.canvas_url),
    created_at: expectString(record.created_at, 'clinical_note.created_at'),
    updated_at: expectString(record.updated_at, 'clinical_note.updated_at'),
    patient: optionalPatient(record.patient),
    appointment: optionalAppointment(record.appointment),
  }
}

export function mapClinicalNoteRows(rows: unknown): ClinicalNote[] {
  if (!Array.isArray(rows)) return []
  return rows.map(mapClinicalNoteRow)
}
