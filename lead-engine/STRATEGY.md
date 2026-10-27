# Lumid Lead Engine — strategy and run book

Last updated 2026-09-22.

---

## 0. Free-only mode (decided 22 Sep — this overrides the budget in §5)

Riyan's call: spend nothing. That is achievable, and it changes which half of
the tool gets used.

**The free stack:**

| Piece | Cost | Why |
|---|---|---|
| Groq LLM (`groq:llama-3.3-70b-versatile`) | free tier, no card | Anthropic/OpenAI both need paid credits. Groq's free tier does the qualifying. |
| BetterContact account | free, 50 credits, no card | Signup only. We never spend the credits. |
| `find N` **without** `emails` | **zero credits** | Discovery and qualification are free. Only address resolution costs. |

**The insight that makes this work:** `openoutfind/core/export.py:107` maps
`"linkedin_url": lead.profile_url`. The profile URL arrives during *discovery*,
which is the free half — it is not something the paid email lookup adds. So a
free `find` returns qualified leads **each carrying a LinkedIn profile URL**,
with a written reason for why they fit.

That is the whole answer to "use it to get leads through LinkedIn." Not the
sending half — the finding half, feeding LinkedIn outreach done by hand.

**Never run `send` or `run`.** Three separate reasons beyond cost:

1. Every message the tool sends ends with the fixed line **"Sent with
   OpenOutreach"**. There is no setting that removes it. On a founder-to-founder
   pitch that line announces mass outreach and will cost replies.
2. Sending makes you the sender in law — anti-spam compliance, a postal address
   the software does not supply, and a `+unsub` alias that has to actually work.
3. **The contacts store.** Legal Notice §6: because India is not in the
   EU/EEA/UK/CH set, contribution is **on with no toggle** — resolved emails get
   pooled and may be disclosed to other operators. But contribution happens only
   *"after a paid email-finder returns a verified work email."* Spend no credits,
   resolve no emails, contribute nothing. Free-only mode sidesteps §6 entirely.

Also note: outside protected jurisdictions the onboarding newsletter default is
**yes**. Say no at the prompt if you do not want it.

---

## 1. The correction this plan is built on

OpenOutreach does not touch LinkedIn. It is browserless by design — it sources
people from BetterContact, a licensed B2B data provider, has an LLM qualify each
one against your ICP, and emails them from your mailbox. The repo advertises
"zero platform-ToS surface" precisely because it never logs into a social
network. LinkedIn appears in exactly one place: a `linkedin_url` column in the
CSV it prints.

So OpenOutreach cannot find the thing your original lead-collector idea was built
around — people *posting* "I need a UI designer this week." Those are two
different motions and they convert completely differently:

| | Intent | Outbound |
|---|---|---|
| Source | LinkedIn post search, your own session | OpenOutreach + BetterContact |
| Volume | 3-10 a week | Unlimited candidates, 40 free verified emails |
| Buyer state | Actively hiring, budget decided | No idea you exist |
| Reply rate | 20-40% | 2-5% |
| Speed to money | Days | Weeks |
| Cost | Your time | Credits + sender reputation |

Neither replaces the other. Intent pays this month. Outbound builds a pipeline
that still exists next month. Run both.

---

## 2. The three lanes

**Lane A — Intent (LinkedIn post search).** Already built: `lead-queue.html`, the
Lumid Lead Queue artifact. Claude drives your own logged-in LinkedIn session in
the browser pane, runs the content searches, and logs leads with an Email/DM-only
badge. Nothing auto-sends. This stays exactly as it is — it is the highest
converting thing you have and it costs nothing but attention.

**Lane B — Outbound (OpenOutreach).** What we just set up. Two campaigns, India
and global, each with its own ICP and its own database. Finds companies that fit
the profile, writes down why each one fits, and drafts the mail.

**Lane C — the LinkedIn layer on top of Lane B.** This is where LinkedIn actually
belongs in this system, and it is the part most people skip. Every OpenOutreach
lead comes with a `linkedin_url`. A cold email from an unknown name is deleted. A
cold email from a name the founder saw on LinkedIn two days ago gets read.

The sequence, per lead, done by you manually:

1. **Day 0** — view their LinkedIn profile. They get a notification. No action
   needed from them, no ToS problem, no automation.
2. **Day 1** — send the email. It now lands on a name with a face attached.
3. **Day 3** — if no reply, send a connection request with no note, or a note of
   one line that is not a pitch.
4. **Day 5** — one follow-up email. One. Then stop.

Do not automate steps 1 or 3. LinkedIn suspends accounts for automated
connecting, and your founder profile is worth far more than these leads.

---

## 3. The offer

**One-week Product UI Sprint. Fixed scope, fixed price.**

- India: ₹35,000
- US/UK/EU: $1,800

Day 1 call and flow mapping. Days 2-4 design the flow properly in Figma with real
states. Day 5 handover with components, tokens and a walkthrough.

