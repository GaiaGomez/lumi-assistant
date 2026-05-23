'use server'

import { createClient } from '@/lib/supabase/server'
import { getBogotaDateParts } from '@/lib/dates/datetime'
import type { Appointment, Patient, SessionNote } from '@/types/index'

// ============================================================
// TIPOS
// ============================================================

export interface TodayAppointmentData {
  appointment: Appointment & { patient?: Patient | null }
  hasSignedNote: boolean
}

export interface PendingClinicalCounts {
  unsignedNotes: number
  pendingConsent: number
  patientsNoNextAppointment: number
  incompleteData: number
  completedNoNote: number
}

export interface WeeklySummary {
  completedAppointments: number
  signedNotes: number
  pendingNotes: number
  activePatients: number
  patientsWithoutNextAppointment: number
}

// ============================================================
// HELPERS: Cálculos en zona Bogotá
// ============================================================

function getTodayBoundariesInBogota(): { startISO: string; endISO: string } {
  const now = new Date()
  const parts = getBogotaDateParts(now)

  // Construir inicio de hoy 00:00:00 en Bogotá
  const startDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 5, 0, 0) // UTC-5 offset
  )

  // Construir fin de hoy 23:59:59 en Bogotá
  const endDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 5 + 23, 59, 59)
  )

  return {
    startISO: startDate.toISOString(),
    endISO: endDate.toISOString(),
  }
}

function getSevenDaysAgoBoundaryInBogota(): string {
  const now = new Date()
  const parts = getBogotaDateParts(now)

  // Crear fecha de 7 días atrás a las 00:00:00 en Bogotá
  const sevenDaysAgo = new Date(parts.year, parts.month - 1, parts.day)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Convertir a UTC (Bogotá es UTC-5)
  const year = sevenDaysAgo.getFullYear()
  const month = sevenDaysAgo.getMonth()
  const day = sevenDaysAgo.getDate()

  const boundaryDate = new Date(Date.UTC(year, month, day, 5, 0, 0))
  return boundaryDate.toISOString()
}

// ============================================================
// getTodayAppointments
// ============================================================

