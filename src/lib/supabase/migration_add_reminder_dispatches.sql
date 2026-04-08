-- ============================================================
-- MIGRACIÓN: REMINDER DISPATCHES
-- 1) Crea una cola segura de recordatorios preparados
-- 2) Evita duplicados por cita/tipo/canal
-- 3) Deja base real para un despachador futuro
-- ============================================================

CREATE TABLE IF NOT EXISTS reminder_dispatches (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  patient_id     uuid REFERENCES patients(id) ON DELETE SET NULL,
  reminder_type  text NOT NULL
                 CHECK (reminder_type IN ('1d', '2h')),
  channel        text NOT NULL
                 CHECK (channel IN ('whatsapp')),
  status         text DEFAULT 'ready' NOT NULL
                 CHECK (status IN ('ready', 'sent', 'failed', 'cancelled')),
  scheduled_for  timestamptz NOT NULL,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at        timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (user_id, appointment_id, reminder_type, channel)
);

CREATE INDEX IF NOT EXISTS reminder_dispatches_status_scheduled_for_idx
  ON reminder_dispatches(status, scheduled_for);

CREATE INDEX IF NOT EXISTS reminder_dispatches_appointment_idx
  ON reminder_dispatches(appointment_id);

ALTER TABLE reminder_dispatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminder_dispatches: solo el dueño puede ver" ON reminder_dispatches;
DROP POLICY IF EXISTS "reminder_dispatches: solo el dueño puede crear" ON reminder_dispatches;
DROP POLICY IF EXISTS "reminder_dispatches: solo el dueño puede editar" ON reminder_dispatches;
DROP POLICY IF EXISTS "reminder_dispatches: solo el dueño puede borrar" ON reminder_dispatches;

CREATE POLICY "reminder_dispatches: solo el dueño puede ver"
  ON reminder_dispatches FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reminder_dispatches: solo el dueño puede crear"
  ON reminder_dispatches FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reminder_dispatches: solo el dueño puede editar"
  ON reminder_dispatches FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "reminder_dispatches: solo el dueño puede borrar"
  ON reminder_dispatches FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_reminder_dispatches_updated_at ON reminder_dispatches;
CREATE TRIGGER update_reminder_dispatches_updated_at
  BEFORE UPDATE ON reminder_dispatches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
