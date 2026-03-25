// ============================================================
// MIDDLEWARE — se ejecuta en CADA request antes de que llegue a la página
// Su trabajo: verificar si el usuario está autenticado
// Si no está logueada → redirige a /login
// Si está logueada y va a /login → redirige al home
// ============================================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Creamos una respuesta mutable para poder modificar las cookies
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Verificamos si hay una sesión activa
  // IMPORTANTE: no usar getSession() en middleware — getUser() hace la verificación real con el servidor
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Si no está logueada y no está en /login → redirigir a login
  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si está logueada y va a /login → redirigir a la agenda
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/agenda', request.url))
  }

  return supabaseResponse
}

// Le decimos a Next.js en qué rutas ejecutar el middleware
// Excluimos archivos estáticos, imágenes y APIs
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
}
