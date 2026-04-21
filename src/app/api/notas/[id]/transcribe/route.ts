import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createClinicalNoteCanvasSignedUrl,
  saveTranscriptionResult,
} from '@/lib/clinical-notes'
import { transcribeCanvas } from '@/lib/ai'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  let force = false
  try {
    const body = await request.json() as { force?: boolean }
    force = body.force === true
  } catch {
    // body vacío o no-JSON es válido — force queda false
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: note } = await supabase
    .from('clinical_notes')
    .select('id, user_id, canvas_url')
    .eq('id', id)
    .single()

  if (!note) {
    return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
  }
  if (note.user_id !== user.id) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  if (!note.canvas_url) {
    return NextResponse.json(
      { error: 'Esta nota no tiene canvas para transcribir.' },
      { status: 400 }
    )
  }

  // Mark as processing so the UI can show spinner on reload
  await supabase
    .from('clinical_notes')
    .update({ transcription_status: 'processing' })
    .eq('id', id)

  let signedUrl: string | null = null
  try {
    signedUrl = await createClinicalNoteCanvasSignedUrl(supabase, note.canvas_url)
  } catch {
    const msg = 'No se pudo acceder a la imagen del canvas.'
    await saveTranscriptionResult(supabase, id, { status: 'error', error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  if (!signedUrl) {
    const msg = 'No se pudo generar la URL de acceso al canvas.'
    await saveTranscriptionResult(supabase, id, { status: 'error', error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  try {
    const transcriptionText = await transcribeCanvas(signedUrl)
    await saveTranscriptionResult(supabase, id, { status: 'done', text: transcriptionText, force })
    return NextResponse.json({ transcription_text: transcriptionText })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'

    if (msg === 'AI_NOT_CONFIGURED') {
      return NextResponse.json(
        {
          error: 'No hay proveedor de IA configurado. Agregá ANTHROPIC_API_KEY en las variables de entorno.',
          code: 'AI_NOT_CONFIGURED',
        },
        { status: 501 }
      )
    }

    await saveTranscriptionResult(supabase, id, { status: 'error', error: msg })
    return NextResponse.json({ error: `Error de IA: ${msg}` }, { status: 500 })
  }
}
