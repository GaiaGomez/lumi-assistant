# Lumi — Case Study

## Overview

Lumi is a clinical operations dashboard I designed and built for an independent psychology practice. It manages the daily loop of appointments, patient records, session notes, payment tracking, follow-ups, and WhatsApp communication — all in one authenticated interface.

I worked on this end to end: product scope, workflow design, data modeling, frontend implementation, Supabase setup, Row Level Security policies, timezone handling, canvas note system, demo data, and test coverage.

This case study walks through what the product does, why I made the decisions I made, and what I learned building operational software for a real clinical workflow.

---

## The Problem

A solo psychologist's daily workflow looks something like this: check the calendar app for today's appointments, open a spreadsheet to see who still owes payment, switch to a notes app for session history, draft a WhatsApp message for a follow-up, and try to remember which patients haven't been seen in a while.

Every one of those steps involves a different tool, a different context, and a different mental model. Nothing is wrong with any individual tool — the problem is the constant switching between them and the things that fall through the gaps: a follow-up that didn't happen, a payment that wasn't tracked, a session note that got postponed and forgotten.

**Before Lumi**, the practitioner I was building for managed everything across Google Calendar, a personal spreadsheet, handwritten notes, and WhatsApp. The most common failure mode wasn't dramatic — it was quiet operational drift. Things got missed not because of bad tools, but because no single tool showed the full picture.

---

## The Solution

Lumi consolidates those scattered workflows into a single dashboard organized around the practitioner's daily rhythm:

**Start of day → Agenda.** See today's appointments with patient context, session status, and payment state visible at a glance. Week and month views for planning ahead.

**During sessions → Patient profile + Notes.** Open a patient's full history, clinical profile, and past notes without leaving the dashboard. Write session notes in text or use the drawing canvas for practitioners who sketch or handwrite with a stylus.

**Between sessions → Pending actions.** A prioritized view of what needs attention: sessions without notes, unpaid appointments, patients due for follow-up. This replaces the mental checklist that used to live in the practitioner's head.

**End of day → WhatsApp templates.** Pre-configured message templates for reminders, confirmations, and follow-ups. Messages are prepared manually — not automated — because the practitioner values personal communication with patients.

---

## Technical Decisions and Tradeoffs

### Why Next.js App Router + Supabase

The app needed server-rendered pages (for fast initial load with authenticated data), client-side interactivity (for calendar editing, modals, and canvas), and a managed backend with auth and RLS built in.

Next.js App Router gave me the server/client split I needed. Supabase gave me Postgres, authentication, Row Level Security, and file storage without managing infrastructure. For a solo project handling sensitive clinical data, this stack let me focus on product logic rather than backend plumbing.

### Row Level Security as a Product Requirement

This was not optional. Clinical patient data cannot rely on frontend checks alone — a misconfigured API route or a leaked endpoint shouldn't expose someone else's patients.

Every domain table (patients, appointments, notes, settings) has RLS policies that scope access to the authenticated user via `auth.uid()`. Canvas files in Supabase Storage follow user-owned path policies. This means the security boundary lives in the database, not in application code.

### Timezone Handling

Colombia doesn't observe daylight saving time, which simplifies the model — but timezone bugs are still one of the most common sources of errors in scheduling software.

The approach: all appointment inputs are treated as local `America/Bogota` times. They're converted to UTC for storage. All display formatting converts back to Bogotá time. A dedicated `datetime.ts` module centralizes every conversion so timezone logic doesn't leak into UI components.

I caught and fixed a bug early where the server was using UTC for "today" calculations, causing appointments between 7pm and midnight Colombia time to appear on the wrong day. This is exactly the kind of quiet bug that erodes trust in scheduling software.

### Canvas Note System

Some practitioners prefer to draw during sessions — diagrams, timelines, annotations. The session notes needed to support both structured text and freehand drawing.

