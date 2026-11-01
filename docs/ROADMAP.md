# Lumid Practice Platform — Build Roadmap

Source of truth for scope and behaviour: [`BLUEPRINT.md`](./BLUEPRINT.md).
Each phase ships as one PR (or a short stack of PRs) and is "done" only when its exit check passes on a preview deploy.

Status key: ☐ todo · ◐ in progress · ☑ done

## Progress (1 Nov 2026)

☑ **Server foundation built and tested** (independent of the existing frontend):
- 5 migrations: 16 tables, enums, RLS on every table, column-level grants, double-booking exclusion constraint, booking state machine, slot engine, encrypted notes, rate limits, pg_cron jobs.
- 58 pgTAP tests (tenant isolation, holds, buffers, cutoffs, expiry, late payments, notes encryption, publishing).
- Shared TS libs: money, dates, error contract, API client with retries + idempotency, zod schemas — 25 unit tests.
- Edge Functions: `public-bookings` (hold + Razorpay order + verify) and `razorpay-webhook` (signature, idempotent, auto-refund) — Deno type-checked.
- CI workflow: app, database, functions, secret scan.

☑ **Phase 0 + Phase 1 frontend landed (1 Nov 2026)** in `LumidDashboard/`:
- Demo mode (no env vars) keeps the current public demo working; live mode uses Supabase.
- Auth (magic link + Google), protected `/app`, `/login`, session-expiry handling.
- Live Overview with setup checklist; Patients, Patient profile, Bookings and Practice settings on real data with loading / empty / error states.
- Route code-splitting (initial JS 136 KB → 69 KB gzipped), third-party avatars removed, security headers, strict TypeScript.
- Not yet on real data: Calendar, Sessions, Follow-ups, Earnings, Your Page, Insights (still demo screens; Phases 2–4).

---

## Phase 0 — Groundwork (repo hygiene)

Goal: the existing UI keeps working while the codebase becomes ready for a real backend.

| # | Task | Acceptance |
|---|---|---|
| 0.1 ☑ | TypeScript strict, ESLint, Prettier, path aliases (`@/`) | `npm run lint` and `npm run typecheck` pass with 0 warnings |
| 0.2 ◐ | Folder structure: `src/app`, `src/features/*`, `src/components/ui`, `src/lib` | Existing screens render identically (screenshot diff) |
| 0.3 ◐ | Move mock data into `src/features/*/fixtures.ts` behind a `VITE_DEMO_MODE` flag | Demo build unchanged; non-demo build ships no mock data |
| 0.4 ☑ | Route-level code splitting (`React.lazy` per route) | Initial JS < 200 KB gzipped |
| 0.5 ☑ | Replace `i.pravatar.cc` with local initials avatar | No third-party image requests |
| 0.6 ☑ | GitHub Actions CI: lint, typecheck, unit tests, build | Green on PR |
| 0.7 ☑ | Vercel security headers (`vercel.json`) | CSP, HSTS, X-Frame-Options, Referrer-Policy present |

**Exit check:** preview deploy looks identical to today, CI green, bundle split.

---

## Phase 1 — Foundation: data, auth, states (Weeks 1–2)

Goal: a psychologist signs up and sees only their own practice, with correct empty states.

| # | Task | Acceptance |
|---|---|---|
| 1.1 ☑ | Supabase migrations: all tables, enums, indexes, `updated_at` triggers | `supabase db reset` runs clean |
| 1.2 ☑ | RLS on every table, default deny | DB tests: user A cannot read/write user B rows |
| 1.3 ☑ | Booking exclusion constraint + `transition_booking()` | DB tests: overlap rejected, invalid transition rejected |
| 1.4 ☑ | `lib/money`, `lib/dates`, `lib/errors`, `lib/api` (error contract) | Unit tests pass |
| 1.5 ☑ | Slot engine in SQL (`public_available_slots`: rules − blocks − bookings − notice/window) | pgTAP tests incl. buffers, notice |
| 1.6 ☑ | Auth: magic link + Google, protected `/app`, sign-out, session expiry | Unauthenticated `/app/*` → `/login?next=` |
| 1.7 ☑ | Onboarding checklist (profile → session types → hours → publish) | Overview shows checklist until published |
| 1.8 ◐ | Feature hooks per screen (TanStack Query) replacing fixtures | No component imports Supabase directly |
| 1.9 ☑ | Shared state components: `Skeleton`, `EmptyState`, `ErrorState`, `InlineRetry` | Every data screen renders all states (Storybook-style test page) |
| 1.10 ☑ | Profile, session types, weekly hours, blocks editable | Changes persist across reload |

