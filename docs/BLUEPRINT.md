# Lumid Backend Blueprint

**Lumid AI · Practice platform · Build spec v2**
1 Nov 2026 · Source: live app `26augustfinal.vercel.app` · Costs at ~₹88 / USD, excl. GST

The single reference for building Lumid's practice platform: who uses it, every flow and screen state, the backend, the API and error contract, security, code standards, and running cost.

---

## 1. Summary

| | |
|---|---|
| **0%** | Backend today. Every screen runs on hard-coded sample data. |
| **Supabase** | One managed backend: database, login, files, scheduled jobs, server functions. |
| **₹0 → ~₹4k / month** | Free while piloting, about ₹4,000 once real patients pay. |
| **~6 weeks** | To a working booking + payment + Meet loop for real psychologists. |

The frontend is in good shape: clean React app, fast, no console errors, works at phone width. What's missing is everything behind it. Nothing saves, there is no login, and payments, Meet links and reminders are only shown, not performed. This spec adds one backend (Supabase, Mumbai region), keeps the existing UI, and defines every flow, state and rule we build against.

---

## 2. Live app audit

From the production bundle and a headless-browser pass at 1440px and 390px.

| Area | Finding | Severity |
|---|---|---|
| Data | All patients, bookings, earnings and dates (fixed to Aug 2026) are compiled into the JS file. No API calls at all. | 🔴 Blocker |
| Access | `/app` opens the full dashboard with no login. Once real data exists, this would expose patient records. | 🔴 Blocker |
| Payments | Razorpay and "payment after details" appear in copy only. No order, checkout or webhook. | 🔴 Blocker |
| Empty / error states | Every screen assumes data exists. No first-run, loading, empty or failure states. | 🟠 Needed |
| Meet / calendar | "Auto-generate / paste link" has no integration behind it. | 🟠 Needed |
| Psychologist pages | `/book` is one fixed profile. `name.lumidai.in` subdomains are not routed. | 🟠 Needed |
| Images | Avatars load from `i.pravatar.cc`, a third-party host. Replace with uploaded photos. | 🟠 Fix |
| Bundle | One 478 KB file (135 KB gzipped) for all 12 routes. Split per route. | 🟢 Later |
| Speed | 0.8–1.8 s to network idle per route. No console errors. No horizontal scroll on mobile. | 🟢 Good |

**Routes found and backend each needs**

| Routes | Backend needed |
|---|---|
| `/app` · `/app/calendar` · `/app/bookings` | Bookings, availability, session types |
| `/app/patients` · `/app/patients/:id` · `/app/sessions` | Patients, sessions, private notes |
| `/app/follow-ups` · `/app/insights` | Follow-ups, scheduled reminders, consented summaries |
| `/app/earnings` · `/app/payments` | Payments, refunds, payouts (from Razorpay webhooks) |
| `/app/your-page` · `/book` | Public profile, slot lookup, checkout |
| `/app/settings` | Practice settings, Google connection, notifications |

> The GitHub repo was not reachable from this session, so this audit is from the deployed build. Code-level findings follow once repo access is granted.

---

## 3. Roles & access

| Role | How they sign in | Can see | Can never see |
|---|---|---|---|
| **Psychologist** | Email magic link or Google | Own practice: patients, bookings, notes, payments, settings | Any other psychologist's data |
| **Patient** | No account. Signed link in each email (+ OTP to email for sensitive actions) | Own bookings with that psychologist, receipts, consents | Session notes, other patients |
| **Visitor** | None | Published profile, session types, free slots | Anything personal, including who booked |
| **Lumid admin** | Google + allow-list + 2FA | Account status, billing, health metrics | Notes and patient identities (no RLS bypass in app code) |
| **System jobs** | Service role inside Edge Functions only | What each job needs | Service key never reaches the browser |

---

## 4. Psychologist flows

Each step lists the endpoint or table it touches, so design and backend build the same thing.

