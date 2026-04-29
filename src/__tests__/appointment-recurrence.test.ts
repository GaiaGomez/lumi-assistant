import { describe, expect, it } from 'vitest'
import {
  buildRecurringAppointmentWindows,
  buildAppointmentDisplayTitle,
  normalizeAppointmentRecurrenceRule,
  serializeAppointmentRecurrenceRule,
} from '@/lib/appointments/recurrence'
import type { AppointmentRecurrenceRule } from '@/types'

// All starts are at noon UTC so addDays/getDay() are timezone-safe
// across any UTC offset from -11 to +12.
const MON_JAN_5  = new Date('2026-01-05T12:00:00.000Z') // Monday
const MON_JAN_5_END = new Date('2026-01-05T13:00:00.000Z')
const DURATION_MS = 60 * 60 * 1000 // 1 hour

function windows(start: Date, untilDate: string, preset: AppointmentRecurrenceRule['preset'], extra: Partial<AppointmentRecurrenceRule> = {}) {
  return buildRecurringAppointmentWindows({
    start,
    end: new Date(start.getTime() + DURATION_MS),
    recurrence: { preset, untilDate, interval: null, unit: null, weekdays: null, ...extra },
  })
}

describe('buildRecurringAppointmentWindows — no recurrence', () => {
  it('returns a single window when recurrence is null', () => {
    const result = buildRecurringAppointmentWindows({
      start: MON_JAN_5,
      end: MON_JAN_5_END,
      recurrence: null,
    })
    expect(result).toHaveLength(1)
    expect(result[0].start).toEqual(MON_JAN_5)
  })

  it('returns a single window when preset is "none"', () => {
    const result = buildRecurringAppointmentWindows({
      start: MON_JAN_5,
      end: MON_JAN_5_END,
      recurrence: { preset: 'none', untilDate: '2026-02-01', interval: null, unit: null, weekdays: null },
    })
    expect(result).toHaveLength(1)
  })

  it('returns a single window when untilDate is missing', () => {
    const result = buildRecurringAppointmentWindows({
      start: MON_JAN_5,
      end: MON_JAN_5_END,
      recurrence: { preset: 'weekly', untilDate: null, interval: null, unit: null, weekdays: null },
    })
    expect(result).toHaveLength(1)
  })
})

describe('buildRecurringAppointmentWindows — daily', () => {
  it('produces one occurrence per day up to untilDate', () => {
    const result = windows(MON_JAN_5, '2026-01-07', 'daily')
    expect(result).toHaveLength(3) // Jan 5, 6, 7
  })

  it('preserves the original duration in each occurrence', () => {
    const result = windows(MON_JAN_5, '2026-01-07', 'daily')
    for (const w of result) {
      expect(w.end.getTime() - w.start.getTime()).toBe(DURATION_MS)
    }
  })
})

describe('buildRecurringAppointmentWindows — weekly', () => {
  it('produces one occurrence per week on the same weekday', () => {
    const result = windows(MON_JAN_5, '2026-01-30', 'weekly')
    expect(result).toHaveLength(4) // Jan 5, 12, 19, 26
  })

  it('each occurrence falls on the same day of week as the original', () => {
    const result = windows(MON_JAN_5, '2026-01-30', 'weekly')
    for (const w of result) {
      expect(w.start.getUTCDay()).toBe(MON_JAN_5.getUTCDay()) // all Mondays
    }
  })
})

describe('buildRecurringAppointmentWindows — every-2-weeks', () => {
  it('produces occurrences every 14 days', () => {
    const result = windows(MON_JAN_5, '2026-01-30', 'every-2-weeks')
    expect(result).toHaveLength(2) // Jan 5, 19
    expect(result[1].start.getTime() - result[0].start.getTime()).toBe(14 * 24 * 60 * 60 * 1000)
  })
})

describe('buildRecurringAppointmentWindows — monthly', () => {
  it('produces one occurrence per month on the same day', () => {
    const result = windows(MON_JAN_5, '2026-04-30', 'monthly')
    expect(result).toHaveLength(4) // Jan, Feb, Mar, Apr 5
  })
})

