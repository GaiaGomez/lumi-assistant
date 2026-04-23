-- ============================================================
-- session_notes: sistema de notas clínicas de sesión v2
--
-- Reemplaza el flujo de clinical_notes + IA por un modelo
-- más directo: texto libre durante la sesión + 4 campos
-- estructurados para la nota formal.
--
-- clinical_notes se mantiene intacta (datos históricos).
-- appointment_id es UNIQUE: una sola nota por cita.
-- ============================================================

CREATE TABLE IF NOT EXISTS session_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id   UUID UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id       UUID REFERENCES patients(id) ON DELETE CASCADE,
  psychologist_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Modo sesión (texto libre durante la consulta)
  quick_note       TEXT,

  -- Modo nota formal (4 preguntas, mapean a DAP internamente)
  como_llego       TEXT,
  que_trabajaron   TEXT,
  como_va_proceso  TEXT,
  que_sigue        TEXT,

  -- Canvas privado del terapeuta (nunca se exporta al paciente)
  canvas_paths     JSONB,
  canvas_url       TEXT,

  -- Control
  session_number   INT,
  is_draft         BOOLEAN DEFAULT true,
  signed_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "psychologist owns notes" ON session_notes;

CREATE POLICY "psychologist owns notes"
ON session_notes FOR ALL
USING (psychologist_id = auth.uid())
WITH CHECK (psychologist_id = auth.uid());

DROP TRIGGER IF EXISTS update_session_notes_updated_at ON session_notes;
CREATE TRIGGER update_session_notes_updated_at
  BEFORE UPDATE ON session_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
