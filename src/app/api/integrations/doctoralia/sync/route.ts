import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncDoctoraliaConnectionForUser } from '@/lib/doctoralia/sync'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const url = new URL(request.url)
  const trigger = url.searchParams.get('trigger') === 'auto' ? 'auto' : 'manual'
  const result = await syncDoctoraliaConnectionForUser(supabase, user.id, { trigger })

  return NextResponse.json({
    outcome: result.outcome,
    trigger: result.trigger,
    error:
      result.outcome === 'success' || result.outcome === 'partial'
        ? null
        : result.connection.lastError ?? 'No se pudo sincronizar Doctoralia.',
    connection: result.connection,
    syncResult: result.syncResult,
  })
}
