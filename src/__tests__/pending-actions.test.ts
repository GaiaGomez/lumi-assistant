import { describe, expect, it } from 'vitest'
import type { Appointment, Patient } from '@/types'
import { buildPendingActions } from '@/lib/pending-actions'
import { DEFAULT_SETTINGS } from '@/lib/settings'

// Fixed "now": Tuesday 2026-04-28 noon UTC
const NOW = new Date('2026-04-28T12:00:00.000Z')

// ─── Minimal fixtures ─────────────────────────────────────────────────────────

function makePatient(overrides: Partial<Patient> & { id: string; nombre: string }): Patient {
  return {
    apellido: 'Gómez',
    telefono: null,
    whatsapp: '573001234567',
    email: null,
    fecha_inicio: null,
    notas_generales: null,
    created_at: '2026-01-01T00:00:00.000Z',
    user_id: 'user-1',
    ...overrides,
  }
}

function makeAppointment(
  overrides: Partial<Appointment> & { fecha_inicio: string; patient: Patient }
): Appointment & { patient: Patient } {
  return {
    id: 'apt-default',
    patient_id: overrides.patient.id,
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

const SETTINGS = { ...DEFAULT_SETTINGS }

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildPendingActions — no data', () => {
  it('returns an empty list when there are no appointments or patients', () => {
    const result = buildPendingActions([], [], SETTINGS, NOW)
    expect(result).toHaveLength(0)
  })
})

describe('buildPendingActions — confirmar_cita_hoy', () => {
  it('generates a confirmar_cita_hoy action for a pending appointment today', () => {
    const patient = makePatient({ id: 'p1', nombre: 'Ana' })
    const todayApt = makeAppointment({
      id: 'apt-today',
      fecha_inicio: '2026-04-28T15:00:00.000Z', // today UTC
      estado_sesion: 'pendiente',
      patient,
    })

    const result = buildPendingActions([todayApt], [patient], SETTINGS, NOW)
    const action = result.find((a) => a.type === 'confirmar_cita_hoy')
    expect(action).toBeDefined()
    expect(action?.appointmentId).toBe('apt-today')
    expect(action?.priority).toBe(1)
  })

  it('does NOT generate confirmar_cita_hoy for an already-confirmed today appointment', () => {
    const patient = makePatient({ id: 'p2', nombre: 'Luis' })
    const confirmed = makeAppointment({
      id: 'apt-confirmed',
      fecha_inicio: '2026-04-28T15:00:00.000Z',
      estado_sesion: 'confirmada',
      patient,
    })

    const result = buildPendingActions([confirmed], [patient], SETTINGS, NOW)
    expect(result.find((a) => a.type === 'confirmar_cita_hoy')).toBeUndefined()
  })
})

describe('buildPendingActions — confirmar_cita_manana', () => {
  it('generates a confirmar_cita_manana action for a pending appointment tomorrow', () => {
    const patient = makePatient({ id: 'p3', nombre: 'Sofía' })
    const tomorrowApt = makeAppointment({
      id: 'apt-tomorrow',
      fecha_inicio: '2026-04-29T10:00:00.000Z', // tomorrow UTC
      estado_sesion: 'pendiente',
      patient,
    })

    const result = buildPendingActions([tomorrowApt], [patient], SETTINGS, NOW)
    const action = result.find((a) => a.type === 'confirmar_cita_manana')
    expect(action).toBeDefined()
    expect(action?.priority).toBe(2)
  })
})

describe('buildPendingActions — cobrar_sesion_realizada', () => {
  it('generates a cobrar action for a completed unpaid appointment', () => {
    const patient = makePatient({ id: 'p4', nombre: 'Carlos' })
    const unpaid = makeAppointment({
      id: 'apt-unpaid',
      fecha_inicio: '2026-04-20T10:00:00.000Z',
      estado_sesion: 'realizada',
      estado_pago: 'pendiente',
      patient,
    })

    const result = buildPendingActions([unpaid], [patient], SETTINGS, NOW)
    const action = result.find((a) => a.type === 'cobrar_sesion_realizada')
    expect(action).toBeDefined()
    expect(action?.appointmentId).toBe('apt-unpaid')
    expect(action?.priority).toBe(3)
  })

  it('does NOT generate a cobrar action when the session is already paid', () => {
    const patient = makePatient({ id: 'p5', nombre: 'Marta' })
    const paid = makeAppointment({
      id: 'apt-paid',
      fecha_inicio: '2026-04-20T10:00:00.000Z',
      estado_sesion: 'realizada',
      estado_pago: 'pagado',
      patient,
    })

    const result = buildPendingActions([paid], [patient], SETTINGS, NOW)
    expect(result.find((a) => a.type === 'cobrar_sesion_realizada')).toBeUndefined()
  })
})

