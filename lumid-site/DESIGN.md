---
name: Lumid AI public site
description: Two inks on sage paper; the Indian Railways reservation chart, where a booking counts only once it says CNF.
colors:
  forest: "#0f2a17"
  forest-raise: "#16381f"
  forest-rule: "#2a4a31"
  lime: "#8bd65e"
  lime-deep: "#6fbf43"
  lime-text: "#2f7514"
  lime-wash: "#dff2d2"
  paper: "#eef2ec"
  paper-deep: "#e3e9e0"
  stub-white: "#ffffff"
  ink: "#0f1a12"
  ink-soft: "#4a574d"
  rule: "#cdd6c9"
  on-forest: "#eef2ec"
  on-forest-soft: "#a7bda8"
  error: "#b3261e"
typography:
  display:
    fontFamily: "General Sans, Manrope, system-ui, sans-serif"
    fontSize: "clamp(52px, 7.6vw, 120px)"
    fontWeight: 600
    lineHeight: 0.92
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "General Sans, Manrope, system-ui, sans-serif"
    fontSize: "clamp(38px, 4.6vw, 68px)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.028em"
  title:
    fontFamily: "General Sans, Manrope, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "General Sans, Manrope, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "\"tnum\" 1, \"ss01\" 1"
  label:
    fontFamily: "General Sans, Manrope, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
  data:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.04em"
    fontFeature: "\"zero\" 1"
rounded:
  stamp: "7px"
  inner: "10px"
  field: "12px"
  card: "16px"
  stub: "18px"
  sheet: "20px"
  pill: "999px"
spacing:
  gutter: "clamp(16px, 4vw, 56px)"
  col-gap: "clamp(16px, 2vw, 28px)"
  row: "24px"
  section-tight: "clamp(56px, 8vw, 112px)"
  section: "clamp(80px, 11vw, 160px)"
components:
  button-lime:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.forest}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "48px"
  button-lime-hover:
    backgroundColor: "{colors.lime-deep}"
  button-forest:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.on-forest}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "48px"
  button-forest-hover:
    backgroundColor: "{colors.forest-raise}"
  button-line:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "48px"
  button-line-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  nav-link:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "40px"
  nav-link-active:
    backgroundColor: "{colors.stub-white}"
    textColor: "{colors.forest}"
  stamp-cnf:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.forest}"
    typography: "{typography.data}"
    rounded: "{rounded.stamp}"
    padding: "0 8px"
    height: "26px"
  stamp-wl:
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    rounded: "{rounded.stamp}"
    padding: "0 8px"
    height: "26px"
  stamp-can:
    textColor: "{colors.ink-soft}"
    typography: "{typography.data}"
    rounded: "{rounded.stamp}"
    padding: "0 8px"
    height: "26px"
  code-cell:
    textColor: "{colors.ink-soft}"
    typography: "{typography.data}"
    padding: "0 0 0 10px"
    height: "26px"
  ticket-stub:
    backgroundColor: "{colors.stub-white}"
    rounded: "{rounded.stub}"
    padding: "30px 32px 28px"
  chart-sheet:
    backgroundColor: "{colors.stub-white}"
    rounded: "{rounded.sheet}"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "14px 16px"
  field-focus:
    backgroundColor: "{colors.stub-white}"
---

# Design System: Lumid AI public site

Scope: the public marketing site in `lumid-site/` only. The Lumid dashboard app has its own system in the project-root `DESIGN.md`; do not merge them.

## Overview

**Creative North Star: "The Reservation Chart"**

The site speaks the language of the Indian Railways reservation chart: ruled chart tables, perforated white ticket stubs, booking codes, and the move from WL to CNF. That familiar grammar carries the product's one mechanism, that a session is confirmed only once it is paid, without explanation. Pages are sheets of sage paper ruled with thin lines, and the forest bands read as the night pages of the same ledger.

The system runs on two inks, forest and lime, over sage paper, with white reserved for the things you hold: stubs, chart sheets, form slips, cards. Density is calm and editorial. Large tight-set General Sans headlines sit on a 12-column module, and data lives in ruled rows with tabular figures. Status is never shown with a third hue. It is shown by the form of the stamp: an outline while held, a lime fill once paid, a strike once cancelled.

