-- ============================================================
-- MIGRACIÓN: agregar campo modalidad a appointments
-- ============================================================
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- El campo es nullable: las citas existentes quedan con NULL
-- y se resuelven con el fallback de notas hasta que se actualicen.
-- ============================================================

alter table appointments
  add column if not exists modalidad text
  check (modalidad in ('online', 'medellin', 'retiro'));

-- Verificar que quedó bien:
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_name = 'appointments' and column_name = 'modalidad';
