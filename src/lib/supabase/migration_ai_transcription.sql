-- ============================================================
-- Soporte de transcripción IA para notas clínicas
--
-- transcription_*  →  resultado de pedirle a la IA que lea el manuscrito
-- structured_note_* →  DAP generado por IA a partir de la transcripción revisada
--
-- IMPORTANTE: structured_note_json es solo una SUGERENCIA que pre-llena el
-- formulario DAP. Nunca reemplaza a template_data sin revisión humana.
-- NULL en *_status equivale al estado 'idle' (sin acción iniciada).
--
-- transcription_manually_edited = true bloquea sobrescrituras de transcription_text
-- por re-transcripciones automáticas. El usuario debe ser consciente de ediciones.
-- ============================================================

ALTER TABLE clinical_notes
  ADD COLUMN IF NOT EXISTS transcription_status         TEXT
    CHECK (transcription_status IN ('processing', 'done', 'error')),
  ADD COLUMN IF NOT EXISTS transcription_text           TEXT,
  ADD COLUMN IF NOT EXISTS transcription_error          TEXT,
  ADD COLUMN IF NOT EXISTS transcribed_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transcription_manually_edited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS structured_note_status       TEXT
    CHECK (structured_note_status IN ('processing', 'done', 'error')),
  ADD COLUMN IF NOT EXISTS structured_note_json         JSONB,
  ADD COLUMN IF NOT EXISTS structured_note_generated_at TIMESTAMPTZ;

-- CHECK constraint: si hay DAP sugerido, debe haber transcripción
ALTER TABLE clinical_notes
  ADD CONSTRAINT structured_note_requires_transcription
    CHECK ((structured_note_json IS NULL) OR (transcription_text IS NOT NULL));
