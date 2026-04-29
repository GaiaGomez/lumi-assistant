# Lumi — Case Study

## Overview

Lumi is a clinical operations dashboard I designed and built for an independent psychology practice. It manages the daily loop of appointments, patient records, session notes, payment tracking, follow-ups, and WhatsApp communication — all in one authenticated interface.

I worked on this end to end: product scope, workflow design, data modeling, frontend implementation, Supabase setup, Row Level Security policies, timezone handling, session notes, demo data, and test coverage.

This case study walks through what the product does, why I made the decisions I made, and what I learned building operational software for a real clinical workflow.

---

## The Problem

A solo psychologist's daily workflow looks something like this: check the calendar app for today's appointments, open a spreadsheet to see who still owes payment, switch to a notes app for session history, draft a WhatsApp message for a follow-up, and try to remember which patients haven't been seen in a while.

Every one of those steps involves a different tool, a different context, and a different mental model. Nothing is wrong with any individual tool — the problem is the constant switching between them and the things that fall through the gaps: a follow-up that didn't happen, a payment that wasn't tracked, a session note that got postponed and forgotten.

**Before Lumi**, the practitioner I was building for managed everything across Google Calendar, a personal spreadsheet, handwritten notes, and WhatsApp. The most common failure mode wasn't dramatic — it was quiet operational drift. Things got missed not because of bad tools, but because no single tool showed the full picture.

---

## The Solution

Lumi consolidates those scattered workflows into a single dashboard organized around the practitioner's daily rhythm:

**Start of day → Agenda.** See today's appointments with patient context, session status, and payment state visible at a glance. Week and month views support planning ahead.

**During sessions → Patient profile + Notes.** Open a patient's full history, clinical profile, and past notes without leaving the dashboard. Session notes support two modes: a private free-writing space for use during the session and a formal structured note for clinical documentation.

**Between sessions → Pending actions.** A prioritized view surfaces what needs attention: unpaid sessions, missing notes, patients without a next appointment, and patients due for follow-up. This replaces the mental checklist that used to live in the practitioner's head.

**End of day → WhatsApp templates.** Pre-configured message templates for reminders, confirmations, payment follow-ups, and reactivation messages. Messages are prepared manually — not automated — because the practitioner values personal communication with patients.

---

## Technical Decisions and Tradeoffs

### Why Next.js App Router + Supabase

The app needed server-rendered pages for authenticated data, client-side interactivity for calendar editing and modals, and a managed backend with authentication and RLS built in.

Next.js App Router gave me the server/client split I needed. Supabase gave me Postgres, authentication, Row Level Security, and storage without managing infrastructure. For a solo project handling sensitive clinical data, this stack let me focus on product logic rather than backend plumbing.

### Row Level Security as a Product Requirement

This was not optional. Clinical patient data cannot rely on frontend checks alone — a misconfigured API route or a leaked endpoint should not expose someone else's patients.

Every domain table has RLS policies that scope access to the authenticated user via `auth.uid()`. Patient records, appointments, session notes, clinical profiles, consultorios, and settings are protected at the database layer — not just in UI logic.

### Timezone Handling

Colombia does not observe daylight saving time, which simplifies the model — but timezone bugs are still one of the most common sources of errors in scheduling software.

The approach: all appointment inputs are treated as local `America/Bogota` times. They are converted to UTC for storage. All display formatting converts back to Bogotá time. Date utilities centralize these conversions so timezone logic does not leak into UI components.

I caught and fixed a bug where server-side "today" calculations could drift from the user's local day. This is exactly the kind of quiet bug that erodes trust in scheduling software.

### Session Notes System

Session notes were designed around a real clinical workflow: not everything written during a session should become part of the formal record.

The notes system uses one component with two modes:

**During the session:** a private free-writing area with silent autosave. It supports quick capture without forcing structure while the session is happening.

**Formal note:** a structured clinical note with four prompts:

- How did the patient arrive today?
- What was worked on?
- How is the process going?
- What comes next?

Internally, this maps to a DAP-style clinical documentation flow while keeping the interface simple and natural for the practitioner. Once the session is closed, the formal note becomes read-only.

### Domain Module Separation

Early in the project, appointment recurrence logic, status transitions, pending-action priority, and datetime formatting were getting tangled into UI components. This made bugs harder to trace and impossible to test without mounting React components.

