-- ============================================================
-- MIGRACIÓN: MVP Clínico Nivel 1
-- Aplica sobre un schema existente — todos los ALTER son
-- idempotentes gracias a IF NOT EXISTS.
-- ============================================================

-- ============================================================
-- 1. session_notes — firma de nota
-- ============================================================

-- status reemplaza el rol semántico de is_draft como campo canónico.
-- is_draft se mantiene para compatibilidad; se sincroniza al firmar.
ALTER TABLE session_notes
  ADD COLUMN IF NOT EXISTS status   text DEFAULT 'draft'
    CHECK (status IN ('draft', 'signed')),
  ADD COLUMN IF NOT EXISTS signed_by uuid REFERENCES auth.users(id);

-- Retrocompatibilidad: rellenar status en filas existentes.
-- Notas con signed_at previo pasan a 'signed'; el resto, 'draft'.
UPDATE session_notes
   SET status = CASE WHEN signed_at IS NOT NULL THEN 'signed' ELSE 'draft' END
 WHERE status IS NULL;

-- ============================================================
-- 2. session_notes — RLS: bloquear edición/borrado de notas firmadas
-- ============================================================

-- UPDATE solo permitido mientras status = 'draft' (o NULL legacy).
-- La cláusula USING evalúa el estado actual de la fila; al firmar
-- (status 'draft' → 'signed') la fila sí está en 'draft' todavía,
-- así que el propio acto de firmar está permitido.
DROP POLICY IF EXISTS "session_notes: solo el psicólogo puede editar" ON session_notes;
CREATE POLICY "session_notes: solo el psicólogo puede editar"
  ON session_notes FOR UPDATE
  USING (
    auth.uid() = psychologist_id
    AND COALESCE(status, 'draft') = 'draft'
  );

-- DELETE bloqueado en notas firmadas.
DROP POLICY IF EXISTS "session_notes: solo el psicólogo puede borrar" ON session_notes;
CREATE POLICY "session_notes: solo el psicólogo puede borrar"
  ON session_notes FOR DELETE
  USING (
    auth.uid() = psychologist_id
    AND COALESCE(status, 'draft') = 'draft'
  );

-- ============================================================
-- 3. patient_clinical_profiles — consentimiento informado ampliado
-- ============================================================

ALTER TABLE patient_clinical_profiles
  ADD COLUMN IF NOT EXISTS informed_consent_signed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS consent_version             text DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS consent_file_path           text;

-- ============================================================
-- 4. patient_clinical_profiles — autorización tratamiento de datos
-- ============================================================

ALTER TABLE patient_clinical_profiles
  ADD COLUMN IF NOT EXISTS data_processing_authorization_status text DEFAULT 'pending'
    CHECK (data_processing_authorization_status IN ('pending', 'authorized')),
  ADD COLUMN IF NOT EXISTS data_processing_authorized_at timestamptz;
