import { toBogotaDateInputValue } from '@/lib/datetime'
import { buildDoctoraliaRequestHeaders } from '@/lib/doctoralia/session'
import type {
  DoctoraliaExternalAppointment,
  DoctoraliaStoredConnection,
} from '@/lib/doctoralia/types'

const DOCTORALIA_BASE_URL = 'https://docplanner.doctoralia.co/api'

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

function buildDoctoraliaDayUrl(date: string): string {
  return `${DOCTORALIA_BASE_URL}/appointments/day/${date}`
}

function isHtmlResponse(contentType: string, body: string): boolean {
  return contentType.includes('text/html') || body.trimStart().startsWith('<!DOCTYPE html') || body.trimStart().startsWith('<html')
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

export async function fetchDoctoraliaDayAppointments(
  connection: DoctoraliaStoredConnection,
  date: string
): Promise<DoctoraliaExternalAppointment[]> {
  const response = await fetch(buildDoctoraliaDayUrl(date), {
    headers: buildDoctoraliaRequestHeaders(connection),
    cache: 'no-store',
  })

  if (response.status === 401 || response.status === 403) {
    throw new DoctoraliaSessionExpiredError()
  }

  const contentType = response.headers.get('content-type') ?? ''
  const body = await response.text()

  if (isHtmlResponse(contentType, body)) {
    throw new DoctoraliaSessionExpiredError()
  }

  if (!response.ok) {
    throw new DoctoraliaRequestError(
      `Doctoralia respondió ${response.status} al leer la agenda del ${date}.`,
      response.status
    )
  }

  return parseDoctoraliaAppointmentsPayload(body)
}

export async function validateDoctoraliaConnection(connection: DoctoraliaStoredConnection) {
  const today = toBogotaDateInputValue(new Date())

  await fetchDoctoraliaDayAppointments(connection, today)
}