I extracted each domain into its own module under `src/lib/`. The result: UI components render state and call functions, business logic is independently testable, and changes to recurrence, dates, notes, or pending actions stay localized.

### Server-Side Demo Login

Because Lumi handles private clinical workflows, the public portfolio demo cannot expose real data. I created a dedicated demo workspace using fictional seed data and a one-click **View demo** button.

The demo login is handled through a minimal server route, `/api/demo-login`, using server-only environment variables. This keeps the demo credentials out of the client bundle while still giving reviewers a frictionless way to explore the product.

---

## Challenges

**Making appointment states intuitive.** Each appointment has two independent states: session status and payment status. Displaying both without cluttering the calendar took several iterations. The final design uses visual hierarchy and compact indicators so the agenda remains scannable.

**Pending actions prioritization.** Not all follow-ups are equal. A patient without a next appointment, an unpaid completed session, and a same-day confirmation all require different levels of attention. Building a priority system that reflected the real workflow required translating clinical admin habits into rules the app could calculate.

**Demo data that tells a story.** The demo seed needed to show realistic workflows without using real clinical records. The seed script creates a coherent fictional practice history with past sessions, upcoming appointments, payment states, clinical profiles, notes, consultorios, and settings.

**Keeping clinical notes simple.** A formal DAP structure is useful, but too much structure during a live session can get in the way. Splitting the experience into "during the session" and "formal note" made the workflow more practical.

**Responsive agenda design.** Calendar interfaces are dense, especially on tablets and phones. I iterated on mobile and tablet views to keep appointments readable without losing the feeling of a real agenda.

---

## What I Learned

**Timezone is a feature, not a detail.** Scheduling software needs a timezone strategy from the beginning. Even in a country without daylight saving time, "today", UTC storage, and local display can drift if not handled deliberately.

**RLS changes how you think about security.** When the database enforces access boundaries, you stop relying only on whether every route or component remembers to check auth. It is a stronger model for sensitive data.

**Small products need more product thinking, not less.** Lumi does not need hundreds of features. Its value comes from reducing the number of places a practitioner has to check and the number of things they have to remember. Deciding what not to automate — like WhatsApp sending — was as important as what I built.

**Business logic belongs outside the UI.** Extracting domain logic into testable modules was the decision that most improved maintainability. The test suite covers the riskiest logic — dates, recurrence, status transitions, and pending actions — without depending on rendered components.

**A good demo is part of the product.** The one-click demo login changed the project from "ask me for access" to "try it now". For a portfolio project, that matters.

---

## Metrics

- **68 unit tests** covering date/time, recurrence, status transitions, and pending actions
- **RLS on domain tables** for database-level access control
- **Bogotá-first timezone strategy** for appointment storage and display
- **One-click public demo** through server-side demo login
- **Full demo seed** generating realistic fictional practice data for portfolio review

---

## Future Direction

If I were to continue building Lumi, the next areas I would focus on:

**Read-only demo mode.** The public demo currently uses fictional data, but a stricter read-only mode would prevent external reviewers from editing or deleting demo records.

**Patient-facing booking.** A public scheduling page where patients can request appointments, reducing the back-and-forth of manual booking.

**Expanded test coverage.** The current tests cover the highest-risk logic. Next would be appointment editing flows, patient profile updates, note signing behavior, and integration tests for the Supabase layer.

**Mobile optimization.** The dashboard is functional on mobile but was designed primarily around desktop and tablet workflows. A focused mobile pass would improve the between-sessions experience.

**Lightweight external integrations.** Future versions could explore optional integrations for calendar import, email-based appointment extraction, or transcription workflows, while keeping privacy and manual review at the center.

---

## Stack Reference

| Layer | Technology |
|-------|-----------|
| Framework | Next.js App Router |
| Frontend | React, TypeScript, Tailwind CSS 4 |
| Backend | Supabase: Postgres, Auth, Storage, SSR |
| Security | Row Level Security, auth proxy middleware |
| Testing | Vitest |
| Key libraries | react-big-calendar, perfect-freehand, moment, lucide-react |

---

**Live demo:** [lumiassistant.vercel.app](https://lumiassistant.vercel.app/) — use the **View demo** button to explore a fictional workspace.

**Repository:** [GitHub](https://github.com/GaiaGomez/lumi-assistant)