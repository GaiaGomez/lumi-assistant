import { toBogotaDateInputValue } from '@/lib/datetime'
import { buildDoctoraliaRequestHeaders } from '@/lib/doctoralia/session'
import type {
  DoctoraliaExternalAppointment,
  DoctoraliaStoredConnection,
} from '@/lib/doctoralia/types'

// Confirmed working endpoint (authenticated doctor app flow).
// Requires Authorization: Bearer <token> or Cookie: <session> header.
const DOCTORALIA_BASE_URL = 'https://docplanner.doctoralia.co/api'

// ── Error types ────────────────────────────────────────────────────────────────
// DoctoraliaSessionExpiredError  → auth failure  (401/403, HTML redirect)
//   User action required: reconnect / paste a fresh credential.
// DoctoraliaRequestError         → integration failure  (non-auth 4xx / 5xx)
//   Not the user's fault; endpoint or payload issue.
// DoctoraliaNetworkError         → connectivity failure  (fetch throws)
//   Transient; retry without requiring reconnect.

export class DoctoraliaSessionExpiredError extends Error {
  constructor(message = 'La sesión de Doctoralia expiró o ya no es válida.') {
    super(message)
    this.name = 'DoctoraliaSessionExpiredError'
  }
}

export class DoctoraliaRequestError extends Error {
  statusCode?: number

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'DoctoraliaRequestError'
    this.statusCode = statusCode
  }
}

export class DoctoraliaNetworkError extends Error {
  constructor(message = 'No se pudo conectar con Doctoralia. Verifica tu conexión.') {
    super(message)
    this.name = 'DoctoraliaNetworkError'
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildDoctoraliaDayUrl(date: string): string {
  return `${DOCTORALIA_BASE_URL}/appointments/day/${date}`
}

function isHtmlResponse(contentType: string, body: string): boolean {
  return (
    contentType.includes('text/html') ||
    body.trimStart().startsWith('<!DOCTYPE html') ||
    body.trimStart().startsWith('<html')
  )
}

function parseDoctoraliaAppointmentsPayload(body: string): DoctoraliaExternalAppointment[] {
  let parsed: unknown

  try {
    parsed = JSON.parse(body)
  } catch {
    throw new DoctoraliaRequestError('Doctoralia devolvió un payload inválido.')
  }

  if (!Array.isArray(parsed)) {
    throw new DoctoraliaRequestError('Doctoralia devolvió un formato inesperado.')
  }

  return parsed as DoctoraliaExternalAppointment[]
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function fetchDoctoraliaDayAppointments(
  connection: DoctoraliaStoredConnection,
  date: string
): Promise<DoctoraliaExternalAppointment[]> {
  let response: Response

  try {
    response = await fetch(buildDoctoraliaDayUrl(date), {
      headers: buildDoctoraliaRequestHeaders(connection),
      cache: 'no-store',
    })
  } catch (cause) {
    // fetch() itself threw — network-level failure, not an auth issue
    throw new DoctoraliaNetworkError()
  }

  // Auth failure: session expired, token invalid, or Doctoralia redirected to login page
  if (response.status === 401 || response.status === 403) {
    throw new DoctoraliaSessionExpiredError()
  }

  const contentType = response.headers.get('content-type') ?? ''
  const body = await response.text()

  // Auth failure: server returned an HTML page (redirect to login)
  if (isHtmlResponse(contentType, body)) {
    throw new DoctoraliaSessionExpiredError()
  }

  // Integration failure: non-auth HTTP error
  if (!response.ok) {
    throw new DoctoraliaRequestError(
      `Doctoralia respondió ${response.status} al leer la agenda del ${date}.`,
      response.status
    )
  }

  return parseDoctoraliaAppointmentsPayload(body)
}

// Validates an active connection by fetching today's schedule.
// Throws DoctoraliaSessionExpiredError on auth failure,
// DoctoraliaRequestError on integration failure,
// DoctoraliaNetworkError on connectivity failure.
export async function validateDoctoraliaConnection(connection: DoctoraliaStoredConnection) {
  const today = toBogotaDateInputValue(new Date())
  await fetchDoctoraliaDayAppointments(connection, today)
}
