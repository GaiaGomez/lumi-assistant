// src/app/api/keepalive/route.ts
// Ruta que Vercel Cron llama una vez al día para que Supabase (plan gratis)
// no pause el proyecto por inactividad. Supabase pausa tras ~7 días sin
// peticiones a la base de datos, así que basta con una consulta mínima diaria.
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

  // Consulta mínima a PostgREST con la anon key. RLS impide leer datos de
  // pacientes, pero la petición llega a Postgres y cuenta como actividad.
  const res = await fetch(`${url}/rest/v1/settings?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: 'no-store',
  })

  return NextResponse.json(
    { ok: res.ok, supabaseStatus: res.status, at: new Date().toISOString() },
    { status: res.ok ? 200 : 502 }
  )
}
