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

  const { data, error } = await supabase
    .from('patient_clinical_profiles')
    .upsert(
      {
        patient_id: patientId,
        psychologist_id: user.id,
        ...normalizePatientClinicalProfilePayload(payload),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'patient_id' }
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapPatientClinicalProfileRow(data)
}
