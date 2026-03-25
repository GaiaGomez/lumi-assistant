// ============================================================
// SUPABASE CLIENT — lado del servidor (Server Components, API Routes)
// createServerClient: lee cookies para mantener la sesión del usuario
// ============================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Esta función crea un cliente Supabase para el servidor.
// next/headers.cookies() lee las cookies del request HTTP actual
// Supabase las usa para verificar si el usuario está autenticado
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // getAll: lee todas las cookies del request
        getAll() {
          return cookieStore.getAll()
        },
        // setAll: escribe las cookies en la respuesta
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll puede fallar en Server Components (solo lectura)
            // En ese caso Supabase maneja la sesión igualmente via getAll
          }
        },
      },
    }
  )
}
