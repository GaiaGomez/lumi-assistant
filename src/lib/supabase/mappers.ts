import type { Appointment, ClinicalNote, Consultorio, Patient } from '@/types'
import {
  normalizeClinicalCanvasPaths,
  normalizeClinicalNoteTemplateData,
} from '@/lib/clinical-note-template'
import { normalizeAppointmentRecurrenceRule } from '@/lib/appointment-recurrence'

export const APPOINTMENT_SELECT = 'id, patient_id, consultorio_id, user_id, event_type, title, category, color, recurrence_group_id, recurrence_rule, fecha_inicio, fecha_fin, estado_sesion, estado_pago, notas, modalidad, created_at, updated_at, patient:patients(*), consultorio:consultorios(*)'

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

function optionalConsultorio(value: unknown): Consultorio | undefined {
  if (!value) return undefined
  return mapConsultorioRow(value)
}

function optionalAppointment(value: unknown): Appointment | undefined {
  if (!value) return undefined
  return mapAppointmentRow(value)
}

export function mapConsultorioRow(row: unknown): Consultorio {
  const record = expectRecord(row, 'consultorio')
  return {
    id: expectString(record.id, 'consultorio.id'),
    user_id: expectString(record.user_id, 'consultorio.user_id'),
    nombre: expectString(record.nombre, 'consultorio.nombre'),
    color: expectString(record.color, 'consultorio.color'),
    icono: expectString(record.icono, 'consultorio.icono'),
    dato_principal_tipo: (
      optionalString(record.dato_principal_tipo) as Consultorio['dato_principal_tipo']
    ) ?? null,
    dato_principal: optionalString(record.dato_principal),
    legacy_key: (
      optionalString(record.legacy_key) as Consultorio['legacy_key']
    ) ?? null,
    created_at: expectString(record.created_at, 'consultorio.created_at'),
    updated_at: expectString(record.updated_at, 'consultorio.updated_at'),
  }
}

export function mapConsultorioRows(rows: unknown): Consultorio[] {
  if (!Array.isArray(rows)) return []
  return rows.map(mapConsultorioRow)
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
  const estadoSesion = record.estado_sesion as Appointment['estado_sesion']

  return {
    id: expectString(record.id, 'appointment.id'),
    patient_id: optionalString(record.patient_id),
    consultorio_id: optionalString(record.consultorio_id),
    user_id: expectString(record.user_id, 'appointment.user_id'),
    event_type: record.event_type === 'general' ? 'general' : 'patient',
    title: optionalString(record.title),
    category: optionalString(record.category),
    color: optionalString(record.color),
    recurrence_group_id: optionalString(record.recurrence_group_id),
    recurrence_rule: normalizeAppointmentRecurrenceRule(record.recurrence_rule),
    fecha_inicio: expectString(record.fecha_inicio, 'appointment.fecha_inicio'),
    fecha_fin: optionalString(record.fecha_fin),
    estado_sesion: estadoSesion,
    estado_pago: record.estado_pago as Appointment['estado_pago'],
    notas: optionalString(record.notas),
    modalidad: (record.modalidad as Appointment['modalidad']) ?? null,
    created_at: expectString(record.created_at, 'appointment.created_at'),
    updated_at: optionalString(record.updated_at) ?? undefined,
    patient: optionalPatient(record.patient),
    consultorio: optionalConsultorio(record.consultorio),
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
    canvas_paths: normalizeClinicalCanvasPaths(record.canvas_paths),
    template_kind: record.template_kind === 'dap' ? 'dap' : null,
    template_data: normalizeClinicalNoteTemplateData(record.template_data),
    is_draft: record.is_draft === true,
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
