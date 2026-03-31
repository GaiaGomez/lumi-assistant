import type { SupabaseClient } from '@supabase/supabase-js'

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
  canvasDataUrl: string
): Promise<string | null> {
  if (!canvasDataUrl) return null

  const response = await fetch(canvasDataUrl)
  const blob = await response.blob()
  const fileName = `${userId}/${Date.now()}.png`

  const { data, error } = await supabase.storage
    .from(CLINICAL_NOTES_BUCKET)
    .upload(fileName, blob, { contentType: 'image/png' })

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
    appointmentId?: string | null
  }
) {
  return supabase.from('clinical_notes').insert({
    patient_id: input.patientId,
    appointment_id: input.appointmentId ?? null,
    user_id: input.userId,
    texto: input.texto.trim() || null,
    canvas_url: input.canvasPath,
  })
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
