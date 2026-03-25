// ============================================================
// SUPABASE CLIENT — lado del navegador (componentes React)
// createBrowserClient: se usa en Client Components ("use client")
// ============================================================

import { createBrowserClient } from '@supabase/ssr'

// Esta función crea un cliente Supabase para el browser.
// Lee las variables de entorno que configuramos en .env.local
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
