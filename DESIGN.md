---
name: Lumid AI Dashboard
description: An operating system for an independent psychologist's practice — payment-enforced booking, calendar, patients, and follow-ups.
colors:
  primary: "#2dc500"
  primary-deep: "#56a835"
  primary-focus: "#229a00"
  primary-soft: "#e8f7ec"
  ink: "#17181a"
  ink-muted: "#8b8f97"
  canvas: "#ffffff"
  canvas-parchment: "#fafafa"
  hairline: "#e8e9eb"
  amber-bg: "#f7fadb"
  amber-fg: "#7a9605"
  rose-bg: "#ffe4ea"
  rose-fg: "#ef4d78"
  blue-bg: "#e3edff"
  blue-fg: "#2f6fed"
  violet-bg: "#ece7ff"
  violet-fg: "#7c5cff"
typography:
  display:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.04em"
rounded:
  sm: "8px"
  md: "10px"
  lg: "16px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-focus}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  badge-paid:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-focus}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  badge-pending:
    backgroundColor: "{colors.amber-bg}"
    textColor: "{colors.amber-fg}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  card:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: Lumid AI Dashboard

## Overview

**Creative North Star: "The Clinic Whiteboard"**

Lumid reads like the whiteboard behind a good solo therapist's desk: plain, fast to scan between sessions, and completely unbothered with performing "software." Every screen answers one question — what needs my attention right now — before it answers anything else. The system is deliberately quiet everywhere except the one green thread that runs through it: payment status, the primary action, the active nav item. That green is doing real work (it's the product's core promise, payment before confirmation), not decoration, so it stays rare and precise rather than washing the page.

This is an Operate-mode dashboard, not a marketing surface. It rejects the two failure modes of clinical software: the sterile, gray enterprise-EHR look, and the over-designed SaaS-dashboard look (gradient hero tiles, icon-badge stat cards, drop shadows on everything). Instead: flat white cards, hairline dividers doing the separating work that shadows usually do, one confident sans-serif, and generous but not decorative whitespace. Nothing on the page should make a psychologist between two 50-minute sessions stop and parse it.

**Key Characteristics:**
- Single-hue brand system: one green (as an exact diagonal gradient on the primary action, flat everywhere else), no secondary/tertiary brand colors — only functional pastels for status.
- Flat and bordered, never shadowed. Depth comes from hairlines and background-tint contrast, not elevation.
- Pill-shaped everything that's actionable or stateful: buttons, badges, nav highlights, filter segments.
- Manrope throughout — one typeface, weight and size carry all the hierarchy.
- Information density over decoration: a stat card is a number, not an illustration of a number.

## Colors

The palette is almost monochrome by design — near-black ink on near-white canvas — with exactly one saturated hue doing all the brand and semantic-positive work, plus three muted pastels reserved strictly for status, never for decoration.

### Primary
- **Clinic Green** (`#2dc500` → `#56a835` diagonal gradient, 135°): the primary action only — "Add New Booking" and equivalent confirming CTAs. Nowhere else is the gradient used; flat `#2dc500` stands in for it in nav highlights, links, and the Paid badge, so the gradient stays a landmark, not a texture.
- **Clinic Green, focus** (`#229a00`): hover/active state for the primary action and the darker text tone paired with the pale green badge background.
- **Clinic Green, soft** (`#e8f7ec`): active-nav pill fill, Paid-badge background. The only tint of the brand color that appears at rest.

### Neutral
- **Ink** (`#17181a`): all primary text. Near-black, not pure black — softer under long reading between sessions.
- **Ink, muted** (`#8b8f97`): secondary text, captions, inactive nav, placeholder text.
- **Canvas** (`#ffffff`): card and surface background.
- **Canvas, parchment** (`#fafafa`): page background, one step off white so white cards read as objects sitting on it.
- **Hairline** (`#e8e9eb`): every border, divider, and card edge. This is the system's only depth cue — see Elevation & Depth.

### Status (functional only — never used decoratively)
- **Awaiting-payment olive** (bg `#f7fadb`, text `#7a9605`): the one non-green semantic color, reserved for anything payment- or attention-pending. Deliberately close in hue to the brand green (olive, not amber/orange) so it reads as "part of the same payment story," not as a generic warning color.
- **Overdue rose** (bg `#ffe4ea`, text `#ef4d78`): cancellations, no-shows, lapsed patients.
- **Neutral-info blue** (bg `#e3edff`, text `#2f6fed`) and **violet** (bg `#ece7ff`, text `#7c5cff`): chart/category differentiation only (e.g. session type breakdowns) — not status, not brand.

### Named Rules
**The One Gradient Rule.** The diagonal green gradient appears in exactly one place: the primary CTA. Every other green in the system is the flat start-color. A second gradient anywhere is a violation, not a variant.

## Typography

**Body & Display Font:** Manrope (with `system-ui, -apple-system, "Segoe UI", sans-serif` as the fallback stack — Manrope is self-hosted via Google Fonts, so the fallback only matters before the font loads).

**Character:** Manrope is a geometric-but-warm grotesque — confident enough for a 700-weight greeting headline, plain enough that a 400-weight patient note never looks decorative. One family, no serif or mono anywhere, so the type system's only lever is weight, size, and color.

