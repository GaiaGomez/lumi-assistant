import type { Appointment } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { serializeAppointmentRecurrenceRule } from '@/lib/appointment-recurrence'

export type AppointmentUpdateInput = Partial<Pick<
  Appointment,
  | 'estado_sesion'
  | 'estado_sesion_override'
  | 'estado_pago'
  | 'modalidad'
  | 'fecha_inicio'
  | 'fecha_fin'
  | 'notas'
  | 'title'
  | 'category'
  | 'color'
>>

export interface CreateAppointmentInput {
  patient_id: string | null
  user_id: string
  event_type: Appointment['event_type']
  title?: Appointment['title']
  category?: Appointment['category']
  color?: Appointment['color']
  recurrence_group_id?: Appointment['recurrence_group_id']
  recurrence_rule?: Appointment['recurrence_rule']
  fecha_inicio: string
  fecha_fin: string
  modalidad: Appointment['modalidad']
  notas: Appointment['notas']
  doctoralia_uid?: Appointment['doctoralia_uid']
}

function normalizeAppointmentNotes(value: Appointment['notas'] | undefined) {
  return value?.trim() ? value.trim() : null
}

function normalizeAppointmentText(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null
}

function sanitizeAppointmentUpdateInput(updates: AppointmentUpdateInput): AppointmentUpdateInput {
  return {
    ...updates,
    notas: updates.notas === undefined ? undefined : normalizeAppointmentNotes(updates.notas),
    title: updates.title === undefined ? undefined : normalizeAppointmentText(updates.title),
    category: updates.category === undefined ? undefined : normalizeAppointmentText(updates.category),
    color: updates.color === undefined ? undefined : normalizeAppointmentText(updates.color),
  }
}

export async function updateAppointmentById(
  supabase: SupabaseClient,
  appointmentId: string,
  updates: AppointmentUpdateInput
) {
  return supabase
    .from('appointments')
    .update(sanitizeAppointmentUpdateInput(updates))
    .eq('id', appointmentId)
}

export async function createAppointment(
  supabase: SupabaseClient,
  input: CreateAppointmentInput
) {
  const payload = {
    patient_id: input.patient_id,
    user_id: input.user_id,
    event_type: input.event_type,
    title: normalizeAppointmentText(input.title),
    category: normalizeAppointmentText(input.category),
    color: normalizeAppointmentText(input.color),
    recurrence_group_id: input.recurrence_group_id ?? null,
    recurrence_rule: serializeAppointmentRecurrenceRule(input.recurrence_rule),
    source_system: 'manual' as const,
    fecha_inicio: input.fecha_inicio,
    fecha_fin: input.fecha_fin,
    modalidad: input.modalidad,
    estado_sesion: input.event_type === 'general' ? 'confirmada' : 'pendiente',
    estado_pago: input.event_type === 'general' ? 'pagado' : 'pendiente',
    notas: normalizeAppointmentNotes(input.notas),
    doctoralia_uid: input.doctoralia_uid ?? null,
  }

  return supabase
    .from('appointments')
    .insert(payload)
}

export async function createAppointments(
  supabase: SupabaseClient,
  inputs: CreateAppointmentInput[]
) {
  return supabase
    .from('appointments')
    .insert(inputs.map((input) => ({
      patient_id: input.patient_id,
      user_id: input.user_id,
      event_type: input.event_type,
      title: normalizeAppointmentText(input.title),
      category: normalizeAppointmentText(input.category),
      color: normalizeAppointmentText(input.color),
      recurrence_group_id: input.recurrence_group_id ?? null,
      recurrence_rule: serializeAppointmentRecurrenceRule(input.recurrence_rule),
      source_system: 'manual' as const,
      fecha_inicio: input.fecha_inicio,
      fecha_fin: input.fecha_fin,
      modalidad: input.modalidad,
      estado_sesion: input.event_type === 'general' ? 'confirmada' : 'pendiente',
      estado_pago: input.event_type === 'general' ? 'pagado' : 'pendiente',
      notas: normalizeAppointmentNotes(input.notas),
      doctoralia_uid: input.doctoralia_uid ?? null,
    })))
}

export async function deleteAppointmentById(
  supabase: SupabaseClient,
  appointmentId: string
) {
  return supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId)
}