Why fixed-scope beats "available for UI/UX work": a cold reader will not start a
negotiation with a stranger. They will say yes to a small, bounded, obviously
reversible thing. The sprint is designed to be cheap to try and cheap to walk
away from, and to convert into flow-by-flow repeat work once the first one lands.

Raise the global price to $2,500-3,000 after two completed sprints with
testimonials. $1,800 is an introductory price that buys proof, not your rate.

---

## 4. Identity — who sends this

**Decision: send personally, framed as a founder who designs.** Not a studio
persona.

Your operating doc says not to let people read you as "just a UI designer," and
that rule is correct — but it is a rule about your *public* positioning. A cold
email is a private 1:1 channel. Nobody's perception of you shifts because a
founder in Bengaluru received an email. The conflict only becomes real if you
start posting "available for freelance design" on your LinkedIn feed, which you
should not do. Keep the feed founder-positioned; let the email do the selling.

Sending personally also wins on substance. Every other designer in that inbox is
a freelancer asking for hours. You are a founder who built and shipped a product
and is doing customer interviews right now. That is the hook, and a studio
identity would throw it away.

**One change though: do not send from your primary personal Gmail.** Cold volume
on your main address risks the account you use for everything. Set up
`riyan@lumid.in` on Google Workspace — your own domain, your real name, separate
from your personal inbox, and it reinforces that lumid.in is a real thing.

---

## 5. Budget: the 40 free credits

BetterContact's free tier is 40 credits. One credit buys one verified work email.
**Finding leads is free and spends nothing** — `find N` without the `emails`
argument costs zero. That is the most important cost fact in this whole system.

So do not spend a credit until the qualifier is behaving:

- **Step 1 (free).** `find 25` on the India campaign. Read every `reason` in the
  CSV. That column is the LLM explaining why each lead fits. If the reasons are
  vague, or it is qualifying design agencies, fix `target.md` and run again.
  Free, repeat as often as you like.
- **Step 2 (10 credits).** Once the reasons read well, `find 10 emails` on India.
  These are your first real sends.
- **Step 3 (15 credits).** Refine the message from what happened, then India again.
- **Step 4 (15 credits).** Global campaign.

40 emails is a test, not a pipeline. At a realistic 2-5% reply rate, expect one to
three replies from the whole free tier. The point of the free tier is to prove the
ICP and the message are right before you pay for volume.

---

## 6. Four-week plan

**Week 1 — set up and tune, spend nothing.**
Get the Workspace mailbox and app password. Fill in `.env`. Read the legal notice.
Run India `find 25` free, read the reasons, tune `target.md` until the
qualification is honest. Meanwhile run Lane A daily — the LinkedIn post search
takes fifteen minutes and can produce a paying client this week.

**Week 2 — first real sends, India.**
`find 10 emails`. Run the Lane C sequence on all ten. Send 5 emails a day, not 10
in one burst — a new mailbox that sends a batch on day one gets filtered. Log
every reply.

**Week 3 — refine and widen.**
Rewrite the offer paragraph based on what actually got replies. India `find 15
emails`. Ramp to 10 sends a day. Start the global campaign's free `find` pass and
tune its target file.

**Week 4 — global, and decide.**
Global `find 15 emails`, full Lane C sequence. Then the real decision: if the free
tier produced at least one call, buy credits and scale. If it produced nothing,
the problem is the message or the ICP, not the volume — fix that before spending.

---

## 7. Guardrails

- **Never auto-send.** `send` and `run` put mail in real inboxes under your name.
  `find` is the safe verb. Nothing in this setup sends without you typing the send
  command yourself.
- **Accept the legal notice yourself.** You are the data controller and the
  sender. Read `LEGAL_NOTICE.md` before setting that variable. Claude will not set
  it for you.
- **Warm the mailbox.** New address: 5 sends a day for the first week, 10 in the
  second, never past 40 a day. One follow-up per lead, maximum.
- **India has DPDP obligations and the EU/UK have GDPR.** A B2B cold email to a
  work address is generally defensible, but include a real way to opt out and
  honour it immediately. Your country code is set to `in`, which is what the tool
  uses to decide your rules.
- **Do not automate LinkedIn.** Manual profile views and manual connection
  requests only. Your founder account is not worth risking for this.
- **Keep the feed clean.** No "open for freelance work" posts. Lane A and Lane C
  both work by people finding a founder profile worth taking seriously.

---

## 8. What good looks like

Track weekly, in the Lead Queue:

- Leads qualified (free finds) — volume at the top of the funnel
- Emails sent
- Reply rate — the number that matters. Under 2% means the message is wrong. Over
  5% means scale it now.
- Calls booked
- Sprints sold

The single leading indicator: **replies per 100 emails.** Everything else is
downstream of the ICP and the first two sentences of the email.
