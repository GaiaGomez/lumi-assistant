// ============================================================
// SYNC DOCTORALIA — importa citas desde la API interna de Doctoralia
// POST /api/sync/doctoralia  (lo llama el botón en Configuración)
// Usa el Bearer token descubierto en DevTools → Network → Request Headers
// ============================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncDoctoraliaAppointmentsForUser } from '@/lib/doctoralia-sync'
import { fetchSettings, upsertSettingValue } from '@/lib/settings'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const settings = await fetchSettings(supabase, user.id)
  const token = settings['doctoralia_token']

  if (!token) {
    return NextResponse.json(
      { error: 'No hay token de Doctoralia configurado. Agrégalo en Configuración.' },
      { status: 400 }
    )
  }

  try {
    const result = await syncDoctoraliaAppointmentsForUser(supabase, user.id, token, 60, 1)

    await Promise.all([
      upsertSettingValue(supabase, user.id, 'doctoralia_last_sync', JSON.stringify({
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
      upsertSettingValue(supabase, user.id, 'doctoralia_sync_error', ''),
    ])

    return NextResponse.json({
      total: result.total,
      imported: result.imported,
      created: result.created,
      updated: result.updated,
      repaired: result.repaired,
      patients_created: result.patientsCreated,
      linked: result.linked,
      unmatched: result.unmatched,
      phones_skipped: result.phonesSkipped,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    await upsertSettingValue(supabase, user.id, 'doctoralia_sync_error', message)

    if (message === 'TOKEN_EXPIRADO') {
      return NextResponse.json(
        { error: 'El token de Doctoralia expiró. Copia uno nuevo desde DevTools y pégalo en Configuración.' },
        { status: 401 }
      )
    }
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
