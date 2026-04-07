import type {
  Appointment,
  AppointmentRecurrenceRule,
  AppointmentRecurrenceUnit,
  AppointmentWeekday,
} from '@/types'

const WEEKDAY_INDEX: Record<AppointmentWeekday, number> = {
  su: 0,
  mo: 1,
  tu: 2,
  we: 3,
  th: 4,
  fr: 5,
  sa: 6,
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function isWeekday(value: unknown): value is AppointmentWeekday {
  return value === 'su' || value === 'mo' || value === 'tu' || value === 'we' || value === 'th' || value === 'fr' || value === 'sa'
}

function normalizeWeekdays(value: unknown): AppointmentWeekday[] | null {
  if (!Array.isArray(value)) return null
  const weekdays = value.filter(isWeekday)
  return weekdays.length > 0 ? weekdays : null
}

function normalizeUnit(value: unknown): AppointmentRecurrenceUnit | null {
  return value === 'day' || value === 'week' || value === 'month' ? value : null
}

export function normalizeAppointmentRecurrenceRule(value: unknown): AppointmentRecurrenceRule | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const preset = record.preset

  if (
    preset !== 'none' &&
    preset !== 'daily' &&
    preset !== 'weekdays' &&
    preset !== 'weekly' &&
    preset !== 'selected-weekdays' &&
    preset !== 'every-2-weeks' &&
    preset !== 'monthly' &&
    preset !== 'custom'
  ) {
    return null
  }

  return {
    preset,
    untilDate: optionalString(record.untilDate),
    interval: typeof record.interval === 'number' ? record.interval : null,
    unit: normalizeUnit(record.unit),
    weekdays: normalizeWeekdays(record.weekdays),
  }
}

export function serializeAppointmentRecurrenceRule(
  value: AppointmentRecurrenceRule | null | undefined
): AppointmentRecurrenceRule | null {
  if (!value || value.preset === 'none') return null

  return {
    preset: value.preset,
    untilDate: value.untilDate,
    interval: value.interval ?? null,
    unit: value.unit ?? null,
    weekdays: value.weekdays?.length ? value.weekdays : null,
  }
}

function cloneDate(date: Date): Date {
  return new Date(date.getTime())
}

function addDays(date: Date, days: number): Date {
  const next = cloneDate(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number): Date {
  const next = cloneDate(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function startOfDay(date: Date): Date {
  const next = cloneDate(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function weeksBetween(start: Date, current: Date): number {
  const startDay = startOfDay(start)
  const currentDay = startOfDay(current)
  return Math.floor((currentDay.getTime() - startDay.getTime()) / (7 * 24 * 60 * 60 * 1000))
}

export function buildAppointmentDisplayTitle(
  appointment: Pick<
    Appointment,
    'event_type' | 'title' | 'patient' | 'notas' | 'doctoralia_paciente_nombre'
  >
): string {
  if (appointment.title?.trim()) return appointment.title.trim()
  if (appointment.patient) return `${appointment.patient.nombre} ${appointment.patient.apellido}`
  if (appointment.doctoralia_paciente_nombre?.trim()) {
    return appointment.doctoralia_paciente_nombre.trim()
  }
  return appointment.notas?.trim() || 'Evento'
}

export function buildRecurringAppointmentWindows(input: {
  start: Date
  end: Date
  recurrence: AppointmentRecurrenceRule | null
}): Array<{ start: Date; end: Date }> {
  const recurrence = serializeAppointmentRecurrenceRule(input.recurrence)
  if (!recurrence) {
    return [{ start: input.start, end: input.end }]
  }

  if (!recurrence.untilDate) {
    return [{ start: input.start, end: input.end }]
  }

  const duration = input.end.getTime() - input.start.getTime()
  const until = new Date(`${recurrence.untilDate}T23:59:59`)
  const occurrences: Array<{ start: Date; end: Date }> = []
  const maxOccurrences = 366

  function pushOccurrence(start: Date) {
    occurrences.push({
      start,
      end: new Date(start.getTime() + duration),
    })
  }

  if (recurrence.preset === 'daily') {
    for (let index = 0; index < maxOccurrences; index += 1) {
      const start = addDays(input.start, index)
      if (start > until) break
      pushOccurrence(start)
    }
    return occurrences
  }

  if (recurrence.preset === 'weekdays') {
    for (let cursor = cloneDate(input.start); cursor <= until && occurrences.length < maxOccurrences; cursor = addDays(cursor, 1)) {
      const day = cursor.getDay()
      if (day >= 1 && day <= 5) pushOccurrence(cloneDate(cursor))
    }
    return occurrences
  }

  if (recurrence.preset === 'weekly') {
    for (let index = 0; index < maxOccurrences; index += 1) {
      const start = addDays(input.start, index * 7)
      if (start > until) break
      pushOccurrence(start)
    }
    return occurrences
  }

  if (recurrence.preset === 'every-2-weeks') {
    for (let index = 0; index < maxOccurrences; index += 1) {
      const start = addDays(input.start, index * 14)
      if (start > until) break
      pushOccurrence(start)
    }
    return occurrences
  }

  if (recurrence.preset === 'monthly') {
    for (let index = 0; index < maxOccurrences; index += 1) {
      const start = addMonths(input.start, index)
      if (start > until) break
      pushOccurrence(start)
    }
    return occurrences
  }

  if (recurrence.preset === 'selected-weekdays') {
    const weekdays = recurrence.weekdays ?? []
    for (let cursor = cloneDate(input.start); cursor <= until && occurrences.length < maxOccurrences; cursor = addDays(cursor, 1)) {
      const weekday = Object.entries(WEEKDAY_INDEX).find(([, dayIndex]) => dayIndex === cursor.getDay())?.[0] as AppointmentWeekday | undefined
      if (weekday && weekdays.includes(weekday)) pushOccurrence(cloneDate(cursor))
    }
    return occurrences
  }

  if (recurrence.preset === 'custom') {
    const interval = Math.max(1, recurrence.interval ?? 1)
    const unit = recurrence.unit ?? 'week'

    if (unit === 'week' && recurrence.weekdays?.length) {
      for (let cursor = cloneDate(input.start); cursor <= until && occurrences.length < maxOccurrences; cursor = addDays(cursor, 1)) {
        const weekday = Object.entries(WEEKDAY_INDEX).find(([, dayIndex]) => dayIndex === cursor.getDay())?.[0] as AppointmentWeekday | undefined
        if (!weekday || !recurrence.weekdays.includes(weekday)) continue
        if (weeksBetween(input.start, cursor) % interval !== 0) continue
        pushOccurrence(cloneDate(cursor))
      }
      return occurrences
    }

    for (let index = 0; index < maxOccurrences; index += 1) {
      const start = unit === 'day'
        ? addDays(input.start, index * interval)
        : unit === 'week'
          ? addDays(input.start, index * interval * 7)
          : addMonths(input.start, index * interval)
      if (start > until) break
      pushOccurrence(start)
    }
  }

  return occurrences.length > 0 ? occurrences : [{ start: input.start, end: input.end }]
}
