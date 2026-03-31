-- ============================================================
-- MIGRACIÓN: endurecer privacidad de canvas-notes
-- ============================================================
-- Objetivos:
-- 1) asegurar bucket privado
-- 2) quitar lecturas públicas legacy
-- 3) dejar acceso solo al dueño por carpeta userId/*
-- Nota:
-- - NO convierte canvas_url viejos en la tabla clinical_notes.
--   El código ya soporta compatibilidad leyendo URLs legacy como path.
-- - Si el bucket no existe todavía, esta migración lo crea como privado.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('canvas-notes', 'canvas-notes', false)
on conflict (id) do update
set public = false;

drop policy if exists "canvas: lectura pública" on storage.objects;
drop policy if exists "canvas: solo el dueño puede subir" on storage.objects;
drop policy if exists "canvas: solo el dueño puede ver" on storage.objects;
drop policy if exists "canvas: solo el dueño puede borrar" on storage.objects;
drop policy if exists "canvas: solo el dueño puede actualizar" on storage.objects;

create policy "canvas: solo el dueño puede subir"
  on storage.objects for insert
  with check (
    bucket_id = 'canvas-notes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "canvas: solo el dueño puede ver"
  on storage.objects for select
  using (
    bucket_id = 'canvas-notes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "canvas: solo el dueño puede borrar"
  on storage.objects for delete
  using (
    bucket_id = 'canvas-notes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "canvas: solo el dueño puede actualizar"
  on storage.objects for update
  using (
    bucket_id = 'canvas-notes'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'canvas-notes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Verificación sugerida:
-- select id, public from storage.buckets where id = 'canvas-notes';
-- select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects';
