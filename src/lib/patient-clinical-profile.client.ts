import type { PatientClinicalProfile } from '@/types'
import { createClient } from '@/lib/supabase/client'
import {
  normalizePatientClinicalProfilePayload,
  type PatientClinicalProfileUpdateInput,
} from '@/lib/patient-clinical-profile'
import { mapPatientClinicalProfileRow } from '@/lib/supabase/mappers'

export async function upsertPatientClinicalProfile(
  patientId: string,
  payload: PatientClinicalProfileUpdateInput
): Promise<PatientClinicalProfile> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const normalized = normalizePatientClinicalProfilePayload(payload)
  console.log('[clinical-profile] saving', { patient_id: patientId, ...normalized })

  const { data, error } = await supabase
    .from('patient_clinical_profiles')
    .upsert(
      {
        patient_id: patientId,
        psychologist_id: user.id,
        ...normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'patient_id' }
    )
    .select('*')
    .single()

  if (error) {
    console.error('[clinical-profile] save error', error)
    throw new Error(error.message)
  }

  console.log('[clinical-profile] saved', data)
  return mapPatientClinicalProfileRow(data)
}
