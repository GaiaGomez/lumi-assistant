import type { SupabaseClient } from '@supabase/supabase-js'

const CANVAS_BUCKET = 'canvas-notes'
const SIGNED_URL_TTL_SECONDS = 3600

export function extractCanvasPath(canvasUrl: string): string {
  const marker = '/canvas-notes/'
  const index = canvasUrl.indexOf(marker)
  if (index !== -1) return canvasUrl.slice(index + marker.length)
  return canvasUrl
}

export async function uploadNoteCanvas(
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
    .from(CANVAS_BUCKET)
    .upload(storagePath, blob, { contentType: 'image/png', upsert: true })

  if (error) throw new Error(`No se pudo subir el canvas: ${error.message}`)
  return data?.path ?? null
}

export async function createNoteCanvasSignedUrl(
  supabase: SupabaseClient,
  canvasUrl: string
): Promise<string | null> {
  const path = extractCanvasPath(canvasUrl)
  const { data } = await supabase.storage
    .from(CANVAS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  return data?.signedUrl ?? null
}
