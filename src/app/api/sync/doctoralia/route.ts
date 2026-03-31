// ============================================================
// SYNC DOCTORALIA — importa citas desde el feed iCal de Doctoralia
// POST /api/sync/doctoralia
// Solo inserta citas nuevas (ignoreDuplicates: true) para no pisar
// los estados que Lu haya actualizado manualmente.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchDoctoraliaCitas } from '@/lib/ical'
import { fetchSettings, upsertSettingValue } from '@/lib/settings'

export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const settings = await fetchSettings(supabase, user.id)
  const icalUrl = settings['doctoralia_ical_url']

  if (!icalUrl) {
    return NextResponse.json(
      { error: 'No hay URL del calendario de Doctoralia configurada' },
      { status: 400 }
    )
  }

  // Parsear el feed iCal
  let citas
  try {
    citas = await fetchDoctoraliaCitas(icalUrl, user.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al leer el calendario'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  if (!citas.length) {
    await upsertSettingValue(supabase, user.id, 'doctoralia_last_sync', JSON.stringify({
      synced_at: new Date().toISOString(),
      total: 0,
      imported: 0,
    }))
    return NextResponse.json({ total: 0, imported: 0 })
  }

  // Insertar solo las citas nuevas — ignoreDuplicates evita pisar datos editados manualmente
  const { error: insertError, count } = await supabase
    .from('appointments')
    .upsert(citas, {
      onConflict: 'user_id,doctoralia_uid',
      ignoreDuplicates: true,
      count: 'exact',
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const imported = count ?? 0

  // Guardar el resultado del último sync en settings
  await upsertSettingValue(supabase, user.id, 'doctoralia_last_sync', JSON.stringify({
    synced_at: new Date().toISOString(),
    total: citas.length,
    imported,
  }))

  return NextResponse.json({ total: citas.length, imported })
}
