import type { PatientClinicalProfile } from '@/types'
import { createClient } from '@/lib/supabase/server'
import { mapPatientClinicalProfileRow } from '@/lib/supabase/mappers'

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
