-- ============================================================
-- AGENDA RESET — limpieza completa de citas e historial
-- ============================================================
-- Qué borra:
--   • appointments                  (todas las citas del calendario)
--
-- Qué NO toca:
--   • patients                      (pacientes intactos)
--   • clinical_notes                (notas clínicas intactas;
--                                    appointment_id → NULL por FK)
--   • consultorios                  (sin cambios)
--   • settings                      (sin cambios)
--
-- FK a respetar:
--   clinical_notes.appointment_id → appointments(id)
--     ON DELETE SET NULL →  Postgres lo maneja automáticamente
--
-- Cómo ejecutar:
--   SQL Editor de Supabase → pega y corre todo el bloque.
--   Cambia el email de la línea marcada con <── CAMBIAR si es necesario.
-- ============================================================

DO $$
DECLARE
  v_user_id              uuid;
  v_appointments_deleted int;
  v_notes_unlinked       int;
BEGIN

  -- ── Localizar usuario ──────────────────────────────────────
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'gaiagomez.co@gmail.com'   -- <── CAMBIAR si hace falta
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado. Verifica el email en la línea marcada.';
  END IF;

  -- ── 1. Citas ───────────────────────────────────────────────
  -- FK inversa en clinical_notes: appointment_id → ON DELETE SET NULL
  -- Postgres pone appointment_id = NULL en las notas automáticamente.
  DELETE FROM appointments
  WHERE user_id = v_user_id;

  GET DIAGNOSTICS v_appointments_deleted = ROW_COUNT;

  -- ── 2. Contar notas clínicas desvinculadas ──────────────────
  SELECT count(*) INTO v_notes_unlinked
  FROM clinical_notes
  WHERE user_id = v_user_id
    AND appointment_id IS NULL;

  -- ── Resumen ────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '=== Agenda Reset — resumen ===';
  RAISE NOTICE 'appointments eliminados                 : %', v_appointments_deleted;
  RAISE NOTICE 'clinical_notes desvinculadas (intactas) : %', v_notes_unlinked;
  RAISE NOTICE '==============================';
  RAISE NOTICE 'Pacientes, notas, consultorios y settings: sin cambios.';

END $$;
