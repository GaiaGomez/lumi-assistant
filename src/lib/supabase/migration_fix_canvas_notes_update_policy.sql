-- ============================================================
-- MIGRACION: permitir update en canvas-notes para upsert
-- ============================================================
-- Contexto:
-- - la nota manuscrita se guarda en storage.objects (bucket canvas-notes)
-- - el flujo usa upload(..., { upsert: true })
-- - cuando el archivo ya existe, Supabase necesita permiso UPDATE
-- ============================================================

drop policy if exists "canvas: solo el dueño puede actualizar" on storage.objects;

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

-- Verificacion sugerida:
-- select policyname, cmd
-- from pg_policies
-- where schemaname = 'storage' and tablename = 'objects'
--   and policyname ilike 'canvas:%';
