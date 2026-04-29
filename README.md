# Lumi
**A clinical operations dashboard for independent psychology practices.**
Lumi replaces the scattered workflow of calendars, spreadsheets, note apps, and WhatsApp drafts with a single authenticated dashboard designed for daily clinical and administrative use.
Built end to end as a solo project — from product scope and data modeling to frontend implementation, auth, RLS, timezone handling, and test coverage.
> **Demo access:** Lumi handles private clinical data, so real patient information is never public. Use the **View demo** button at [lumiassistant.vercel.app](https://lumiassistant.vercel.app/) to explore a fictional sample workspace with demo patients, appointments, session notes, consultorios, and settings. Screenshots and a walkthrough are available in the [case study](docs/case-study.md).
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
| Framework | Next.js App Router | Server-rendered dashboard pages with authenticated route protection through `proxy.ts`. Client components handle interaction-heavy flows. |
| Frontend | React, TypeScript, Tailwind CSS 4 | Type safety across the codebase. Tailwind for rapid, consistent styling. |
| Backend | Supabase: Postgres, Auth, Storage, SSR | Managed Postgres with Row Level Security, built-in auth, and file storage for canvas images. |
| Testing | Vitest | Unit tests covering the highest-risk business logic. |
| Key libraries | react-big-calendar, perfect-freehand, moment, lucide-react | Calendar views, pressure-sensitive canvas rendering, date handling, and icons. |
### Architecture
```txt
src/
├── app/
│   ├── login/
│   ├── api/
│   │   └── demo-login/      # Server-side demo login endpoint
│   └── (dashboard)/
│       ├── agenda/          # Calendar views and appointment management
│       ├── citas/           # Appointment detail pages
│       ├── pacientes/       # Patient list, profiles, and clinical history
│       ├── notas/           # Session notes and note creation
│       ├── whatsapp/        # Template configuration and message prep
│       ├── configuracion/   # Practice settings
│       └── profile/         # User profile
├── components/
│   ├── agenda/              # Calendar, day/week/month views
│   ├── appointments/        # Quick state editing and appointment helpers
│   ├── configuracion/       # Settings forms
│   ├── notes/               # Session notes and drawing canvas
│   ├── pacientes/           # Patient cards, profiles, quick actions
│   ├── profile/             # Profile management
│   └── ui/                  # Shared UI primitives
└── lib/
    ├── appointments/        # Appointment logic, recurrence, status, UI helpers
    ├── consultorios/        # Practice room configuration
    ├── dates/               # Bogotá timezone normalization and formatting
    ├── notes/               # Session note actions and storage
    ├── patients/            # Clinical profile client/server helpers
    ├── pending-actions/     # Follow-up priority calculation
    ├── profile/             # User profile helpers
    ├── settings/            # User settings and practice config
    ├── supabase/            # Supabase clients and data mappers
    └── whatsapp/            # Template rendering helpers

Pattern: Server-rendered pages load authenticated data from Supabase. Client components handle calendar interactions, appointment modals, drawing canvas, and quick state changes. Business logic lives in dedicated src/lib domain modules, separated from UI code and independently testable.

Key Technical Decisions

RLS as a product boundary. Every domain table has Row Level Security policies scoping reads and writes to the authenticated user through auth.uid(). Patient data, appointments, notes, clinical profiles, consultorios, and settings are protected at the database layer — not just in UI logic. Canvas files in Supabase Storage follow user-owned path policies.

Bogotá-first timezone model. Colombia does not observe daylight saving time, which simplifies the model but does not eliminate the risk. All appointment inputs are treated as local America/Bogota times, stored as UTC instants in Postgres, and formatted back to Bogotá time for display. Date utilities centralize these conversions to avoid scattered timezone bugs.

Canvas storage strategy. Session note drawings store vector paths as JSONB in the database for re-editing and rendered images in Supabase Storage for fast display. This avoids storing large base64 blobs in Postgres while keeping drawing data editable.

Dedicated domain modules. Recurrence rules, appointment status transitions, pending-action priority, datetime formatting, settings, notes, WhatsApp templates, and Supabase data mapping each live in their own module. This keeps UI components focused on rendering and makes business logic testable without mounting components.

Authenticated route protection. Dashboard routes go through a proxy.ts middleware layer that validates the Supabase session before rendering. Unauthenticated requests redirect to login.

Server-side demo login. The public demo button signs in through a minimal server route at /api/demo-login, using server-only environment variables. This keeps demo credentials out of the client bundle while making the portfolio demo accessible with one click.

Data Model

The schema covers patients, appointments with recurrence, session notes, clinical profiles, consultorios, settings with WhatsApp templates, and canvas storage paths.

Full schema: supabase/schema.sql￼

Tests

Unit tests cover:

* Date/time conversion and timezone edge cases
* Appointment recurrence generation
* Appointment and payment status transitions
* Pending-action priority logic

npm run test       # Run Vitest suite
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript validation

⸻

Local Setup

Requires a Supabase project with the schema applied.

npm install
cp .env.example .env.local
npm run dev

Environment variables:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BOOKING_URL=
# Server-only demo login
DEMO_EMAIL=
DEMO_PASSWORD=

For a fresh database, apply supabase/schema.sql￼. Existing projects may need manual migrations from the supabase/ directory.

Full setup notes: SETUP.md￼

Demo Data

Lumi includes a seed script that creates realistic fictional data for the public demo workspace and portfolio review.

The production demo uses a dedicated Supabase Auth user:

demo@lumiassistant.com

Prerequisites:

* The demo user must exist in Supabase Auth before running the seed.
* DEMO_EMAIL and DEMO_PASSWORD must be configured locally and in Vercel for the View demo button.
* The database schema and required migrations must already be applied.

Steps:

1. In Supabase, go to the SQL Editor.
2. Open supabase/seed_demo.sql￼ and copy its full contents.
3. Paste into the SQL Editor.
4. Run the script.
5. Log in through the View demo button.

What the seed creates:

* 10 patients with realistic fictional profiles.
* 25+ appointments spanning past, present, and future dates.
* 3 consultorios: Online, Medellín, and Retiro.
* 3 clinical profiles with background and therapeutic context.
* 4 session notes: a mix of signed notes and drafts.
* Settings for profile, working hours, booking link, and WhatsApp templates.

All dates are relative to CURRENT_DATE, so demo data stays fresh with recent appointments, upcoming sessions, and realistic follow-up timelines.

Verify the demo data loaded correctly:

-- Check patients
SELECT p.nombre, p.apellido, p.email
FROM patients p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'demo@lumiassistant.com';
-- Check appointments
SELECT COUNT(*) AS appointments_count
FROM appointments a
JOIN auth.users u ON u.id = a.user_id
WHERE u.email = 'demo@lumiassistant.com';
-- Check session notes
SELECT COUNT(*) AS session_notes_count
FROM session_notes sn
JOIN auth.users u ON u.id = sn.psychologist_id
WHERE u.email = 'demo@lumiassistant.com';
-- Check consultorios
SELECT c.nombre, c.legacy_key
FROM consultorios c
JOIN auth.users u ON u.id = c.user_id
WHERE u.email = 'demo@lumiassistant.com';

⸻

Commands

npm run dev       # Local development server
npm run build     # Production build
npm run start     # Run production build
npm run lint      # ESLint
npm run test      # Vitest unit tests
npx tsc --noEmit  # TypeScript type checking

⸻

Project Status

Core product flows are implemented and tested: agenda, patients, session notes, pending actions, WhatsApp templates, settings, and public demo access. The project is in portfolio packaging phase — final deployment polish, screenshots, and documentation.

⸻

Case Study

For a detailed walkthrough of the product decisions, technical challenges, and learnings: docs/case-study.md￼