-- ============================================================
-- MIGRACIÓN: REMOVE REMINDER DISPATCHES
-- Lumi mantiene WhatsApp como flujo manual vía links wa.me.
-- Esta migración elimina la cola de recordatorios automáticos.
-- ============================================================

DROP POLICY IF EXISTS "reminder_dispatches: solo el dueño puede ver" ON reminder_dispatches;
DROP POLICY IF EXISTS "reminder_dispatches: solo el dueño puede crear" ON reminder_dispatches;
DROP POLICY IF EXISTS "reminder_dispatches: solo el dueño puede editar" ON reminder_dispatches;
DROP POLICY IF EXISTS "reminder_dispatches: solo el dueño puede borrar" ON reminder_dispatches;

DROP TRIGGER IF EXISTS update_reminder_dispatches_updated_at ON reminder_dispatches;

DROP TABLE IF EXISTS reminder_dispatches;
