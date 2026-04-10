-- ============================================================
-- MIGRACIÓN: base resilient de conexión Doctoralia
-- ============================================================
-- Objetivos:
-- 1) Persistir el estado de conexión sin exponer secretos al frontend
-- 2) Separar la deduplicación externa de la tabla appointments
-- 3) Dejar lista la base para sync manual ahora y automático después
-- ============================================================

create table if not exists doctoralia_connections (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid references auth.users(id) on delete cascade not null unique,
  connection_status  text not null default 'disconnected'
                     check (connection_status in ('disconnected', 'connected', 'expired', 'syncing', 'error')),
  session_kind       text
                     check (session_kind in ('authorization', 'cookie')),
  session_secret     text,
  session_expires_at timestamptz,
  connected_at       timestamptz,
  last_sync_at       timestamptz,
  last_sync_result   jsonb,
  last_error         text,
  imported_count     integer not null default 0 check (imported_count >= 0),
  updated_count      integer not null default 0 check (updated_count >= 0),
  failed_count       integer not null default 0 check (failed_count >= 0),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists doctoralia_appointment_links (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  external_key   text not null,
  external_id    text,
  dedupe_mode    text not null
                 check (dedupe_mode in ('external-id', 'fingerprint')),
  appointment_id uuid references appointments(id) on delete cascade not null,
  payload_hash   text not null,
  last_seen_at   timestamptz not null,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (user_id, external_key)
);

create index if not exists doctoralia_appointment_links_appointment_id_idx
  on doctoralia_appointment_links(appointment_id);

alter table doctoralia_connections enable row level security;
alter table doctoralia_appointment_links enable row level security;

drop policy if exists "doctoralia_connections: solo el dueño puede ver" on doctoralia_connections;
drop policy if exists "doctoralia_connections: solo el dueño puede crear" on doctoralia_connections;
drop policy if exists "doctoralia_connections: solo el dueño puede editar" on doctoralia_connections;
drop policy if exists "doctoralia_connections: solo el dueño puede borrar" on doctoralia_connections;

create policy "doctoralia_connections: solo el dueño puede ver" on doctoralia_connections for select using (auth.uid() = user_id);
create policy "doctoralia_connections: solo el dueño puede crear" on doctoralia_connections for insert with check (auth.uid() = user_id);
create policy "doctoralia_connections: solo el dueño puede editar" on doctoralia_connections for update using (auth.uid() = user_id);
create policy "doctoralia_connections: solo el dueño puede borrar" on doctoralia_connections for delete using (auth.uid() = user_id);

drop policy if exists "doctoralia_appointment_links: solo el dueño puede ver" on doctoralia_appointment_links;
drop policy if exists "doctoralia_appointment_links: solo el dueño puede crear" on doctoralia_appointment_links;
drop policy if exists "doctoralia_appointment_links: solo el dueño puede editar" on doctoralia_appointment_links;
drop policy if exists "doctoralia_appointment_links: solo el dueño puede borrar" on doctoralia_appointment_links;

create policy "doctoralia_appointment_links: solo el dueño puede ver" on doctoralia_appointment_links for select using (auth.uid() = user_id);
create policy "doctoralia_appointment_links: solo el dueño puede crear" on doctoralia_appointment_links for insert with check (auth.uid() = user_id);
create policy "doctoralia_appointment_links: solo el dueño puede editar" on doctoralia_appointment_links for update using (auth.uid() = user_id);
create policy "doctoralia_appointment_links: solo el dueño puede borrar" on doctoralia_appointment_links for delete using (auth.uid() = user_id);

drop trigger if exists update_doctoralia_connections_updated_at on doctoralia_connections;
create trigger update_doctoralia_connections_updated_at
  before update on doctoralia_connections
  for each row execute function update_updated_at_column();

drop trigger if exists update_doctoralia_appointment_links_updated_at on doctoralia_appointment_links;
create trigger update_doctoralia_appointment_links_updated_at
  before update on doctoralia_appointment_links
  for each row execute function update_updated_at_column();
