-- ============================================================
-- MIGRACION: import estable de citas desde Doctoralia
-- ============================================================
-- Objetivos:
-- 1) guardar metadata de procedencia sin dejar a Doctoralia como source of truth
-- 2) preservar payments/notas/vinculos internos en appointments
-- 3) evitar reimportar citas borradas localmente
-- ============================================================

alter table appointments
  add column if not exists source_system text default 'manual',
  add column if not exists doctoralia_estado_sesion text,
  add column if not exists estado_sesion_override text,
  add column if not exists doctoralia_paciente_nombre text,
  add column if not exists doctoralia_last_synced_at timestamptz,
  add column if not exists doctoralia_last_seen_at timestamptz,
  add column if not exists doctoralia_removed_at timestamptz;

create table if not exists doctoralia_imports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  doctoralia_uid text not null,
  appointment_id uuid references appointments(id) on delete set null,
  external_patient_name text,
  first_imported_at timestamptz default now() not null,
  last_seen_at timestamptz,
  deleted_in_lumi_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, doctoralia_uid)
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'update_doctoralia_imports_updated_at'
  ) then
    create trigger update_doctoralia_imports_updated_at
      before update on doctoralia_imports
      for each row execute function update_updated_at_column();
  end if;
end $$;

update appointments
set source_system = case
  when doctoralia_uid is not null then 'doctoralia'
  else 'manual'
end
where doctoralia_uid is not null
   or source_system is null;

update appointments
set doctoralia_estado_sesion = estado_sesion
where doctoralia_uid is not null
  and doctoralia_estado_sesion is null;

update appointments
set doctoralia_paciente_nombre = nullif(trim(notas), '')
where doctoralia_uid is not null
  and patient_id is null
  and doctoralia_paciente_nombre is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_source_system_check'
  ) then
    alter table appointments
      add constraint appointments_source_system_check
      check (source_system in ('manual', 'doctoralia'));
  end if;
end $$;

alter table doctoralia_imports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'doctoralia_imports'
      and policyname = 'doctoralia_imports: solo el dueño puede ver'
  ) then
    create policy "doctoralia_imports: solo el dueño puede ver"
      on doctoralia_imports for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'doctoralia_imports'
      and policyname = 'doctoralia_imports: solo el dueño puede crear'
  ) then
    create policy "doctoralia_imports: solo el dueño puede crear"
      on doctoralia_imports for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'doctoralia_imports'
      and policyname = 'doctoralia_imports: solo el dueño puede editar'
  ) then
    create policy "doctoralia_imports: solo el dueño puede editar"
      on doctoralia_imports for update
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'doctoralia_imports'
      and policyname = 'doctoralia_imports: solo el dueño puede borrar'
  ) then
    create policy "doctoralia_imports: solo el dueño puede borrar"
      on doctoralia_imports for delete
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_doctoralia_estado_sesion_check'
  ) then
    alter table appointments
      add constraint appointments_doctoralia_estado_sesion_check
      check (
        doctoralia_estado_sesion in ('pendiente', 'confirmada', 'realizada', 'cancelo')
        or doctoralia_estado_sesion is null
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_estado_sesion_override_check'
  ) then
    alter table appointments
      add constraint appointments_estado_sesion_override_check
      check (
        estado_sesion_override in ('pendiente', 'confirmada', 'realizada', 'cancelo')
        or estado_sesion_override is null
      );
  end if;
end $$;
