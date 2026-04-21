// ============================================================
// SYNC DOCTORALIA — importa citas desde la API interna de Doctoralia
// POST /api/sync/doctoralia  (lo llama el botón en Configuración)
//
// Flujo:
//  1. Recibe el Bearer token desde el body (o usa el guardado si no viene)
//  2. Guarda el token en doctoralia_connections.session_secret
//  3. Corre la sincronización
//  4. Actualiza doctoralia_connections con el resultado
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncDoctoraliaAppointmentsForUser } from '@/lib/doctoralia-sync'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // ── 1. Obtener el token ──────────────────────────────────────────
  // Primero intenta del body; si no viene, usa el guardado en DB
  let token: string | null = null

  try {
    const body = await request.json()
    if (typeof body?.token === 'string' && body.token.trim()) {
      token = body.token.trim()
    }
  } catch {
    // body vacío o no es JSON — intentará usar el token guardado
  }

  if (!token) {
    // Intentar usar el token ya guardado en doctoralia_connections
    const { data: conn } = await supabase
      .from('doctoralia_connections')
      .select('session_secret, connection_status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (conn?.session_secret) {
      token = conn.session_secret
    }
  }

  if (!token) {
    return NextResponse.json(
      {
        error: 'No hay token de Doctoralia. Copia el Bearer token desde DevTools y pégalo en el campo.',
        code: 'NO_TOKEN',
      },
      { status: 400 }
    )
  }

  // ── 2. Guardar/actualizar token y marcar como "syncing" ──────────
  await supabase
    .from('doctoralia_connections')
    .upsert(
      {
        user_id:           user.id,
        session_secret:    token,
        session_kind:      'authorization',
        connection_status: 'syncing',
        last_error:        null,
        updated_at:        new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  // ── 3. Correr la sincronización ───────────────────────────────────
  try {
    const result = await syncDoctoraliaAppointmentsForUser(supabase, user.id, token, 60, 1)

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

    // ── 4. Guardar resultado exitoso ──────────────────────────────
    await supabase
      .from('doctoralia_connections')
      .update({
        connection_status: 'connected',
        last_sync_at:      result.syncedAt,
        last_sync_result:  syncResult,
        last_error:        null,
        connected_at:      result.syncedAt,
      })
      .eq('user_id', user.id)

    return NextResponse.json({ result: syncResult })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'

    const isExpired = message === 'TOKEN_EXPIRADO'

    // Guardar estado de error
    await supabase
      .from('doctoralia_connections')
      .update({
        connection_status: isExpired ? 'expired' : 'error',
        last_error:        message,
        // Si el token expiró, borrarlo para que no quede guardado un token muerto
        ...(isExpired ? { session_secret: null } : {}),
      })
      .eq('user_id', user.id)

    if (isExpired) {
      return NextResponse.json(
        {
          error: 'El token venció. Abre Doctoralia en Chrome, ve a DevTools → Network y copia un token fresco.',
          code: 'TOKEN_EXPIRADO',
        },
        { status: 401 }
      )
    }

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
