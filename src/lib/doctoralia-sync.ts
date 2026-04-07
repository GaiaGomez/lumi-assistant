import type { SupabaseClient } from '@supabase/supabase-js'
import type { Appointment } from '@/types'
import { getBogotaDateParts, isSameInstant } from '@/lib/datetime'
import {
  fetchDoctoraliaRange,
  mapAttendanceToEstado,
  fetchDoctoraliaAppointmentDetail,
  fetchDoctoraliaPhoneValidation,
} from '@/lib/doctoralia-api'

interface PatientMatchRow {
  id: string
  nombre: string
  apellido: string
  telefono: string | null
}

interface ExistingDoctoraliaRow {
  id: string
  doctoralia_uid: string | null
  patient_id: string | null
  doctoralia_paciente_nombre: string | null
  fecha_inicio: string
  fecha_fin: string | null
}

interface DoctoraliaImportRow {
  doctoralia_uid: string
  appointment_id: string | null
  deleted_in_lumi_at: string | null
}

export interface DoctoraliaSyncResult {
  total: number
  imported: number
  created: number
  updated: number
  repaired: number
  patientsCreated: number
  linked: number
  unmatched: number
  syncedAt: string
}

// Convierte un teléfono normalizado (ej: "+573183895244") al formato de whatsapp en Lumi
// (solo dígitos, sin +, sin espacios: "573183895244")
function toWhatsAppFormat(phone: string): string {
  return phone.replace(/\D/g, '')
}

function normalizePersonName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function buildPatientLookup(patients: PatientMatchRow[]) {
  const lookup = new Map<string, string | null>()

  for (const patient of patients) {
    const key = normalizePersonName(`${patient.nombre} ${patient.apellido}`)
    if (!key) continue

    if (!lookup.has(key)) {
      lookup.set(key, patient.id)
      continue
    }

    if (lookup.get(key) !== patient.id) {
      lookup.set(key, null)
    }
  }

  return lookup
}

function splitDoctoraliaPatientName(fullName: string): { nombre: string; apellido: string } | null {
  const tokens = fullName
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)

  if (tokens.length < 2) return null

  return {
    nombre: tokens.slice(0, -1).join(' '),
    apellido: tokens[tokens.length - 1],
  }
}

