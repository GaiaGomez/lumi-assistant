import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { connectDoctoraliaSession } from '@/lib/doctoralia/sync'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as { sessionValue?: string } | null
  const sessionValue = body?.sessionValue?.trim() ?? ''

  if (!sessionValue) {
    return NextResponse.json(
      { error: 'Pega una credencial activa de Doctoralia.' },
      { status: 400 }
    )
  }

  const result = await connectDoctoraliaSession(supabase, user.id, sessionValue)

  if (result.outcome === 'connected') {
    return NextResponse.json({ connection: result.connection })
  }

  return NextResponse.json(
    {
      error: result.connection.lastError ?? 'No se pudo validar la conexión.',
      connection: result.connection,
    },
    { status: result.outcome === 'expired' ? 401 : 400 }
  )
}
