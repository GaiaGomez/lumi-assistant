# Lumi / lu-assistant — Setup real

Guía corta para levantar el proyecto con el estado actual del repo.

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar variables de entorno

Copia el archivo de ejemplo:

```bash
cp .env.example .env.local
```

Completa estas variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BOOKING_URL=
```

Qué hace cada una:
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave pública usada por SSR y client components
- `NEXT_PUBLIC_BOOKING_URL`: valor por defecto para `booking_url` en settings

## 3. Crear el proyecto en Supabase

1. Crea un proyecto nuevo en Supabase.
2. Ve a **SQL Editor**.
3. Ejecuta primero:

```sql
-- src/lib/supabase/schema.sql
```

Esto crea:
- `patients`
- `appointments`
- `clinical_notes`
- `settings`
- políticas RLS
- bucket de storage para canvas

## 4. Revisar migraciones manuales relevantes

Si tu base ya existía de antes, revisa estas migraciones del repo:

- `src/lib/supabase/migration_add_modalidad.sql`
- `src/lib/supabase/migration_add_confirmada.sql`
- `src/lib/supabase/migration_consolidate_base.sql`
- `src/lib/supabase/migration_fix_canvas_notes_privacy.sql`
- `src/lib/supabase/migration_cleanup_legacy_sync.sql`

Cuándo aplicarlas:
- `migration_add_modalidad.sql`: si tu tabla `appointments` todavía no tiene `modalidad`
- `migration_add_confirmada.sql`: si tu entorno todavía no quedó alineado con el modelo nuevo de estados
- `migration_consolidate_base.sql`: si el entorno no tiene la tabla `settings` o `updated_at`
- `migration_fix_canvas_notes_privacy.sql`: si necesitas alinear storage de notas clínicas con el modelo actual de privacidad
- `migration_cleanup_legacy_sync.sql`: si tu base todavía conserva columnas, settings o tablas del sync viejo

Si estás levantando un proyecto completamente nuevo y `schema.sql` ya refleja el estado actual, las migraciones sirven sobre todo como referencia histórica o para entornos viejos.

## 5. Crear usuario de acceso

En Supabase:

1. Ve a **Authentication → Users**
2. Crea el usuario que va a entrar a Lumi
3. Usa ese email/contraseña en `/login`

## 6. Ejecutar en local

```bash
npm run dev
```

Luego abre:

```text
http://localhost:3000
```

## 7. Validaciones útiles

Antes de desplegar:

```bash
./node_modules/.bin/tsc --noEmit
npm run lint
npm run build
```

Nota:
- el build puede depender de acceso a internet por `next/font` y la fuente Geist

## 8. Seed de demo

Si necesitas datos demo para probar agenda y paciente:

- revisa `src/lib/supabase/seed_demo.sql`
- usa `src/lib/supabase/cleanup_old_data.sql` para limpiar datos viejos del demo antes de volver a sembrar

## 9. Qué hace hoy cada área principal

- `/agenda`: calendario, creación y edición de citas
- `/whatsapp`: bandeja de pendientes reales del sistema
- `/pacientes`: listado y perfil de pacientes
- `/configuracion`: plantillas de WhatsApp, agenda y consultorios
- `/historias`: hoy redirige a pacientes; las notas se crean desde el perfil del paciente

## 10. Notas de despliegue

- El build puede depender de acceso a internet por `next/font` y la fuente Geist
- No hay cron jobs activos en este proyecto
