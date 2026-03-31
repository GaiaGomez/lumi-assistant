import type { Appointment } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AppointmentUpdateInput = Partial<Pick<
  Appointment,
  'estado_sesion' | 'estado_pago' | 'modalidad' | 'fecha_inicio' | 'fecha_fin' | 'notas'
>>

export interface CreateAppointmentInput {
  patient_id: string
  user_id: string
  fecha_inicio: string
  fecha_fin: string
  modalidad: Appointment['modalidad']
  notas: Appointment['notas']
  doctoralia_uid?: Appointment['doctoralia_uid']
}

function normalizeAppointmentNotes(value: Appointment['notas'] | undefined) {
  return value?.trim() ? value.trim() : null
}

function sanitizeAppointmentUpdateInput(updates: AppointmentUpdateInput): AppointmentUpdateInput {
  return {
    ...updates,
    notas: updates.notas === undefined ? undefined : normalizeAppointmentNotes(updates.notas),
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
  return supabase
    .from('appointments')
    .insert({
      patient_id: input.patient_id,
      user_id: input.user_id,
      fecha_inicio: input.fecha_inicio,
      fecha_fin: input.fecha_fin,
      modalidad: input.modalidad,
      estado_sesion: 'pendiente',
      estado_pago: 'pendiente',
      notas: normalizeAppointmentNotes(input.notas),
      doctoralia_uid: input.doctoralia_uid ?? null,
    })
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
