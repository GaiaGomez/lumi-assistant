// ============================================================
// DOCTORALIA API CLIENT — llama a la API interna de Doctoralia
// Descubierta inspeccionando las llamadas del browser con DevTools.
// Endpoint: GET /api/appointments/day/{YYYY-MM-DD}
// Auth: Bearer token (se obtiene de los request headers en DevTools)
// ============================================================

import {
  normalizeDateTimeAssumingUtc,
  normalizeDoctoraliaDateTime,
} from '@/lib/datetime'

// Forma exacta en que Doctoralia devuelve una cita
export interface DoctoraliaAppointment {
  id: number           // ID único de la cita en Doctoralia
  start: string        // datetime local de agenda; a veces viene sin offset, ej: "2026-04-06T09:00:00"
  end: string          // mismo formato que start
  attendance: number   // 0=pendiente, 1=confirmada, 2=realizada, 3=canceló (sin docs oficiales)
  scheduledBy: number  // 0=agendada por el profesional, otros valores = por paciente u otro
  noShowIsReported: boolean
  firstServiceColorSchemaId: number
  scheduleColorSchemaId: number
  patient: {
    firstName: string
    lastName: string
    // Campos de contacto — presentes o no según el endpoint; se capturam si la API los devuelve
    phone?: string | null
    phoneNumber?: string | null
    mobile?: string | null
    cellPhone?: string | null
    phonePrefix?: string | null
  }
}

export interface DoctoraliaSyncWindow {
  dates: string[]
  rangeStartIso: string
  rangeEndIso: string
}

export interface NormalizedDoctoraliaAppointment extends DoctoraliaAppointment {
  start_iso: string
  end_iso: string
  start_iso_if_utc: string
  end_iso_if_utc: string
}

// Respuesta del endpoint POST /api/phoneNumber de Doctoralia
export interface DoctoraliaPhoneValidation {
  countryCode: number
  extension: string
  hasExtension: boolean
  isValid: boolean
  hasCountryCode: boolean
  format: string        // número en formato internacional, ej: "+573183895244"
  exampleNumber: string
}

// Respuesta mínima del endpoint GET /api/appointments/{id}/for-edition
// Solo mapeamos los campos que necesitamos — la respuesta completa tiene mucho más.
export interface DoctoraliaAppointmentForEdition {
  patient: {
    id: number
    firstName: string
    lastName: string
    phone: string | null    // teléfono crudo tal como está en Doctoralia, ej: "+57 318 4042549"
    email: string | null
  }
}

// Obtiene el detalle completo de una cita, incluyendo el teléfono del paciente.
// Doctoralia solo devuelve el teléfono en este endpoint, no en el listado de agenda.
export async function fetchDoctoraliaAppointmentDetail(
  appointmentId: string,
  token: string
): Promise<DoctoraliaAppointmentForEdition | null> {
  try {
    const response = await fetch(
      `https://docplanner.doctoralia.co/api/appointments/${appointmentId}/for-edition`,
      {
        headers: {
          'Authorization': `bearer ${token}`,
          'Accept': 'application/json, text/plain, */*',
          'x-country-id': 'CO',
          'x-user-type': 'doctor',
        },
        cache: 'no-store',
      }
    )
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// Llama al endpoint de validación/normalización de Doctoralia.
// Devuelve el número en formato internacional (+57...) si es válido, o null si falla.
export async function fetchDoctoraliaPhoneValidation(
  rawPhone: string,
  token: string
): Promise<string | null> {
  try {
    const response = await fetch('https://docplanner.doctoralia.co/api/phoneNumber', {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${token}`,
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'x-country-id': 'CO',
        'x-user-type': 'doctor',
      },
      body: JSON.stringify({ phoneNumber: rawPhone }),
      cache: 'no-store',
    })

    if (!response.ok) return null

    const data: DoctoraliaPhoneValidation = await response.json()

    if (data.isValid && data.format) return data.format
    return null
  } catch {
    return null
  }
}

// Mapeamos el campo `attendance` de Doctoralia a nuestro enum de estado_sesion
export function mapAttendanceToEstado(
  attendance: number
): 'pendiente' | 'confirmada' | 'realizada' | 'cancelo' {
  switch (attendance) {
    case 0: return 'pendiente'   // agendada, aún no ocurre
    case 1: return 'confirmada'  // paciente confirmó asistencia
    case 2: return 'realizada'   // sesión ya ocurrió
    case 3: return 'cancelo'     // paciente canceló
    default: return 'pendiente'
  }
}

// Obtiene las citas de un día específico desde la API interna de Doctoralia
// token: el Bearer token que se ve en los request headers de DevTools
// date: fecha en formato YYYY-MM-DD
export async function fetchDoctoraliaDayAppointments(
  date: string,
  token: string
): Promise<NormalizedDoctoraliaAppointment[]> {
  const url = `https://docplanner.doctoralia.co/api/appointments/day/${date}`

  const response = await fetch(url, {
    headers: {
      'Authorization': `bearer ${token}`,
      'Accept': 'application/json, text/plain, */*',
      'x-country-id': 'CO',      // país de la cuenta
      'x-user-type': 'doctor',   // tipo de usuario
    },
    // No cacheamos — siempre queremos datos frescos
    cache: 'no-store',
  })

  // 401 = token vencido → el usuario necesita pegar uno nuevo
  if (response.status === 401) {
    throw new Error('TOKEN_EXPIRADO')
  }

  if (!response.ok) {
    throw new Error(`Error ${response.status} al obtener citas del ${date}`)
  }

  const data = await response.json()

  // La API devuelve un array directamente, pero validamos por si acaso
  return Array.isArray(data)
    ? data.map((appointment) => ({
        ...appointment,
        start_iso: normalizeDoctoraliaDateTime(appointment.start),
        end_iso: normalizeDoctoraliaDateTime(appointment.end),
        start_iso_if_utc: normalizeDateTimeAssumingUtc(appointment.start),
        end_iso_if_utc: normalizeDateTimeAssumingUtc(appointment.end),
      }))
    : []
}

// Obtiene citas para un rango de días (hoy - daysBehind hasta hoy + daysAhead)
// Hace una llamada por día en paralelo (Promise.all)
export async function fetchDoctoraliaRange(
  token: string,
  daysAhead = 30,
  daysBehind = 1
): Promise<NormalizedDoctoraliaAppointment[]> {
  const { dates } = buildDoctoraliaSyncWindow(daysAhead, daysBehind)

  const results = await Promise.allSettled(
    dates.map((date) => fetchDoctoraliaDayAppointments(date, token))
  )

  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => result.reason)

  if (errors.length > 0) {
    const tokenExpired = errors.find((error) => error instanceof Error && error.message === 'TOKEN_EXPIRADO')
    if (tokenExpired instanceof Error) throw tokenExpired

    const firstError = errors[0]
    if (firstError instanceof Error) throw firstError
    throw new Error('No se pudo sincronizar Doctoralia.')
  }

  return results
    .filter((result): result is PromiseFulfilledResult<NormalizedDoctoraliaAppointment[]> => result.status === 'fulfilled')
    .flatMap((result) => result.value)
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

  for (let i = -daysBehind; i <= daysAhead; i++) {
    const d = new Date(baseDate)
    d.setDate(baseDate.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    dates.push(`${yyyy}-${mm}-${dd}`)
  }

  return {
    dates,
    rangeStartIso: start.toISOString(),
    rangeEndIso: end.toISOString(),
  }
}