export async function getTodayAppointments(
  psychologistId: string
): Promise<TodayAppointmentData[]> {
  try {
    const supabase = await createClient()
    const { startISO, endISO } = getTodayBoundariesInBogota()

    // Query: appointments de hoy, ordenados por hora
    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        patient_id,
        consultorio_id,
        user_id,
        event_type,
        title,
        category,
        color,
        recurrence_group_id,
        recurrence_rule,
        fecha_inicio,
        fecha_fin,
        estado_sesion,
        estado_pago,
        notas,
        modalidad,
        created_at,
        updated_at,
        patient:patients(id, user_id, nombre, apellido, telefono, whatsapp, email, fecha_inicio, notas_generales, created_at)
      `
      )
      .eq('user_id', psychologistId)
      .gte('fecha_inicio', startISO)
      .lte('fecha_inicio', endISO)
      .order('fecha_inicio', { ascending: true })

    if (appointmentError) {
      return []
    }

    if (!appointments || appointments.length === 0) {
      return []
    }

    // Query: session_notes para detectar cuáles tienen nota firmada
    const appointmentIds = appointments.map((a) => a.id)
    const { data: signedNotes, error: notesError } = await supabase
      .from('session_notes')
      .select('appointment_id, signed_at')
      .in('appointment_id', appointmentIds)
      .not('signed_at', 'is', null)

    if (notesError) {
      return appointments.map((a) => {
        const patient = Array.isArray(a.patient) ? a.patient[0] ?? null : a.patient ?? null
        return {
          appointment: { ...a, patient },
          hasSignedNote: false,
        }
      })
    }

    const signedNoteAppointmentIds = new Set(
      signedNotes?.map((n) => n.appointment_id) ?? []
    )

    return appointments.map((a) => {
      const patient = Array.isArray(a.patient) ? a.patient[0] ?? null : a.patient ?? null
      return {
        appointment: { ...a, patient },
        hasSignedNote: signedNoteAppointmentIds.has(a.id),
      }
    })
  } catch {
    return []
  }
}

// ============================================================
// getPendingClinicalCounts
// ============================================================

export async function getPendingClinicalCounts(
  psychologistId: string
): Promise<PendingClinicalCounts> {
  const supabase = await createClient()

  const result: PendingClinicalCounts = {
    unsignedNotes: 0,
    pendingConsent: 0,
    patientsNoNextAppointment: 0,
    incompleteData: 0,
    completedNoNote: 0,
  }

  try {
    // 1. Notas sin firmar (is_draft=true O signed_at IS NULL)
    const { count: unsignedCount, error: e1 } = await supabase
      .from('session_notes')
      .select('id', { count: 'exact', head: true })
      .eq('psychologist_id', psychologistId)
      .eq('is_draft', true)

    if (!e1) result.unsignedNotes = unsignedCount || 0
  } catch {
    // silent fallback
  }

  try {
    // 2. Consentimientos pendientes
    const { count: consentCount, error: e2 } = await supabase
      .from('patient_clinical_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('psychologist_id', psychologistId)
      .eq('informed_consent_status', 'pending')

    if (!e2) result.pendingConsent = consentCount || 0
  } catch {
    // silent fallback
  }

  try {
    // 3. Pacientes sin próxima cita
    // Encontrar pacientes activos con cita realizada pero sin próxima cita programada
    const { data: patientsWithPastAppt, error: e3a } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('user_id', psychologistId)
      .eq('estado_sesion', 'realizada')

    if (!e3a && patientsWithPastAppt && patientsWithPastAppt.length > 0) {
      const pastPatientIds = patientsWithPastAppt.map((a) => a.patient_id)

      // De esos, encontrar cuáles no tienen cita futura
      const now = new Date().toISOString()
      const { data: patientsWithFutureAppt, error: e3b } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('user_id', psychologistId)
        .gt('fecha_inicio', now)

      if (!e3b) {
        const futurePatientIds = new Set(
          patientsWithFutureAppt?.map((a) => a.patient_id) ?? []
        )
        const noNextAppt = pastPatientIds.filter(
          (id) => !futurePatientIds.has(id)
        ).length
        result.patientsNoNextAppointment = noNextAppt
      }
    }
  } catch {
    // silent fallback
  }

  try {
    // 4. Datos clínicos incompletos
    // documento, birth_date, o email NULL
    const { count: incompleteCount, error: e4 } = await supabase
      .from('patient_clinical_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('psychologist_id', psychologistId)
      .or(
        'documento.is.null,birth_date.is.null,email.is.null'
      )

    if (!e4) result.incompleteData = incompleteCount || 0
  } catch {
    // silent fallback
  }

  try {
    // 5. Sesiones realizadas sin nota (estado_sesion='realizada' pero sin signed_note)
    const { data: realizedAppts, error: e5a } = await supabase
      .from('appointments')
      .select('id')
      .eq('user_id', psychologistId)
      .eq('estado_sesion', 'realizada')

    if (!e5a && realizedAppts && realizedAppts.length > 0) {
      const realizedIds = realizedAppts.map((a) => a.id)

      // Encontrar cuáles tienen nota firmada
      const { data: signedNotesData, error: e5b } = await supabase
        .from('session_notes')
        .select('appointment_id')
        .in('appointment_id', realizedIds)
        .not('signed_at', 'is', null)

      if (!e5b) {
        const withSignedNote = new Set(
          signedNotesData?.map((n) => n.appointment_id) ?? []
        )
        const completedNoNote = realizedIds.filter(
          (id) => !withSignedNote.has(id)
        ).length
        result.completedNoNote = completedNoNote
      }
    }
  } catch {
    // silent fallback
  }

  return result
}

// ============================================================
// getWeeklySummary
// ============================================================

export async function getWeeklySummary(
  psychologistId: string
): Promise<WeeklySummary> {
  const supabase = await createClient()
  const sevenDaysAgoISO = getSevenDaysAgoBoundaryInBogota()

  const result: WeeklySummary = {
    completedAppointments: 0,
    signedNotes: 0,
    pendingNotes: 0,
    activePatients: 0,
    patientsWithoutNextAppointment: 0,
  }

  try {
    // 1. Citas realizadas en los últimos 7 días
    const { count: completedCount, error: e1 } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', psychologistId)
      .eq('estado_sesion', 'realizada')
      .gte('fecha_inicio', sevenDaysAgoISO)

    if (!e1) result.completedAppointments = completedCount || 0
  } catch {
    // silent fallback
  }

  try {
    // 2. Notas firmadas en los últimos 7 días
    const { count: signedCount, error: e2 } = await supabase
      .from('session_notes')
      .select('id', { count: 'exact', head: true })
      .eq('psychologist_id', psychologistId)
      .not('signed_at', 'is', null)
      .gte('signed_at', sevenDaysAgoISO)

    if (!e2) result.signedNotes = signedCount || 0
  } catch {
    // silent fallback
  }

  try {
    // 3. Notas pendientes (draft) creadas en los últimos 7 días
    const { count: pendingCount, error: e3 } = await supabase
      .from('session_notes')
      .select('id', { count: 'exact', head: true })
      .eq('psychologist_id', psychologistId)
      .eq('is_draft', true)
      .gte('created_at', sevenDaysAgoISO)

    if (!e3) result.pendingNotes = pendingCount || 0
  } catch {
    // silent fallback
  }

  try {
    // 4. Pacientes activos (con cita en los últimos 7 días)
    const { data: activePatients, error: e4 } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('user_id', psychologistId)
      .gte('fecha_inicio', sevenDaysAgoISO)

    if (!e4) {
      const uniquePatients = new Set(
        activePatients?.map((a) => a.patient_id).filter(Boolean) ?? []
      )
      result.activePatients = uniquePatients.size
    }
  } catch {
    // silent fallback
  }

  try {
    // 5. Pacientes sin próxima cita (con cita en últimos 7 días pero sin futura)
    const now = new Date().toISOString()

    const { data: recentPatients, error: e5a } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('user_id', psychologistId)
      .gte('fecha_inicio', sevenDaysAgoISO)
      .lte('fecha_inicio', now)

    if (!e5a && recentPatients && recentPatients.length > 0) {
      const recentPatientIds = recentPatients.map((a) => a.patient_id)

      const { data: patientsWithFuture, error: e5b } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('user_id', psychologistId)
        .gt('fecha_inicio', now)

      if (!e5b) {
        const futureIds = new Set(
          patientsWithFuture?.map((a) => a.patient_id) ?? []
        )
        const noNextAppt = recentPatientIds.filter(
          (id) => !futureIds.has(id)
        ).length
        result.patientsWithoutNextAppointment = noNextAppt
      }
    }
  } catch {
    // silent fallback
  }

  return result
}
