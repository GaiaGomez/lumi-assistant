'use server'

import { createClient } from '@/lib/supabase/server'
import type { SessionNote } from '@/types'

type SessionNoteRow = Record<string, unknown>

function mapRow(row: SessionNoteRow): SessionNote {
  return {
    id: row.id as string,
    appointmentId: row.appointment_id as string,
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

export async function upsertSessionNote(
  appointmentId: string,
  patientId: string,
  data: Partial<SessionNote>
): Promise<SessionNote> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: existing } = await supabase
    .from('session_notes')
    .select('*')
    .eq('appointment_id', appointmentId)
    .eq('psychologist_id', user.id)
    .maybeSingle()

  let sessionNumber: number
  if (existing?.session_number) {
    sessionNumber = existing.session_number as number
  } else {
    const { count } = await supabase
      .from('session_notes')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patientId)
    sessionNumber = (count ?? 0) + 1
  }

  const ex = existing as SessionNoteRow | null

  const merged = {
    appointment_id: appointmentId,
    patient_id: patientId,
    psychologist_id: user.id,
    session_number: sessionNumber,
    quick_note: data.quickNote !== undefined ? data.quickNote : ((ex?.quick_note as string | null) ?? null),
    como_llego: data.comoLlego !== undefined ? data.comoLlego : ((ex?.como_llego as string | null) ?? null),
    que_trabajaron: data.queTrabajaron !== undefined ? data.queTrabajaron : ((ex?.que_trabajaron as string | null) ?? null),
    como_va_proceso: data.comoVaProceso !== undefined ? data.comoVaProceso : ((ex?.como_va_proceso as string | null) ?? null),
    que_sigue: data.queSigue !== undefined ? data.queSigue : ((ex?.que_sigue as string | null) ?? null),
    canvas_paths: data.canvasPaths !== undefined ? data.canvasPaths : ((ex?.canvas_paths as SessionNote['canvasPaths']) ?? null),
    canvas_url: data.canvasUrl !== undefined ? data.canvasUrl : ((ex?.canvas_url as string | null) ?? null),
    is_draft: data.isDraft !== undefined ? data.isDraft : (ex?.is_draft !== false),
  }

  const { data: row, error } = await supabase
    .from('session_notes')
    .upsert(merged, { onConflict: 'appointment_id' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapRow(row as SessionNoteRow)
}

export async function getSessionNote(appointmentId: string): Promise<SessionNote | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('session_notes')
    .select('*')
    .eq('appointment_id', appointmentId)
    .eq('psychologist_id', user.id)
    .maybeSingle()

  return data ? mapRow(data as SessionNoteRow) : null
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

export async function signNote(noteId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('session_notes')
    .update({ signed_at: new Date().toISOString(), is_draft: false })
    .eq('id', noteId)
    .eq('psychologist_id', user.id)

  if (error) throw new Error(error.message)
}
