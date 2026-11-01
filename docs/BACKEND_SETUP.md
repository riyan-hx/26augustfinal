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

## 4. Razorpay
Dashboard → Webhooks → URL `https://<ref>.supabase.co/functions/v1/razorpay-webhook`,
events: `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed`. Use test keys until launch.

## 5. Frontend env (Vercel → Settings → Environment Variables)
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_FUNCTIONS_URL=https://<ref>.supabase.co/functions/v1
```
The anon key is public by design; RLS protects data. The service role key must never be in the frontend or the repo.

## Tests
```bash
npm test                 # unit tests (money, dates, errors, api client, schemas, signatures)
npm run test:db          # migrations + 58 pgTAP tests on a throwaway Postgres 16 (needs pgTAP)
deno check --config supabase/functions/deno.json supabase/functions/*/index.ts
```
