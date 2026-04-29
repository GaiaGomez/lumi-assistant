-- ============================================================
-- LUMI — DATABASE SCHEMA
-- ============================================================
-- Modelo actual:
--   - patients
--   - patient_clinical_profiles
--   - appointments
--   - consultorios
--   - session_notes
--   - settings
--   - canvas-notes storage bucket
--
-- Notas:
--   - session_notes es la tabla activa para notas de sesión.
--   - El canvas se guarda en session_notes con canvas_paths/canvas_url.
--   - Cada usuario solo accede a sus propios datos mediante RLS.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- TABLE: patients
-- Información básica de cada paciente
-- ============================================================

create table if not exists patients (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  nombre          text not null,
  apellido        text not null,
  telefono        text,
  whatsapp        text, -- formato recomendado: 573001234567, sin + ni espacios
  email           text,
  fecha_inicio    date, -- fecha de la primera sesión
  notas_generales text,
  created_at      timestamptz default now()
);

-- ============================================================
-- TABLE: patient_clinical_profiles
-- Perfil clínico estable del paciente.
-- No reemplaza las notas por sesión.
-- ============================================================

create table if not exists patient_clinical_profiles (
  id                             uuid default gen_random_uuid() primary key,
  patient_id                     uuid references patients(id) on delete cascade not null,
  psychologist_id                uuid references auth.users(id) on delete cascade not null,

  documento                      text,
  birth_date                     date,
  genero                         text,
  ocupacion                      text,
  email                          text,
  direccion                      text,
  ciudad                         text,
  eps                            text,

  emergency_contact_name         text,
  emergency_contact_relationship text,
  emergency_contact_phone        text,
  emergency_contact_authorized   boolean,
  emergency_contact_notes        text,

  medication                     text,
  allergies                      text,
  medical_conditions             text,
  diagnoses                      text,
  previous_treatments            text,

  consultation_reason            text,
  therapeutic_objective          text,
  session_frequency              text,
  care_modality                  text,
  process_status                 text,
  support_network                text,
  clinical_alerts                text[] default '{}'::text[],

  informed_consent_status        text
                                 check (informed_consent_status in ('pending', 'signed', 'not_required')),

  administrative_notes           text,

  created_at                     timestamptz default now(),
  updated_at                     timestamptz default now(),

  unique (patient_id)
);

create index if not exists patient_clinical_profiles_psychologist_idx
  on patient_clinical_profiles(psychologist_id);

create index if not exists patient_clinical_profiles_patient_psychologist_idx
  on patient_clinical_profiles(patient_id, psychologist_id);

-- ============================================================
-- TABLE: consultorios
-- Entidad editable por usuario para representar lugares,
-- modalidades o sedes reales.
-- ============================================================

