-- ============================================================
-- MIGRACIÓN: alinear modelo final de estados de sesión
-- ============================================================
-- Ejecutar en el SQL Editor de Supabase.
-- Modelo final:
--   pendiente | confirmada | realizada | cancelo
--
-- Normaliza datos legacy:
--   asistio    -> realizada
--   no_asistio -> cancelo
-- ============================================================

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_estado_sesion_check;

UPDATE appointments
SET estado_sesion = 'realizada'
WHERE estado_sesion = 'asistio';

UPDATE appointments
SET estado_sesion = 'cancelo'
WHERE estado_sesion = 'no_asistio';

ALTER TABLE appointments
  ADD CONSTRAINT appointments_estado_sesion_check
  CHECK (estado_sesion IN ('pendiente', 'confirmada', 'realizada', 'cancelo'));

-- Verificar resultado:
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'appointments_estado_sesion_check';
