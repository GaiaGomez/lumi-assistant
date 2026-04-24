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

function sanitizePayload(payload: PatientClinicalProfileUpdateInput) {
  return {
    documento: normalizeText(payload.documento),
    birth_date: payload.birth_date?.trim() || null,
    genero: normalizeText(payload.genero),
    ocupacion: normalizeText(payload.ocupacion),
    email: normalizeText(payload.email),
    direccion: normalizeText(payload.direccion),
    ciudad: normalizeText(payload.ciudad),
    eps: normalizeText(payload.eps),
    emergency_contact_name: normalizeText(payload.emergency_contact_name),
    emergency_contact_relationship: normalizeText(payload.emergency_contact_relationship),
    emergency_contact_phone: normalizeText(payload.emergency_contact_phone),
    emergency_contact_authorized:
      typeof payload.emergency_contact_authorized === 'boolean'
        ? payload.emergency_contact_authorized
        : null,
    emergency_contact_notes: normalizeText(payload.emergency_contact_notes),
    medication: normalizeText(payload.medication),
    allergies: normalizeText(payload.allergies),
    medical_conditions: normalizeText(payload.medical_conditions),
    diagnoses: normalizeText(payload.diagnoses),
    previous_treatments: normalizeText(payload.previous_treatments),
    consultation_reason: normalizeText(payload.consultation_reason),
    therapeutic_objective: normalizeText(payload.therapeutic_objective),
    session_frequency: normalizeText(payload.session_frequency),
    care_modality: normalizeText(payload.care_modality),
    process_status: normalizeText(payload.process_status),
    support_network: normalizeText(payload.support_network),
    clinical_alerts: sanitizeClinicalAlerts(payload.clinical_alerts),
    informed_consent_status: payload.informed_consent_status ?? null,
    administrative_notes: normalizeText(payload.administrative_notes),
  }
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
