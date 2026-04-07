// ============================================================
// CRON: SYNC DOCTORALIA — corre según el schedule de Vercel
// Vercel llama este endpoint según el schedule en vercel.json
// Usa la API interna de Doctoralia con el Bearer token guardado en settings
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncDoctoraliaAppointmentsForUser } from '@/lib/doctoralia-sync'
import { upsertSettingValue } from '@/lib/settings'

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

  // Busca todos los usuarios que tienen un token de Doctoralia configurado
  const { data: tokenRows, error: settingsError } = await supabase
    .from('settings')
    .select('user_id, value')
    .eq('key', 'doctoralia_token')
    .neq('value', '')

  if (settingsError) {
    console.error('[Cron sync-doctoralia] Error leyendo settings:', settingsError.message)
    return NextResponse.json({ error: settingsError.message }, { status: 500 })
  }

  if (!tokenRows || tokenRows.length === 0) {
    console.log('[Cron sync-doctoralia] Ningún usuario tiene token configurado')
    return NextResponse.json({ synced: 0 })
  }

  let totalImported = 0

  for (const row of tokenRows) {
    const { user_id, value: token } = row

    try {
      const result = await syncDoctoraliaAppointmentsForUser(supabase as never, user_id, token, 30, 1)
      totalImported += result.imported

      await Promise.all([
        upsertSettingValue(supabase as never, user_id, 'doctoralia_last_sync', JSON.stringify({
          synced_at: result.syncedAt,
          total: result.total,
          imported: result.imported,
          created: result.created,
          updated: result.updated,
          repaired: result.repaired,
          patients_created: result.patientsCreated,
          linked: result.linked,
          unmatched: result.unmatched,
          phones_skipped: result.phonesSkipped,
        })),
        upsertSettingValue(supabase as never, user_id, 'doctoralia_sync_error', ''),
      ])

      console.log(
        `[Cron sync-doctoralia] user=${user_id} → total=${result.total} linked=${result.linked} unmatched=${result.unmatched} phones_skipped=${result.phonesSkipped}`
      )

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      console.error(`[Cron sync-doctoralia] user=${user_id} error:`, msg)
      await upsertSettingValue(supabase as never, user_id, 'doctoralia_sync_error', msg)
    }
  }

  return NextResponse.json({ success: true, usersProcessed: tokenRows.length, totalImported })
}
