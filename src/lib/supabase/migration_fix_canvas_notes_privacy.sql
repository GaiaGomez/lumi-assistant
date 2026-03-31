-- ============================================================
-- MIGRACIÓN: endurecer privacidad de canvas-notes
-- ============================================================
-- Objetivos:
-- 1) asegurar bucket privado
-- 2) quitar lecturas públicas legacy
-- 3) dejar acceso solo al dueño por carpeta userId/*
-- ============================================================

update storage.buckets
set public = false
where id = 'canvas-notes';

drop policy if exists "canvas: lectura pública" on storage.objects;
drop policy if exists "canvas: solo el dueño puede subir" on storage.objects;
drop policy if exists "canvas: solo el dueño puede ver" on storage.objects;
drop policy if exists "canvas: solo el dueño puede borrar" on storage.objects;

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