The site explicitly rejects the centred-headline-plus-screenshot SaaS page. Proof comes from the real dashboard screens, framed on paper-deep mats.

**Key Characteristics:**
- Two inks (forest, lime) on sage paper, white stubs and sheets, no third brand hue.
- Ruled chart grammar: 2px ink head rule, 1px sage rules between rows.
- Perforated ticket stubs with notched edges and a dashed tear line.
- Status carried by stamp form (WL outline, CNF lime fill, CAN struck outline).
- Mono only for data; every label and heading is General Sans.
- Pill controls throughout, matching the dashboard.

## Colors

A restrained two-ink palette: deep forest and bright lime on a cool sage paper, with white kept for held objects.

### Primary
- **Night Forest** (forest): Headlines on paper, the primary dark button, forest bands (consent, how-it-works, closing, footer), the selection text, and focus rings on paper.
- **Forest Raise** (forest-raise): Hover on forest buttons and the giant footer wordmark, a single step lifted off forest.
- **Forest Rule** (forest-rule): Hairlines and card borders inside forest bands.

### Secondary
- **Signal Lime** (lime): Fills only. The CNF stamp, the primary lime button, the open FAQ marker, text selection, and lime text or icons placed on forest.
- **Pressed Lime** (lime-deep): Lime button hover, the selected-row dot, the input caret, and small check icons.
- **Ledger Lime** (lime-text): The only lime used as text on paper (the "Confirmed." line, the wordmark's "AI"). It exists for contrast, about 5:1 on paper.
- **Lime Wash** (lime-wash): Quiet confirmed surfaces on paper: the paid strip in the stub, form success, icon wells on contact cards.

### Neutral
- **Sage Paper** (paper): The page ground, and the fill of form fields and the stub's pay strip.
- **Deep Sage** (paper-deep): Nav hover, and the mat that frames dashboard screenshots.
- **Stub White** (stub-white): Ticket stubs, chart sheets, the contact form, the active nav pill, and focused fields.
- **Chart Ink** (ink): Body text, the 2px head rule of every chart, WL stamp outlines, and the line button.
- **Soft Ink** (ink-soft): Secondary copy, column headers, field keys, and code cells.
- **Sage Rule** (rule): The 1px row rule, card borders, the dashed perforation, and the CAN stamp outline.
- **Paper on Forest** (on-forest) and **Sage on Forest** (on-forest-soft): Primary and secondary text inside forest bands.
- **Error Red** (error): Form validation only, as the field border and message. It is never decorative.

### Named Rules
**The Two Inks Rule.** Forest and lime are the only brand hues. Status, emphasis and category never get a third color. Error red is used for validation and nowhere else.

**The Lime Contrast Rule.** Bright lime is a fill, or text on forest. Lime text on paper or white is always Ledger Lime (lime-text). Never set bright lime or Pressed Lime as text on paper.

## Typography

**Display Font:** General Sans (with Manrope, system-ui)
**Body Font:** General Sans
**Data Font:** JetBrains Mono (500, 700)

**Character:** One confident grotesque does all the speaking, set tight and large in forest. The mono appears only where a railway chart would print a value.

### Hierarchy
- **Display** (600, clamp(52px, 7.6vw, 120px), 0.92, -0.045em): The hero headline, set as stacked lines. Sub-page h1s use clamp(48px, 6.6vw, 100px) at 0.94, and the closing line uses clamp(48px, 7vw, 108px).
- **Headline** (600, clamp(38px, 4.6vw, 68px), 1.02, -0.028em): Section heads in forest, paired with a soft-ink paragraph on columns 9 to 12.
- **Title** (600, 21px, 1.2, -0.02em): Ledger, timeline, principle and index-row titles. Scales up to clamp(24px, 2.2vw, 32px) for route stations.
- **Body** (400, 17px, 1.55): Tabular and stylistic-set figures are on globally. Ledes run at 18 to 21px and are capped at 34 to 46ch.
- **Label** (500, 12 to 14px, ink-soft): Column headers, field keys, status keys and captions. Sentence case, never uppercase-tracked.
- **Data** (JetBrains Mono 700, 12 to 13px, 0.04em, slashed zero): Booking codes (LMD 4821 0937), screen codes (OVW, BKG), category codes, status stamps, and the TBD fee value.

### Named Rules
**The Data-Only Mono Rule.** Mono is used for what a chart would print: booking codes, screen codes, status stamps, and the TBD value. Labels, headings, captions and buttons are always General Sans.

**The Tight Display Rule.** Display and headline type is tracked negative (-0.028em to -0.045em) with leading at or below 1.02. Body type is never tracked.

## Layout

The layout is a 12-column module (`repeat(12, minmax(0, 1fr))`) with a fluid column gap, inside a 1360px container with a fluid gutter. Compositions are deliberately asymmetric. Copy takes columns 1 to 5 or 1 to 6 and the object (stub, screen, chart) takes 6 or 7 to 12. Section heads put the headline on 1 to 7 and the explanatory paragraph on 9 to 12, aligned to the bottom.

The vertical rhythm uses `section` padding for full sections and `section-tight` for follow-ons. Chart rows pad 14 to 24px vertically, and ruled list rows pad 20 to 28px. The sticky nav is 76px high, with a translucent paper backdrop that gains a rule once scrolled. Sticky preview columns sit at top 100px.

Responsive behaviour: the nav collapses to a sheet at 920px. Most 12-column splits stack at 960px (the hero at 1080px). Ledger and rule rows become a narrow code column plus content below 760 to 860px. The stub drops its side panel below its main panel at 560px. Chart tables scroll horizontally above 640px. Below 640px they drop secondary columns and show the booking code under the name.

## Elevation & Depth

The system is flat by default. Depth comes from the paper → white change and from rules, not from shadows. Two soft shadows exist, and both belong to held objects. The stub is lifted like a ticket on a desk, and phone screenshots get a deep drop. Outlines use inset box-shadow rings rather than borders, so they never shift layout.

### Shadow Vocabulary
- **Ticket lift** (`box-shadow: 0 1px 0 rgba(15,26,18,.04), 0 24px 48px -28px rgba(15,42,23,.35)`): Ticket stubs only.
- **Device drop** (`box-shadow: 0 30px 60px -30px rgba(15,42,23,.45)`): Phone screenshots on the features page.
- **Inset ring** (`box-shadow: inset 0 0 0 1.5px <ink>`): WL stamps, the TBD value and FAQ markers. A 1px rule ring is used for the active nav pill.

### Named Rules
**The Held Object Rule.** Only things a person would hold (stubs, phones) cast a shadow. Sheets, cards and forms sit flat on 1px rules.

## Shapes

Shapes are soft-cornered and stepped by size: 7px stamps, 10px inner strips, 12px fields and screen insets, 16px cards, 18px stubs, 20px sheets and frames. Every control is a full pill. The signature silhouette is the perforated stub. A radial-gradient mask cuts 13px semicircular notches top and bottom at the tear line, and a 2px dashed rule runs between them. Dashed rules recur elsewhere as the world's perforation: the how-it-works route line, the mobile ledger divider, and the photo placeholder. A chart sheet joins its screenshot frame as one object, with the top corners rounded on the sheet and the bottom corners on the frame.

## Components

### Buttons
Pill-shaped, confident and short.
- **Shape:** Full pill (999px). Sizes are 40px (small, 15px text), 48px (default, 16px) and 56px (large, 17px). Text is weight 600.
- **Lime:** The primary call to action ("Start free"), with lime fill and forest text. Hover moves to Pressed Lime.
- **Forest:** The dark alternative on paper, with forest fill and paper text. Hover moves to Forest Raise.
- **Line:** A 1px ink outline. On hover it inverts to an ink fill with paper text. On forest bands it uses an on-forest-soft outline and inverts to an on-forest fill.
- **Hover / Focus:** 0.25s transitions on the ease-out curve, and arrow icons nudge 3px right. Active presses the button down 1px. Focus is a 2px forest outline offset by 3px (lime on forest).

### Status stamps
Status only, in mono 700 at 12px, 26px high, 7px corners, minimum 52px wide.
- **CNF:** Lime fill with forest text. Paid and confirmed.
- **WL:** An ink outline ring with ink text, used for held but unpaid (WL 1, WL 2). On forest it uses an on-forest ring.
- **CAN:** A rule-colored outline with soft-ink text, struck through. Cancelled.
- The contact slip uses a large variant: 40px high, 96px minimum width, 15px text.

### Code cell
The neutral marker for categories (PAY, CONSENT, SOLO, WA, APP), set in mono 700 at 12px in soft ink, with a 2px left rule in the current color. It has no fill and no ring. Index rows use the same voice without the rule for screen codes (OVW, BKG). When a row is selected, its screen code turns forest and gains an 8px Pressed Lime dot.

### Ticket stub (signature)
The ticket stub is a white card with an 18px radius, the ticket lift shadow, and notched perforations. Its main panel holds a brand and code head and a grid of fields. Each field pairs a 12px soft-ink key with a 17px 600 value, and the large value runs to clamp(26px, 2.3vw, 34px). A 188px side panel sits behind a dashed tear line and holds the status roll. That roll is a 76px window with a 2px ink border, and mono 30px text that slides from WL to CNF over 0.7s. When the stub confirms, the border and fill turn lime and the pay strip moves from paper to Lime Wash with a check. The pricing stub drops the notches and runs single-panel.

### Chart table
A white sheet with a 20px top radius and a 1px rule border. Its title bar carries a 17px heading and a mono meta line over a 2px ink rule. Headers are 12px 500 soft-ink labels, and cells pad 14px 24px with 1px rules between them. Times and fees use tabular figures, and the live row takes a faint lime-white tint. The sheet joins a Deep Sage frame that holds the real screenshot. Flat variants (the features index, ledgers, the FAQ, timelines, fare lines) keep only the 2px ink head rule and 1px row rules on paper.

### Inputs / Fields
- **Style:** Paper fill, a transparent 1px border, 12px radius, 14px 16px padding, 16px text, and a Pressed Lime caret. Labels are 14px 500 General Sans above the field.
- **Hover:** The border becomes Sage Rule.
- **Focus:** A forest border with a white fill. The browser outline is replaced by this border change.
- **Error:** An Error Red border, a #fff6f5 fill and a 13px red message below the field. Success shows a Lime Wash strip in forest text.

### Navigation
The sticky 76px bar sits on translucent paper with a backdrop blur. The wordmark is 22px 700 forest, with "AI" in Ledger Lime. Links are 40px pills in 15px 500 soft ink. Hover gives a Deep Sage fill. The current page gets a white fill, a 1px rule ring and forest text. Sign in is a plain text link, and Start free is a small lime button. Below 920px a 44px round toggle opens a full-width paper sheet of 22px 600 links with paired buttons.

### Forest bands
Consent, how it works, the closing call to action and the footer invert to forest, on-forest text and forest-rule hairlines. The how-it-works route is a dashed on-forest-soft line connecting three stations, each topped by a stamp. The footer ends in a giant 700-weight LUMID AI wordmark in Forest Raise, which reads as a watermark rather than a headline.

## Do's and Don'ts

### Do:
- **Do** show status by stamp form: WL as an ink outline, CNF as a lime fill, CAN as a struck rule outline.
- **Do** mark categories with the neutral code cell (mono, soft ink, 2px left rule), never a stamp.
- **Do** keep mono to data: booking codes, screen codes, stamps and the TBD value.
- **Do** use Ledger Lime (lime-text) for any lime text on paper. Keep bright lime for fills and for text on forest.
- **Do** open every chart or ruled list with a 2px ink head rule and separate rows with 1px Sage Rule.
- **Do** put held objects (stubs, forms, chart sheets) on Stub White over sage paper.
- **Do** show the real dashboard screens on a Deep Sage mat with 12px inner corners.

### Don't:
- **Don't** introduce a third brand hue for status, category, or emphasis.
- **Don't** put a category or step label in a WL or CNF stamp. Stamps mean held, paid, or cancelled.
- **Don't** set labels, headings, or buttons in mono.
- **Don't** set bright lime (#8bd65e) or Pressed Lime as text on paper or white.
- **Don't** add shadows to sheets, cards, or forms. Shadow is reserved for stubs and phone screenshots.
- **Don't** use square or small-radius buttons. Controls are pills.
