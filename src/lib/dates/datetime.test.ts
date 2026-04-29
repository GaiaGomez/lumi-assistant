import { describe, expect, it } from 'vitest'
import {
  parseDateTimeInBogota,
  buildBogotaDateTime,
  toBogotaDateInputValue,
  toBogotaTimeInputValue,
  isSameInstant,
} from '@/lib/dates/datetime'

// Bogotá is UTC-5 (permanent — Colombia has no DST).
// "10:00 Bogotá" = "15:00 UTC".
const BOGOTA_UTC_OFFSET_MS = 5 * 60 * 60 * 1000

describe('parseDateTimeInBogota', () => {
  it('parses a naive local datetime string as Bogotá time (UTC-5)', () => {
    const result = parseDateTimeInBogota('2026-04-28T10:00')
    const expectedUtc = new Date(Date.UTC(2026, 3, 28, 15, 0, 0))
    expect(result.getTime()).toBe(expectedUtc.getTime())
  })

  it('parses midnight Bogotá as 05:00 UTC', () => {
    const result = parseDateTimeInBogota('2026-01-01T00:00')
    expect(result.toISOString()).toBe('2026-01-01T05:00:00.000Z')
  })

  it('parses end-of-day correctly', () => {
    const result = parseDateTimeInBogota('2026-04-28T23:59')
    expect(result.toISOString()).toBe('2026-04-29T04:59:00.000Z')
  })

  it('passes through a string that already has a timezone suffix', () => {
    const iso = '2026-04-28T15:00:00.000Z'
    expect(parseDateTimeInBogota(iso).toISOString()).toBe(iso)
  })

  it('passes through a string with a +HH:MM offset', () => {
    const withOffset = '2026-04-28T10:00:00-05:00'
    const result = parseDateTimeInBogota(withOffset)
    // -05:00 = Bogotá → same instant as 15:00 UTC
    expect(result.toISOString()).toBe('2026-04-28T15:00:00.000Z')
  })

  it('throws on a completely invalid format', () => {
    expect(() => parseDateTimeInBogota('not-a-date')).toThrow()
  })
})

describe('buildBogotaDateTime', () => {
  it('returns the same UTC instant as parseDateTimeInBogota', () => {
    const fromBuild = buildBogotaDateTime('2026-04-28', '14:30')
    const fromParse = parseDateTimeInBogota('2026-04-28T14:30')
    expect(fromBuild?.getTime()).toBe(fromParse.getTime())
  })

  it('correctly adds the Bogotá offset', () => {
    const result = buildBogotaDateTime('2026-06-15', '08:00')
    expect(result?.toISOString()).toBe('2026-06-15T13:00:00.000Z')
  })

  it('returns null when the date string is empty', () => {
    expect(buildBogotaDateTime('', '10:00')).toBeNull()
  })

  it('returns null when the time string is empty', () => {
    expect(buildBogotaDateTime('2026-04-28', '')).toBeNull()
  })
})

describe('toBogotaDateInputValue / toBogotaTimeInputValue — roundtrip', () => {
  it('extracts the original local date and time after a Bogotá build', () => {
    const date = '2026-04-28'
    const time = '09:30'
    const utcDate = buildBogotaDateTime(date, time)!

    expect(toBogotaDateInputValue(utcDate)).toBe(date)
    expect(toBogotaTimeInputValue(utcDate)).toBe(time)
  })

  it('handles midnight without rolling back one day', () => {
    const utcDate = buildBogotaDateTime('2026-03-01', '00:00')!
    expect(toBogotaDateInputValue(utcDate)).toBe('2026-03-01')
    expect(toBogotaTimeInputValue(utcDate)).toBe('00:00')
  })

  it('handles the last minute of the day', () => {
    const utcDate = buildBogotaDateTime('2026-12-31', '23:59')!
    expect(toBogotaDateInputValue(utcDate)).toBe('2026-12-31')
    expect(toBogotaTimeInputValue(utcDate)).toBe('23:59')
  })
})

describe('isSameInstant', () => {
  it('returns true for two Date objects at the same millisecond', () => {
    const a = new Date('2026-04-28T15:00:00.000Z')
    const b = new Date('2026-04-28T15:00:00.000Z')
    expect(isSameInstant(a, b)).toBe(true)
  })

  it('returns false for different timestamps', () => {
    const a = new Date('2026-04-28T15:00:00.000Z')
    const b = new Date('2026-04-28T16:00:00.000Z')
    expect(isSameInstant(a, b)).toBe(false)
  })

  it('compares ISO strings as well as Date objects', () => {
    expect(isSameInstant('2026-04-28T15:00:00.000Z', '2026-04-28T15:00:00.000Z')).toBe(true)
    expect(isSameInstant('2026-04-28T15:00:00.000Z', '2026-04-28T16:00:00.000Z')).toBe(false)
  })

  it('treats two nulls as equal and null vs value as not equal', () => {
    expect(isSameInstant(null, null)).toBe(true)
    expect(isSameInstant(null, new Date())).toBe(false)
    expect(isSameInstant(undefined, undefined)).toBe(true)
  })
})
