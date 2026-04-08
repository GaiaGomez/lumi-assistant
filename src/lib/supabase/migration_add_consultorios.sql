-- ============================================================
-- MIGRACIÓN: CONSULTORIOS EDITABLES
-- 1) Crea una entidad real de consultorios por usuario
-- 2) Conecta appointments vía consultorio_id
-- 3) Migra las modalidades legacy a consultorios reales
-- ============================================================

CREATE TABLE IF NOT EXISTS consultorios (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre              text NOT NULL,
  color               text NOT NULL DEFAULT '#9488B0',
  icono               text NOT NULL DEFAULT 'map-pin',
  dato_principal_tipo text
                      CHECK (dato_principal_tipo IN ('direccion', 'enlace', 'nota')),
  dato_principal      text,
  legacy_key          text
                      CHECK (legacy_key IN ('online', 'medellin', 'retiro')),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS consultorios_user_legacy_key_idx
  ON consultorios(user_id, legacy_key)
  WHERE legacy_key IS NOT NULL;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS consultorio_id uuid REFERENCES consultorios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS appointments_consultorio_id_idx
  ON appointments(consultorio_id);

ALTER TABLE consultorios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultorios: solo el dueño puede ver" ON consultorios;
DROP POLICY IF EXISTS "consultorios: solo el dueño puede crear" ON consultorios;
DROP POLICY IF EXISTS "consultorios: solo el dueño puede editar" ON consultorios;
DROP POLICY IF EXISTS "consultorios: solo el dueño puede borrar" ON consultorios;

CREATE POLICY "consultorios: solo el dueño puede ver"
  ON consultorios FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "consultorios: solo el dueño puede crear"
  ON consultorios FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "consultorios: solo el dueño puede editar"
  ON consultorios FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "consultorios: solo el dueño puede borrar"
  ON consultorios FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_consultorios_updated_at ON consultorios;
CREATE TRIGGER update_consultorios_updated_at
  BEFORE UPDATE ON consultorios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

WITH existing_users AS (
  SELECT DISTINCT user_id FROM appointments
  UNION
  SELECT DISTINCT user_id FROM patients
  UNION
  SELECT DISTINCT user_id FROM settings
),
legacy_blueprint AS (
  SELECT
    user_id,
    legacy_key,
    COALESCE(name_setting.value, default_name) AS nombre,
    COALESCE(color_setting.value, default_color) AS color,
    icono,
    primary_type AS dato_principal_tipo,
    NULLIF(TRIM(primary_setting.value), '') AS dato_principal
  FROM existing_users
  CROSS JOIN (
    VALUES
      ('medellin', 'Medellín', '#9488B0', 'map-pin', 'direccion', 'modalidad_medellin_nombre', 'modalidad_medellin_color', 'modalidad_medellin_direccion'),
      ('online', 'Online', '#8FA5BD', 'monitor', 'enlace', 'modalidad_online_nombre', 'modalidad_online_color', 'modalidad_online_enlace'),
      ('retiro', 'Retiro', '#7EA88F', 'leaf', 'nota', 'modalidad_retiro_nombre', 'modalidad_retiro_color', 'modalidad_retiro_instrucciones')
  ) AS defs(legacy_key, default_name, default_color, icono, primary_type, name_key, color_key, primary_key)
  LEFT JOIN settings AS name_setting
    ON name_setting.user_id = existing_users.user_id
   AND name_setting.key = defs.name_key
  LEFT JOIN settings AS color_setting
    ON color_setting.user_id = existing_users.user_id
   AND color_setting.key = defs.color_key
  LEFT JOIN settings AS primary_setting
    ON primary_setting.user_id = existing_users.user_id
   AND primary_setting.key = defs.primary_key
)
INSERT INTO consultorios (
  user_id,
  nombre,
  color,
  icono,
  dato_principal_tipo,
  dato_principal,
  legacy_key
)
SELECT
  user_id,
  nombre,
  color,
  icono,
  dato_principal_tipo,
  dato_principal,
  legacy_key
FROM legacy_blueprint
ON CONFLICT DO NOTHING;

UPDATE appointments AS appointment
SET consultorio_id = consultorio.id
FROM consultorios AS consultorio
WHERE appointment.consultorio_id IS NULL
  AND appointment.modalidad IS NOT NULL
  AND appointment.user_id = consultorio.user_id
  AND appointment.modalidad = consultorio.legacy_key;
