-- Permite múltiples notas por cita y notas sin cita asociada.
-- appointment_id pasa a ser opcional (ya era nullable) y no único.

ALTER TABLE session_notes
  DROP CONSTRAINT IF EXISTS session_notes_appointment_id_key;