**Exit check:** new account → empty practice with checklist; two test accounts fully isolated.

---

## Phase 2 — Booking & payments (Weeks 3–4)

Goal: a patient books and pays from `slug.lumidai.in`, every failure flow handled.

| # | Task | Acceptance |
|---|---|---|
| 2.1 | Public profile by slug (path `/p/:slug` + subdomain rewrite) | Unpublished → "This page isn't available" |
| 2.2 ☑ | Slots via RPC `public_available_slots` (anon) | 422 on bad range, max 31 days |
| 2.3 ☑ | Edge fn `public-bookings` (hold + Razorpay order, Idempotency-Key) | 409 on taken slot, same key returns same result |
| 2.4 | Razorpay Checkout on booking page, 10-min hold timer | Test-mode payment completes |
| 2.5 ☑ | Edge fn `razorpay-webhook` (HMAC, idempotent via `webhook_events`) | Duplicate events return 200, no double confirm |
| 2.6 ◐ | `verify` fast path + "Confirming payment…" polling | Late webhook still confirms |
| 2.7 ☑ | Cron `expire-holds` | Unpaid holds expire at 10 min |
| 2.8 | Failure UI: conflict, expired, failed, paid-after-expiry refund | Each has E2E test |
| 2.9 | Bookings, Payments, Earnings screens on real rows | Totals match DB |
| 2.10 | Manual booking from dashboard (payment link / paid offline) | Appears on calendar |

**Exit check:** Playwright E2E: publish → book → pay (test) → confirmed, plus all failure flows.

---

## Phase 3 — Calendar, Meet & reminders (Weeks 5–6)

| # | Task | Acceptance |
|---|---|---|
| 3.1 | Google OAuth (PKCE + state), tokens in Vault | Reconnect banner when token invalid |
| 3.2 | Calendar event + Meet link on confirm; free/busy blocks slots | Meet link on booking + email |
| 3.3 | Reschedule / cancel / outcome — psychologist side | State machine enforced, event updated |
| 3.4 | Patient manage page (signed token): reschedule, cancel, receipt | Cutoff respected (403 after) |
| 3.5 | Refunds per policy | Refund row + Razorpay refund id |
| 3.6 | Resend email templates: confirm, reminder 24h/1h, cancel, follow-up | Delivered + bounce tracked |
| 3.7 | Cron jobs: reminders, follow-ups, reconcile-payments | Idempotent; logs with request id |
| 3.8 | Sentry + uptime check + webhook-failure alert | Alerts reach founder email |

**Exit check:** one real psychologist runs a full week of sessions on Lumid.

---

## Phase 4 — Care & intelligence (after pilot)

| # | Task | Acceptance |
|---|---|---|
| 4.1 | Encrypted session notes with autosave + offline draft | Notes unreadable in raw table dump |
| 4.2 | Follow-ups and care plans on patient detail | Due list on Overview |
| 4.3 | Audit log view | Every patient-record view logged |
| 4.4 | Patient consent + data-rights pages (DPDP) | Withdraw takes effect immediately |
| 4.5 | Opt-in AI session summaries, clinician-reviewed, source-labelled | Off by default; never auto-shared |
| 4.6 | Account export + deletion (30-day purge) | Purge job tested |

**Exit check:** pilot psychologists report time saved (measured, not assumed).

---

## Working agreement

- One branch per task group, conventional commits, PR with screenshots.
- Every data component handles loading / empty / error / success.
- No secrets in the repo. Service role only inside Edge Functions.
- Spec changes update `BLUEPRINT.md` in the same PR.