function buildAppointmentStartDate(value: string): string {
  const parts = getBogotaDateParts(value)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function getResolvedPatientId(
  existingPatientId: string | null,
  normalizedName: string | null,
  patientIdByKey: Map<string, string>
): string | null {
  if (existingPatientId) return existingPatientId
  if (!normalizedName) return null
  return patientIdByKey.get(normalizedName) ?? null
}

export async function syncDoctoraliaAppointmentsForUser(
  supabase: SupabaseClient,
  userId: string,
  token: string,
  daysAhead = 60,
  daysBehind = 1
): Promise<DoctoraliaSyncResult> {
  const syncedAt = new Date().toISOString()

  const [rawAppointments, patientsResult, existingResult, importsResult] = await Promise.all([
    fetchDoctoraliaRange(token, daysAhead, daysBehind),
    supabase
      .from('patients')
      .select('id, nombre, apellido, telefono')
      .eq('user_id', userId),
    supabase
      .from('appointments')
      .select('id, doctoralia_uid, patient_id, doctoralia_paciente_nombre, fecha_inicio, fecha_fin')
      .eq('user_id', userId)
      .not('doctoralia_uid', 'is', null),
    supabase
      .from('doctoralia_imports')
      .select('doctoralia_uid, appointment_id, deleted_in_lumi_at')
      .eq('user_id', userId),
  ])

  if (patientsResult.error) throw patientsResult.error
  if (existingResult.error) throw existingResult.error
  if (importsResult.error) throw importsResult.error

  const patientLookup = buildPatientLookup((patientsResult.data ?? []) as PatientMatchRow[])
  const patientIdByKey = new Map(
    Array.from(patientLookup.entries())
      .filter(([, value]) => typeof value === 'string')
      .map(([key, value]) => [key, value as string])
  )
  const existingRows = (existingResult.data ?? []) as ExistingDoctoraliaRow[]
  const importRows = (importsResult.data ?? []) as DoctoraliaImportRow[]
  const existingByUid = new Map(
    existingRows
      .filter((row) => row.doctoralia_uid)
      .map((row) => [row.doctoralia_uid as string, row])
  )
  const importByUid = new Map(importRows.map((row) => [row.doctoralia_uid, row]))

  const trackingUpdates: Array<Pick<
    Appointment,
    | 'id'
    | 'doctoralia_last_synced_at'
    | 'doctoralia_last_seen_at'
    | 'doctoralia_removed_at'
    | 'fecha_inicio'
    | 'fecha_fin'
  >> = []
  const importUpserts: Array<{
    user_id: string
    doctoralia_uid: string
    appointment_id: string | null
    external_patient_name: string | null
    last_seen_at: string
    deleted_in_lumi_at: string | null
  }> = []
  const appointmentLinkUpdates: Array<Pick<Appointment, 'id' | 'patient_id'>> = []
  const inserts: Array<Partial<Appointment>> = []
  const pendingNewImports = new Map<string, string | null>()
  // Teléfono normalizado por nombre de paciente — se rellena después de /for-edition
  const phoneByNormalizedName = new Map<string, string>()
  // Primera cita conocida por paciente — usada para pedir el detalle con el teléfono
  const firstAppointmentIdByName = new Map<string, string>()
  const patientsToCreate = new Map<string, {
    nombre: string
    apellido: string
    fecha_inicio: string
  }>()
  let created = 0
  let updated = 0
  let repaired = 0
  let patientsCreated = 0
  let linked = 0
  let unmatched = 0

  for (const rawAppointment of rawAppointments) {
    const fullName = `${rawAppointment.patient.firstName} ${rawAppointment.patient.lastName}`.trim()
    const normalizedName = fullName ? normalizePersonName(fullName) : ''
    if (!normalizedName) continue

    // Guardamos la primera cita de cada paciente para pedir el detalle con teléfono después
    if (!firstAppointmentIdByName.has(normalizedName)) {
      firstAppointmentIdByName.set(normalizedName, String(rawAppointment.id))
    }

    if (patientLookup.has(normalizedName)) continue
    if (patientsToCreate.has(normalizedName)) continue

    patientsToCreate.set(normalizedName, {
      nombre: rawAppointment.patient.firstName.trim(),
      apellido: rawAppointment.patient.lastName.trim(),
      fecha_inicio: buildAppointmentStartDate(rawAppointment.start_iso),
    })
  }

  for (const appointment of existingRows) {
    if (appointment.patient_id || !appointment.doctoralia_paciente_nombre) continue

    const normalizedName = normalizePersonName(appointment.doctoralia_paciente_nombre)
    if (!normalizedName) continue
    if (patientLookup.has(normalizedName) || patientsToCreate.has(normalizedName)) continue

    const splitName = splitDoctoraliaPatientName(appointment.doctoralia_paciente_nombre)
    if (!splitName) continue

    patientsToCreate.set(normalizedName, {
      ...splitName,
      fecha_inicio: buildAppointmentStartDate(appointment.fecha_inicio),
    })
  }

  // Resolver teléfonos para pacientes que los necesitan:
  // nuevos (patientsToCreate) + existentes sin teléfono en Lumi.
  // El teléfono solo existe en /api/appointments/{id}/for-edition, no en el listado de agenda.
  const existingWithoutPhone = (patientsResult.data ?? []) as PatientMatchRow[]
  const namesNeedingPhone = new Set<string>([
    ...patientsToCreate.keys(),
    ...existingWithoutPhone
      .filter((p) => !p.telefono)
      .map((p) => normalizePersonName(`${p.nombre} ${p.apellido}`)),
  ])

  const appointmentsToFetch = Array.from(namesNeedingPhone).flatMap((name) => {
    const id = firstAppointmentIdByName.get(name)
    return id ? [{ name, id }] : []
  })

  if (appointmentsToFetch.length > 0) {
    const detailResults = await Promise.allSettled(
      appointmentsToFetch.map(({ id }) => fetchDoctoraliaAppointmentDetail(id, token))
    )

    // Recogemos los teléfonos crudos por nombre de paciente
    const rawPhoneByName = new Map<string, string>()
    for (let i = 0; i < appointmentsToFetch.length; i++) {
      const result = detailResults[i]
      if (result.status !== 'fulfilled' || !result.value) continue
      const phone = result.value.patient.phone
      if (phone && phone.replace(/\D/g, '').length >= 7) {
        rawPhoneByName.set(appointmentsToFetch[i].name, phone)
      }
    }

    // Normalizamos los teléfonos únicos vía POST /api/phoneNumber (una llamada por número único)
    const uniqueRawPhones = Array.from(new Set(rawPhoneByName.values()))
    const normalizedByRaw = new Map<string, string>()
    if (uniqueRawPhones.length > 0) {
      const normalizedResults = await Promise.allSettled(
        uniqueRawPhones.map((raw) => fetchDoctoraliaPhoneValidation(raw, token))
      )
      for (let i = 0; i < uniqueRawPhones.length; i++) {
        const result = normalizedResults[i]
        if (result.status === 'fulfilled' && result.value) {
          normalizedByRaw.set(uniqueRawPhones[i], result.value)
        }
      }
    }

    // Guardamos: preferimos formato normalizado (+57...), fallback al crudo
    for (const [name, raw] of rawPhoneByName) {
      phoneByNormalizedName.set(name, normalizedByRaw.get(raw) ?? raw)
    }
  }

  if (patientsToCreate.size > 0) {
    const { data: createdPatients, error: createdPatientsError } = await supabase
      .from('patients')
      .insert(
        Array.from(patientsToCreate.entries()).map(([key, patient]) => ({
          user_id: userId,
          nombre: patient.nombre,
          apellido: patient.apellido,
          telefono: phoneByNormalizedName.get(key) ?? null,
          whatsapp: phoneByNormalizedName.has(key) ? toWhatsAppFormat(phoneByNormalizedName.get(key)!) : null,
          email: null,
          fecha_inicio: patient.fecha_inicio,
          notas_generales: null,
        }))
      )
      .select('id, nombre, apellido')

    if (createdPatientsError) throw createdPatientsError

    for (const patient of createdPatients ?? []) {
      const key = normalizePersonName(`${patient.nombre} ${patient.apellido}`)
      if (!key) continue
      patientLookup.set(key, patient.id)
      patientIdByKey.set(key, patient.id)
      patientsCreated += 1
    }
  }

  // Actualizar teléfono de pacientes existentes que no lo tienen aún (nunca sobreescribimos)
  const existingPatientsToUpdatePhone = (patientsResult.data ?? []) as PatientMatchRow[]
  const phoneUpdates = existingPatientsToUpdatePhone
    .filter((p) => !p.telefono)
    .flatMap((p) => {
      const key = normalizePersonName(`${p.nombre} ${p.apellido}`)
      const phone = phoneByNormalizedName.get(key)
      if (!phone) return []
      return [{ id: p.id, telefono: phone, whatsapp: toWhatsAppFormat(phone) }]
    })

  if (phoneUpdates.length > 0) {
    await Promise.all(
      phoneUpdates.map(({ id, telefono, whatsapp }) =>
        supabase.from('patients').update({ telefono, whatsapp }).eq('id', id)
      )
    )
  }

  for (const rawAppointment of rawAppointments) {
    const doctoraliaUid = String(rawAppointment.id)
    const existing = existingByUid.get(doctoraliaUid)
    const trackedImport = importByUid.get(doctoraliaUid)
    const doctoraliaEstadoSesion = mapAttendanceToEstado(rawAppointment.attendance)
    const doctoraliaPatientName = `${rawAppointment.patient.firstName} ${rawAppointment.patient.lastName}`.trim() || null
    const normalizedPatientName = doctoraliaPatientName
      ? normalizePersonName(doctoraliaPatientName)
      : null
    const resolvedPatientId = getResolvedPatientId(
      existing?.patient_id ?? null,
      normalizedPatientName,
      patientIdByKey
    )

    if (existing) {
      updated += 1
      if (resolvedPatientId) linked += 1
      else unmatched += 1

      const shouldRepairStart =
        isSameInstant(existing.fecha_inicio, rawAppointment.start_iso_if_utc) &&
        !isSameInstant(existing.fecha_inicio, rawAppointment.start_iso)
      const shouldRepairEnd =
        isSameInstant(existing.fecha_fin, rawAppointment.end_iso_if_utc) &&
        !isSameInstant(existing.fecha_fin, rawAppointment.end_iso)

      if (shouldRepairStart || shouldRepairEnd) {
        repaired += 1
      }

      trackingUpdates.push({
        id: existing.id,
        doctoralia_last_synced_at: syncedAt,
        doctoralia_last_seen_at: syncedAt,
        doctoralia_removed_at: null,
        fecha_inicio: shouldRepairStart ? rawAppointment.start_iso : existing.fecha_inicio,
        fecha_fin: shouldRepairEnd ? rawAppointment.end_iso : existing.fecha_fin,
      })

      if (!existing.patient_id && resolvedPatientId) {
        appointmentLinkUpdates.push({
          id: existing.id,
          patient_id: resolvedPatientId,
        })
      }
      importUpserts.push({
        user_id: userId,
        doctoralia_uid: doctoraliaUid,
        appointment_id: existing.id,
        external_patient_name: doctoraliaPatientName,
        last_seen_at: syncedAt,
        deleted_in_lumi_at: null,
      })
      continue
    }

    if (trackedImport?.deleted_in_lumi_at) {
      updated += 1
      unmatched += 1

      importUpserts.push({
        user_id: userId,
        doctoralia_uid: doctoraliaUid,
        appointment_id: null,
        external_patient_name: doctoraliaPatientName,
        last_seen_at: syncedAt,
        deleted_in_lumi_at: trackedImport.deleted_in_lumi_at,
      })
      continue
    }

    created += 1
    if (resolvedPatientId) linked += 1
    else unmatched += 1

    inserts.push({
      user_id: userId,
      source_system: 'doctoralia',
      event_type: 'patient',
      doctoralia_uid: doctoraliaUid,
      doctoralia_estado_sesion: doctoraliaEstadoSesion,
      doctoralia_paciente_nombre: doctoraliaPatientName,
      doctoralia_last_synced_at: syncedAt,
      doctoralia_last_seen_at: syncedAt,
      doctoralia_removed_at: null,
      patient_id: resolvedPatientId,
      fecha_inicio: rawAppointment.start_iso,
      fecha_fin: rawAppointment.end_iso,
      estado_sesion: doctoraliaEstadoSesion,
      estado_pago: 'pendiente',
      notas: null,
    })
    pendingNewImports.set(doctoraliaUid, doctoraliaPatientName)
  }

  if (inserts.length > 0) {
    const { error } = await supabase
      .from('appointments')
      .upsert(inserts, {
        onConflict: 'user_id,doctoralia_uid',
        ignoreDuplicates: true,
      })

    if (error) throw error
  }

  if (trackingUpdates.length > 0) {
    const results = await Promise.all(
      trackingUpdates.map((update) =>
        supabase
          .from('appointments')
          .update({
            doctoralia_last_synced_at: update.doctoralia_last_synced_at,
            doctoralia_last_seen_at: update.doctoralia_last_seen_at,
            doctoralia_removed_at: update.doctoralia_removed_at,
            fecha_inicio: update.fecha_inicio,
            fecha_fin: update.fecha_fin,
          })
          .eq('id', update.id)
      )
    )

    for (const result of results) {
      if (result.error) throw result.error
    }
  }

  for (const appointment of existingRows) {
    if (appointment.patient_id || !appointment.doctoralia_paciente_nombre) continue
    const normalizedName = normalizePersonName(appointment.doctoralia_paciente_nombre)
    const patientId = patientIdByKey.get(normalizedName)
    if (!patientId) continue
    if (appointmentLinkUpdates.some((update) => update.id === appointment.id)) continue

    appointmentLinkUpdates.push({
      id: appointment.id,
      patient_id: patientId,
    })
  }

  if (appointmentLinkUpdates.length > 0) {
    const results = await Promise.all(
      appointmentLinkUpdates.map((update) =>
        supabase
          .from('appointments')
          .update({ patient_id: update.patient_id })
          .eq('id', update.id)
      )
    )

    for (const result of results) {
      if (result.error) throw result.error
    }
  }

  if (pendingNewImports.size > 0) {
    const { data: insertedRows, error: insertedRowsError } = await supabase
      .from('appointments')
      .select('id, doctoralia_uid')
      .eq('user_id', userId)
      .in('doctoralia_uid', Array.from(pendingNewImports.keys()))

    if (insertedRowsError) throw insertedRowsError

    for (const row of insertedRows ?? []) {
      if (!row.doctoralia_uid) continue
      importUpserts.push({
        user_id: userId,
        doctoralia_uid: row.doctoralia_uid,
        appointment_id: row.id,
        external_patient_name: pendingNewImports.get(row.doctoralia_uid) ?? null,
        last_seen_at: syncedAt,
        deleted_in_lumi_at: null,
      })
    }
  }

  if (importUpserts.length > 0) {
    const { error } = await supabase
      .from('doctoralia_imports')
      .upsert(importUpserts, {
        onConflict: 'user_id,doctoralia_uid',
        ignoreDuplicates: false,
      })

    if (error) throw error
  }

  return {
    total: rawAppointments.length,
    imported: rawAppointments.length,
    created,
    updated,
    repaired,
    patientsCreated,
    linked,
    unmatched,
    syncedAt,
  }
}
