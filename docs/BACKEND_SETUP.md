# Backend setup (Supabase + Razorpay)

## 1. Create the project
1. supabase.com → New project → **Region: South Asia (Mumbai)**.
2. Database → Extensions: enable **pg_cron**.
3. Install the CLI and link: `npx supabase login && npx supabase link --project-ref <ref>`.

## 2. Apply the database
```bash
npx supabase db push          # runs supabase/migrations in order
```
Then add the notes encryption key to Vault (SQL editor, once):
```sql
select vault.create_secret(encode(gen_random_bytes(32), 'base64'), 'notes_key');
```
Never rotate this key without re-encrypting notes.

## 3. Edge Function secrets
For local development, copy `supabase/functions/.env.example` to `supabase/functions/.env.local`, replace the Razorpay placeholders with test credentials, then run:
```bash
npx supabase functions serve --env-file supabase/functions/.env.local
```
Do not commit `.env.local`. The CLI provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically when running functions locally; deployed functions receive them automatically as well.

```bash
npx supabase secrets set \
  RAZORPAY_KEY_ID=rzp_test_xxx \
  RAZORPAY_KEY_SECRET=xxx \
  RAZORPAY_WEBHOOK_SECRET=xxx \
  ALLOWED_ORIGINS=https://app.lumidai.in,http://localhost:5173
npx supabase functions deploy public-bookings --no-verify-jwt
npx supabase functions deploy razorpay-webhook --no-verify-jwt
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.

## 4. Google sign-in
1. In Google Cloud Console, create an OAuth 2.0 Client ID for a Web application.
2. Set its authorized redirect URI to `https://<ref>.supabase.co/auth/v1/callback`.
3. In Supabase → Authentication → Sign In / Providers → Google, enable the provider and enter the Google client ID and client secret.
4. In Supabase → Authentication → URL Configuration, set the production Site URL and add each deployed app origin as an allowed redirect URL (for example `https://app.lumidai.in/**`). Add `http://localhost:5173/**` only for local development.

The app sends both Google OAuth and email magic-link callbacks to the requested same-site page. Supabase must allow those redirect URLs. If Google is not enabled, the API responds with `validation_failed` / `Unsupported provider: provider is not enabled`; no frontend change can enable a provider in the Supabase project.

## 5. Razorpay
Dashboard → Webhooks → URL `https://<ref>.supabase.co/functions/v1/razorpay-webhook`,
events: `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed`. Use test keys until launch.

## 6. Frontend env (Vercel → Settings → Environment Variables)
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_FUNCTIONS_URL=https://<ref>.supabase.co/functions/v1
VITE_ONLINE_PAYMENTS=true
```
Set the Razorpay key ID, key secret, and webhook secret as Supabase Edge Function secrets (never frontend variables). Redeploy the frontend after setting `VITE_ONLINE_PAYMENTS`; Vite embeds `VITE_*` values at build time. With the flag unset or false, public bookings use the existing pay-at-session request flow instead of Razorpay Checkout.

The anon key is public by design; RLS protects data. The service role key must never be in the frontend or the repo.

## Tests
```bash
npm test                 # unit tests (money, dates, errors, api client, schemas, signatures)
npm run test:db          # migrations + 58 pgTAP tests on a throwaway Postgres 16 (needs pgTAP)
deno check --config supabase/functions/deno.json supabase/functions/*/index.ts
```
