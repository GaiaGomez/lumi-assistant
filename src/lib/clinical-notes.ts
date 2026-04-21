import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClinicalCanvasPath, ClinicalNoteTemplateData } from '@/types'
import { CLINICAL_NOTE_TEMPLATE_KIND, serializeClinicalNoteTemplateData } from '@/lib/clinical-note-template'

const CLINICAL_NOTES_BUCKET = 'canvas-notes'
const CLINICAL_NOTE_SIGNED_URL_TTL_SECONDS = 3600

// Compatibilidad:
// - registros nuevos guardan solo el path privado del archivo
// - registros legacy pueden seguir teniendo una URL pública completa
export function extractCanvasPath(canvasUrl: string): string {
  const marker = '/canvas-notes/'
  const index = canvasUrl.indexOf(marker)
  if (index !== -1) return canvasUrl.slice(index + marker.length)
  return canvasUrl
}

export async function uploadClinicalNoteCanvas(
  supabase: SupabaseClient,
  userId: string,
  canvasDataUrl: string,
  fileName?: string
): Promise<string | null> {
  if (!canvasDataUrl) return null

  const response = await fetch(canvasDataUrl)
  const blob = await response.blob()
  const storagePath = fileName ?? `${userId}/${Date.now()}.png`

  const { data, error } = await supabase.storage
    .from(CLINICAL_NOTES_BUCKET)
    .upload(storagePath, blob, {
      contentType: 'image/png',
      upsert: true,
    })

  if (error) {
    throw new Error(`No se pudo subir la nota manuscrita: ${error.message}`)
  }

  return data?.path ?? null
}

export async function createClinicalNote(
  supabase: SupabaseClient,
  input: {
    patientId: string
    userId: string
    texto: string
    canvasPath: string | null
    canvasPaths?: ClinicalCanvasPath[] | null
    templateData?: ClinicalNoteTemplateData | null
    appointmentId?: string | null
    isDraft?: boolean
  }
) {
  const templateData = serializeClinicalNoteTemplateData(input.templateData)

  return supabase
    .from('clinical_notes')
    .insert({
      patient_id: input.patientId,
      appointment_id: input.appointmentId ?? null,
      user_id: input.userId,
      texto: input.texto.trim() || null,
      canvas_url: input.canvasPath,
      canvas_paths: input.canvasPaths ?? null,
      template_kind: templateData ? CLINICAL_NOTE_TEMPLATE_KIND : null,
      template_data: templateData,
      is_draft: input.isDraft ?? false,
    })
    .select('id')
    .single()
}

export async function updateClinicalNote(
  supabase: SupabaseClient,
  input: {
    id: string
    appointmentId?: string | null
    texto: string
    canvasPath: string | null
    canvasPaths?: ClinicalCanvasPath[] | null
    templateData?: ClinicalNoteTemplateData | null
    isDraft?: boolean
  }
) {
  const templateData = serializeClinicalNoteTemplateData(input.templateData)

  return supabase
    .from('clinical_notes')
    .update({
      appointment_id: input.appointmentId ?? null,
      texto: input.texto.trim() || null,
      canvas_url: input.canvasPath,
      canvas_paths: input.canvasPaths ?? null,
      template_kind: templateData ? CLINICAL_NOTE_TEMPLATE_KIND : null,
      template_data: templateData,
      is_draft: input.isDraft ?? false,
    })
    .eq('id', input.id)
}

export async function createClinicalNoteCanvasSignedUrl(
  supabase: SupabaseClient,
  canvasUrl: string
): Promise<string | null> {
  const path = extractCanvasPath(canvasUrl)
  const { data } = await supabase.storage
    .from(CLINICAL_NOTES_BUCKET)
    .createSignedUrl(path, CLINICAL_NOTE_SIGNED_URL_TTL_SECONDS)

  return data?.signedUrl ?? null
}

export async function deleteClinicalNoteCanvas(
  supabase: SupabaseClient,
  canvasUrl: string | null | undefined
) {
  if (!canvasUrl) return

  const path = extractCanvasPath(canvasUrl)
  await supabase.storage.from(CLINICAL_NOTES_BUCKET).remove([path])
}

export async function deleteClinicalNoteById(
  supabase: SupabaseClient,
  noteId: string
) {
  return supabase.from('clinical_notes').delete().eq('id', noteId)
}

export async function saveTranscriptionResult(
  supabase: SupabaseClient,
  noteId: string,
  result:
    | { status: 'done'; text: string }
    | { status: 'error'; error: string }
) {
  const now = new Date().toISOString()
  if (result.status === 'done') {
    return supabase
      .from('clinical_notes')
      .update({
        transcription_status: 'done',
        transcription_text: result.text,
        transcription_error: null,
        transcribed_at: now,
      })
      .eq('id', noteId)
  }
  return supabase
    .from('clinical_notes')
    .update({
      transcription_status: 'error',
      transcription_error: result.error,
      transcribed_at: now,
    })
    .eq('id', noteId)
}

export async function saveStructuredNoteResult(
  supabase: SupabaseClient,
  noteId: string,
  result:
    | { status: 'done'; json: ClinicalNoteTemplateData }
    | { status: 'error'; error: string }
) {
  const now = new Date().toISOString()
  if (result.status === 'done') {
    return supabase
      .from('clinical_notes')
      .update({
        structured_note_status: 'done',
        structured_note_json: result.json,
        structured_note_generated_at: now,
      })
      .eq('id', noteId)
  }
  return supabase
    .from('clinical_notes')
    .update({
      structured_note_status: 'error',
      structured_note_generated_at: now,
    })
    .eq('id', noteId)
}
