// src/app/api/keepalive/route.ts
// Ruta que Vercel Cron llama una vez al día (ver vercel.json). Hace dos cosas:
//   1. Mantiene Supabase activo: el plan gratis pausa el proyecto tras ~7 días
//      sin peticiones a la base de datos.
//   2. Refresca el demo: llama a la función SQL reset_demo() (supabase/reset_demo.sql),
//      que regenera las citas y pacientes ficticios con fechas relativas a hoy.
// Nota: proxy.ts ya excluye /api, así que esta ruta no redirige a /login.

import { NextResponse } from 'next/server'

// Fuerza ejecución en cada llamada (nada de respuestas cacheadas del build).
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Si CRON_SECRET está configurado en Vercel, Vercel Cron lo envía como
  // "Authorization: Bearer <secreto>". Cualquier otra petición recibe 401.
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

  // 1) Refresca el demo. RPC = llamar una función de Postgres por HTTP.
  const rpc = await fetch(`${url}/rest/v1/rpc/reset_demo`, {
    method: 'POST',
    headers,
    body: '{}',
    cache: 'no-store',
  })

  // 2) Si la función aún no existe, una consulta mínima mantiene vivo el keepalive.
  let fallbackStatus: number | null = null
  if (!rpc.ok) {
    const res = await fetch(`${url}/rest/v1/settings?select=id&limit=1`, { headers, cache: 'no-store' })
    fallbackStatus = res.status
  }

  const ok = rpc.ok || fallbackStatus === 200
  return NextResponse.json(
    { ok, demoReset: rpc.ok, rpcStatus: rpc.status, fallbackStatus, at: new Date().toISOString() },
    { status: ok ? 200 : 502 }
  )
}
