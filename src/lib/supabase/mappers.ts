import type { Appointment, ClinicalNote, Patient } from '@/types'
import {
  normalizeClinicalCanvasPaths,
  normalizeClinicalNoteTemplateData,
} from '@/lib/clinical-note-template'
import { normalizeAppointmentRecurrenceRule } from '@/lib/appointment-recurrence'

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
  const doctoraliaUid = optionalString(record.doctoralia_uid)
  const sourceSystem = record.source_system === 'doctoralia'
    ? 'doctoralia'
    : doctoraliaUid
      ? 'doctoralia'
      : 'manual'
  const doctoraliaEstadoSesion = (
    optionalString(record.doctoralia_estado_sesion) as Appointment['estado_sesion'] | null
  ) ?? null
  const estadoSesionOverride = (
    optionalString(record.estado_sesion_override) as Appointment['estado_sesion'] | null
  ) ?? null
  const legacyEstadoSesion = record.estado_sesion as Appointment['estado_sesion']

  return {
    id: expectString(record.id, 'appointment.id'),
    patient_id: optionalString(record.patient_id),
    user_id: expectString(record.user_id, 'appointment.user_id'),
    source_system: sourceSystem,
    event_type: record.event_type === 'general' ? 'general' : 'patient',
    title: optionalString(record.title),
    category: optionalString(record.category),
    color: optionalString(record.color),
    recurrence_group_id: optionalString(record.recurrence_group_id),
    recurrence_rule: normalizeAppointmentRecurrenceRule(record.recurrence_rule),
    doctoralia_uid: doctoraliaUid,
    doctoralia_estado_sesion: doctoraliaEstadoSesion,
    estado_sesion_override: estadoSesionOverride,
    doctoralia_paciente_nombre: optionalString(record.doctoralia_paciente_nombre),
    doctoralia_last_synced_at: optionalString(record.doctoralia_last_synced_at),
    doctoralia_last_seen_at: optionalString(record.doctoralia_last_seen_at),
    doctoralia_removed_at: optionalString(record.doctoralia_removed_at),
    fecha_inicio: expectString(record.fecha_inicio, 'appointment.fecha_inicio'),
    fecha_fin: optionalString(record.fecha_fin),
    estado_sesion: legacyEstadoSesion,
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
    canvas_paths: normalizeClinicalCanvasPaths(record.canvas_paths),
    template_kind: record.template_kind === 'dap' ? 'dap' : null,
    template_data: normalizeClinicalNoteTemplateData(record.template_data),
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
