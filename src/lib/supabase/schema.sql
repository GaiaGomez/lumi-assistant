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
-- Guarda cada cita. Puede venir de Doctoralia (tiene doctoralia_uid) o ser manual
create table if not exists appointments (
  id               uuid default gen_random_uuid() primary key,
  patient_id       uuid references patients(id) on delete cascade,
  user_id          uuid references auth.users(id) on delete cascade not null,
  doctoralia_uid   text unique,  -- UID del evento iCal, evita duplicar citas importadas
  fecha_inicio     timestamptz not null,
  fecha_fin        timestamptz,
  estado_sesion    text default 'pendiente'
                   check (estado_sesion in ('pendiente', 'asistio', 'cancelo', 'no_asistio')),
  estado_pago      text default 'pendiente'
                   check (estado_pago in ('pendiente', 'pagado')),
  notas            text,
  created_at       timestamptz default now()
);

-- TABLA: clinical_notes
-- Una nota clínica por sesión. Tiene texto escrito con teclado Y/O imagen del canvas
create table if not exists clinical_notes (
  id             uuid default gen_random_uuid() primary key,
  patient_id     uuid references patients(id) on delete cascade not null,
  appointment_id uuid references appointments(id) on delete set null,
  user_id        uuid references auth.users(id) on delete cascade not null,
  texto          text,       -- notas escritas con teclado
  canvas_url     text,       -- URL pública de la imagen guardada en Supabase Storage
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

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — MUY IMPORTANTE
-- Cada usuario solo puede ver y modificar SUS propios datos
-- Sin esto, cualquier usuario autenticado podría ver los pacientes de Lu
-- ============================================================

alter table patients        enable row level security;
alter table appointments    enable row level security;
alter table clinical_notes  enable row level security;

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

-- Políticas para clinical_notes
create policy "notes: solo el dueño puede ver"   on clinical_notes for select using (auth.uid() = user_id);
create policy "notes: solo el dueño puede crear" on clinical_notes for insert with check (auth.uid() = user_id);
create policy "notes: solo el dueño puede editar" on clinical_notes for update using (auth.uid() = user_id);
create policy "notes: solo el dueño puede borrar" on clinical_notes for delete using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET — para guardar las imágenes del canvas
-- ============================================================

insert into storage.buckets (id, name, public)
values ('canvas-notes', 'canvas-notes', true)
on conflict do nothing;

-- Solo el dueño puede subir/ver/borrar sus imágenes
create policy "canvas: solo el dueño puede subir"
  on storage.objects for insert
  with check (bucket_id = 'canvas-notes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "canvas: lectura pública"
  on storage.objects for select
  using (bucket_id = 'canvas-notes');

create policy "canvas: solo el dueño puede borrar"
  on storage.objects for delete
  using (bucket_id = 'canvas-notes' and auth.uid()::text = (storage.foldername(name))[1]);
