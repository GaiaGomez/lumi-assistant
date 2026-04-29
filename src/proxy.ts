import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function requireEnv(key: string): string {
  const value = process.env[key as keyof NodeJS.ProcessEnv]
  if (!value) {
    throw new Error(
      `Falta variable de entorno requerida: ${key}. Verifica que esté definida en .env.local`
    )
  }
  return value
}

const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_ANON_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

const PUBLIC_ROUTES = ['/login']
const INTERNAL_PREFIXES = ['/_next', '/favicon', '/api']
const PUBLIC_FILE_PATHS = ['/manifest.json', '/robots.txt', '/sitemap.xml', '/sw.js']

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    INTERNAL_PREFIXES.some((p) => pathname.startsWith(p)) ||
    PUBLIC_FILE_PATHS.includes(pathname)
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicRoute = PUBLIC_ROUTES.some((route) => matchesRoute(pathname, route))

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  if (user && matchesRoute(pathname, '/login')) {
    const agendaUrl = request.nextUrl.clone()
    agendaUrl.pathname = '/agenda'
    return NextResponse.redirect(agendaUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