describe('buildRecurringAppointmentWindows — weekdays (Mon–Fri)', () => {
  it('skips Saturday and Sunday', () => {
    // Jan 5–11: Mon–Fri = 5 workdays, Sat Jan 10, Sun Jan 11 skipped
    const result = windows(MON_JAN_5, '2026-01-11', 'weekdays')
    expect(result).toHaveLength(5)
    for (const w of result) {
      const day = w.start.getUTCDay()
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(5)
    }
  })
})

describe('buildRecurringAppointmentWindows — selected-weekdays', () => {
  it('only generates occurrences on the specified weekdays', () => {
    // Mon (1) and Wed (3) from Jan 5–11
    const result = windows(MON_JAN_5, '2026-01-11', 'selected-weekdays', { weekdays: ['mo', 'we'] })
    expect(result).toHaveLength(2) // Jan 5 (Mon) and Jan 7 (Wed)
    const days = result.map((w) => w.start.getUTCDay())
    expect(days).toContain(1) // Monday
    expect(days).toContain(3) // Wednesday
    expect(days).not.toContain(2) // no Tuesday
  })
})

describe('normalizeAppointmentRecurrenceRule', () => {
  it('returns null for non-object inputs', () => {
    expect(normalizeAppointmentRecurrenceRule(null)).toBeNull()
    expect(normalizeAppointmentRecurrenceRule('weekly')).toBeNull()
    expect(normalizeAppointmentRecurrenceRule([])).toBeNull()
  })

  it('returns null for unrecognized preset', () => {
    expect(normalizeAppointmentRecurrenceRule({ preset: 'biweekly' })).toBeNull()
  })

  it('returns a valid rule for a known preset', () => {
    const result = normalizeAppointmentRecurrenceRule({ preset: 'weekly', untilDate: '2026-06-01' })
    expect(result?.preset).toBe('weekly')
    expect(result?.untilDate).toBe('2026-06-01')
  })

  it('filters out invalid weekday values', () => {
    const result = normalizeAppointmentRecurrenceRule({ preset: 'selected-weekdays', weekdays: ['mo', 'xx', 'fr'] })
    expect(result?.weekdays).toEqual(['mo', 'fr'])
  })
})

describe('serializeAppointmentRecurrenceRule', () => {
  it('returns null when preset is "none"', () => {
    const rule: AppointmentRecurrenceRule = { preset: 'none', untilDate: '2026-06-01', interval: null, unit: null, weekdays: null }
    expect(serializeAppointmentRecurrenceRule(rule)).toBeNull()
  })

  it('returns null for null input', () => {
    expect(serializeAppointmentRecurrenceRule(null)).toBeNull()
  })

  it('normalizes empty weekdays to null', () => {
    const rule: AppointmentRecurrenceRule = { preset: 'weekly', untilDate: '2026-06-01', interval: null, unit: null, weekdays: [] }
    const result = serializeAppointmentRecurrenceRule(rule)
    expect(result?.weekdays).toBeNull()
  })
})

describe('buildAppointmentDisplayTitle', () => {
  it('prefers the explicit title when set', () => {
    const title = buildAppointmentDisplayTitle({
      event_type: 'patient',
      title: 'Sesión inicial',
      patient: { nombre: 'Ana', apellido: 'López' } as never,
      notas: 'Alguna nota',
    })
    expect(title).toBe('Sesión inicial')
  })

  it('falls back to patient name when title is empty', () => {
    const title = buildAppointmentDisplayTitle({
      event_type: 'patient',
      title: '',
      patient: { nombre: 'Ana', apellido: 'López' } as never,
      notas: null,
    })
    expect(title).toBe('Ana López')
  })

  it('falls back to notas when there is no title or patient', () => {
    const title = buildAppointmentDisplayTitle({
      event_type: 'general',
      title: null,
      patient: undefined,
      notas: 'Reunión de equipo',
    })
    expect(title).toBe('Reunión de equipo')
  })

  it('falls back to "Evento" when everything is empty', () => {
    const title = buildAppointmentDisplayTitle({ event_type: 'general', title: null, patient: undefined, notas: null })
    expect(title).toBe('Evento')
  })
})