### P1 · Sign up & onboard
1. **Sign up** — Email magic link or Google. Accepts terms and data processing agreement. → `auth.signUp`
2. **Create profile** — Name, photo, credentials (RCI no. optional), languages, city, bio. Picks a slug. → `PATCH psychologists` · slug check
3. **Add session types** — Name, length, price, buffer. Defaults pre-filled: 50 min ₹1,500, 30 min ₹1,200. → `session_types`
4. **Set weekly hours** — Timezone Asia/Kolkata, minimum notice, booking window. → `availability_rules`
5. **Connect Google Calendar** — So Meet links are created and busy times block slots. Skippable; manual link allowed. → `GET /integrations/google/connect`
6. **Connect payouts** — Razorpay linked account (KYC). Until done, page can take bookings in test mode only. → `POST /payouts/onboard`
7. **Publish page** — Checklist complete → page goes live at `slug.lumidai.in`. Copy link, share on WhatsApp. → `PATCH psychologists.published`

### P2 · A working day
1. **Open Overview** — Today's sessions, paid vs awaiting, follow-ups due, items that need attention. → `rpc dashboard_today`
2. **Before a session** — Open patient: last notes, agreed actions, consented check-ins. → `patients/:id` · `audit_log` write
3. **Join** — Meet link on the booking card, active 10 min before start.
4. **Mark outcome** — Completed, no-show or late cancel. Drives earnings and follow-ups. → `POST /bookings/:id/outcome`
5. **Write notes** — Private notes, focus, next steps. Autosaves every 5 s, encrypted. → `session_notes`
6. **Set follow-up** — Due date + message. Sent automatically by email (WhatsApp later). → `follow_ups`

### P3 · Manage bookings
1. **Add booking manually** — For a returning patient. Sends payment link or marks "paid offline". → `POST /bookings` (auth)
2. **Reschedule** — Drag on calendar or pick new slot. Patient is emailed; Meet event updated. → `POST /bookings/:id/reschedule`
3. **Cancel** — Full refund when psychologist cancels. Reason required. → `POST /bookings/:id/cancel`
4. **Block time** — Leave or personal time. Conflicts with existing bookings are listed first. → `availability_blocks`

### P4 · Money & account
1. **Earnings** — Collected, pending, refunded, Razorpay fees, net. By day / week / month. → `rpc earnings_summary`
2. **Payouts** — Settlement status per payment from Razorpay. → `payments` · `payouts`
3. **Export** — CSV of bookings and payments for their accountant. → `GET /exports/payments.csv`
4. **Close account** — Exports all data, unpublishes page, deletes after 30 days (legal retention kept for invoices). → `POST /account/delete`

---

## 5. Patient flows

### C1 · Book & pay
1. **Open psychologist's link** — Profile, session types, languages, cancellation policy. → `GET /public/psychologists/:slug`
2. **Pick session and time** — Next 14 days, shown in the patient's timezone. → `GET /public/slots`
3. **Enter details** — Name, email, phone, optional note. Consent to terms. Slot held 10 min with visible timer. → `POST /public/bookings`
4. **Pay** — Razorpay Checkout: UPI, card, netbanking.
5. **Confirmation** — Booking code, date, Meet link, add-to-calendar, manage link. Same by email. → `GET /public/bookings/:code`

### C2 · Before & after the session
1. **Reminders** — 24 h and 1 h before, with Meet link. → cron `send-reminders`
2. **Join session** — Opens Google Meet. No Lumid account needed.
3. **Follow-up** — Message from psychologist, with "book next session" button pre-filled. → cron `send-follow-ups`
4. **Receipt** — Downloadable receipt from the manage page. → `GET /public/bookings/:code/receipt`

### C3 · Change a booking
1. **Open manage link** — From email. Signed token, expires after the session.
2. **Reschedule** — Allowed until the psychologist's cutoff (default 24 h). Same price, new slot. → `POST /public/bookings/:code/reschedule`
3. **Cancel** — Refund per policy shown before confirming: full before cutoff, none after. → `POST /public/bookings/:code/cancel`

### C4 · Privacy rights (DPDP)
1. **See what is shared** — Consent list per psychologist: what, since when. → `GET /public/consents`
2. **Withdraw consent** — Takes effect immediately; psychologist sees "consent withdrawn". → `DELETE /public/consents/:id`
3. **Request data copy or deletion** — Email OTP to verify. Completed within 30 days; logged. → `POST /public/data-requests`

---

## 6. Failure flows

