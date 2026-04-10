-- TABLA: patients
-- Guarda la información básica de cada paciente
create table if not exists patients (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  nombre       text not null,
  apellido     text not null,
  telefono     text,
  whatsapp     text,  -- formato: 573001234567 (sin + ni espacios)
  email        text,
  fecha_inicio date,  -- fecha de la primera sesión
  notas_generales text,
  created_at   timestamptz default now()
);

-- TABLA: appointments
-- Guarda cada cita del consultorio o eventos generales del calendario
create table if not exists appointments (
  id               uuid default gen_random_uuid() primary key,
  patient_id       uuid references patients(id) on delete cascade,
  user_id          uuid references auth.users(id) on delete cascade not null,
  event_type       text default 'patient'
                   check (event_type in ('patient', 'general')),
  title            text,
  category         text,
  color            text,
  recurrence_group_id uuid,
  recurrence_rule  jsonb,
  fecha_inicio     timestamptz not null,
  fecha_fin        timestamptz,
  estado_sesion    text default 'pendiente'
                   check (estado_sesion in ('pendiente', 'confirmada', 'realizada', 'cancelo')),
  estado_pago      text default 'pendiente'
                   check (estado_pago in ('pendiente', 'pagado')),
  notas            text,
  modalidad        text check (modalidad in ('online', 'medellin', 'retiro')),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- TABLA: doctoralia_connections
-- Guarda el estado de conexión y la sesión temporal usada por el backend
-- para sincronizaciones manuales desde Agenda.
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

-- TABLA: doctoralia_appointment_links
-- Mapea citas externas a citas internas sin contaminar la tabla appointments
-- con metadata específica de la integración.
create table if not exists doctoralia_appointment_links (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  external_key  text not null,
  external_id   text,
  dedupe_mode   text not null
                check (dedupe_mode in ('external-id', 'fingerprint')),
  appointment_id uuid references appointments(id) on delete cascade not null,
  payload_hash  text not null,
  last_seen_at  timestamptz not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (user_id, external_key)
);

create index if not exists doctoralia_appointment_links_appointment_id_idx
  on doctoralia_appointment_links(appointment_id);

-- TABLA: settings
-- Configuración key-value del consultorio por usuario.
-- Se usa hoy para plantillas y link de agenda, y deja base para Ajustes.
create table if not exists settings (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  key          text not null,
  value        text not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (user_id, key)
);

-- TABLA: consultorios
-- Entidad editable por usuario para representar lugares o modalidades reales.
create table if not exists consultorios (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid references auth.users(id) on delete cascade not null,
  nombre             text not null,
  color              text not null default '#9488B0',
  icono              text not null default 'map-pin',
  dato_principal_tipo text
                     check (dato_principal_tipo in ('direccion', 'enlace', 'nota')),
  dato_principal     text,
  legacy_key         text
                     check (legacy_key in ('online', 'medellin', 'retiro')),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create unique index if not exists consultorios_user_legacy_key_idx
  on consultorios(user_id, legacy_key)
  where legacy_key is not null;

alter table appointments
  add column if not exists consultorio_id uuid references consultorios(id) on delete set null;

create index if not exists appointments_consultorio_id_idx
  on appointments(consultorio_id);

-- TABLA: clinical_notes
-- Una nota clínica por sesión. Tiene texto escrito con teclado Y/O imagen del canvas
create table if not exists clinical_notes (
  id             uuid default gen_random_uuid() primary key,
  patient_id     uuid references patients(id) on delete cascade not null,
  appointment_id uuid references appointments(id) on delete set null,
  user_id        uuid references auth.users(id) on delete cascade not null,
  texto          text,       -- notas escritas con teclado
  canvas_url     text,       -- path privado del canvas en Storage (o URL legacy hasta migrarlo)
  canvas_paths   jsonb,      -- trazos serializados para permitir edicion real del canvas
  template_kind  text check (template_kind in ('dap')),
  template_data  jsonb,      -- estructura clinica de progreso (DAP)
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- FUNCIÓN: actualizar updated_at automáticamente al modificar una nota
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_clinical_notes_updated_at
  before update on clinical_notes
  for each row execute function update_updated_at_column();

create trigger update_appointments_updated_at
  before update on appointments
  for each row execute function update_updated_at_column();

create trigger update_doctoralia_connections_updated_at
  before update on doctoralia_connections
  for each row execute function update_updated_at_column();

create trigger update_doctoralia_appointment_links_updated_at
  before update on doctoralia_appointment_links
  for each row execute function update_updated_at_column();

create trigger update_settings_updated_at
  before update on settings
  for each row execute function update_updated_at_column();

create trigger update_consultorios_updated_at
  before update on consultorios
  for each row execute function update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — MUY IMPORTANTE
-- Cada usuario solo puede ver y modificar SUS propios datos
-- Sin esto, cualquier usuario autenticado podría ver los pacientes de Lu
-- ============================================================

alter table patients        enable row level security;
alter table appointments    enable row level security;
alter table doctoralia_connections enable row level security;
alter table doctoralia_appointment_links enable row level security;
alter table clinical_notes  enable row level security;
alter table settings        enable row level security;
alter table consultorios    enable row level security;

-- Políticas para patients
create policy "patients: solo el dueño puede ver"   on patients for select using (auth.uid() = user_id);
create policy "patients: solo el dueño puede crear" on patients for insert with check (auth.uid() = user_id);
create policy "patients: solo el dueño puede editar" on patients for update using (auth.uid() = user_id);
create policy "patients: solo el dueño puede borrar" on patients for delete using (auth.uid() = user_id);

-- Políticas para appointments
create policy "appointments: solo el dueño puede ver"   on appointments for select using (auth.uid() = user_id);
create policy "appointments: solo el dueño puede crear" on appointments for insert with check (auth.uid() = user_id);
create policy "appointments: solo el dueño puede editar" on appointments for update using (auth.uid() = user_id);
create policy "appointments: solo el dueño puede borrar" on appointments for delete using (auth.uid() = user_id);

-- Políticas para doctoralia_connections
create policy "doctoralia_connections: solo el dueño puede ver" on doctoralia_connections for select using (auth.uid() = user_id);
create policy "doctoralia_connections: solo el dueño puede crear" on doctoralia_connections for insert with check (auth.uid() = user_id);
create policy "doctoralia_connections: solo el dueño puede editar" on doctoralia_connections for update using (auth.uid() = user_id);
create policy "doctoralia_connections: solo el dueño puede borrar" on doctoralia_connections for delete using (auth.uid() = user_id);

-- Políticas para doctoralia_appointment_links
create policy "doctoralia_appointment_links: solo el dueño puede ver" on doctoralia_appointment_links for select using (auth.uid() = user_id);
create policy "doctoralia_appointment_links: solo el dueño puede crear" on doctoralia_appointment_links for insert with check (auth.uid() = user_id);
create policy "doctoralia_appointment_links: solo el dueño puede editar" on doctoralia_appointment_links for update using (auth.uid() = user_id);
create policy "doctoralia_appointment_links: solo el dueño puede borrar" on doctoralia_appointment_links for delete using (auth.uid() = user_id);

-- Políticas para clinical_notes
create policy "notes: solo el dueño puede ver"   on clinical_notes for select using (auth.uid() = user_id);
create policy "notes: solo el dueño puede crear" on clinical_notes for insert with check (auth.uid() = user_id);
create policy "notes: solo el dueño puede editar" on clinical_notes for update using (auth.uid() = user_id);
create policy "notes: solo el dueño puede borrar" on clinical_notes for delete using (auth.uid() = user_id);

-- Políticas para settings
create policy "settings: solo el dueño puede ver"   on settings for select using (auth.uid() = user_id);
create policy "settings: solo el dueño puede crear" on settings for insert with check (auth.uid() = user_id);
create policy "settings: solo el dueño puede editar" on settings for update using (auth.uid() = user_id);
create policy "settings: solo el dueño puede borrar" on settings for delete using (auth.uid() = user_id);

-- Políticas para consultorios
create policy "consultorios: solo el dueño puede ver" on consultorios for select using (auth.uid() = user_id);
create policy "consultorios: solo el dueño puede crear" on consultorios for insert with check (auth.uid() = user_id);
create policy "consultorios: solo el dueño puede editar" on consultorios for update using (auth.uid() = user_id);
create policy "consultorios: solo el dueño puede borrar" on consultorios for delete using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET — para guardar las imágenes del canvas
-- Regla actual: bucket privado, sin lectura pública.
-- La app guarda solo el path y lee con signed URLs temporales.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('canvas-notes', 'canvas-notes', false)
on conflict do nothing;

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
