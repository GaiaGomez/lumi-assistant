-- ============================================================
-- MIGRACIÓN: MVP Clínico Nivel 1.1
-- Agrega estructura formal de nota, modalidad/duración de sesión,
-- fuente de registro de consentimiento y bucket de firmas.
-- Idempotente: todos los ALTER usan IF NOT EXISTS.
-- ============================================================

-- ============================================================
-- 1. session_notes — nueva estructura clínica formal
-- ============================================================

ALTER TABLE session_notes
  ADD COLUMN IF NOT EXISTS session_topic            text,
  ADD COLUMN IF NOT EXISTS clinical_observations    text,
  ADD COLUMN IF NOT EXISTS interventions            text,
  ADD COLUMN IF NOT EXISTS clinical_evolution       text,
  ADD COLUMN IF NOT EXISTS therapeutic_plan         text,
  ADD COLUMN IF NOT EXISTS session_modality         text DEFAULT 'no_especificada'
    CHECK (session_modality IN ('virtual', 'presencial', 'no_especificada')),
  ADD COLUMN IF NOT EXISTS session_duration_minutes integer;

-- ============================================================
-- 2. patient_clinical_profiles — fuente de registro de consentimiento
-- ============================================================

ALTER TABLE patient_clinical_profiles
  ADD COLUMN IF NOT EXISTS consent_recorded_source text DEFAULT 'manual'
    CHECK (consent_recorded_source IN ('first_session', 'manual'));

-- ============================================================
-- 3. Storage bucket: firmas profesionales
-- Bucket privado para firma escaneada del profesional.
-- Path: {user_id}/signature
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-signatures', 'professional-signatures', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. RLS storage: professional-signatures
-- Solo el dueño puede subir, ver, actualizar y borrar su firma.
-- El primer segmento del path debe ser auth.uid().
-- ============================================================

DROP POLICY IF EXISTS "signatures: solo el dueño puede subir" ON storage.objects;
CREATE POLICY "signatures: solo el dueño puede subir"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'professional-signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "signatures: solo el dueño puede ver" ON storage.objects;
CREATE POLICY "signatures: solo el dueño puede ver"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'professional-signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "signatures: solo el dueño puede actualizar" ON storage.objects;
CREATE POLICY "signatures: solo el dueño puede actualizar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'professional-signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'professional-signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "signatures: solo el dueño puede borrar" ON storage.objects;
CREATE POLICY "signatures: solo el dueño puede borrar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'professional-signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
