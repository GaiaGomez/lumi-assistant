# Lu Assistant — Guía de Setup

## Paso 1: Crear el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo
2. Nombre: `lu-assistant` | Región: `South America (São Paulo)` — la más cercana a Colombia
3. Espera que termine de inicializar (~2 minutos)
4. Ve a **SQL Editor** y pega el contenido de `src/lib/supabase/schema.sql`
5. Ejecuta el script (botón Run)

## Paso 2: Conseguir las credenciales de Supabase

Ve a tu proyecto → **Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL` → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Project API keys → anon / public
- `SUPABASE_SERVICE_ROLE_KEY` → Project API keys → service_role (para los cron jobs)

## Paso 3: Configurar .env.local

Abre el archivo `.env.local` en la raíz del proyecto y rellena:
```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
CRON_SECRET=una-clave-larga-que-inventes
```

## Paso 4: Crear el usuario de Lu en Supabase Auth

1. Supabase → **Authentication → Users → Add user**
2. Email: el email de Lu
3. Password: una contraseña segura
4. ¡Guárdalos en un lugar seguro para dárselos a Lu!

## Paso 5: Agregar los íconos PWA

Crea dos imágenes en `public/icons/`:
- `icon-192.png` (192×192px) — puede ser el logo de Lu Assistant
- `icon-512.png` (512×512px) — mismo logo más grande

## Paso 6: Correr en local para probar

```bash
cd lu-assistant
npm run dev
```

Abre `http://localhost:3000` y prueba con las credenciales de Lu.

## Paso 7: Deploy en Vercel

```bash
npx vercel
```

Cuando te pida las variables de entorno, las agregas también en:
Vercel Dashboard → tu proyecto → **Settings → Environment Variables**

Agrega las mismas 4 variables del `.env.local`.

## Paso 8: Configurar URL del iCal de Doctoralia

En Doctoralia:
1. Inicia sesión como Lu
2. Ve a **Calendario → Sincronizar → Exportar iCal**
3. Copia la URL del feed
4. Agrégala como variable de entorno: `DOCTORALIA_ICAL_URL=https://...`

## Paso 9: Instalar en el iPad de Lu

1. Abre Safari en el iPad
2. Ve a la URL de Vercel (ej: `lu-assistant.vercel.app`)
3. Toca el botón de compartir (cuadrado con flecha)
4. Selecciona **"Agregar a pantalla de inicio"**
5. ¡Lu ya tiene la app instalada como una app nativa!

---

## Stack técnico

- **Next.js 14** (App Router) — framework full stack
- **TypeScript** — tipado estático
- **Tailwind CSS** — estilos
- **Supabase** — base de datos PostgreSQL + autenticación + storage
- **react-big-calendar** — calendario interactivo
- **react-sketch-canvas** — canvas con Apple Pencil
- **ical.js** — parser del feed iCal de Doctoralia
- **Vercel** — deploy + cron jobs
