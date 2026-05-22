'use server'

import type { PatientClinicalProfile } from '@/types'
import { createClient } from '@/lib/supabase/server'
import { mapPatientClinicalProfileRow } from '@/lib/supabase/mappers'

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