describe('buildPendingActions — paciente_sin_proxima', () => {
  it('generates paciente_sin_proxima when patient had a last session but no next appointment', () => {
    const patient = makePatient({ id: 'p6', nombre: 'Daniela' })
    // Last session 5 days ago — under the reactivation threshold (default 60 days)
    const lastSession = makeAppointment({
      id: 'apt-last',
      fecha_inicio: '2026-04-23T10:00:00.000Z',
      estado_sesion: 'realizada',
      estado_pago: 'pagado',
      patient,
    })

    const result = buildPendingActions([lastSession], [patient], SETTINGS, NOW)
    const action = result.find((a) => a.type === 'paciente_sin_proxima')
    expect(action).toBeDefined()
    expect(action?.patientId).toBe('p6')
    expect(action?.priority).toBe(4)
  })

  it('does NOT generate paciente_sin_proxima when the patient has a future appointment', () => {
    const patient = makePatient({ id: 'p7', nombre: 'Ricardo' })
    const lastSession = makeAppointment({
      id: 'apt-last',
      fecha_inicio: '2026-04-20T10:00:00.000Z',
      estado_sesion: 'realizada',
      estado_pago: 'pagado',
      patient,
    })
    const nextSession = makeAppointment({
      id: 'apt-next',
      fecha_inicio: '2026-05-05T10:00:00.000Z',
      estado_sesion: 'pendiente',
      patient,
    })

    const result = buildPendingActions([lastSession, nextSession], [patient], SETTINGS, NOW)
    expect(result.find((a) => a.type === 'paciente_sin_proxima')).toBeUndefined()
  })
})

describe('buildPendingActions — reactivar_paciente', () => {
  it('generates reactivar_paciente when inactivity exceeds the configured threshold', () => {
    const patient = makePatient({ id: 'p8', nombre: 'Valentina' })
    // Last session 90 days ago — over default threshold of 60
    const oldSession = makeAppointment({
      id: 'apt-old',
      fecha_inicio: '2026-01-28T10:00:00.000Z', // 90 days before NOW
      estado_sesion: 'realizada',
      estado_pago: 'pagado',
      patient,
    })

    const result = buildPendingActions([oldSession], [patient], SETTINGS, NOW)
    const action = result.find((a) => a.type === 'reactivar_paciente')
    expect(action).toBeDefined()
    expect(action?.patientId).toBe('p8')
    expect(action?.priority).toBe(5)
  })
})

describe('buildPendingActions — sorting', () => {
  it('returns actions sorted by priority (1 → 5)', () => {
    const patient = makePatient({ id: 'p9', nombre: 'Laura' })
    const todayPending = makeAppointment({
      id: 'apt-today',
      fecha_inicio: '2026-04-28T14:00:00.000Z',
      estado_sesion: 'pendiente',
      estado_pago: 'pendiente',
      patient,
    })
    const unpaid = makeAppointment({
      id: 'apt-unpaid',
      fecha_inicio: '2026-04-10T10:00:00.000Z',
      estado_sesion: 'realizada',
      estado_pago: 'pendiente',
      patient,
    })

    const result = buildPendingActions([todayPending, unpaid], [patient], SETTINGS, NOW)
    const priorities = result.map((a) => a.priority)
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b))
  })
})

describe('buildPendingActions — WhatsApp preview', () => {
  it('builds an externalAction with a wa.me href for patients with a whatsapp number', () => {
    const patient = makePatient({ id: 'p10', nombre: 'Pilar', whatsapp: '573009876543' })
    const unpaid = makeAppointment({
      id: 'apt-x',
      fecha_inicio: '2026-04-10T10:00:00.000Z',
      estado_sesion: 'realizada',
      estado_pago: 'pendiente',
      patient,
    })

    const result = buildPendingActions([unpaid], [patient], SETTINGS, NOW)
    const action = result.find((a) => a.type === 'cobrar_sesion_realizada')
    expect(action?.externalAction?.href).toContain('wa.me/573009876543')
  })

  it('does NOT build an externalAction when the patient has no phone', () => {
    const patient = makePatient({ id: 'p11', nombre: 'Sin Tel', whatsapp: null, telefono: null })
    const unpaid = makeAppointment({
      id: 'apt-y',
      fecha_inicio: '2026-04-10T10:00:00.000Z',
      estado_sesion: 'realizada',
      estado_pago: 'pendiente',
      patient,
    })

    const result = buildPendingActions([unpaid], [patient], SETTINGS, NOW)
    const action = result.find((a) => a.type === 'cobrar_sesion_realizada')
    expect(action?.externalAction).toBeUndefined()
  })
})
