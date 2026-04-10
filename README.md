# Lumi / lu-assistant

Suite clínica privada para gestionar agenda, pacientes, notas clínicas, pagos pendientes y seguimiento por WhatsApp.

Flujos operativos actuales:
- Agenda con calendario (día/semana/mes), colores por modalidad y festivos colombianos
- Creación, edición, reagendado y eliminación de citas con validación de conflictos
- Pantalla de pendientes con acciones operativas reales
- Perfil de paciente con historial, notas y actualización rápida de estados
- Historias clínicas con texto y canvas (Apple Pencil)
- Configuración de plantillas de WhatsApp y link de agenda
- Perfil de usuaria (ajustes personales)

## Stack

- Next.js 16.2.1 (App Router)
- React 19.2.4
- TypeScript
- Tailwind CSS 4
- Supabase SSR + Supabase JS
- react-big-calendar
- react-sketch-canvas
- moment

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Estructura principal

```text
src/app
  (dashboard)/agenda
  (dashboard)/pacientes
  (dashboard)/historias
  (dashboard)/whatsapp
  (dashboard)/configuracion
  (dashboard)/profile
  login

src/components
  agenda
  appointments
  pacientes
  historias
  configuracion
  profile
  ui

src/lib
  appointments.ts
  appointment-recurrence.ts
  appointment-status.ts
  appointment-ui.ts
  appointment-updates.ts
  clinical-notes.ts
  clinical-note-template.ts
  consultorios.ts
  datetime.ts
  doctoralia/
  format.ts
  pending-actions.ts
  profile.ts
  settings.ts
  whatsapp.ts
  supabase/
```

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores reales:

```bash
cp .env.example .env.local
```

Variables requeridas:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_BOOKING_URL`

## Cómo corre la app

- `src/proxy.ts` protege todas las rutas privadas y redirige a `/login` si no hay sesión.
- Las páginas del dashboard usan Supabase server-side para leer datos.
- Las mutaciones rápidas viven en client components y persisten en Supabase.
- Navegación del producto:
  - `/agenda`
  - `/pacientes`
  - `/historias` (redirige a `/pacientes`; no es bandeja independiente)
  - `/whatsapp` (UI: Pendientes)
  - `/configuracion`
  - `/profile`

## Base de datos y SQL

Los archivos están en [`src/lib/supabase/`](src/lib/supabase/):

- `schema.sql` — base esperada para instalación nueva
- `seed_demo.sql` — datos de ejemplo
- `cleanup_old_data.sql` — limpieza de datos viejos

Migraciones manuales (aplicar en orden si el proyecto ya existía):

```
migration_add_modalidad.sql
migration_add_confirmada.sql
migration_add_consultorios.sql
migration_add_reminder_dispatches.sql
migration_remove_reminder_dispatches.sql
migration_consolidate_base.sql
migration_add_doctoralia_connection_foundation.sql
migration_enhance_clinical_notes.sql
migration_expand_appointments_to_events.sql
migration_fix_canvas_notes_privacy.sql
migration_fix_canvas_notes_update_policy.sql
migration_cleanup_legacy_sync.sql
```

## Estado actual del producto

Operativo:
- Agenda completa con filtros, cards visuales y estados
- Modal de cita con reagendado y validación de conflicto
- Recurrencia de citas
- Pendientes como lista de acciones reales
- Perfil del paciente con quick actions sobre citas/pagos
- Historias clínicas con canvas y texto enriquecido
- Ajustes de mensajes de WhatsApp
- Base de conexión y sincronización manual de Doctoralia desde Agenda

Pendiente por cerrar:
- El cron en `src/app/api/cron/recordatorio/route.ts` lista citas para debug; no hace envíos automáticos

## Notas útiles

- El middleware se llama `proxy.ts`, no `middleware.ts` — esto es un breaking change de Next.js 16.
- `src/app/(dashboard)/historias/page.tsx` redirige a pacientes; no es una bandeja independiente.
- El proyecto usa `next/font` con Geist en `src/app/layout.tsx`. En entornos sin salida a internet el build puede fallar al descargar la fuente.

## Levantar desde cero

Sigue [`SETUP.md`](SETUP.md).
