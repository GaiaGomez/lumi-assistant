# Lumi Case Study

## Context

Lumi is a private clinical operations dashboard for an independent psychology practice. The product supports the daily work around patients, appointments, session notes, pending follow-ups, payment state, and reusable WhatsApp templates.

It was built as a practical portfolio project with a real workflow in mind: make the practice easier to run without requiring the practitioner to jump between a calendar, notes app, spreadsheets, and message drafts.

## Problem

Solo clinical practices often have small teams, sensitive data, and many repeated admin tasks. The main operational risks are not flashy: missed follow-ups, unclear payment status, fragmented patient context, and appointment times that drift when stored or displayed incorrectly.

Lumi needed to make those workflows visible in one place while staying private, calm, and fast enough for repeated daily use.

## Solution

Lumi centralizes the practice workflow into an authenticated dashboard:

- Agenda views for day, week, and month planning.
- Appointment modals for creation, editing, rescheduling, recurrence, and conflict checks.
- Patient profiles with history, clinical context, session notes, and quick state updates.
- Pending actions for operational follow-up.
- WhatsApp template settings for manual message preparation.
- Drawing canvas support inside clinical notes for stylus-based workflows.

The result is a tool that presents the operational state of the practice without asking the user to reconstruct it from several disconnected apps.

## My Role

I designed and implemented the product end to end: product scope, UI structure, frontend implementation, data model, Supabase setup, RLS policies, timezone handling, demo data, and test coverage.

The work included shaping the clinical workflow, translating it into data structures, building the dashboard screens, and tightening the product so it could be understood quickly by a recruiter or reviewer.

## Technical Decisions

- **Next.js App Router:** used for a dashboard structure with server-rendered pages and authenticated route protection through `proxy.ts`.
- **Supabase as backend:** used for authentication, Postgres data, storage, and Row Level Security.
- **RLS by default:** domain tables are scoped to the authenticated owner through `auth.uid()` policies.
- **Bogotá timezone model:** date helpers treat local appointment input as `America/Bogota` and store UTC instants for consistency.
- **Client components where interaction matters:** calendar editing, appointment modals, quick actions, and drawing interactions stay responsive on the client.
- **Dedicated domain modules:** recurrence, appointment status, pending actions, datetime, and Supabase mapping are separated from UI code.
- **Unit tests for business logic:** 68 Vitest tests cover the highest-risk logic around dates, recurrence, statuses, and pending actions.

## Challenges

The hardest parts were the quiet details that make operational software trustworthy:

- Keeping appointment times consistent across form inputs, calendar views, storage, and formatting.
- Modeling appointment and payment states without making the UI feel heavy.
- Protecting clinical data with database-level boundaries instead of relying only on frontend checks.
- Making session notes support both structured text and canvas-style clinical sketches.
- Preparing demo data that tells a clear product story without exposing real records.

## Learnings

Lumi reinforced that small workflow products need strong product judgment as much as code. The value comes from reducing repeated friction: fewer places to check, fewer decisions to remember, and fewer opportunities for operational mistakes.

Technically, the project highlighted the importance of pushing business logic into testable modules, treating timezone behavior as a first-class requirement, and using RLS as part of the application architecture rather than an afterthought.

## Next Steps

- Add final portfolio screenshots to `docs/screenshots/`.
- Publish a public demo deployment and link it from the README.
- Continue expanding tests around appointment editing and patient-profile workflows.
- Polish onboarding/setup notes for reviewers who want to run the project locally.
