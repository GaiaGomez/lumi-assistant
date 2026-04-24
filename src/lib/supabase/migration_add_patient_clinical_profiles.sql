-- ============================================================
-- MIGRACIÓN: FICHA CLÍNICA POR PACIENTE
-- 1) Crea un perfil clínico estable separado de las notas por sesión
-- 2) Garantiza un perfil único por paciente
-- 3) Protege el acceso con RLS por psicólogo dueño
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_clinical_profiles (
  id                             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id                     uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  psychologist_id                uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  documento                      text,
  birth_date                     date,
  genero                         text,
  ocupacion                      text,
  email                          text,
  direccion                      text,
  ciudad                         text,
  eps                            text,

  emergency_contact_name         text,
  emergency_contact_relationship text,
  emergency_contact_phone        text,
  emergency_contact_authorized   boolean,
  emergency_contact_notes        text,

  medication                     text,
  allergies                      text,
  medical_conditions             text,
  diagnoses                      text,
  previous_treatments            text,

  consultation_reason            text,
  therapeutic_objective          text,
  session_frequency              text,
  care_modality                  text,
  process_status                 text,
  support_network                text,

  clinical_alerts                text[] DEFAULT '{}'::text[],
  informed_consent_status        text CHECK (
    informed_consent_status IN ('pending', 'signed', 'not_required')
  ),
  administrative_notes           text,

  created_at                     timestamptz DEFAULT now(),
  updated_at                     timestamptz DEFAULT now(),

  UNIQUE (patient_id)
);

CREATE INDEX IF NOT EXISTS patient_clinical_profiles_psychologist_idx
  ON patient_clinical_profiles(psychologist_id);

CREATE INDEX IF NOT EXISTS patient_clinical_profiles_patient_psychologist_idx
  ON patient_clinical_profiles(patient_id, psychologist_id);

ALTER TABLE patient_clinical_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_clinical_profiles: solo el dueño puede ver"
  ON patient_clinical_profiles;

DROP POLICY IF EXISTS "patient_clinical_profiles: solo el dueño puede crear"
  ON patient_clinical_profiles;

DROP POLICY IF EXISTS "patient_clinical_profiles: solo el dueño puede editar"
  ON patient_clinical_profiles;

DROP POLICY IF EXISTS "patient_clinical_profiles: solo el dueño puede borrar"
  ON patient_clinical_profiles;

CREATE POLICY "patient_clinical_profiles: solo el dueño puede ver"
  ON patient_clinical_profiles
  FOR SELECT
  USING (auth.uid() = psychologist_id);

CREATE POLICY "patient_clinical_profiles: solo el dueño puede crear"
  ON patient_clinical_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "patient_clinical_profiles: solo el dueño puede editar"
  ON patient_clinical_profiles
  FOR UPDATE
  USING (auth.uid() = psychologist_id)
  WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "patient_clinical_profiles: solo el dueño puede borrar"
  ON patient_clinical_profiles
  FOR DELETE
  USING (auth.uid() = psychologist_id);

DROP TRIGGER IF EXISTS update_patient_clinical_profiles_updated_at
  ON patient_clinical_profiles;

CREATE TRIGGER update_patient_clinical_profiles_updated_at
  BEFORE UPDATE ON patient_clinical_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();