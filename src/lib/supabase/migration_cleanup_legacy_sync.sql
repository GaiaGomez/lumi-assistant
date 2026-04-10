-- ============================================================
-- MIGRACIÓN: limpiar integración legacy externa
-- ============================================================
-- Objetivos:
-- 1) Conservar citas existentes sin depender de metadata legacy
-- 2) Renombrar el link público de agenda a un concepto neutral
-- 3) Eliminar tablas, columnas e índices usados solo por el sync viejo
-- ============================================================

-- ── settings ────────────────────────────────────────────────
UPDATE settings
SET key = 'booking_url'
WHERE key = 'doctoralia_url';

DELETE FROM settings
WHERE key IN (
  'doctoralia_token',
  'doctoralia_last_sync',
  'doctoralia_sync_error'
);

-- ── appointments ────────────────────────────────────────────
-- Conserva títulos visibles para citas importadas sin paciente ligado.
UPDATE appointments
SET title = doctoralia_paciente_nombre
WHERE COALESCE(NULLIF(title, ''), '') = ''
  AND COALESCE(NULLIF(doctoralia_paciente_nombre, ''), '') <> ''
  AND patient_id IS NULL;

-- Si alguna cita estaba mostrando un override temporal, lo convertimos en el estado persistido.
UPDATE appointments
SET estado_sesion = COALESCE(estado_sesion_override, doctoralia_estado_sesion, estado_sesion, 'pendiente')
WHERE estado_sesion_override IS NOT NULL
   OR (estado_sesion IS NULL AND doctoralia_estado_sesion IS NOT NULL);

DROP INDEX IF EXISTS appointments_user_doctoralia_uid_key;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_source_system_check,
  DROP CONSTRAINT IF EXISTS appointments_doctoralia_estado_sesion_check,
  DROP CONSTRAINT IF EXISTS appointments_estado_sesion_override_check;

ALTER TABLE appointments
  DROP COLUMN IF EXISTS source_system,
  DROP COLUMN IF EXISTS doctoralia_uid,
  DROP COLUMN IF EXISTS doctoralia_estado_sesion,
  DROP COLUMN IF EXISTS estado_sesion_override,
  DROP COLUMN IF EXISTS doctoralia_paciente_nombre,
  DROP COLUMN IF EXISTS doctoralia_last_synced_at,
  DROP COLUMN IF EXISTS doctoralia_last_seen_at,
  DROP COLUMN IF EXISTS doctoralia_removed_at;

-- ── imports legacy ──────────────────────────────────────────
DROP TRIGGER IF EXISTS update_doctoralia_imports_updated_at ON doctoralia_imports;
DROP TABLE IF EXISTS doctoralia_imports;