What happens when things go wrong. Each one is tested before launch.

| Situation | What the person sees | What the system does |
|---|---|---|
| Slot taken while patient fills details | "That time was just booked. Pick another." Slots refresh, details kept. | DB exclusion constraint rejects the hold → `409 SLOT_UNAVAILABLE` |
| Hold expires before paying | Timer runs out → "Your hold ended. This time is still free / was taken." | Cron sets `expired`; checkout re-checks → `410 HOLD_EXPIRED` |
| Payment fails or is cancelled | "Payment didn't go through. You weren't charged." Retry button, hold continues. | Booking stays `pending_payment`; failure logged |
| Paid, but webhook is late | "Confirming your payment…" then confirmation (polls 30 s). | Client verifies signature; webhook is final; hourly reconcile job catches misses |
| Paid after hold expired and slot taken | "We couldn't keep this time. Full refund started." Option to pick a new slot. | Auto refund, both parties emailed, alert to Lumid |
| Google disconnected / token expired | Banner in dashboard: "Reconnect Google to keep creating Meet links." | Booking still confirms; Meet link marked "to add"; psychologist emailed |
| Email bounces | Psychologist sees "Email not delivered" on the booking. | Resend webhook → `notifications.status = bounced` |
| Patient no-show | Psychologist marks no-show; no refund by default policy. | Feeds no-show rate; optional follow-up |
| Psychologist cancels | Patient emailed with apology + rebook link. | Full refund including Razorpay fee absorbed by psychologist |
| Session expired while editing notes | "You've been signed out. Your note is saved on this device." Sign in → restores. | Draft in local storage; `401` handled globally |
| Offline / network error | Inline "Couldn't load. Retry." on the affected card only. | React Query retries 2× with backoff; page never goes blank |

---

## 7. Screen states

Every screen ships with all five states (empty, loading, error, success, special). Empty states tell the person what will appear and the one action that gets them there.

**Reference mockups (in the HTML version)**
- **Overview, first day** — A setup checklist ("Add session types ✓ / Set your weekly hours — NEXT / Connect Google Calendar") with a progress bar replaces the stats until the page is published.
- **Patients, empty** — "No patients yet. Patients appear here after their first booking through your page." Button: **Copy booking link**. The action is the thing that creates patients.
- **Booking page, slot conflict** — Inline banner: "4:00 PM was just booked by someone else. Your details are saved. Pick another time." The taken slot is struck out; the next free slot is selected.
- **Earnings, payouts not connected** — "Connect payouts to get paid. Patients can book now. Payments settle to your bank once Razorpay verifies your account." Button: **Connect Razorpay**.

| Screen | Empty | Loading | Error | Special |
|---|---|---|---|---|
| Overview | Setup checklist until published; then "No sessions today. Next: Thu 10:00" | Skeleton cards at final size | Per-card retry | Google / payout reconnect banner |
| Calendar | "No hours set" + Set hours | Grid renders, events fade in | Banner, grid stays usable | Drag conflict: snaps back + reason |
| Bookings | "No bookings yet" + Copy link | Table skeleton, 6 rows | Inline retry | Filter with no results: "No bookings match" + Clear filters |
| Patients | "No patients yet" + Copy link | List skeleton | Inline retry | Search no match; archived toggle |
| Patient detail | "No notes yet" + Add note; "No shared check-ins" when no consent | Header first, tabs lazy | 404: "Patient not found" + Back | Consent withdrawn badge |
| Sessions | "Completed sessions appear here" | Skeleton | Inline retry | Notes incomplete flag |
| Follow-ups | "Nothing due. Follow-ups you set after sessions show here." | Skeleton | Inline retry | Failed send: retry per item |
| Insights | "Insights start after 3 completed sessions" | Skeleton | Hide card, log error | Only consented data; label source + date |
| Earnings / Payments | "Connect payouts" or "No payments yet" | Numbers as skeleton, not ₹0 | Banner, last known values greyed | Refund in progress state |
| Your Page | Preview with missing fields highlighted | Preview skeleton | Save failed: field-level message | Slug taken: suggestions |
| Public booking | "No times in the next 14 days" + Notify me | Slot skeleton | Slot conflict, hold expired, payment failed (see Failure flows) | Unpublished page: "This page isn't available" |
| Settings | — | Form skeleton | Field-level errors, form keeps values | Unsaved changes guard |

