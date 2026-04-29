import { describe, expect, it } from 'vitest'
import type { Appointment } from '@/types'
import {
  getTodayAppointments,
  getTomorrowPendingAppointments,
  getNextAppointment,
  getLastPastAppointment,
  getPendingPayments,
  getDaysInactive,
  appointmentNeedsConfirmation,
  appointmentNeedsChargeCollection,
  isCompletedAppointment,
  findAppointmentConflict,
} from '@/lib/appointments'

// Fixed "now" for deterministic tests: 2026-04-28 noon UTC
const NOW = new Date('2026-04-28T12:00:00.000Z')

function makeAppointment(overrides: Partial<Appointment> & { fecha_inicio: string }): Appointment {
  return {
    id: 'apt-1',
    patient_id: 'pat-1',
    consultorio_id: null,
    user_id: 'user-1',
    event_type: 'patient',
    title: null,
    category: null,
    color: null,
    recurrence_group_id: null,
    recurrence_rule: null,
    fecha_fin: null,
    estado_sesion: 'pendiente',
    estado_pago: 'pendiente',
    notas: null,
    modalidad: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// ─── Today / tomorrow helpers ────────────────────────────────────────────────

describe('getTodayAppointments', () => {
  it('returns appointments that start today', () => {
    const todayMorning = makeAppointment({ id: 'a1', fecha_inicio: '2026-04-28T09:00:00.000Z' })
    const todayEvening = makeAppointment({ id: 'a2', fecha_inicio: '2026-04-28T22:00:00.000Z' })
    const yesterday   = makeAppointment({ id: 'a3', fecha_inicio: '2026-04-27T09:00:00.000Z' })

    const result = getTodayAppointments([todayMorning, todayEvening, yesterday], NOW)
    expect(result.map((a) => a.id)).toEqual(expect.arrayContaining(['a1', 'a2']))
    expect(result.map((a) => a.id)).not.toContain('a3')
  })

  it('excludes cancelled appointments even if they are today', () => {
    const cancelled = makeAppointment({ id: 'c1', fecha_inicio: '2026-04-28T09:00:00.000Z', estado_sesion: 'cancelo' })
    const result = getTodayAppointments([cancelled], NOW)
    expect(result).toHaveLength(0)
  })
})

describe('getTomorrowPendingAppointments', () => {
  it('returns only pending appointments scheduled for tomorrow', () => {
    const tomorrow = makeAppointment({ id: 't1', fecha_inicio: '2026-04-29T09:00:00.000Z', estado_sesion: 'pendiente' })
    const tomorrowConfirmed = makeAppointment({ id: 't2', fecha_inicio: '2026-04-29T10:00:00.000Z', estado_sesion: 'confirmada' })
    const today = makeAppointment({ id: 't3', fecha_inicio: '2026-04-28T09:00:00.000Z', estado_sesion: 'pendiente' })

    const result = getTomorrowPendingAppointments([tomorrow, tomorrowConfirmed, today], NOW)
    expect(result.map((a) => a.id)).toEqual(['t1'])
  })
})

// ─── Next / last appointment queries ─────────────────────────────────────────

describe('getNextAppointment', () => {
  it('returns the soonest future non-cancelled appointment', () => {
    const next  = makeAppointment({ id: 'n1', fecha_inicio: '2026-04-29T10:00:00.000Z' })
    const later = makeAppointment({ id: 'n2', fecha_inicio: '2026-05-15T10:00:00.000Z' })
    const past  = makeAppointment({ id: 'n3', fecha_inicio: '2026-04-27T10:00:00.000Z' })

    const result = getNextAppointment([next, later, past], NOW)
    expect(result?.id).toBe('n1')
  })

  it('ignores cancelled future appointments', () => {
    const cancelled = makeAppointment({ id: 'c1', fecha_inicio: '2026-04-29T10:00:00.000Z', estado_sesion: 'cancelo' })
    const result = getNextAppointment([cancelled], NOW)
    expect(result).toBeNull()
  })

  it('returns null when no future appointments exist', () => {
    const past = makeAppointment({ id: 'p1', fecha_inicio: '2026-04-01T10:00:00.000Z' })
    expect(getNextAppointment([past], NOW)).toBeNull()
  })
})

describe('getLastPastAppointment', () => {
  it('returns the most recent completed past appointment', () => {
    const last     = makeAppointment({ id: 'l1', fecha_inicio: '2026-04-20T10:00:00.000Z', estado_sesion: 'realizada' })
    const earlier  = makeAppointment({ id: 'l2', fecha_inicio: '2026-03-01T10:00:00.000Z', estado_sesion: 'realizada' })
    const pending  = makeAppointment({ id: 'l3', fecha_inicio: '2026-04-25T10:00:00.000Z', estado_sesion: 'pendiente' })

    const result = getLastPastAppointment([last, earlier, pending], NOW)
    expect(result?.id).toBe('l1')
  })

  it('ignores pending appointments even if they are in the past', () => {
    const pastPending = makeAppointment({ id: 'pp1', fecha_inicio: '2026-04-01T10:00:00.000Z', estado_sesion: 'pendiente' })
    expect(getLastPastAppointment([pastPending], NOW)).toBeNull()
  })
})

// ─── Payments ─────────────────────────────────────────────────────────────────

describe('getPendingPayments', () => {
  it('returns only completed appointments with pending payment', () => {
    const done    = makeAppointment({ id: 'p1', fecha_inicio: '2026-04-01T10:00:00.000Z', estado_sesion: 'realizada', estado_pago: 'pendiente' })
    const paid    = makeAppointment({ id: 'p2', fecha_inicio: '2026-04-02T10:00:00.000Z', estado_sesion: 'realizada', estado_pago: 'pagado' })
    const pending = makeAppointment({ id: 'p3', fecha_inicio: '2026-04-03T10:00:00.000Z', estado_sesion: 'pendiente', estado_pago: 'pendiente' })

    const result = getPendingPayments([done, paid, pending])
    expect(result.map((a) => a.id)).toEqual(['p1'])
  })
})

describe('getDaysInactive', () => {
  it('calculates full days elapsed since the last past appointment', () => {
    const lastApt = makeAppointment({ fecha_inicio: '2026-04-18T12:00:00.000Z' })
    // NOW is 2026-04-28 → 10 full days elapsed
    expect(getDaysInactive(lastApt, NOW)).toBe(10)
  })

  it('returns null when there is no last appointment', () => {
    expect(getDaysInactive(null, NOW)).toBeNull()
  })
})

// ─── State predicates ─────────────────────────────────────────────────────────

describe('appointment state predicates', () => {
  it('appointmentNeedsConfirmation is true only for "pendiente"', () => {
    expect(appointmentNeedsConfirmation({ estado_sesion: 'pendiente' })).toBe(true)
    expect(appointmentNeedsConfirmation({ estado_sesion: 'confirmada' })).toBe(false)
    expect(appointmentNeedsConfirmation({ estado_sesion: 'realizada' })).toBe(false)
    expect(appointmentNeedsConfirmation({ estado_sesion: 'cancelo' })).toBe(false)
  })

  it('isCompletedAppointment is true only for "realizada"', () => {
    expect(isCompletedAppointment({ estado_sesion: 'realizada' })).toBe(true)
    expect(isCompletedAppointment({ estado_sesion: 'pendiente' })).toBe(false)
  })

  it('appointmentNeedsChargeCollection requires realizada + pendiente payment', () => {
    expect(appointmentNeedsChargeCollection({ estado_sesion: 'realizada', estado_pago: 'pendiente' })).toBe(true)
    expect(appointmentNeedsChargeCollection({ estado_sesion: 'realizada', estado_pago: 'pagado' })).toBe(false)
    expect(appointmentNeedsChargeCollection({ estado_sesion: 'pendiente', estado_pago: 'pendiente' })).toBe(false)
  })
})

// ─── Conflict detection ───────────────────────────────────────────────────────

describe('findAppointmentConflict', () => {
  it('detects overlap with an existing appointment', () => {
    const existing = makeAppointment({
      id: 'e1',
      fecha_inicio: '2026-04-28T10:00:00.000Z',
      fecha_fin: '2026-04-28T11:00:00.000Z',
    })
    const newStart = new Date('2026-04-28T10:30:00.000Z')
    const newEnd   = new Date('2026-04-28T11:30:00.000Z')

    expect(findAppointmentConflict([existing], newStart, newEnd)).toBe(existing)
  })

  it('does not flag a cancelled appointment as a conflict', () => {
    const cancelled = makeAppointment({
      id: 'c1',
      fecha_inicio: '2026-04-28T10:00:00.000Z',
      fecha_fin:    '2026-04-28T11:00:00.000Z',
      estado_sesion: 'cancelo',
    })
    const newStart = new Date('2026-04-28T10:30:00.000Z')
    const newEnd   = new Date('2026-04-28T11:30:00.000Z')

    expect(findAppointmentConflict([cancelled], newStart, newEnd)).toBeUndefined()
  })

  it('does not flag itself as a conflict when ignoreAppointmentId is set', () => {
    const apt = makeAppointment({
      id: 'self',
      fecha_inicio: '2026-04-28T10:00:00.000Z',
      fecha_fin:    '2026-04-28T11:00:00.000Z',
    })
    const newStart = new Date('2026-04-28T10:00:00.000Z')
    const newEnd   = new Date('2026-04-28T11:00:00.000Z')

    expect(findAppointmentConflict([apt], newStart, newEnd, 'self')).toBeUndefined()
  })
})
