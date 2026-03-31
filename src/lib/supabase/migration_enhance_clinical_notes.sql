-- ============================================================
-- MIGRACION: enriquecer notas clinicas
-- ============================================================
-- Objetivos:
-- 1) habilitar plantilla estructurada DAP en cada nota
-- 2) guardar trazos del canvas para permitir edicion posterior
-- 3) mantener compatibilidad con notas legacy basadas solo en texto/imagen
-- ============================================================

alter table clinical_notes
  add column if not exists canvas_paths jsonb,
  add column if not exists template_kind text,
  add column if not exists template_data jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clinical_notes_template_kind_check'
  ) then
    alter table clinical_notes
      add constraint clinical_notes_template_kind_check
      check (template_kind is null or template_kind in ('dap'));
  end if;
end $$;

comment on column clinical_notes.canvas_paths is
  'Trazos serializados del canvas manuscrito para reabrir y editar la nota sin perder el vector original.';

comment on column clinical_notes.template_kind is
  'Formato estructurado usado por la nota escrita. Inicialmente: dap.';

comment on column clinical_notes.template_data is
  'Contenido estructurado de la plantilla clinica (focus, riskLevel, data, assessment, plan).';

-- Verificacion sugerida:
-- select column_name, data_type
-- from information_schema.columns
-- where table_name = 'clinical_notes'
-- order by ordinal_position;
