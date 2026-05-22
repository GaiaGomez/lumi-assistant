import type { PatientClinicalProfile } from '@/types'
import { createClient } from '@/lib/supabase/server'
import { mapPatientClinicalProfileRow } from '@/lib/supabase/mappers'

// Auto-registers informed consent + data authorization on the first attended session,
// only if they're still pending. Uses the appointment date (not current time).
// Returns whether any change was made.
export async function maybeAutoRegisterConsents(
  patientId: string,
  firstAttendedAt: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: current } = await supabase
    .from('patient_clinical_profiles')
    .select('informed_consent_status, data_processing_authorization_status')
    .eq('patient_id', patientId)
    .maybeSingle()

  const consentPending = !current?.informed_consent_status || current.informed_consent_status === 'pending'
  const dataPending = !current?.data_processing_authorization_status || current.data_processing_authorization_status === 'pending'

  if (!consentPending && !dataPending) return false

  const now = new Date().toISOString()
  const payload: Record<string, unknown> = {
    patient_id: patientId,
    psychologist_id: user.id,
    updated_at: now,
    consent_recorded_source: 'first_session',
  }

  if (consentPending) {
    payload.informed_consent_status = 'signed'
    payload.informed_consent_signed_at = firstAttendedAt
    payload.consent_version = 'v1.0'
  }

  if (dataPending) {
    payload.data_processing_authorization_status = 'authorized'
    payload.data_processing_authorized_at = firstAttendedAt
  }

  await supabase
    .from('patient_clinical_profiles')
    .upsert(payload, { onConflict: 'patient_id' })

  return true
}

export async function getPatientClinicalProfile(
  patientId: string
): Promise<PatientClinicalProfile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('patient_clinical_profiles')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle()

  return data ? mapPatientClinicalProfileRow(data) : null
}

// Marca el consentimiento informado como firmado con fecha y hora actual.
export async function markConsentSigned(patientId: string): Promise<PatientClinicalProfile> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('patient_clinical_profiles')
    .upsert(
      {
        patient_id: patientId,
        psychologist_id: user.id,
        informed_consent_status: 'signed',
        informed_consent_signed_at: now,
        consent_version: 'v1.0',
        updated_at: now,
      },
      { onConflict: 'patient_id' }
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapPatientClinicalProfileRow(data)
}

// Marca la autorización de tratamiento de datos como autorizada.
export async function markDataProcessingAuthorized(patientId: string): Promise<PatientClinicalProfile> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('patient_clinical_profiles')
    .upsert(
      {
        patient_id: patientId,
        psychologist_id: user.id,
        data_processing_authorization_status: 'authorized',
        data_processing_authorized_at: now,
        updated_at: now,
      },
      { onConflict: 'patient_id' }
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapPatientClinicalProfileRow(data)
}
