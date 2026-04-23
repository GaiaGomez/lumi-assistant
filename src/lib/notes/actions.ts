'use server'

import { createClient } from '@/lib/supabase/server'
import type { SessionNote } from '@/types'

type SessionNoteRow = Record<string, unknown>

function mapRow(row: SessionNoteRow): SessionNote {
  return {
    id: row.id as string,
    appointmentId: (row.appointment_id as string | null) ?? null,
    patientId: row.patient_id as string,
    psychologistId: row.psychologist_id as string,
    quickNote: (row.quick_note as string | null) ?? null,
    comoLlego: (row.como_llego as string | null) ?? null,
    queTrabajaron: (row.que_trabajaron as string | null) ?? null,
    comoVaProceso: (row.como_va_proceso as string | null) ?? null,
    queSigue: (row.que_sigue as string | null) ?? null,
    canvasPaths: (row.canvas_paths as SessionNote['canvasPaths']) ?? null,
    canvasUrl: (row.canvas_url as string | null) ?? null,
    sessionNumber: (row.session_number as number | null) ?? null,
    isDraft: row.is_draft === true,
    signedAt: (row.signed_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

async function nextSessionNumber(supabase: Awaited<ReturnType<typeof createClient>>, patientId: string): Promise<number> {
  const { count } = await supabase
    .from('session_notes')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', patientId)
  return (count ?? 0) + 1
}

// Crea una nota vacía. appointmentId es opcional — para notas libres del perfil.
export async function createSessionNote(
  patientId: string,
  appointmentId?: string
): Promise<SessionNote> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const sessionNumber = await nextSessionNumber(supabase, patientId)

  const { data: row, error } = await supabase
    .from('session_notes')
    .insert({
      patient_id: patientId,
      psychologist_id: user.id,
      appointment_id: appointmentId ?? null,
      session_number: sessionNumber,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapRow(row as SessionNoteRow)
}

// Para /citas/[id]: devuelve la nota más reciente de esa cita,
// o crea una nueva si todavía no hay ninguna.
export async function getOrCreateNoteForAppointment(
  appointmentId: string,
  patientId: string
): Promise<SessionNote> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: existing } = await supabase
    .from('session_notes')
    .select('*')
    .eq('appointment_id', appointmentId)
    .eq('psychologist_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return mapRow(existing as SessionNoteRow)

  const sessionNumber = await nextSessionNumber(supabase, patientId)

  const { data: row, error } = await supabase
    .from('session_notes')
    .insert({
      patient_id: patientId,
      psychologist_id: user.id,
      appointment_id: appointmentId,
      session_number: sessionNumber,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapRow(row as SessionNoteRow)
}

// Actualiza solo los campos provistos — el componente llama esto en autosave.
export async function updateSessionNote(
  noteId: string,
  data: Partial<Pick<SessionNote, 'quickNote' | 'comoLlego' | 'queTrabajaron' | 'comoVaProceso' | 'queSigue' | 'canvasPaths' | 'canvasUrl'>>
): Promise<SessionNote> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const payload: Record<string, unknown> = {}
  if (data.quickNote !== undefined) payload.quick_note = data.quickNote
  if (data.comoLlego !== undefined) payload.como_llego = data.comoLlego
  if (data.queTrabajaron !== undefined) payload.que_trabajaron = data.queTrabajaron
  if (data.comoVaProceso !== undefined) payload.como_va_proceso = data.comoVaProceso
  if (data.queSigue !== undefined) payload.que_sigue = data.queSigue
  if (data.canvasPaths !== undefined) payload.canvas_paths = data.canvasPaths
  if (data.canvasUrl !== undefined) payload.canvas_url = data.canvasUrl

  const { data: row, error } = await supabase
    .from('session_notes')
    .update(payload)
    .eq('id', noteId)
    .eq('psychologist_id', user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapRow(row as SessionNoteRow)
}

export async function getSessionNoteById(noteId: string): Promise<SessionNote | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('session_notes')
    .select('*')
    .eq('id', noteId)
    .eq('psychologist_id', user.id)
    .maybeSingle()

  return data ? mapRow(data as SessionNoteRow) : null
}

export async function deleteSessionNote(noteId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('session_notes')
    .delete()
    .eq('id', noteId)
    .eq('psychologist_id', user.id)

  if (error) throw new Error(error.message)
}

export async function getPatientNotes(patientId: string): Promise<SessionNote[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('session_notes')
    .select('*')
    .eq('patient_id', patientId)
    .eq('psychologist_id', user.id)
    .order('created_at', { ascending: false })

  return (data ?? []).map((r) => mapRow(r as SessionNoteRow))
}