**UI rules for every state.** Skeletons match the final layout so nothing jumps. Buttons show progress on themselves and disable while saving. Success is confirmed where the action happened (toast only for background work). Errors explain what happened and what to do, in plain words, and never clear what the person typed. Motion 180–250 ms, respects reduced motion. All states meet WCAG AA and work by keyboard.

---

## 8. Architecture

Few moving parts, all managed. No servers to run. Scales to hundreds of psychologists without a redesign.

| Layer | What | Details |
|---|---|---|
| **Frontend** | Existing React app | Vite + React Router + TypeScript · TanStack Query for server state · Vercel, wildcard `*.lumidai.in` |
| **Core** | Supabase · Mumbai | Postgres + row-level security · Auth: magic link + Google · Storage: photos, receipts · pg_cron for jobs |
| **Server logic** | Edge Functions | Public booking API · Razorpay + Resend webhooks · Google Calendar sync · Notifications, exports |
| **Integrations** | Pay-per-use | Razorpay (Route payouts) · Google Calendar + Meet · Resend email · WhatsApp, LLM (later) |

**Rule of thumb:** simple reads and writes by the logged-in psychologist go straight to tables, guarded by RLS. Anything public, involving money, a third party, or more than one row in one step goes through an Edge Function.

---

## 9. Data model

| Table | Holds | Key rule |
|---|---|---|
| `psychologists` | Profile, slug, bio, languages, photo, policy, published | id = auth user id; slug unique, lowercase |
| `session_types` | Name, duration, price, buffer, active | Price in paise (integer); soft-delete only |
| `availability_rules` | Weekday, start, end, timezone | No overlapping rules per day |
| `availability_blocks` | Leave, blocked time | Overrides rules |
| `patients` | Name, email, phone, tags, status | Unique (psychologist_id, email) |
| `bookings` | tstzrange, status, Meet link, code, manage token hash | Exclusion constraint on active statuses: no overlap |
| `payments` | Razorpay order / payment ids, amount, fee, status | Written only by server; unique razorpay_payment_id |
| `refunds` | Amount, reason, Razorpay refund id, status | Sum ≤ payment amount |
| `session_notes` | Encrypted body, focus, next steps, version | Owner-only; never in any export to patients |
| `follow_ups` | Due at, message, channel, status | Sent by job; retries tracked |
| `notifications` | Type, channel, recipient, provider id, status | Every email/WhatsApp logged |
| `integrations` | Google / Razorpay account refs, token in Vault | Tokens never selectable by client |
| `consents` | Scope, granted_at, withdrawn_at | Checked before any insight |
| `webhook_events` | Provider, event id, payload hash, processed_at | Unique event id = idempotency |
| `audit_log` | Actor, action, entity, request id, time | Append-only, no update/delete grant |

Every table: `id uuid`, `psychologist_id`, `created_at`, `updated_at` (trigger). Times stored in UTC, shown in Asia/Kolkata. Money stored in paise. Migrations live in the repo and run in CI; no changes made by hand in the dashboard.

---

## 10. Booking states

Main path: `pending_payment` → `confirmed` → `completed`

| From | To | Triggered by | Side effects |
|---|---|---|---|
| `pending_payment` | `confirmed` | Razorpay webhook `payment.captured` | Calendar event, Meet link, emails, reminders queued |
| `pending_payment` | `expired` | Cron after 10 min | Slot released |
| `confirmed` | `rescheduled → confirmed` | Patient (before cutoff) or psychologist | Old range released, event moved, emails |
| `confirmed` | `cancelled` | Patient or psychologist | Refund per policy, event deleted, emails |
| `confirmed` | `completed` / `no_show` | Psychologist after start time | Follow-up prompt; earnings updated |

Transitions happen in one Postgres function (`transition_booking`) that checks the current state, so two requests can't move a booking twice.

---

## 11. Endpoints

Edge Functions under `/functions/v1`. All inputs validated with zod schemas shared with the frontend. Public endpoints are rate limited per IP.

