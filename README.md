# Lumi / lu-assistant

Suite clínica privada para gestionar agenda, pacientes, notas clínicas, pagos pendientes y seguimiento por WhatsApp.

Hoy el proyecto ya cubre estos flujos reales:
- agenda con calendario y modal de cita
- creación, edición, reagendado y eliminación de citas
- pantalla de pendientes con acciones operativas reales
- perfil de paciente con historial, notas y actualización rápida de estados
- configuración de plantillas de WhatsApp y link de agenda
- notas clínicas con texto y canvas

## Stack actual

- Next.js 16.2.1
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase SSR + Supabase JS
- react-big-calendar
- react-sketch-canvas
- ical.js

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
  (dashboard)/whatsapp
  (dashboard)/configuracion
  (dashboard)/historias
  login

src/components
  agenda
  appointments
  pacientes
  historias
  configuracion
  ui

src/lib
  appointments.ts
  appointment-status.ts
  appointment-ui.ts
  appointment-updates.ts
  pending-actions.ts
  settings.ts
  whatsapp.ts
  supabase/
```

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores reales:

```bash
cp .env.example .env.local
```

Variables usadas hoy por el código:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_DOCTORALIA_URL`

## Cómo corre la app

- `src/proxy.ts` protege todas las rutas privadas y redirige a `/login` si no hay sesión.
- Las páginas del dashboard usan Supabase server-side para leer datos.
- Las mutaciones rápidas viven en client components y persisten en Supabase.
- La navegación visible del producto hoy es:
  - `/agenda`
  - `/pacientes`
  - `/whatsapp` (UI: Pendientes)
  - `/configuracion`

## Base de datos y SQL

Los archivos relevantes están en [`src/lib/supabase`](/Users/gaiagomez/Documents/Claude/Projects/Dev/lu-assistant/src/lib/supabase):

- `schema.sql`
- `migration_add_modalidad.sql`
- `migration_add_confirmada.sql`
- `migration_consolidate_base.sql`
- `migration_fix_canvas_notes_privacy.sql`
- `seed_demo.sql`
- `cleanup_old_data.sql`

`schema.sql` representa la base esperada para una instalación nueva.  
Si tu proyecto Supabase ya existía antes de las últimas fases, revisa también las migraciones manuales para dejarlo alineado.

## Estado actual del producto

Lo que está operativo hoy:
- agenda con filtros, cards visuales y estados
- modal de cita con reagendado y validación de conflicto
- pendientes como lista de acciones reales
- perfil del paciente con quick actions sobre citas/pagos
- ajustes de mensajes de WhatsApp

Lo que todavía no está cerrado como integración completa:
- sincronización automática con Doctoralia / iCal
- automatización real de envíos desde cron

## Notas útiles

- `src/app/(dashboard)/historias/page.tsx` redirige a pacientes; no es una bandeja independiente.
- El cron actual en `src/app/api/cron/recordatorio/route.ts` lista citas para debug y verificación; no hace envíos automáticos.
- El proyecto usa `next/font` con Geist en `src/app/layout.tsx`. En entornos sin salida a internet, el build puede fallar al descargar la fuente.

## Siguiente paso recomendado

Si vas a levantar el proyecto desde cero, sigue [`SETUP.md`](/Users/gaiagomez/Documents/Claude/Projects/Dev/lu-assistant/SETUP.md).
