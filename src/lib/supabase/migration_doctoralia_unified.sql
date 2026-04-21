-- ============================================================
-- MIGRACIÓN UNIFICADA: Doctoralia sync — foundation completa
-- ============================================================
-- Corre esto en Supabase → SQL Editor
--
-- Qué hace:
--  1. Crea/restaura las columnas doctoralia_* en appointments
--  2. Crea la tabla doctoralia_imports (deduplicación)
--  3. Crea la tabla doctoralia_connections (estado + token)
--  4. Agrega índices, constraints y políticas RLS
--
-- Es idempotente: puedes correrla varias veces sin problema.
-- ============================================================

-- ────────────────────────────────────────────────────────────────
-- 1. Columnas en appointments
-- ────────────────────────────────────────────────────────────────

alter table appointments
  add column if not exists source_system          text        default 'manual',
  add column if not exists doctoralia_uid          text,
  add column if not exists doctoralia_estado_sesion text,
  add column if not exists estado_sesion_override   text,
  add column if not exists doctoralia_paciente_nombre text,
  add column if not exists doctoralia_last_synced_at  timestamptz,
  add column if not exists doctoralia_last_seen_at    timestamptz,
  add column if not exists doctoralia_removed_at      timestamptz;

-- Poblar source_system en filas existentes
update appointments
set source_system = case
  when doctoralia_uid is not null then 'doctoralia'
  else 'manual'
end
where source_system is null;

-- Constraints (idempotentes)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_source_system_check'
  ) then
    alter table appointments
      add constraint appointments_source_system_check
      check (source_system in ('manual', 'doctoralia'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_doctoralia_uid_user_unique'
  ) then
    alter table appointments
      add constraint appointments_doctoralia_uid_user_unique
      unique nulls not distinct (user_id, doctoralia_uid);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_doctoralia_estado_sesion_check'
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
    select 1 from pg_constraint where conname = 'appointments_estado_sesion_override_check'
  ) then
    alter table appointments
      add constraint appointments_estado_sesion_override_check
      check (
        estado_sesion_override in ('pendiente', 'confirmada', 'realizada', 'cancelo')
        or estado_sesion_override is null
      );
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────
-- 2. Tabla doctoralia_imports (deduplicación de citas)
-- ────────────────────────────────────────────────────────────────

create table if not exists doctoralia_imports (
  id                   uuid        default gen_random_uuid() primary key,
  user_id              uuid        references auth.users(id) on delete cascade not null,
  doctoralia_uid       text        not null,
  appointment_id       uuid        references appointments(id) on delete set null,
  external_patient_name text,
  first_imported_at    timestamptz default now() not null,
  last_seen_at         timestamptz,
  deleted_in_lumi_at   timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  unique (user_id, doctoralia_uid)
);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'update_doctoralia_imports_updated_at'
  ) then
    create trigger update_doctoralia_imports_updated_at
      before update on doctoralia_imports
      for each row execute function update_updated_at_column();
  end if;
end $$;

alter table doctoralia_imports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'doctoralia_imports' and policyname = 'doctoralia_imports: solo el dueño puede ver'
  ) then
    create policy "doctoralia_imports: solo el dueño puede ver"
      on doctoralia_imports for select using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'doctoralia_imports' and policyname = 'doctoralia_imports: solo el dueño puede crear'
  ) then
    create policy "doctoralia_imports: solo el dueño puede crear"
      on doctoralia_imports for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'doctoralia_imports' and policyname = 'doctoralia_imports: solo el dueño puede editar'
  ) then
    create policy "doctoralia_imports: solo el dueño puede editar"
      on doctoralia_imports for update using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'doctoralia_imports' and policyname = 'doctoralia_imports: solo el dueño puede borrar'
  ) then
    create policy "doctoralia_imports: solo el dueño puede borrar"
      on doctoralia_imports for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────
-- 3. Tabla doctoralia_connections (estado de conexión + token)
-- ────────────────────────────────────────────────────────────────

create table if not exists doctoralia_connections (
  id                 uuid        default gen_random_uuid() primary key,
  user_id            uuid        references auth.users(id) on delete cascade not null unique,
  connection_status  text        not null default 'disconnected'
                     check (connection_status in ('disconnected', 'connected', 'expired', 'syncing', 'error')),
  session_kind       text
                     check (session_kind in ('authorization', 'cookie')),
  session_secret     text,       -- Bearer token guardado (solo legible server-side con service role)
  session_expires_at timestamptz,
  connected_at       timestamptz,
  last_sync_at       timestamptz,
  last_sync_result   jsonb,
  last_error         text,
  imported_count     integer     not null default 0 check (imported_count >= 0),
  updated_count      integer     not null default 0 check (updated_count >= 0),
  failed_count       integer     not null default 0 check (failed_count >= 0),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'update_doctoralia_connections_updated_at'
  ) then
    create trigger update_doctoralia_connections_updated_at
      before update on doctoralia_connections
      for each row execute function update_updated_at_column();
  end if;
end $$;

alter table doctoralia_connections enable row level security;

-- RLS: el usuario puede ver su fila PERO no puede ver session_secret desde el cliente
-- (el frontend lee status/last_sync_at/last_sync_result, no el token)
drop policy if exists "doctoralia_connections: solo el dueño puede ver"    on doctoralia_connections;
drop policy if exists "doctoralia_connections: solo el dueño puede crear"  on doctoralia_connections;
drop policy if exists "doctoralia_connections: solo el dueño puede editar" on doctoralia_connections;
drop policy if exists "doctoralia_connections: solo el dueño puede borrar" on doctoralia_connections;

create policy "doctoralia_connections: solo el dueño puede ver"
  on doctoralia_connections for select using (auth.uid() = user_id);

create policy "doctoralia_connections: solo el dueño puede crear"
  on doctoralia_connections for insert with check (auth.uid() = user_id);

create policy "doctoralia_connections: solo el dueño puede editar"
  on doctoralia_connections for update using (auth.uid() = user_id);

create policy "doctoralia_connections: solo el dueño puede borrar"
  on doctoralia_connections for delete using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- Fin de la migración
-- ────────────────────────────────────────────────────────────────
