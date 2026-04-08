import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSettings } from '@/lib/settings'

function buildFileName(date: Date): string {
  return `lumi-datos-${date.toISOString().slice(0, 10)}.json`
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const [
    consultoriosResult,
    patientsResult,
    appointmentsResult,
    clinicalNotesResult,
    settings,
  ] = await Promise.all([
    supabase
      .from('consultorios')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('patients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha_inicio', { ascending: true }),
    supabase
      .from('clinical_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    fetchSettings(supabase, user.id),
  ])

  const failedResult = [
    consultoriosResult,
    patientsResult,
    appointmentsResult,
    clinicalNotesResult,
  ].find((result) => result.error)

  if (failedResult?.error) {
    return NextResponse.json(
      { error: failedResult.error.message || 'No se pudo exportar la información.' },
      { status: 500 }
    )
  }

  const safeSettings = Object.fromEntries(
    Object.entries(settings).filter(([key]) => key !== 'doctoralia_token')
  )
  const generatedAt = new Date()

  const payload = {
    exported_at: generatedAt.toISOString(),
    format: 'lumi-data-export/v1',
    account: {
      id: user.id,
      email: user.email ?? null,
      created_at: user.created_at ?? null,
      last_sign_in_at: user.last_sign_in_at ?? null,
    },
    summary: {
      consultorios: consultoriosResult.data?.length ?? 0,
      patients: patientsResult.data?.length ?? 0,
      appointments: appointmentsResult.data?.length ?? 0,
      clinical_notes: clinicalNotesResult.data?.length ?? 0,
    },
    notes: [
      'La exportación incluye los datos estructurados de Lumi en formato JSON.',
      'Los archivos binarios del canvas no se embeben; las notas conservan la referencia guardada en canvas_url.',
      'Por seguridad, el token de Doctoralia no se incluye en esta descarga.',
    ],
    data: {
      settings: safeSettings,
      consultorios: consultoriosResult.data ?? [],
      patients: patientsResult.data ?? [],
      appointments: appointmentsResult.data ?? [],
      clinical_notes: clinicalNotesResult.data ?? [],
    },
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${buildFileName(generatedAt)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
