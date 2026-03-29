-- ============================================================
-- MIGRACIÓN: agregar campo modalidad a appointments
-- ============================================================
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- El campo queda nullable para conservar compatibilidad con citas legacy.
-- ============================================================

alter table appointments
  add column if not exists modalidad text
  check (modalidad in ('online', 'medellin', 'retiro'));
