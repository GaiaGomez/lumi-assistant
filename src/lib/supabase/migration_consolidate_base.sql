-- ============================================================
-- MIGRACIÓN: consolidación base de Lumi
-- ============================================================
-- Objetivos:
-- 1) Formalizar settings como parte real del producto
-- 2) Endurecer appointments con updated_at
-- 3) Cambiar doctoralia_uid a unicidad por usuario
-- ============================================================

-- ── settings ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key          text NOT NULL,
  value        text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, key)
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings: solo el dueño puede ver" ON settings;
DROP POLICY IF EXISTS "settings: solo el dueño puede crear" ON settings;
DROP POLICY IF EXISTS "settings: solo el dueño puede editar" ON settings;
DROP POLICY IF EXISTS "settings: solo el dueño puede borrar" ON settings;

CREATE POLICY "settings: solo el dueño puede ver" ON settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "settings: solo el dueño puede crear" ON settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings: solo el dueño puede editar" ON settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "settings: solo el dueño puede borrar" ON settings FOR DELETE USING (auth.uid() = user_id);

-- ── appointments ────────────────────────────────────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE appointments
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_doctoralia_uid_key;

DROP INDEX IF EXISTS appointments_user_doctoralia_uid_key;

CREATE UNIQUE INDEX appointments_user_doctoralia_uid_key
  ON appointments(user_id, doctoralia_uid)
  WHERE doctoralia_uid IS NOT NULL;

-- ── trigger genérico updated_at ─────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
