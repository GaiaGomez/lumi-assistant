-- ============================================================
-- AGENDA RESET — limpieza completa de citas e historial de sync
-- ============================================================
-- Qué borra:
--   • doctoralia_appointment_links  (todos los vínculos de import)
--   • appointments                  (todas las citas del calendario)
--
-- Qué resetea (sin borrar la fila):
--   • doctoralia_connections        → contadores y metadata de sync
--     last_sync_at, last_sync_result, last_error = NULL
--     imported_count, updated_count, failed_count = 0
--     connection_status 'syncing' → 'connected'  (lock colgante)
--
-- Qué NO toca:
--   • patients                      (pacientes intactos)
--   • clinical_notes                (notas clínicas intactas;
--                                    appointment_id → NULL por FK)
--   • consultorios                  (sin cambios)
--   • settings                      (sin cambios)
--   • doctoralia_connections        sesión, kind, secret, expires_at
--                                   y connected_at se preservan
--
-- FK a respetar:
--   doctoralia_appointment_links.appointment_id → appointments(id)
--     ON DELETE CASCADE  →  borramos links primero por claridad
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
  v_links_deleted        int;
  v_appointments_deleted int;
  v_connections_reset    int;
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

  -- ── 1. Vínculos Doctoralia ─────────────────────────────────
  -- FK: appointment_id → appointments(id) ON DELETE CASCADE
  -- Se borrarían en cascada al eliminar appointments, pero lo hacemos
  -- explícitamente primero para que el conteo sea exacto.
  DELETE FROM doctoralia_appointment_links
  WHERE user_id = v_user_id;

  GET DIAGNOSTICS v_links_deleted = ROW_COUNT;

  -- ── 2. Citas ───────────────────────────────────────────────
  -- FK inversa en clinical_notes: appointment_id → ON DELETE SET NULL
  -- Postgres pone appointment_id = NULL en las notas automáticamente.
  DELETE FROM appointments
  WHERE user_id = v_user_id;

  GET DIAGNOSTICS v_appointments_deleted = ROW_COUNT;

  -- ── 3. Contar notas clínicas desvinculadas ──────────────────
  SELECT count(*) INTO v_notes_unlinked
  FROM clinical_notes
  WHERE user_id = v_user_id
    AND appointment_id IS NULL;

  -- ── 4. Resetear metadata de sync en Doctoralia connection ──
  -- Preservamos: connection_status (salvo lock 'syncing' → 'connected'),
  --              session_kind, session_secret, session_expires_at, connected_at.
  -- Borramos:    last_sync_at, last_sync_result, last_error,
  --              imported_count, updated_count, failed_count.
  UPDATE doctoralia_connections
  SET
    connection_status = CASE
                          WHEN connection_status = 'syncing' THEN 'connected'
                          ELSE connection_status
                        END,
    last_sync_at      = NULL,
    last_sync_result  = NULL,
    last_error        = NULL,
    imported_count    = 0,
    updated_count     = 0,
    failed_count      = 0,
    updated_at        = now()
  WHERE user_id = v_user_id;

  GET DIAGNOSTICS v_connections_reset = ROW_COUNT;

  -- ── Resumen ────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '=== Agenda Reset — resumen ===';
  RAISE NOTICE 'doctoralia_appointment_links eliminados : %', v_links_deleted;
  RAISE NOTICE 'appointments eliminados                 : %', v_appointments_deleted;
  RAISE NOTICE 'clinical_notes desvinculadas (intactas) : %', v_notes_unlinked;
  RAISE NOTICE 'doctoralia_connections con sync reset   : %', v_connections_reset;
  RAISE NOTICE '==============================';
  RAISE NOTICE 'Pacientes, notas, consultorios y settings: sin cambios.';

END $$;