| Method · Path | Auth | Purpose | Errors |
|---|---|---|---|
| `GET /public/psychologists/:slug` | None | Published profile + session types | 404 NOT_FOUND |
| `GET /public/slots?slug&type&from&to` | None | Free slots, max 31 days | 422, 404 |
| `POST /public/bookings` | None + Idempotency-Key | Create hold + Razorpay order | 409 SLOT_UNAVAILABLE, 422, 429 |
| `POST /public/bookings/:id/verify` | Hold token | Verify checkout signature (fast path) | 400 INVALID_SIGNATURE, 410 HOLD_EXPIRED |
| `GET /public/bookings/:code` | Manage token | Booking detail for patient | 401, 404 |
| `POST /public/bookings/:code/reschedule` | Manage token | Move booking | 409, 403 CUTOFF_PASSED |
| `POST /public/bookings/:code/cancel` | Manage token | Cancel + refund per policy | 403 CUTOFF_PASSED, 409 |
| `GET/DELETE /public/consents` | Manage token + OTP | View / withdraw consent | 401, 404 |
| `POST /public/data-requests` | Email OTP | Export or delete request | 429 |
| `POST /bookings` | Psychologist | Manual booking / payment link | 409, 422 |
| `POST /bookings/:id/reschedule · cancel · outcome` | Psychologist | State changes | 409 INVALID_TRANSITION |
| `GET /integrations/google/connect · callback` | Psychologist | OAuth with PKCE + state | 400, 503 |
| `POST /payouts/onboard` | Psychologist | Razorpay linked account | 422, 503 |
| `GET /exports/:kind.csv` | Psychologist | Bookings / payments export | 429 |
| `POST /account/delete` | Psychologist + re-auth | Schedule deletion | 403 |
| `POST /webhooks/razorpay` | HMAC signature | Payment, refund, payout events | 401 (bad signature); always 200 on duplicates |
| `POST /webhooks/resend` | Svix signature | Delivery, bounce | 401 |

**Scheduled jobs**

| Job | Every | Does |
|---|---|---|
| `expire-holds` | 1 min | Unpaid holds older than 10 min → expired |
| `send-reminders` | 5 min | 24 h and 1 h reminders, once each |
| `send-follow-ups` | 15 min | Due follow-ups; 3 retries then mark failed |
| `reconcile-payments` | 1 h | Compare Razorpay vs DB, fix missed webhooks, alert on mismatch |
| `purge-deleted` | Daily | Hard-delete accounts past 30-day window |

---

## 12. Error handling

One shape for every response, so the frontend handles errors in one place.

```jsonc
// success
{ "data": { ... } }

// error
{ "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "That time was just booked.",
    "fields": { "start": "taken" },   // optional
    "request_id": "req_8f2c…"
} }
```

```ts
// frontend: one fetch wrapper
const res = await api.post("/public/bookings", body, { idempotencyKey });
// throws ApiError { code, status, message, fields }
// UI maps code → copy + action, never shows raw text
// 401 → sign-in, keep draft
// 5xx/network → retry 2× with backoff, then inline retry
```

| Code | HTTP | Meaning | UI behaviour |
|---|---|---|---|
| `VALIDATION_FAILED` | 422 | Input failed schema | Message under each field |
| `UNAUTHENTICATED` | 401 | No or expired session/token | Sign-in, return to same place |
| `FORBIDDEN` · `CUTOFF_PASSED` | 403 | Not allowed (or too late to change) | Explain rule, offer contact |
| `NOT_FOUND` | 404 | Missing or not yours (same answer) | Not-found state + back |
| `SLOT_UNAVAILABLE` · `INVALID_TRANSITION` | 409 | Conflict with current state | Refresh data, explain |
| `HOLD_EXPIRED` | 410 | Payment window passed | Offer same slot if free |
| `RATE_LIMITED` | 429 | Too many requests | "Try again in a minute" |
| `INTEGRATION_UNAVAILABLE` | 503 | Razorpay / Google down | Retry; booking not lost |
| `INTERNAL` | 500 | Unexpected | Generic message + request id; Sentry alert |

**Server rules.** Validate at the edge, then trust nothing from the client: prices, amounts and slot validity are recomputed on the server. Every mutating public call takes an `Idempotency-Key`. Webhooks store the event id first and return 200 on repeats. Errors never leak stack traces or SQL. Every log line carries `request_id`, never patient names, emails or note text.

