-- ============================================================
-- Eliminar integración Doctoralia de la base de datos
--
-- Correr MANUALMENTE en Supabase → SQL Editor
-- Es seguro ejecutar más de una vez (todas las operaciones usan IF EXISTS)
-- ============================================================

-- 1. Políticas RLS de las tablas Doctoralia
DROP POLICY IF EXISTS "doctoralia_connections: solo el dueño puede ver"    ON doctoralia_connections;
DROP POLICY IF EXISTS "doctoralia_connections: solo el dueño puede crear"  ON doctoralia_connections;
DROP POLICY IF EXISTS "doctoralia_connections: solo el dueño puede editar" ON doctoralia_connections;
DROP POLICY IF EXISTS "doctoralia_connections: solo el dueño puede borrar" ON doctoralia_connections;

DROP POLICY IF EXISTS "doctoralia_appointment_links: solo el dueño puede ver"    ON doctoralia_appointment_links;
DROP POLICY IF EXISTS "doctoralia_appointment_links: solo el dueño puede crear"  ON doctoralia_appointment_links;
DROP POLICY IF EXISTS "doctoralia_appointment_links: solo el dueño puede editar" ON doctoralia_appointment_links;
DROP POLICY IF EXISTS "doctoralia_appointment_links: solo el dueño puede borrar" ON doctoralia_appointment_links;

-- 2. Triggers
DROP TRIGGER IF EXISTS update_doctoralia_connections_updated_at       ON doctoralia_connections;
DROP TRIGGER IF EXISTS update_doctoralia_appointment_links_updated_at ON doctoralia_appointment_links;

-- 3. Índices
DROP INDEX IF EXISTS doctoralia_appointment_links_appointment_id_idx;

-- 4. Tablas (appointment_links primero por FK a appointments)
DROP TABLE IF EXISTS doctoralia_appointment_links;
DROP TABLE IF EXISTS doctoralia_connections;

-- 5. Columnas legacy en appointments
--    Estas columnas existían en versiones anteriores del schema.
--    Si ya se corrió migration_cleanup_legacy_sync.sql, estas operaciones
--    no hacen nada (IF EXISTS las hace seguras).
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

-- 6. Settings keys de Doctoralia
UPDATE settings SET key = 'booking_url' WHERE key = 'doctoralia_url';
DELETE FROM settings WHERE key IN (
  'doctoralia_token',
  'doctoralia_last_sync',
  'doctoralia_sync_error'
);
