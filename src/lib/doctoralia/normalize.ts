import { createHash } from 'crypto'
import { normalizeDateTimeInBogota } from '@/lib/datetime'
import type {
  DoctoraliaExternalAppointment,
  DoctoraliaNormalizedAppointment,
} from '@/lib/doctoralia/types'

export interface DoctoraliaSyncWindow {
  dates: string[]
  rangeStartIso: string
  rangeEndIso: string
}

function normalizeWhitespace(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function mapDoctoraliaAttendanceToEstado(attendance: number) {
  switch (attendance) {
    case 1:
      return 'confirmada' as const
    case 2:
      return 'realizada' as const
    case 3:
      return 'cancelo' as const
    default:
      return 'pendiente' as const
  }
}

function buildPatientName(raw: DoctoraliaExternalAppointment): string {
  const firstName = raw.patient?.firstName?.trim() ?? ''
  const lastName = raw.patient?.lastName?.trim() ?? ''
  return `${firstName} ${lastName}`.trim()
}

function buildFallbackExternalKey(raw: DoctoraliaExternalAppointment, patientName: string): string {
  const fingerprintSource = [
    normalizeDateTimeInBogota(raw.start),
    normalizeDateTimeInBogota(raw.end),
    normalizeWhitespace(patientName || 'sin-nombre'),
    String(raw.scheduledBy ?? ''),
  ].join('|')

  return `fingerprint:${hashString(fingerprintSource).slice(0, 32)}`
}

export function normalizeDoctoraliaAppointment(
  raw: DoctoraliaExternalAppointment,
  sourceDay: string
): DoctoraliaNormalizedAppointment {
  const patientName = buildPatientName(raw)
  const title = patientName || 'Cita importada'
  const fechaInicio = normalizeDateTimeInBogota(raw.start)
  const fechaFin = normalizeDateTimeInBogota(raw.end)
  const externalId = raw.id === null || raw.id === undefined || String(raw.id).trim() === ''
    ? null
    : String(raw.id)

  // Estrategia de deduplicación:
  // 1) usamos el id externo cuando Doctoralia lo entrega;
  // 2) si no existe, caemos a un fingerprint determinístico de horario + paciente + hint del scheduler.
  // Este fallback evita duplicados en la mayoría de casos, pero dos citas idénticas para el mismo
  // paciente y horario podrían colisionar si Doctoralia no expone un identificador estable.
  const externalKey = externalId
    ? `appointment:${externalId}`
    : buildFallbackExternalKey(raw, patientName)
  const dedupeMode = externalId ? 'external-id' as const : 'fingerprint' as const
  const estadoSesion = mapDoctoraliaAttendanceToEstado(raw.attendance)
  const payloadHash = hashString(JSON.stringify({
    title,
    patientName,
    fechaInicio,
    fechaFin,
    estadoSesion,
  }))

  return {
    externalKey,
    externalId,
    dedupeMode,
    sourceDay,
    title,
    patientName,
    fechaInicio,
    fechaFin,
    estadoSesion,
    payloadHash,
  }
}

export function buildDoctoraliaSyncWindow(
  daysAhead = 30,
  daysBehind = 1,
  baseDate = new Date()
): DoctoraliaSyncWindow {
  const dates: string[] = []
  const start = new Date(baseDate)
  start.setDate(start.getDate() - daysBehind)
  start.setHours(0, 0, 0, 0)

  const end = new Date(baseDate)
  end.setDate(end.getDate() + daysAhead)
  end.setHours(23, 59, 59, 999)

  for (let offset = -daysBehind; offset <= daysAhead; offset += 1) {
    const date = new Date(baseDate)
    date.setDate(baseDate.getDate() + offset)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    dates.push(`${year}-${month}-${day}`)
  }

  return {
    dates,
    rangeStartIso: start.toISOString(),
    rangeEndIso: end.toISOString(),
  }
}

export function buildDoctoraliaCandidateKey(input: {
  title: string
  fechaInicio: string
  fechaFin: string
}): string {
  return [
    input.fechaInicio,
    input.fechaFin,
    normalizeWhitespace(input.title),
  ].join('|')
}