The storage strategy: vector paths are saved as JSONB in the database (so the drawing remains editable), and a rendered image goes to Supabase Storage (for fast display in the patient's history). This avoids storing large base64 blobs in Postgres while keeping drawings as first-class data.

I used `perfect-freehand` for pressure-sensitive stroke rendering and `react-sketch-canvas` as the drawing surface.

### Domain Module Separation

Early in the project, I noticed that appointment recurrence logic, status transitions, pending-action priority, and datetime formatting were getting tangled into UI components. This made bugs harder to trace and impossible to test without mounting React components.

I extracted each domain into its own module in `src/lib/`. The result: UI components just render state and call functions, business logic is independently testable, and when I need to change how recurrence works, I touch one file instead of hunting through components.

---

## Challenges

**Making appointment states intuitive.** Each appointment has two independent states: session status (scheduled, completed, cancelled, no-show) and payment status (pending, paid, waived). Displaying both without cluttering the calendar took several iterations. The final design uses color coding for session status and a secondary indicator for payment — enough to scan quickly without reading labels.

**Pending actions prioritization.** Not all follow-ups are equal. A patient who no-showed is higher priority than one whose last session is simply unpaid. Building a priority system that reflected real clinical judgment — not just chronological order — required several conversations about the actual workflow.

**Demo data that tells a story.** The demo seed needed to show realistic workflows (past appointments, varied statuses, different patient profiles) without using real clinical records. The seed script creates a coherent practice history that demonstrates every feature path a reviewer might explore.

**Canvas performance and editing.** Storing and loading drawings needed to feel instant. The JSONB + Storage dual approach solved the performance side, but getting the canvas to feel right for handwriting (pressure sensitivity, stroke smoothing, palm rejection) required tuning parameters beyond the library defaults.

---

## What I Learned

**Timezone is a feature, not a detail.** The 7pm–midnight bug taught me that timezone handling needs to be treated as a first-class requirement with explicit tests, not a formatting concern you add at the end. Every scheduling app I build from now on starts with a timezone strategy.

**RLS changes how you think about security.** When the database enforces access boundaries, you stop worrying about whether every API route checks auth correctly. It's a different mental model — and a much more reliable one for sensitive data.

**Small products need more product thinking, not less.** Lumi doesn't have a hundred features. The value comes from reducing the number of places a practitioner has to check and the number of things they have to remember. Deciding what *not* to build — like automated WhatsApp sending — was as important as what I built.

**Business logic in modules, UI in components.** Extracting domain logic into testable modules was the single decision that most improved the codebase's maintainability. The 68 tests I wrote cover the riskiest logic (dates, recurrence, status transitions, pending actions) and they all run without touching any UI.

---

## Metrics

- **68 unit tests** covering date/time, recurrence, status transitions, and pending actions
- **RLS on all domain tables** — zero client-side-only access control
- **Single timezone module** handling all UTC ↔ Bogotá conversions
- **Dual canvas storage** — JSONB paths + rendered images, no base64 in the database
- **Full demo seed** generating realistic practice data for portfolio review

---

## Future Direction

If I were to continue building Lumi, the next areas I'd focus on:

**DAP note system.** Adding a structured clinical note format (Data, Assessment, Plan) alongside the existing freehand canvas — giving practitioners a formal documentation path for session records.

**Patient-facing booking.** A public scheduling page where patients can request appointments, reducing the back-and-forth of manual booking.

**Expanded test coverage.** The current 68 tests cover the highest-risk logic. Next would be appointment editing flows, patient profile updates, and integration tests for the Supabase layer.

**Mobile optimization.** The dashboard is functional on mobile but was designed desktop-first. A focused mobile pass would improve the between-sessions workflow significantly.

---

## Stack Reference

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Frontend | React, TypeScript, Tailwind CSS 4 |
| Backend | Supabase (Postgres, Auth, Storage, SSR) |
| Security | Row Level Security, auth proxy middleware |
| Testing | Vitest |
| Key libraries | react-big-calendar, perfect-freehand, moment, lucide-react |

---

**Live demo:** [lumiassistant.vercel.app](https://lumiassistant.vercel.app/) (demo login available on request)

**Repository:** [GitHub](https://github.com/GaiaGomez/lumi-assistant) 