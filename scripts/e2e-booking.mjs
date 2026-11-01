// Demo-mode E2E for the public booking page. Usage: node scripts/e2e-booking.mjs [baseUrl]
// Needs a running app (npm run dev / preview) and `playwright` resolvable.
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
const base = process.argv[2] ?? 'http://localhost:5199'
const fail = (m) => { console.error('FAIL', m); process.exitCode = 1 }
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

async function pickSlot() {
  await page.getByRole('tab').first().waitFor()
  await page.locator('button[aria-pressed]').first().click()
}
async function fillAndContinue(extra = {}) {
  await page.getByLabel('Full name').fill('Divya Prasad')
  await page.getByLabel('Email', { exact: true }).fill(extra.email ?? 'divya@example.com')
  if (!extra.skipTerms) await page.getByLabel(/I agree to the booking terms/).check()
  await page.getByRole('button', { name: /Continue to payment/ }).click()
}

// 1. Unknown slug → unavailable
await page.goto(`${base}/p/nope`)
await page.getByText('This page isn’t available').waitFor({ timeout: 8000 }).catch(() => fail('unknown slug state'))

// 2. Validation: bad email and missing terms block the hold
await page.goto(`${base}/p/anitha`)
await pickSlot()
await fillAndContinue({ email: 'not-an-email', skipTerms: true })
await page.locator('.form-error', { hasText: 'Enter a valid email.' }).waitFor({ timeout: 3000 }).catch(() => fail('email validation'))
await page.locator('.form-error', { hasText: 'Please accept the terms to book.' }).waitFor({ timeout: 3000 }).catch(() => fail('terms validation'))

// 3. Happy path: hold → countdown → pay (demo) → confirmed
await page.getByLabel('Email', { exact: true }).fill('divya@example.com')
await page.getByLabel(/I agree to the booking terms/).check()
await page.getByRole('button', { name: /Continue to payment/ }).click()
await page.getByText('Complete your payment').waitFor({ timeout: 5000 }).catch(() => fail('hold step'))
const held = await page.getByText(/Time held for/).innerText().catch(() => '')
if (!/Time held for\s*(9|10):\d\d/.test(held)) fail(`countdown not shown: "${held}"`)
await page.getByRole('button', { name: /Pay \(demo\)/ }).click()
await page.getByText('You’re booked').waitFor({ timeout: 8000 }).catch(() => fail('confirmation'))
await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/confirmed.png` : '/tmp/confirmed.png' })

// 4. Mobile layout has no horizontal overflow
await page.setViewportSize({ width: 390, height: 800 })
await page.goto(`${base}/p/anitha`)
await pickSlot()
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
if (overflow > 0) fail(`mobile overflow ${overflow}px`)

if (errors.length) fail(`page errors: ${errors.join(' | ')}`)
await browser.close()
console.log(process.exitCode ? 'E2E FAILED' : 'E2E OK')