create table if not exists consultorios (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users(id) on delete cascade not null,
  nombre              text not null,
  color               text not null default '#9488B0',
  icono               text not null default 'map-pin',
  dato_principal_tipo text
                      check (dato_principal_tipo in ('direccion', 'enlace', 'nota')),
  dato_principal      text,
  legacy_key          text
                      check (legacy_key in ('online', 'medellin', 'retiro')),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create unique index if not exists consultorios_user_legacy_key_idx
  on consultorios(user_id, legacy_key)
  where legacy_key is not null;

-- ============================================================
-- TABLE: appointments
-- Citas del consultorio y eventos generales del calendario
-- ============================================================

create table if not exists appointments (
  id                  uuid default gen_random_uuid() primary key,
  patient_id          uuid references patients(id) on delete cascade,
  user_id             uuid references auth.users(id) on delete cascade not null,

  event_type          text default 'patient'
                      check (event_type in ('patient', 'general')),

  title               text,
  category            text,
  color               text,

  recurrence_group_id uuid,
  recurrence_rule     jsonb,

  fecha_inicio        timestamptz not null,
  fecha_fin           timestamptz,

  estado_sesion       text default 'pendiente'
                      check (estado_sesion in ('pendiente', 'confirmada', 'realizada', 'cancelo')),

  estado_pago         text default 'pendiente'
                      check (estado_pago in ('pendiente', 'pagado')),

  notas               text,

  modalidad           text check (modalidad in ('online', 'medellin', 'retiro')),
  consultorio_id      uuid references consultorios(id) on delete set null,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists appointments_consultorio_id_idx
  on appointments(consultorio_id);

create index if not exists appointments_user_fecha_inicio_idx
  on appointments(user_id, fecha_inicio);

create index if not exists appointments_patient_id_idx
  on appointments(patient_id);

-- ============================================================
-- TABLE: session_notes
-- Tabla activa para notas de sesión.
--
-- Soporta:
--   - Texto libre durante la sesión
--   - Nota formal con 4 campos
--   - Canvas privado del terapeuta
--
-- appointment_id es opcional y no único:
-- permite notas sin cita y múltiples notas por cita.
-- ============================================================

create table if not exists session_notes (
  id               uuid primary key default gen_random_uuid(),

  appointment_id   uuid references appointments(id) on delete cascade,
  patient_id       uuid references patients(id) on delete cascade,
  psychologist_id  uuid references auth.users(id) on delete cascade not null,

  -- Modo sesión: texto libre durante la consulta
  quick_note       text,

  -- Modo nota formal: 4 preguntas que mapean internamente a DAP
  como_llego       text,
  que_trabajaron   text,
  como_va_proceso  text,
  que_sigue        text,

  -- Canvas privado del terapeuta
  canvas_paths     jsonb,
  canvas_url       text,

  -- Control
  session_number   int,
  is_draft         boolean default true,
  signed_at        timestamptz,

  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists session_notes_psychologist_idx
  on session_notes(psychologist_id);

create index if not exists session_notes_patient_idx
  on session_notes(patient_id);

create index if not exists session_notes_appointment_idx
  on session_notes(appointment_id);

-- ============================================================
-- TABLE: settings
-- Configuración key-value del consultorio por usuario.
-- ============================================================

create table if not exists settings (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  key         text not null,
  value       text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  unique (user_id, key)
);

create index if not exists settings_user_id_idx
  on settings(user_id);

-- ============================================================
-- FUNCTION: update_updated_at_column
-- Actualiza updated_at automáticamente al modificar filas.
-- ============================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- TRIGGERS
-- Idempotentes: se eliminan antes de volver a crearse.
-- ============================================================

drop trigger if exists update_patient_clinical_profiles_updated_at on patient_clinical_profiles;
create trigger update_patient_clinical_profiles_updated_at
  before update on patient_clinical_profiles
  for each row execute function update_updated_at_column();

drop trigger if exists update_consultorios_updated_at on consultorios;
create trigger update_consultorios_updated_at
  before update on consultorios
  for each row execute function update_updated_at_column();

drop trigger if exists update_appointments_updated_at on appointments;
create trigger update_appointments_updated_at
  before update on appointments
  for each row execute function update_updated_at_column();

drop trigger if exists update_session_notes_updated_at on session_notes;
create trigger update_session_notes_updated_at
  before update on session_notes
  for each row execute function update_updated_at_column();

drop trigger if exists update_settings_updated_at on settings;
create trigger update_settings_updated_at
  before update on settings
  for each row execute function update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- Cada usuario solo puede ver y modificar sus propios datos.
-- ============================================================

alter table patients enable row level security;
alter table patient_clinical_profiles enable row level security;
alter table appointments enable row level security;
alter table consultorios enable row level security;
alter table session_notes enable row level security;
alter table settings enable row level security;

-- ============================================================
-- RLS POLICIES: patients
-- ============================================================

drop policy if exists "patients: solo el dueño puede ver" on patients;
create policy "patients: solo el dueño puede ver"
  on patients for select
  using (auth.uid() = user_id);

drop policy if exists "patients: solo el dueño puede crear" on patients;
create policy "patients: solo el dueño puede crear"
  on patients for insert
  with check (auth.uid() = user_id);

drop policy if exists "patients: solo el dueño puede editar" on patients;
create policy "patients: solo el dueño puede editar"
  on patients for update
  using (auth.uid() = user_id);

drop policy if exists "patients: solo el dueño puede borrar" on patients;
create policy "patients: solo el dueño puede borrar"
  on patients for delete
  using (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: patient_clinical_profiles
-- ============================================================

drop policy if exists "patient_clinical_profiles: solo el dueño puede ver" on patient_clinical_profiles;
create policy "patient_clinical_profiles: solo el dueño puede ver"
  on patient_clinical_profiles for select
  using (auth.uid() = psychologist_id);

drop policy if exists "patient_clinical_profiles: solo el dueño puede crear" on patient_clinical_profiles;
create policy "patient_clinical_profiles: solo el dueño puede crear"
  on patient_clinical_profiles for insert
  with check (auth.uid() = psychologist_id);

drop policy if exists "patient_clinical_profiles: solo el dueño puede editar" on patient_clinical_profiles;
create policy "patient_clinical_profiles: solo el dueño puede editar"
  on patient_clinical_profiles for update
  using (auth.uid() = psychologist_id);

drop policy if exists "patient_clinical_profiles: solo el dueño puede borrar" on patient_clinical_profiles;
create policy "patient_clinical_profiles: solo el dueño puede borrar"
  on patient_clinical_profiles for delete
  using (auth.uid() = psychologist_id);

-- ============================================================
-- RLS POLICIES: appointments
-- ============================================================

drop policy if exists "appointments: solo el dueño puede ver" on appointments;
create policy "appointments: solo el dueño puede ver"
  on appointments for select
  using (auth.uid() = user_id);

drop policy if exists "appointments: solo el dueño puede crear" on appointments;
create policy "appointments: solo el dueño puede crear"
  on appointments for insert
  with check (auth.uid() = user_id);

drop policy if exists "appointments: solo el dueño puede editar" on appointments;
create policy "appointments: solo el dueño puede editar"
  on appointments for update
  using (auth.uid() = user_id);

drop policy if exists "appointments: solo el dueño puede borrar" on appointments;
create policy "appointments: solo el dueño puede borrar"
  on appointments for delete
  using (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: consultorios
-- ============================================================

drop policy if exists "consultorios: solo el dueño puede ver" on consultorios;
create policy "consultorios: solo el dueño puede ver"
  on consultorios for select
  using (auth.uid() = user_id);

drop policy if exists "consultorios: solo el dueño puede crear" on consultorios;
create policy "consultorios: solo el dueño puede crear"
  on consultorios for insert
  with check (auth.uid() = user_id);

drop policy if exists "consultorios: solo el dueño puede editar" on consultorios;
create policy "consultorios: solo el dueño puede editar"
  on consultorios for update
  using (auth.uid() = user_id);

drop policy if exists "consultorios: solo el dueño puede borrar" on consultorios;
create policy "consultorios: solo el dueño puede borrar"
  on consultorios for delete
  using (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: session_notes
-- ============================================================

drop policy if exists "session_notes: solo el psicólogo puede ver" on session_notes;
create policy "session_notes: solo el psicólogo puede ver"
  on session_notes for select
  using (auth.uid() = psychologist_id);

drop policy if exists "session_notes: solo el psicólogo puede crear" on session_notes;
create policy "session_notes: solo el psicólogo puede crear"
  on session_notes for insert
  with check (auth.uid() = psychologist_id);

drop policy if exists "session_notes: solo el psicólogo puede editar" on session_notes;
create policy "session_notes: solo el psicólogo puede editar"
  on session_notes for update
  using (auth.uid() = psychologist_id);

drop policy if exists "session_notes: solo el psicólogo puede borrar" on session_notes;
create policy "session_notes: solo el psicólogo puede borrar"
  on session_notes for delete
  using (auth.uid() = psychologist_id);

-- ============================================================
-- RLS POLICIES: settings
-- ============================================================

drop policy if exists "settings: solo el dueño puede ver" on settings;
create policy "settings: solo el dueño puede ver"
  on settings for select
  using (auth.uid() = user_id);

drop policy if exists "settings: solo el dueño puede crear" on settings;
create policy "settings: solo el dueño puede crear"
  on settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "settings: solo el dueño puede editar" on settings;
create policy "settings: solo el dueño puede editar"
  on settings for update
  using (auth.uid() = user_id);

drop policy if exists "settings: solo el dueño puede borrar" on settings;
create policy "settings: solo el dueño puede borrar"
  on settings for delete
  using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET: canvas-notes
-- Bucket privado para imágenes del canvas.
-- La app guarda el path y lee con signed URLs temporales.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('canvas-notes', 'canvas-notes', false)
on conflict (id) do nothing;

-- ============================================================
-- STORAGE POLICIES: canvas-notes
-- El primer folder del path debe ser el auth.uid().
-- Ejemplo:
--   {user_id}/{note_id}/canvas.png
-- ============================================================

drop policy if exists "canvas: solo el dueño puede subir" on storage.objects;
create policy "canvas: solo el dueño puede subir"
  on storage.objects for insert
  with check (
    bucket_id = 'canvas-notes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "canvas: solo el dueño puede ver" on storage.objects;
create policy "canvas: solo el dueño puede ver"
  on storage.objects for select
  using (
    bucket_id = 'canvas-notes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "canvas: solo el dueño puede borrar" on storage.objects;
create policy "canvas: solo el dueño puede borrar"
  on storage.objects for delete
  using (
    bucket_id = 'canvas-notes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

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