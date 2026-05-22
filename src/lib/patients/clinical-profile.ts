import type {
  ClinicalAlertKey,
  InformedConsentStatus,
  Patient,
  PatientClinicalProfile,
} from '@/types'

export const CLINICAL_ALERT_OPTIONS: Array<{ key: ClinicalAlertKey; label: string }> = [
  { key: 'medicacion_activa', label: 'Medicación activa' },
  { key: 'contacto_incompleto', label: 'Contacto incompleto' },
  { key: 'consentimiento_pendiente', label: 'Consentimiento pendiente' },
  { key: 'prefiere_whatsapp', label: 'Prefiere WhatsApp' },
  { key: 'no_llamar', label: 'No llamar' },
  { key: 'riesgo_clinico', label: 'Riesgo clínico' },
]

export const INFORMED_CONSENT_OPTIONS: Array<{ value: InformedConsentStatus; label: string }> = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'signed', label: 'Firmado' },
  { value: 'not_required', label: 'No aplica' },
]

export type PatientClinicalProfileUpdateInput = Partial<Omit<
  PatientClinicalProfile,
  'id' | 'patient_id' | 'psychologist_id' | 'created_at' | 'updated_at'
>>

function normalizeText(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null
}

function sanitizeClinicalAlerts(value: ClinicalAlertKey[] | null | undefined) {
  if (!Array.isArray(value)) return null
  const allowed = new Set(CLINICAL_ALERT_OPTIONS.map((option) => option.key))
  const normalized = value.filter((item): item is ClinicalAlertKey => allowed.has(item))
  return normalized.length > 0 ? Array.from(new Set(normalized)) : null
}

function sanitizePayload(payload: PatientClinicalProfileUpdateInput): Partial<Omit<PatientClinicalProfile, 'id' | 'patient_id' | 'psychologist_id' | 'created_at' | 'updated_at'>> {
  const out: ReturnType<typeof sanitizePayload> = {}

  if ('documento' in payload) out.documento = normalizeText(payload.documento)
  if ('birth_date' in payload) out.birth_date = payload.birth_date?.trim() || null
  if ('genero' in payload) out.genero = normalizeText(payload.genero)
  if ('ocupacion' in payload) out.ocupacion = normalizeText(payload.ocupacion)
  if ('email' in payload) out.email = normalizeText(payload.email)
  if ('direccion' in payload) out.direccion = normalizeText(payload.direccion)
  if ('ciudad' in payload) out.ciudad = normalizeText(payload.ciudad)
  if ('eps' in payload) out.eps = normalizeText(payload.eps)
  if ('emergency_contact_name' in payload) out.emergency_contact_name = normalizeText(payload.emergency_contact_name)
  if ('emergency_contact_relationship' in payload) out.emergency_contact_relationship = normalizeText(payload.emergency_contact_relationship)
  if ('emergency_contact_phone' in payload) out.emergency_contact_phone = normalizeText(payload.emergency_contact_phone)
  if ('emergency_contact_authorized' in payload) out.emergency_contact_authorized = typeof payload.emergency_contact_authorized === 'boolean' ? payload.emergency_contact_authorized : null
  if ('emergency_contact_notes' in payload) out.emergency_contact_notes = normalizeText(payload.emergency_contact_notes)
  if ('medication' in payload) out.medication = normalizeText(payload.medication)
  if ('allergies' in payload) out.allergies = normalizeText(payload.allergies)
  if ('medical_conditions' in payload) out.medical_conditions = normalizeText(payload.medical_conditions)
  if ('diagnoses' in payload) out.diagnoses = normalizeText(payload.diagnoses)
  if ('previous_treatments' in payload) out.previous_treatments = normalizeText(payload.previous_treatments)
  if ('consultation_reason' in payload) out.consultation_reason = normalizeText(payload.consultation_reason)
  if ('therapeutic_objective' in payload) out.therapeutic_objective = normalizeText(payload.therapeutic_objective)
  if ('session_frequency' in payload) out.session_frequency = normalizeText(payload.session_frequency)
  if ('care_modality' in payload) out.care_modality = normalizeText(payload.care_modality)
  if ('process_status' in payload) out.process_status = normalizeText(payload.process_status)
  if ('support_network' in payload) out.support_network = normalizeText(payload.support_network)
  if ('clinical_alerts' in payload) out.clinical_alerts = sanitizeClinicalAlerts(payload.clinical_alerts)
  if ('informed_consent_status' in payload) out.informed_consent_status = payload.informed_consent_status ?? null
  if ('informed_consent_signed_at' in payload) out.informed_consent_signed_at = payload.informed_consent_signed_at ?? null
  if ('consent_version' in payload) out.consent_version = normalizeText(payload.consent_version)
  if ('consent_file_path' in payload) out.consent_file_path = normalizeText(payload.consent_file_path)
  if ('data_processing_authorization_status' in payload) out.data_processing_authorization_status = payload.data_processing_authorization_status ?? null
  if ('data_processing_authorized_at' in payload) out.data_processing_authorized_at = payload.data_processing_authorized_at ?? null
  if ('administrative_notes' in payload) out.administrative_notes = normalizeText(payload.administrative_notes)

  return out
}

export function getClinicalAlertLabel(alert: ClinicalAlertKey) {
  return CLINICAL_ALERT_OPTIONS.find((option) => option.key === alert)?.label ?? alert
}

export function resolveClinicalAlertKeys(
  patient: Patient,
  profile: PatientClinicalProfile | null
): ClinicalAlertKey[] {
  const result = new Set<ClinicalAlertKey>(profile?.clinical_alerts ?? [])

  if (profile?.medication?.trim()) {
    result.add('medicacion_activa')
  }

  if (profile?.informed_consent_status === 'pending') {
    result.add('consentimiento_pendiente')
  }

  const emergencyFields = [
    profile?.emergency_contact_name,
    profile?.emergency_contact_relationship,
    profile?.emergency_contact_phone,
  ].filter((value) => value?.trim())

  if (emergencyFields.length > 0 && emergencyFields.length < 3) {
    result.add('contacto_incompleto')
  }

  if (patient.whatsapp && result.has('prefiere_whatsapp')) {
    result.add('prefiere_whatsapp')
  }

  return Array.from(result)
}

export function normalizePatientClinicalProfilePayload(
  payload: PatientClinicalProfileUpdateInput
) {
  return sanitizePayload(payload)
}