---

## 13. Security & privacy

**Access**
- **RLS on every table**, default deny. Policy: `psychologist_id = auth.uid()`.
- **Automated RLS tests** in CI: user A can't read, update or delete user B's rows.
- **Service role** only inside Edge Functions; never shipped to the browser.
- **Patient links**: random 32-byte tokens, stored hashed, expire after the session.
- **Sensitive actions** (delete account, export) require fresh sign-in.

**Data**
- **Mumbai region** for all patient data.
- **Notes encrypted** with pgsodium / Vault keys; decrypted only for the owner.
- **OAuth tokens** in Supabase Vault, not in tables the client can read.
- **Daily backups** (Pro) + monthly restore test.
- **Minimum data**: no diagnosis fields on the booking form.

**Application**
- **Webhook signatures** verified with constant-time compare.
- **Security headers** on Vercel: CSP, HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy.
- **Rate limits** on public endpoints and OTP (5 / 15 min).
- **No secrets in the repo**; Vercel + Supabase env vars; gitleaks in CI.
- **Dependencies**: Dependabot + `npm audit` gate on high severity.

**DPDP & trust**
- **Consent records** with purpose and time; withdrawal works instantly.
- **Export and deletion** requests handled within 30 days, logged.
- **Audit log** of every patient record view and change.
- **Breach runbook**: who to notify, within what time.
- **Privacy notice + DPA** reviewed by a lawyer before launch.

Checked against OWASP Top 10 before each phase ships. "DPDP compliance in progress" stays in the UI until legal review is done; no compliance claims before that.

---

## 14. Codebase standards

```
src/
  app/            routes, layouts, providers
  features/
    bookings/     api.ts · hooks.ts · schema.ts · components/
    patients/
    calendar/  earnings/  settings/  public-booking/
  components/ui/  shared primitives (Button, Card, Empty…)
  lib/            api client, errors, dates, money, supabase
  types/          generated database types
supabase/
  migrations/     numbered SQL, the only way schema changes
  functions/      one folder per Edge Function + _shared/
  tests/          RLS + function tests
e2e/              Playwright: booking, payment, auth
```

**Rules**
- **TypeScript strict**, no `any`; DB types generated from schema.
- **One zod schema** per input, shared by form and server.
- **Components never call Supabase directly**; they use feature hooks.
- **Server state in TanStack Query**; UI state local. No global store unless needed.
- **Every data component** handles loading, empty, error, success.
- **Money and dates** only through `lib/money` and `lib/dates`.
- **Small files**: components under ~200 lines, functions do one thing.
- **ESLint + Prettier** enforced in CI; no warnings merged.
- **Mock data removed** from the bundle; seed script for demos instead.

| Test layer | Tool | Covers | Gate |
|---|---|---|---|
| Unit | Vitest | Slot calculation, money, refund policy, state transitions | Every PR |
| Database | pgTAP / Supabase test | RLS isolation, constraints, transition function | Every PR |
| Functions | Deno test | Endpoints, webhook signatures, idempotency | Every PR |
| End to end | Playwright | Sign up → publish → book → pay (Razorpay test) → confirm | Before production deploy |
| Accessibility | axe + keyboard pass | Booking page, dashboard core screens | Before production deploy |

---

## 15. How we ship

| Area | Practice |
|---|---|
| **Environments** | Local: Supabase CLI, seeded data · Preview: every PR, Razorpay test keys · Production: main branch, live keys |
| **Branching** | Short-lived branches from `main` · Conventional commits · Squash merge, PR required |
| **CI (GitHub Actions)** | Lint, type-check, unit · Migrations on fresh DB + RLS tests · Build, bundle size check · Secret scan, audit |
| **Release** | Migrations before app deploy · E2E on preview, then promote · Rollback = Vercel promote previous |

**PR checklist**
- [ ] All five screen states handled
- [ ] Inputs validated with shared schema
- [ ] RLS / auth considered, test added
- [ ] Errors use the error contract
- [ ] No secrets, no patient data in logs
- [ ] Works at 390 px and by keyboard
- [ ] Screenshot or recording attached

