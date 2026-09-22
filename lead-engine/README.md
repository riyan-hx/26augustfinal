# Lumid Lead Engine

Outbound lead generation for the Product UI Sprint offer. Built on
[OpenOutreach](https://github.com/eracle/OpenOutreach) (GPL-3.0).

Read [STRATEGY.md](STRATEGY.md) first — it explains what this is for, what it
cannot do, and how the 40 free credits should be spent.
[LINKEDIN.md](LINKEDIN.md) covers the two LinkedIn motions that sit around it.

## Layout

```
lead-engine/
  .venv/                    OpenOutreach and its dependencies (gitignored)
  .env.example              credential template — copy to .env and fill in
  .env                      your credentials (gitignored, never committed)
  lead.ps1                  campaign runner
  campaigns/
    india/  product.md      what you sell, priced in INR
            target.md       the Indian ICP
    global/ product.md      the same offer, priced in USD
            target.md       the US/UK/EU ICP
  data/                     one SQLite database per campaign (gitignored)
```

Two campaigns live side by side because OpenOutreach stores one campaign per
database. `lead.ps1` picks the campaign by pointing `--db` at a different SQLite
file and loading that campaign's `product.md` and `target.md` into the
environment.

## First run

1. Copy the template and fill it in. Every value in it is your own credential —
   nothing here is filled in for you.

   ```bash
   cp lead-engine/.env.example lead-engine/.env
   ```

2. You need three things:
   - an LLM key (Anthropic) — judges leads and writes the mail
   - a BetterContact key — <https://bettercontact.rocks>, free, 40 credits, no card
   - a mailbox and its **app password** — ideally `riyan@lumid.in` on Google
     Workspace, not your primary personal Gmail

3. Read <https://github.com/eracle/OpenOutreach/blob/main/LEGAL_NOTICE.md> and
   only then set `OPENOUTFIND_ACCEPT_LEGAL_NOTICE=1`. You are the data controller
   and the sender.

4. Check what the install still wants:

   ```bash
   powershell -File lead-engine/lead.ps1 india status
   ```

## Daily use

```bash
powershell -File lead-engine/lead.ps1 india find 25
```

Free. Spends nothing. Prints every lead it has as CSV on stdout, including a
`reason` column explaining why each one qualified. Read those reasons — they are
how you tune `target.md`.

```bash
powershell -File lead-engine/lead.ps1 india find 10 emails
```

Ten leads carrying a verified work email. Costs up to 10 credits.

```bash
powershell -File lead-engine/lead.ps1 india find 0
```

No work at all — just reprint what is already stored.

## Sending

`send` and `run` put mail in real inboxes under your name. They are deliberately
not wrapped in `lead.ps1`. Read the guardrails in STRATEGY.md before either one,
and warm the mailbox first: five sends a day in week one.
