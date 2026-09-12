# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Independent, solo-practice psychologists (the in-app persona is Dr. Anitha Raghavan, Bengaluru) who run their own practice without clinic staff or a receptionist. They currently coordinate bookings, payment collection, and patient follow-ups manually — WhatsApp, spreadsheets, memory — and use Lumid to consolidate that into one dashboard they check daily between sessions.

## Product Purpose

Lumid is an operating system for an independent psychologist's practice: booking with payment enforcement, a calendar, patient records, and follow-up tracking, in one place. It exists to remove the operational overhead (chasing payment, losing track of who needs a follow-up, re-explaining booking terms) so the psychologist's time goes to care, not admin. Success is a psychologist who no longer loses income to no-shows/unpaid sessions and doesn't let a patient's follow-up silently lapse.

## Positioning

Payment-enforced booking is the mechanism a generic calendar tool (Calendly, etc.) could not truthfully copy: a session cannot be confirmed until payment is made, directly addressing the #1 revenue-leak for solo psychologists (no-shows and awkward manual payment-chasing). This is tied into the same system as patient continuity (follow-ups, session history), rather than being a bolt-on payment link.

## Operating Context

- A public booking page (`/book`) patients use to request a session, gated by payment.
- A private dashboard (`/app/*`) the psychologist checks between sessions: Overview (today's schedule, earnings, KPIs), Calendar, Bookings, Patients (+ individual Patient Profile), Sessions, Follow-ups, Earnings, "Your Page" (the public booking link), Settings.
- Currency is ₹ (INR) — built for the Indian market first.
- Deliberately v1-scoped: earlier strategy work (documented in project history) trimmed the nav and feature set down from a larger draft, on the principle that "less is more" for a v1 — an Insights/AI-intelligence nav item and most Settings sub-sections were cut because there's no real data behind them yet.

## Capabilities and Constraints

- Frontend-only prototype today: React 19 + Vite + TypeScript + react-router-dom v7, styled on HeroUI v3 (`@heroui/react`) with a custom token layer in `src/styles/globals.css` / `src/index.css`. All data is mock data from `src/lib/data.ts` (patients, today's schedule, bookings, follow-ups, timeline events) — no backend, auth, or real payment processing wired up yet.
- Known data-model gap: `timelineEvents` in `data.ts` is shared across all patients rather than per-patient (documented, not yet fixed).
- Hosted on GitHub (`riyan-hx/26augustfinal`, private); no live production deployment currently (a prior Netlify deploy was auto-paused by Netlify for undetermined reasons and was removed — the app currently runs locally only).

## Brand Commitments

- Name: **Lumid AI** / **Lumid**. Wordmark is text-only (no icon lockup), set in the brand green.
- Visual identity is pulled directly from a Figma file the founder (Riyan) provided (`Lumid AI Dashboard`, node 0-1): a green system anchored on an exact diagonal gradient `#2dc500 → #56a835` for primary actions, Manrope as the typeface, flat hairline-bordered white cards (no drop shadows), pill-shaped buttons/badges/nav states. This Figma file is the current visual authority — later redesign work should treat it as ground truth over any earlier design-system iteration in this project's history (this app went through several prior visual directions — indigo/Apple-derived, HeroUI-default — before converging on this one).
- Voice: plain, operational, non-clinical-jargon — dashboard copy speaks to "what needs your attention today," not abstract feature names.

## Evidence on Hand

- No real customer testimonials, case studies, press, or pricing exist yet — nothing here should be fabricated as if it did. All patient names, session data, and earnings figures in the running app are mock data for demonstration.
- A comprehensive internal documentation artifact (dashboard structure, page-by-page feature walkthrough) was produced earlier in this project's history for a professional review; treat it as internal reference, not user-facing evidence.

## Product Principles

- Payment before confirmation, always — this is the product's one non-negotiable mechanism, not a toggle.
- V1 means less: only ship a nav item or Settings section when real data/logic backs it; cut the rest rather than stub it.
- The dashboard is Operate-mode, not Persuade-mode: scanability and daily-use speed outrank marketing polish. Brand lives in the details (the exact green, the exact type), not in decoration.
- Built for a single practitioner with no staff — never assume a receptionist, admin role, or multi-provider workflow exists unless asked for explicitly.
- India-first: ₹ currency, IST-oriented scheduling assumptions, until told otherwise.
