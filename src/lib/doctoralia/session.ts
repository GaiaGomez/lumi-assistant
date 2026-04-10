import type {
  DoctoraliaSessionKind,
  DoctoraliaStoredConnection,
} from '@/lib/doctoralia/types'

interface NormalizedDoctoraliaSessionInput {
  sessionKind: DoctoraliaSessionKind
  sessionSecret: string
  sessionExpiresAt: string | null
}

function decodeBase64UrlSegment(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8')
}

function extractHeaderValue(rawInput: string): string {
  const lines = rawInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const authorizationLine = lines.find((line) => line.toLowerCase().startsWith('authorization:'))
  if (authorizationLine) {
    return authorizationLine.slice(authorizationLine.indexOf(':') + 1).trim()
  }

  const cookieLine = lines.find((line) => line.toLowerCase().startsWith('cookie:'))
  if (cookieLine) {
    return cookieLine.slice(cookieLine.indexOf(':') + 1).trim()
  }

  return rawInput.trim()
}

function looksLikeJwt(value: string): boolean {
  const token = value.replace(/^bearer\s+/i, '').trim()
  return token.split('.').length === 3
}

function looksLikeCookie(value: string): boolean {
  return value.includes('=') && !looksLikeJwt(value)
}

function inferJwtExpiry(token: string): string | null {
  const rawToken = token.replace(/^bearer\s+/i, '').trim()
  if (!looksLikeJwt(rawToken)) return null

  try {
    const [, payloadSegment] = rawToken.split('.')
    const payload = JSON.parse(decodeBase64UrlSegment(payloadSegment)) as { exp?: number }
    if (typeof payload.exp !== 'number') return null
    return new Date(payload.exp * 1000).toISOString()
  } catch {
    return null
  }
}

export function normalizeDoctoraliaSessionInput(rawInput: string): NormalizedDoctoraliaSessionInput {
  const extracted = extractHeaderValue(rawInput)

  if (!extracted) {
    throw new Error('Pega un valor de Authorization o Cookie activo de Doctoralia.')
  }

  if (/^bearer\s+/i.test(extracted) || looksLikeJwt(extracted)) {
    const sessionSecret = extracted.replace(/^bearer\s+/i, '').trim()
    if (!sessionSecret) {
      throw new Error('El valor de Authorization está vacío.')
    }

    return {
      sessionKind: 'authorization',
      sessionSecret,
      sessionExpiresAt: inferJwtExpiry(sessionSecret),
    }
  }

  if (looksLikeCookie(extracted)) {
    const sessionSecret = extracted.replace(/^cookie\s*:\s*/i, '').trim()
    if (!sessionSecret) {
      throw new Error('El valor de Cookie está vacío.')
    }

    return {
      sessionKind: 'cookie',
      sessionSecret,
      sessionExpiresAt: null,
    }
  }

  throw new Error('Formato no reconocido. Pega el valor de Authorization o Cookie de una sesión activa.')
}

export function isDoctoraliaSessionExpired(sessionExpiresAt: string | null | undefined): boolean {
  if (!sessionExpiresAt) return false
  return new Date(sessionExpiresAt).getTime() <= Date.now()
}

export function buildDoctoraliaRequestHeaders(connection: Pick<DoctoraliaStoredConnection, 'sessionKind' | 'sessionSecret'>): HeadersInit {
  if (!connection.sessionKind || !connection.sessionSecret) {
    throw new Error('No hay una sesión válida de Doctoralia guardada.')
  }

  const headers: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
    'x-country-id': 'CO',
    'x-user-type': 'doctor',
  }

  if (connection.sessionKind === 'authorization') {
    headers.Authorization = `bearer ${connection.sessionSecret}`
  } else {
    headers.Cookie = connection.sessionSecret
  }

  return headers
}
