// ============================================================
// CRON: SYNC DOCTORALIA — corre según el schedule de Vercel
// Vercel llama este endpoint según el schedule en vercel.json
//
// Lee los tokens de doctoralia_connections (no de settings)
// y sincroniza automáticamente para cada usuario conectado.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncDoctoraliaAppointmentsForUser } from '@/lib/doctoralia-sync'

export async function GET(request: NextRequest) {
  // Solo Vercel puede llamar este endpoint (via CRON_SECRET)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Service role: sin RLS, puede leer todos los usuarios
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Busca todos los usuarios con token guardado y conexión activa o expirada
  // (no procesamos "error" permanente — esos requieren intervención manual)
  const { data: connections, error: connError } = await supabase
    .from('doctoralia_connections')
    .select('user_id, session_secret, connection_status')
    .not('session_secret', 'is', null)
    .neq('session_secret', '')
    .in('connection_status', ['connected', 'expired', 'syncing', 'error'])

  if (connError) {
    console.error('[Cron sync-doctoralia] Error leyendo connections:', connError.message)
    return NextResponse.json({ error: connError.message }, { status: 500 })
  }

  if (!connections || connections.length === 0) {
    console.log('[Cron sync-doctoralia] Ningún usuario tiene token configurado')
    return NextResponse.json({ synced: 0 })
  }

  let totalImported = 0
  let usersOk = 0
  let usersExpired = 0

  for (const conn of connections) {
    const { user_id, session_secret: token } = conn
    if (!token) continue

    try {
      // Marcar como syncing
      await supabase
        .from('doctoralia_connections')
        .update({ connection_status: 'syncing', updated_at: new Date().toISOString() })
        .eq('user_id', user_id)

      const result = await syncDoctoraliaAppointmentsForUser(supabase as never, user_id, token, 60, 1)
      totalImported += result.imported
      usersOk++

      const syncResult = {
        total:           result.total,
        created:         result.created,
        updated:         result.updated,
        repaired:        result.repaired,
        patientsCreated: result.patientsCreated,
        linked:          result.linked,
        unmatched:       result.unmatched,
        syncedAt:        result.syncedAt,
      }

      await supabase
        .from('doctoralia_connections')
        .update({
          connection_status: 'connected',
          last_sync_at:      result.syncedAt,
          last_sync_result:  syncResult,
          last_error:        null,
          connected_at:      result.syncedAt,
        })
        .eq('user_id', user_id)

      console.log(
        `[Cron sync-doctoralia] user=${user_id} → total=${result.total} created=${result.created} updated=${result.updated} unmatched=${result.unmatched}`
      )

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      const isExpired = msg === 'TOKEN_EXPIRADO'
      if (isExpired) usersExpired++

      console.error(`[Cron sync-doctoralia] user=${user_id} error:`, msg)

      await supabase
        .from('doctoralia_connections')
        .update({
          connection_status: isExpired ? 'expired' : 'error',
          last_error:        msg,
          // Si expiró, limpiar el token para no seguir reintentando con uno muerto
          ...(isExpired ? { session_secret: null } : {}),
        })
        .eq('user_id', user_id)
    }
  }

  return NextResponse.json({
    success: true,
    usersProcessed: connections.length,
    usersOk,
    usersExpired,
    totalImported,
  })
}