**Definition of done**
- Merged with green CI
- Tested on preview with real flow
- Sentry shows no new errors after 24 h
- Spec updated if behaviour changed
- Monitoring: uptime check on booking page, alert on webhook failure, daily reconcile report

---

## 16. Monthly cost

Assumes ~40 sessions per psychologist per month and 3 messages per session. List prices; confirm on each vendor's page at signup.

| Item | Pilot (1–5 psych.) | Launch (5–25 psych.) | Growth (25–100 psych.) |
|---|---:|---:|---:|
| Supabase (Free → Pro $25 → Pro + bigger compute) | ₹0 | ₹2,200 | ₹3,100 |
| Hosting (Vercel Hobby → Pro $20, or Cloudflare ₹0) | ₹0 | ₹0–1,760 | ₹1,760 |
| Email (Resend free tier → $20) | ₹0 | ₹0 | ₹1,760 |
| WhatsApp utility messages (~₹0.13 each, optional) | ₹0 | ~₹400 | ~₹1,600 |
| AI summaries (small model, opt-in) | ₹0 | ~₹300 | ~₹1,500 |
| Google Calendar + Meet API | ₹0 | ₹0 | ₹0 |
| Domain lumidai.in (yearly, spread monthly) | ~₹70 | ~₹70 | ~₹70 |
| Sentry, GitHub Actions, uptime check (free tiers) | ₹0 | ₹0 | ₹0 |
| **Total per month** | **~₹70** | **₹3,000–4,700** | **~₹9,800** |
| **Per psychologist (top of range)** | — | **~₹190** | **~₹100** |

> **Payment fees are separate.** Razorpay takes about 2% + 18% GST on that fee (≈2.36% of each payment): ₹35 on a ₹1,500 session.
> **Move to Supabase Pro before the first real patient:** the free tier pauses after a week of inactivity and has no daily backups. Vercel Hobby is for non-commercial use only.

---

## 17. Build roadmap

### 1 · Foundation — Week 1–2
- Repo restructure to feature folders, lint, CI
- Supabase (Mumbai), schema, RLS + tests
- Auth, protected `/app`, onboarding checklist
- API client + error contract; mock data replaced
- Empty / loading / error states on all screens

**Done when:** a psychologist signs up and sees only their own empty practice, with correct empty states.

### 2 · Booking & payments — Week 3–4
- Session types + hours editable
- Public page by subdomain
- Slots, holds, Razorpay checkout + webhook
- Failure flows: conflict, expiry, failed payment
- Earnings from real rows

**Done when:** E2E test books and pays in Razorpay test mode, including every failure flow.

### 3 · Calendar & reminders — Week 5–6
- Google connect, Meet link per booking
- Reschedule / cancel / refunds, both sides
- Emails + reminders + follow-ups
- Reconcile job, monitoring, alerts

**Done when:** one real psychologist runs a full week of sessions on Lumid.

### 4 · Care & intelligence — After pilot
- Encrypted notes, care plans, audit view
- Patient consent + data-rights pages
- Opt-in AI summaries, clinician-reviewed
- WhatsApp if email isn't enough

**Done when:** pilot psychologists report time saved, measured.

---

## 18. Decisions needed before building

1. **Repo access** — Make the repo public briefly, or connect the local project folder to this session, so the backend can be wired into the actual code.
2. **Who receives the money** — Razorpay Route (paid into each psychologist's account, Lumid's share split automatically) or each psychologist uses their own Razorpay keys. Route is cleaner but needs KYC per psychologist.
3. **Who pays the ~2.36% gateway fee** — Psychologist, patient (convenience fee), or Lumid.
4. **Default cancellation policy** — Proposed: free reschedule/cancel until 24 h before; no refund after; psychologist can change it.
5. **Reminder channel for launch** — Email only (free) or email + WhatsApp (needs verified Meta business account and approved templates).
6. **Hosting for paid launch** — Vercel Pro (~₹1,760/mo, easiest wildcard subdomains) or Cloudflare Pages (free, more setup).

---

*Prepared for Lumid AI. Estimates, not quotes. Not legal advice: DPDP obligations and payment-aggregator rules should be confirmed with a qualified advisor before handling real patient data.*