### Hierarchy
- **Display** (700, 26px, line-height 1): page greeting only ("Good Morning, Dr. Anitha"). Appears once per page.
- **Title** (700, 17px, line-height 1.3): card headers ("Today's Schedules", "Practice overview").
- **Body, strong** (600, 13px): primary row content — patient names, KPI numbers at 28px/700 as the one intentional size jump for hero numbers.
- **Body** (400, 13px): default text, captions one step down at 11–12px in muted ink.
- **Label** (600, 11px, tracking 0.04em, uppercase): KPI column headers, section eyebrows on grouped nav — the only uppercase+tracked text in the system, reserved for true metadata labels.

### Named Rules
**The No-Serif Rule.** Nothing in the product ever sets a serif face, including in marketing-adjacent surfaces like the public booking page. The whiteboard has one voice.

## Layout

Single-column content max-width (1160px) centered under a fixed 232px sidebar, with a sticky top bar (search, notifications, avatar) above it. Content sections stack vertically with consistent 16–20px gaps; grids (KPI row, chart+calendar row, booking-mix+patient-status+needs-attention row) collapse to a single column below `lg`. Density is comfortable but not spacious — this is a tool checked many times a day, not a page that needs to breathe for a first-time visitor. Card internal padding sits at 20px (`--spacing-lg`) for content cards, 16px for list rows.

## Elevation & Depth

Flat by design — no shadows anywhere on the interface. Depth is conveyed entirely through the hairline border (`#e8e9eb`, 1px) plus the one-step background contrast between `canvas` (#fff, cards) and `canvas-parchment` (#fafafa, page). A card is "raised" only in the sense that it's white on off-white with a defined edge; nothing lifts, glows, or casts a shadow on hover. The sidebar and top bar separate from content with the same hairline, never a shadow.

### Named Rules
**The Flat-By-Default Rule.** If an element needs a shadow to read as separate, it needs a hairline instead. `box-shadow` does not appear in this system outside of a browser-native focus ring.

## Shapes

Two radii cover the whole system: **16px** on cards and containers, **pill (9999px)** on everything interactive or stateful — buttons, badges, chips, the segmented filter control, the active-nav highlight. There is no small/sharp radius in between; a shape is either a soft card or a full pill, never a compromise rounded-md button. Icons are 13–16px, one consistent stroke weight (1.75–2px), from lucide-react — never emoji, never mixed icon sets.

## Components

### Buttons
- **Shape:** pill (9999px), no exceptions.
- **Primary:** the diagonal green gradient (`#2dc500` → `#56a835`, 135°), white text, no border. Reserved for the single most important action on a view (booking, confirming).
- **Secondary:** white background, hairline border, muted-ink text; used for everything that isn't the primary commitment (Export, Open Calendar, View Profile).
- **Hover/Focus:** secondary buttons tint to the parchment background on hover; a 2px solid focus ring in the primary-focus green with 2px offset marks keyboard focus on every interactive element.

### Badges / Status pills
- **Style:** pill shape, pastel background with a matching darker-tone text — never a solid-fill badge, always the soft-bg + saturated-text pairing so badges stay legible without shouting.
- **Paid** = green-soft / green-focus text. **Pending/awaiting** = olive-bg / olive text. **Cancelled/lapsed** = rose-bg / rose text.

### Cards / Containers
- **Corner Style:** 16px radius.
- **Background:** white on the parchment page background.
- **Shadow Strategy:** none — see Elevation & Depth.
- **Border:** 1px solid hairline, always.
- **Internal Padding:** 20px for content cards; list-row cards use 20px horizontal / 14px vertical per row, separated by hairline dividers rather than gaps.

### Inputs / Fields
- **Style:** hairline border, white or parchment fill, pill or 10px radius depending on context (search bar is pill; form fields are 10px).
- **Focus:** border shifts to the primary green plus the 2px focus ring.

### Navigation
- **Sidebar:** grouped by uppercase-label section (PRACTICE / CARE), 16px icon + 13px medium-weight label per item. Active state is the pale-green pill fill (`#e8f7ec`) with green icon and text — no border, no bold weight change, the fill alone carries the state.
- **Top bar:** search input (pill), notification bell, avatar — no decoration, sticky on scroll.

## Do's and Don'ts

### Do:
- **Do** keep the gradient exclusive to the primary CTA (The One Gradient Rule).
- **Do** use hairlines and background-tint, never shadows, for every card/section boundary.
- **Do** use the pill radius for anything stateful or clickable, and 16px for everything else — no third radius.
- **Do** pair every badge's saturated text with its matching pastel background, never a bare colored dot as the only status signal (color-blind-unsafe on its own).
- **Do** keep KPI/KPI-adjacent numbers as the one place font-size jumps above 17px outside the page greeting.

### Don't:
- **Don't** add a second gradient, an icon-badge stat card, or a drop shadow anywhere — these were explicitly removed from earlier iterations of this dashboard and must not return.
- **Don't** introduce a second brand hue. Status pastels (olive/rose/blue/violet) stay functional-only.
- **Don't** use emoji as icons or section markers; lucide-react only.
- **Don't** set anything in a serif or monospace face.
