import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { connectDoctoraliaSession } from '@/lib/doctoralia/sync'

// Endpoint del API interno de Doctoralia para autenticación de doctores.
// Si Doctoralia cambia esta URL, actualiza solo esta constante.
const DOCTORALIA_LOGIN_URL = 'https://docplanner.doctoralia.co/api/auth/login'

function extractSessionFromLoginResponse(
  response: Response,
  body: Record<string, unknown> | null
): string | null {
  // 1. Authorization header en la respuesta
  const authHeader = response.headers.get('authorization')
  if (authHeader) return authHeader

  // 2. Token en el cuerpo JSON
  const rawToken =
    body?.token ?? body?.access_token ?? body?.jwt ?? body?.accessToken
  if (typeof rawToken === 'string' && rawToken) {
    return `Authorization: Bearer ${rawToken}`
  }

  // 3. Set-Cookie — usa getSetCookie() cuando está disponible (Node 18+)
  const headersWithGetSetCookie = response.headers as Headers & {
    getSetCookie?: () => string[]
  }
  const setCookieValues = headersWithGetSetCookie.getSetCookie?.() ?? []
  const setCookieFallback = response.headers.get('set-cookie')

  const allSetCookies =
    setCookieValues.length > 0
      ? setCookieValues
      : setCookieFallback
        ? [setCookieFallback]
        : []

  if (allSetCookies.length > 0) {
    const cookiePairs = allSetCookies
      .map((c) => c.split(';')[0]?.trim())
      .filter(Boolean)
      .join('; ')
    if (cookiePairs) return `Cookie: ${cookiePairs}`
  }

  return null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as {
    email?: string
    password?: string
  } | null

  const email = body?.email?.trim() ?? ''
  const password = body?.password ?? ''

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Ingresa tu email y contraseña de Doctoralia.' },
      { status: 400 }
    )
  }

  let authValue: string | null = null

  try {
    const loginResponse = await fetch(DOCTORALIA_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-country-id': 'CO',
        'x-user-type': 'doctor',
      },
      body: JSON.stringify({ login: email, password }),
      cache: 'no-store',
    })

    const responseBody = await loginResponse.json().catch(() => null) as
      | Record<string, unknown>
      | null

    if (
      loginResponse.status === 401 ||
      loginResponse.status === 403 ||
      loginResponse.status === 422
    ) {
      return NextResponse.json(
        {
          error:
            'Credenciales incorrectas. Verifica tu email y contraseña de Doctoralia.',
        },
        { status: 401 }
      )
    }

    if (!loginResponse.ok) {
      const serverMessage =
        typeof responseBody?.message === 'string' ? responseBody.message : null
      return NextResponse.json(
        { error: serverMessage ?? 'Doctoralia no respondió. Intenta de nuevo.' },
        { status: 502 }
      )
    }

    authValue = extractSessionFromLoginResponse(loginResponse, responseBody)

    if (!authValue) {
      console.warn(
        '[Doctoralia login] login ok pero no se pudo extraer sesión de la respuesta'
      )
      return NextResponse.json(
        {
          error:
            'Doctoralia completó el login pero no devolvió una sesión reconocible. Usa "Credencial manual" para pegarla desde tu navegador.',
        },
        { status: 502 }
      )
    }
  } catch (error) {
    console.error('[Doctoralia login] error de red:', error)
    return NextResponse.json(
      {
        error:
          'No se pudo conectar con Doctoralia. Verifica tu conexión e intenta de nuevo.',
      },
      { status: 502 }
    )
  }

  const result = await connectDoctoraliaSession(supabase, user.id, authValue)

  if (result.outcome === 'connected') {
    return NextResponse.json({ connection: result.connection })
  }

  return NextResponse.json(
    {
      error:
        result.connection.lastError ?? 'La sesión obtenida no pudo validarse.',
      connection: result.connection,
    },
    { status: result.outcome === 'expired' ? 401 : 400 }
  )
}
