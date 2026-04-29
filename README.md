# Lumi — Clinical Operations App

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Tests](https://img.shields.io/badge/tests-68%20passing-brightgreen)
![Supabase](https://img.shields.io/badge/Supabase-RLS-green)

Lumi is a private clinical operations app for an independent psychology practice. It brings together scheduling, patient records, session notes, pending actions, payment status, and WhatsApp message templates in one focused dashboard.

The product is built as a portfolio-ready case study of a real operational problem: a solo practitioner needs less context switching, fewer calendar mistakes, and a reliable way to keep clinical and administrative work in sync.

## Why This Project Matters

Lumi is not a tutorial app. It was built around a real workflow: managing appointments, clinical context, follow-ups, and private patient data in a small psychology practice. The project demonstrates product thinking, frontend implementation, database modeling, auth, RLS, testing, and technical tradeoff decisions.

## Live Demo

- Public demo: [lumiassistant.vercel.app](https://lumiassistant.vercel.app/)
- Access: private demo login required
- Case study: [`docs/case-study.md`](docs/case-study.md)

> Lumi protects dashboard routes behind authentication because it handles private clinical workflows. Demo access can be provided on request.


## What Lumi Solves

Small clinical practices often run across disconnected tools: calendar events, patient notes, payment follow-up, WhatsApp messages, and personal spreadsheets. Lumi turns those repeated admin loops into one workflow designed around sessions, patients, and follow-up.

The app focuses on:

- Planning and editing appointments without losing clinical context.
- Keeping patient history, session notes, and payment state visible together.
- Reducing manual follow-up work through pending-action views and message templates.
- Handling local appointment times consistently for Bogotá.
- Keeping private data scoped per authenticated user through Supabase RLS.

## Main Features

- Agenda with day, week, and month views.
- Appointment creation, editing, rescheduling, recurrence, deletion, and conflict validation.
- Appointment states for session status and payment status.
- Patient list with patient profiles, history, quick actions, and clinical profile data.
- Session notes with text and drawing canvas support for stylus workflows.
- Pending actions view for operational follow-up.
- WhatsApp template configuration and manual message preparation.
- User profile and practice settings.
- Demo seed data for portfolio and QA flows.

## Stack

- Next.js 16.2.1 with App Router and `proxy.ts` route protection.
- React 19.2.4.
- TypeScript.
- Tailwind CSS 4.
- Supabase SSR and Supabase JS.
- Supabase Auth, Postgres, Storage, and Row Level Security.
- Vitest for unit tests.
- react-big-calendar, moment, lucide-react, and perfect-freehand.

## Architecture Summary

```text
src/app
  login
  (dashboard)/agenda
  (dashboard)/pacientes
  (dashboard)/whatsapp
  (dashboard)/configuracion
  (dashboard)/profile

src/components
  agenda
  appointments
  pacientes
  historias
  notes
  configuracion
  profile
  ui

src/lib
  appointments and recurrence logic
  clinical notes and patient profile logic
  datetime formatting/parsing for Bogotá
  pending actions and WhatsApp template helpers
  Supabase clients, schema, migrations, and demo seed
```

Server-rendered dashboard pages read from Supabase with authenticated server clients. Client components handle interaction-heavy flows such as calendar edits, appointment modals, drawing canvas updates, and quick state changes.

## Data and Security

Supabase is the system of record. The schema includes patients, appointments, session notes, settings, consultorios, patient clinical profiles, and private canvas storage.

Row Level Security is enabled for the main domain tables. Policies scope reads and writes to the authenticated user through `auth.uid()`, using `user_id` or `psychologist_id` depending on the table. Canvas files are stored under user-owned paths and protected with storage policies.

## Timezone

Lumi treats Bogotá as the product timezone: `America/Bogota`.

Colombia does not observe daylight saving time, so date helpers in `src/lib/datetime.ts` normalize local appointment inputs to UTC while formatting all clinical calendar views back in Bogotá time.

## Tests

The project currently has **68 unit tests** covering date/time behavior, appointment recurrence, appointment status logic, and pending-action logic.

```bash
npm run lint
npm run test
npx tsc --noEmit
```

## Demo Data

The demo seed lives in [`src/lib/supabase/seed_demo.sql`](src/lib/supabase/seed_demo.sql). It creates sample patients, consultorios, appointments across past/current/future dates, clinical profiles, session notes, and settings with WhatsApp templates.

To use it:

1. Open the Supabase SQL Editor.
2. Copy the contents of `src/lib/supabase/seed_demo.sql`.
3. Replace the placeholder email with the demo account email.
4. Run the script.

## Local Setup

This project requires a Supabase project with the schema applied before running the app locally.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BOOKING_URL=
```

For a fresh Supabase database, start with [`src/lib/supabase/schema.sql`](src/lib/supabase/schema.sql). Existing projects may need the manual migrations in [`src/lib/supabase/`](src/lib/supabase/) applied in order.

Full setup notes live in [`SETUP.md`](SETUP.md).

## Commands

```bash
npm run dev       # local development
npm run build     # production build
npm run start     # run production build
npm run lint      # ESLint
npm run test      # Vitest unit tests
npx tsc --noEmit  # TypeScript validation
```

## Key Technical Decisions

- **Authenticated dashboard first:** private routes are protected through Next.js `proxy.ts`.
- **Server reads, client interactions:** pages load authenticated data server-side while complex UI flows stay responsive in client components.
- **RLS as a product boundary:** user-owned clinical data is enforced at the database layer, not only in UI logic.
- **Bogotá-first time handling:** appointment inputs are treated as local Bogotá times and stored as UTC instants.
- **Focused domain modules:** recurrence, status transitions, pending actions, formatting, and Supabase mapping live in dedicated `src/lib` modules.
- **Portfolio-ready seed data:** demo data is realistic enough to show workflows without relying on private clinical records.

## Product Status

Core product flows are implemented and covered by unit tests: agenda, patients, session notes, pending actions, WhatsApp templates, and settings. The remaining work is portfolio packaging: public deployment, final screenshots, and optional UI polish.
