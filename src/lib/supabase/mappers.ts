import type { Appointment, Consultorio, Patient, PatientClinicalProfile } from '@/types'
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

export function mapPatientClinicalProfileRow(row: unknown): PatientClinicalProfile {
  const record = expectRecord(row, 'patient_clinical_profile')

  return {
    id: expectString(record.id, 'patient_clinical_profile.id'),
    patient_id: expectString(record.patient_id, 'patient_clinical_profile.patient_id'),
    psychologist_id: expectString(record.psychologist_id, 'patient_clinical_profile.psychologist_id'),
    documento: optionalString(record.documento),
    birth_date: optionalString(record.birth_date),
    genero: optionalString(record.genero),
    ocupacion: optionalString(record.ocupacion),
    email: optionalString(record.email),
    direccion: optionalString(record.direccion),
    ciudad: optionalString(record.ciudad),
    eps: optionalString(record.eps),
    emergency_contact_name: optionalString(record.emergency_contact_name),
    emergency_contact_relationship: optionalString(record.emergency_contact_relationship),
    emergency_contact_phone: optionalString(record.emergency_contact_phone),
    emergency_contact_authorized: typeof record.emergency_contact_authorized === 'boolean'
      ? record.emergency_contact_authorized
      : null,
    emergency_contact_notes: optionalString(record.emergency_contact_notes),
    medication: optionalString(record.medication),
    allergies: optionalString(record.allergies),
    medical_conditions: optionalString(record.medical_conditions),
    diagnoses: optionalString(record.diagnoses),
    previous_treatments: optionalString(record.previous_treatments),
    consultation_reason: optionalString(record.consultation_reason),
    therapeutic_objective: optionalString(record.therapeutic_objective),
    session_frequency: optionalString(record.session_frequency),
    care_modality: optionalString(record.care_modality),
    process_status: optionalString(record.process_status),
    support_network: optionalString(record.support_network),
    clinical_alerts: Array.isArray(record.clinical_alerts)
      ? record.clinical_alerts.filter((value): value is string => typeof value === 'string') as PatientClinicalProfile['clinical_alerts']
      : null,
    informed_consent_status: optionalString(record.informed_consent_status) as PatientClinicalProfile['informed_consent_status'],
    administrative_notes: optionalString(record.administrative_notes),
    created_at: expectString(record.created_at, 'patient_clinical_profile.created_at'),
    updated_at: expectString(record.updated_at, 'patient_clinical_profile.updated_at'),
  }
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
