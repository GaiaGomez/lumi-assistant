import type { Appointment } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AppointmentUpdateInput = Partial<Pick<
  Appointment,
  'estado_sesion' | 'estado_pago' | 'modalidad' | 'fecha_inicio' | 'fecha_fin' | 'notas'
>>

export async function updateAppointmentById(
  supabase: SupabaseClient,
  appointmentId: string,
  updates: AppointmentUpdateInput
) {
  return supabase
    .from('appointments')
    .update(updates)
    .eq('id', appointmentId)
}
