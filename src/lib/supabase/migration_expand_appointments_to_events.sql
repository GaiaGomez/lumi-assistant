-- ============================================================
-- MIGRACION: ampliar appointments para eventos generales
-- ============================================================
-- Objetivos:
-- 1) permitir eventos sin paciente
-- 2) soportar titulo libre y color/categoria visual
-- 3) guardar metadatos de recurrencia sin rehacer la agenda
-- ============================================================

alter table appointments
  add column if not exists event_type text default 'patient',
  add column if not exists title text,
  add column if not exists category text,
  add column if not exists color text,
  add column if not exists recurrence_group_id uuid,
  add column if not exists recurrence_rule jsonb;

update appointments
set event_type = 'patient'
where event_type is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_event_type_check'
  ) then
    alter table appointments
      add constraint appointments_event_type_check
      check (event_type in ('patient', 'general'));
  end if;
end $$;

comment on column appointments.event_type is
  'patient = cita clinica, general = evento no asociado a paciente.';

comment on column appointments.title is
  'Titulo libre del evento. Para citas con paciente puede quedar null y se usa el nombre del paciente.';

comment on column appointments.category is
  'Categoria opcional para eventos no clinicos.';

comment on column appointments.color is
  'Color visual opcional del evento en la agenda.';

comment on column appointments.recurrence_group_id is
  'Identificador compartido por las ocurrencias creadas dentro de la misma serie.';

comment on column appointments.recurrence_rule is
  'Regla de recurrencia serializada para referencia de la serie creada.';
