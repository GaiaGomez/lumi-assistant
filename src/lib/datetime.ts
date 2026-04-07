export const LUMI_TIME_ZONE = 'America/Bogota'

const DOCTORALIA_OFFSET_HOURS = 5
const ISO_WITH_TIME_ZONE_RE = /(Z|[+-]\d{2}:\d{2})$/i
const LOCAL_DATE_TIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function ensureValidDate(date: Date, originalValue: string): Date {
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Fecha inválida: ${originalValue}`)
  }
  return date
}

export function parseIsoDateTime(value: string): Date {
  return ensureValidDate(new Date(value), value)
}

function buildBogotaUtcDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): Date {
  return new Date(
    Date.UTC(year, month - 1, day, hour + DOCTORALIA_OFFSET_HOURS, minute, second)
  )
}

export function parseDoctoraliaDateTime(value: string): Date {
  if (ISO_WITH_TIME_ZONE_RE.test(value)) {
    return ensureValidDate(new Date(value), value)
  }

  const match = value.match(LOCAL_DATE_TIME_RE)
  if (!match) {
    throw new Error(`Formato de fecha Doctoralia no soportado: ${value}`)
  }

  const [, year, month, day, hour, minute, second = '00'] = match
  return ensureValidDate(
    buildBogotaUtcDate(
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ),
    value
  )
}

export function normalizeDoctoraliaDateTime(value: string): string {
  return parseDoctoraliaDateTime(value).toISOString()
}

export function normalizeDateTimeAssumingUtc(value: string): string {
  if (ISO_WITH_TIME_ZONE_RE.test(value)) {
    return ensureValidDate(new Date(value), value).toISOString()
  }

  const match = value.match(LOCAL_DATE_TIME_RE)
  if (!match) {
    throw new Error(`Formato de fecha sin zona no soportado: ${value}`)
  }

  const [, year, month, day, hour, minute, second = '00'] = match
  return ensureValidDate(
    new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      )
    ),
    value
  ).toISOString()
}

export function isSameInstant(
  left: string | Date | null | undefined,
  right: string | Date | null | undefined
): boolean {
  if (!left || !right) return left === right

  const leftDate = left instanceof Date ? left : parseIsoDateTime(left)
  const rightDate = right instanceof Date ? right : parseIsoDateTime(right)
  return leftDate.getTime() === rightDate.getTime()
}

export function buildBogotaDateTime(
  dateValue: string,
  timeValue: string
): Date | null {
  if (!dateValue || !timeValue) return null

  const [year, month, day] = dateValue.split('-').map(Number)
  const [hour, minute] = timeValue.split(':').map(Number)

  if ([year, month, day, hour, minute].some((part) => Number.isNaN(part))) {
    return null
  }

  return buildBogotaUtcDate(year, month, day, hour, minute, 0)
}

export function getBogotaDateParts(value: string | Date) {
  const date = typeof value === 'string' ? ensureValidDate(new Date(value), value) : value
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: LUMI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(date)
  const getValue = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0')

  return {
    year: getValue('year'),
    month: getValue('month'),
    day: getValue('day'),
    hour: getValue('hour'),
    minute: getValue('minute'),
    second: getValue('second'),
  }
}

export function toBogotaDateInputValue(value: string | Date): string {
  const parts = getBogotaDateParts(value)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

export function toBogotaTimeInputValue(value: string | Date): string {
  const parts = getBogotaDateParts(value)
  return `${pad(parts.hour)}:${pad(parts.minute)}`
}

export function formatInBogota(
  value: string | Date,
  options: Intl.DateTimeFormatOptions
): string {
  const date = typeof value === 'string' ? ensureValidDate(new Date(value), value) : value
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: LUMI_TIME_ZONE,
    ...options,
  }).format(date)
}
