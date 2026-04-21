// ============================================================
// CRON: RECORDATORIO DE CITAS — se ejecuta diariamente a las 9am
// Cuenta las citas del día siguiente con estado pendiente.
// Los resultados quedan en los logs de Vercel para monitoreo.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  // Verificamos que el request viene de Vercel Cron (no de alguien random)
  // La Authorization header la configura Vercel automáticamente con CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Para los cron jobs usamos el service role key (sin RLS) porque el sistema actúa como admin
  // NOTA: este key NUNCA va al frontend, solo en variables de entorno del servidor
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const manana = new Date()
  manana.setDate(manana.getDate() + 1)
  const inicio = new Date(manana); inicio.setHours(0, 0, 0, 0)
  const fin = new Date(manana); fin.setHours(23, 59, 59, 999)

  const { data: citas, error } = await supabase
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('estado_sesion', 'pendiente')
    .gte('fecha_inicio', inicio.toISOString())
    .lte('fecha_inicio', fin.toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log para que Lu vea en los logs de Vercel qué citas hay mañana
  console.log(`[Cron] Citas mañana: ${citas?.length ?? 0}`)

  return NextResponse.json({
    success: true,
    citasManana: citas?.length ?? 0,
    mensaje: `${citas?.length ?? 0} cita(s) pendiente(s) mañana`
  })
}
