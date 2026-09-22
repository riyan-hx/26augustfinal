# The LinkedIn layer

Two separate jobs. Do not confuse them.

---

## Lane A — intent search (people asking for a designer right now)

This is the original lead-collector motion and it is still the highest-converting
thing in the system. Claude drives your own logged-in session in the browser
pane; you log in yourself, nothing runs in the background, nothing auto-sends.

Base URL pattern:

```
https://www.linkedin.com/search/results/content/?keywords=<KEYWORDS>&datePosted=%5B%22past-week%22%5D&sortBy=%22date_posted%22
```

`datePosted` only offers 24h / week / month buckets, so filter the exact day
count by reading each post's relative timestamp.

### Queries that work

Phrase variants of someone hiring, not someone advertising:

- `looking for a UI UX designer`
- `need a UI designer`
- `hiring a freelance UI UX designer`
- `looking for a product designer` + `startup`
- `need someone to redesign our app`
- `our dashboard needs a redesign`
- `looking for a designer to work on our SaaS`

Bias terms that surface contactable posts, appended to any of the above:
`email`, `gmail.com`, `portfolio to`, `DM me`, `drop your portfolio`.

### Queries that do not work

Generic single words — `UI design`, `designer`, `UX` — return a wall of designers
advertising themselves rather than people hiring. Every query needs a verb of
intent in it.

### What to log

Both email-contact and DM-only posts. Email-only was tried first and was far too
sparse: most fresh sub-24h posts are DM-only, while posts carrying an email are
usually already a week old and have fifty replies. Each lead in the queue gets an
Email / DM-only channel badge. Email leads go out through Gmail with your
explicit go-ahead each time; DM-only leads you send yourself.

Cadence: fifteen minutes, daily. Fresh posts are the whole advantage — a post
that is three days old has already been answered forty times.

---

## Lane C — the warm-touch layer on OpenOutreach leads

Every row of the OpenOutreach CSV carries a `linkedin_url`. Use it. A cold email
from an unknown name gets deleted; a cold email from a name the founder saw on
LinkedIn two days ago gets read.

Per lead, manually:

| Day | Action | Why |
|---|---|---|
| 0 | View their profile | They get a notification. Your name is now familiar. |
| 1 | Send the email | Lands on a recognised name. |
| 3 | Connection request, no note or one non-pitch line | Second touch, different channel. |
| 5 | One follow-up email | One. Then stop. |

### Hard rules

- All of this is manual. No automation tools, no browser extensions that
  auto-connect, no scheduled scripts. LinkedIn suspends accounts for automated
  connecting and your founder profile is worth more than this entire pipeline.
- Cap connection requests at roughly 20 a day across everything you do, including
  your normal founder networking.
- Never post "available for freelance design work" on your feed. The feed stays
  founder-positioned. Lane A and Lane C both work *because* people who click
  through find a founder building something real, not a designer looking for
  work.
- If someone replies on LinkedIn instead of email, move the conversation there and
  drop them from the email sequence immediately.
