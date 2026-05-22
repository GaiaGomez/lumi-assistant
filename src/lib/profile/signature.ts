import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'professional-signatures'

export async function uploadProfessionalSignature(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `${userId}/signature.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(error.message)
  return path
}

export async function deleteProfessionalSignature(
  supabase: SupabaseClient,
  path: string
): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw new Error(error.message)
}

export async function getProfessionalSignatureUrl(
  supabase: SupabaseClient,
  path: string,
  expiresIn = 120
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'No se pudo generar la URL')
  return data.signedUrl
}
