import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { saveStructuredNoteResult } from '@/lib/clinical-notes'
import { structureTranscription } from '@/lib/ai'
import type { ClinicalNoteTemplateData } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: note } = await supabase
    .from('clinical_notes')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (!note) {
    return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
  }
  if (note.user_id !== user.id) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo del request inválido.' }, { status: 400 })
  }

  const transcriptionText =
    body !== null &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    'transcription_text' in body
      ? (body as { transcription_text: unknown }).transcription_text
      : null

  if (typeof transcriptionText !== 'string' || !transcriptionText.trim()) {
    return NextResponse.json({ error: 'Se requiere transcription_text no vacío.' }, { status: 400 })
  }

  await supabase
    .from('clinical_notes')
    .update({ structured_note_status: 'processing' })
    .eq('id', id)

  try {
    const structuredNote: ClinicalNoteTemplateData = await structureTranscription(transcriptionText)
    await saveStructuredNoteResult(supabase, id, { status: 'done', json: structuredNote })
    return NextResponse.json({ structured_note_json: structuredNote })
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

    await saveStructuredNoteResult(supabase, id, { status: 'error', error: msg })
    return NextResponse.json({ error: `Error de IA: ${msg}` }, { status: 500 })
  }
}
