-- Soporte de borradores para notas clínicas
-- Una nota con is_draft = true es un borrador; con false (default) es una historia clínica publicada.

ALTER TABLE clinical_notes
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;

-- Índice para filtrar/listar borradores eficientemente
CREATE INDEX IF NOT EXISTS clinical_notes_is_draft_user_idx
  ON clinical_notes (user_id, is_draft, created_at DESC);
