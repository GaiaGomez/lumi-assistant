# Lumi

**A clinical operations dashboard for independent psychology practices.**

Lumi replaces the scattered workflow of calendars, spreadsheets, note apps, and WhatsApp drafts with a single authenticated dashboard designed for daily clinical and administrative use.

Built end to end as a solo project — from product scope and data modeling to frontend implementation, auth, RLS, timezone handling, and test coverage.

> **Demo access:** Lumi handles private clinical data, so the dashboard is behind authentication. Screenshots and a walkthrough are available in the [case study](docs/case-study.md). Demo login can be provided on request at [lumiassistant.vercel.app](https://lumiassistant.vercel.app/).

---

## The Problem

Solo clinical practices run across disconnected tools every day. A psychologist checking their schedule in Google Calendar, writing session notes in a separate app, tracking payments in a spreadsheet, and drafting WhatsApp messages manually is doing the same context-switching loop dozens of times per week.

The real risks are quiet: a missed follow-up, a payment marked wrong, a session note that never got written, an appointment displayed at the wrong time because the system forgot about timezones.

Lumi makes those workflows visible in one place — designed around sessions, patients, and follow-up rather than generic productivity.

## What It Does

**Scheduling and agenda management**
Day, week, and month views with appointment creation, editing, rescheduling, recurrence rules, and conflict validation. Appointment states track both session status and payment status independently.

**Patient records and clinical context**
Patient profiles with visit history, clinical profile data, and session notes accessible from one view. Quick-action buttons reduce the number of clicks for common tasks.

**Session notes with canvas support**
Text-based notes alongside a drawing canvas for stylus workflows — designed for practitioners who sketch diagrams, annotate, or handwrite during sessions.

**Operational follow-up**
A pending-actions view surfaces what needs attention: unpaid sessions, missing notes, patients due for follow-up. This replaces the mental tracking that otherwise falls through the cracks.

**WhatsApp templates**
Configurable message templates for appointment reminders, confirmations, and follow-ups. Messages are prepared for manual sending, not automated — respecting the practitioner's preference for personal communication.

**Practice settings and user profile**
Consultorio configuration, working hours, and profile management.

---

## Technical Highlights

### Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js (App Router) | Server-rendered dashboard pages with authenticated route protection through `proxy.ts`. Client components handle interaction-heavy flows. |
| Frontend | React, TypeScript, Tailwind CSS 4 | Type safety across the codebase. Tailwind for rapid, consistent styling. |
| Backend | Supabase (Postgres, Auth, Storage, SSR) | Managed Postgres with Row Level Security, built-in auth, and file storage for canvas images. |
| Testing | Vitest | 68 unit tests covering the highest-risk business logic. |
| Key libraries | react-big-calendar, perfect-freehand, moment, lucide-react | Calendar views, pressure-sensitive canvas rendering, date handling, and icons. |

### Architecture

```
src/
├── app/
│   ├── login/
│   └── (dashboard)/
│       ├── agenda/          # Calendar views and appointment management
│       ├── pacientes/       # Patient list, profiles, and clinical history
│       ├── whatsapp/        # Template configuration and message prep
│       ├── configuracion/   # Practice settings
│       └── profile/         # User profile
├── components/
│   ├── agenda/              # Calendar, day/week/month views
│   ├── appointments/        # Modals, forms, conflict validation
│   ├── pacientes/           # Patient cards, profiles, quick actions
│   ├── historias/           # Clinical history views
│   ├── notes/               # Session notes and canvas
│   ├── configuracion/       # Settings forms
│   ├── profile/             # Profile management
│   └── ui/                  # Shared UI primitives
└── lib/
    ├── appointments.ts      # Recurrence, status transitions, conflict logic
    ├── clinical-notes.ts    # Note creation and retrieval
    ├── datetime.ts          # Bogotá timezone normalization (UTC ↔ local)
    ├── pending-actions.ts   # Follow-up priority calculation
    ├── whatsapp.ts          # Template rendering helpers
    └── supabase/            # Clients, schema, migrations, seed data
```

**Pattern:** Server-rendered pages load authenticated data from Supabase. Client components handle calendar interactions, appointment modals, drawing canvas, and quick state changes. Business logic lives in dedicated `src/lib` modules, separated from UI code and independently testable.

### Key Technical Decisions

**RLS as a product boundary.** Every domain table has Row Level Security policies scoping reads and writes to the authenticated user through `auth.uid()`. Patient data, appointments, notes, and settings are protected at the database layer — not just in UI logic. Canvas files in Supabase Storage follow user-owned path policies.

**Bogotá-first timezone model.** Colombia does not observe daylight saving time, which simplifies the model but doesn't eliminate the risk. All appointment inputs are treated as local `America/Bogota` times, stored as UTC instants in Postgres, and formatted back to Bogotá time for display. The `datetime.ts` module centralizes this conversion to avoid scattered timezone bugs.

**Canvas storage strategy.** Session note drawings store vector paths as JSONB in the database (for re-editing) and rendered images in Supabase Storage (for fast display). This avoids storing large base64 blobs in Postgres while keeping the drawing data editable.

**Dedicated domain modules.** Recurrence rules, appointment status transitions, pending-action priority, datetime formatting, and Supabase data mapping each live in their own module. This keeps UI components focused on rendering and makes business logic testable without mounting components.

**Authenticated route protection.** Dashboard routes go through a `proxy.ts` middleware layer that validates the Supabase session before rendering. Unauthenticated requests redirect to login.

### Data Model

The schema covers: patients, appointments (with recurrence), session notes (text + canvas), clinical profiles, consultorios (practice rooms), settings with WhatsApp templates, and canvas storage paths.

Full schema: [`supabase/schema.sql`](supabase/schema.sql)

### Tests

68 unit tests covering:

- Date/time conversion and timezone edge cases
- Appointment recurrence generation
- Appointment and payment status transitions
- Pending-action priority logic

```bash
npm run test       # Run Vitest suite
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript validation
```

---

## Local Setup

Requires a Supabase project with the schema applied.

```bash
npm install
cp .env.example .env.local
npm run dev
```

**Environment variables:**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BOOKING_URL=
```

For a fresh database, apply [`supabase/schema.sql`](supabase/schema.sql). Existing projects may need manual migrations from the `supabase/` directory.

Full setup notes: [`SETUP.md`](SETUP.md)

### Demo Data

A seed script creates realistic sample data for testing and portfolio review.

**Prerequisites:**
- A demo user account must exist in Supabase Auth first. Create one in the Supabase dashboard before proceeding.

**Steps:**

1. In Supabase, go to the **SQL Editor**.
2. Open [`supabase/seed_demo.sql`](supabase/seed_demo.sql) and copy its full contents.
3. Paste into the SQL Editor.
4. Replace the email placeholder `lu@tudominio.com` (line 67) with your actual demo user email (e.g., `demo@example.com`).
5. Run the script.
6. Log in to Lumi with the demo account credentials.

**What the seed creates:**

- **10 patients** with realistic profiles (names, contact info, clinical notes)
- **25+ appointments** spanning past, present, and future dates—designed to populate the dashboard with actionable pending items (unpaid sessions, missing notes, patients due for follow-up)
- **3 consultorios** (online, in-person locations, retreat sessions)
- **3 clinical profiles** with detailed backgrounds and therapeutic objectives
- **4 session notes** (mix of published and draft notes, with canvas drawings)
- **Settings** (profile, working hours, WhatsApp templates)

All dates are relative to `CURRENT_DATE`, so demo data is always fresh—recent appointments, upcoming sessions, and realistic follow-up timelines generate automatically.

**Verify the demo data loaded correctly:**

After running the seed, paste these queries into the SQL Editor to confirm:

```sql
-- Check patients
SELECT p.nombre, p.apellido, p.email
FROM patients p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'demo@example.com';

-- Check appointments
SELECT COUNT(*) AS appointments_count
FROM appointments a
JOIN auth.users u ON u.id = a.user_id
WHERE u.email = 'demo@example.com';

-- Check session notes
SELECT COUNT(*) AS session_notes_count
FROM session_notes sn
JOIN auth.users u ON u.id = sn.psychologist_id
WHERE u.email = 'demo@example.com';

-- Check consultorios
SELECT c.nombre, c.legacy_key
FROM consultorios c
JOIN auth.users u ON u.id = c.user_id
WHERE u.email = 'demo@example.com';
```

---

## Commands

```bash
npm run dev       # Local development server
npm run build     # Production build
npm run start     # Run production build
npm run lint      # ESLint
npm run test      # Vitest unit tests
npx tsc --noEmit  # TypeScript type checking
```

---

## Project Status

Core product flows are implemented and tested: agenda, patients, session notes, pending actions, WhatsApp templates, and settings. The project is in portfolio packaging phase — final deployment polish, screenshots, and documentation.

---

## Case Study

For a detailed walkthrough of the product decisions, technical challenges, and learnings: [**docs/case-study.md**](docs/case-study.md)