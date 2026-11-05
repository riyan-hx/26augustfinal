import type { SetupStatus } from '../../types/domain'

/** `step` is the matching setup-wizard step id, for deep links. */
export const setupSteps: { key: keyof SetupStatus; step: 'about' | 'link' | 'sessions' | 'hours'; label: string; hint: string }[] = [
  { key: 'hasProfile', step: 'about', label: 'Tell patients who you are', hint: 'Name, title and languages' },
  { key: 'hasSlug', step: 'link', label: 'Choose your booking link', hint: 'The link patients book from' },
  { key: 'hasSessionTypes', step: 'sessions', label: 'Add a session type', hint: 'Length and price' },
  { key: 'hasAvailability', step: 'hours', label: 'Set your weekly hours', hint: 'When patients can book' },
]

export const setupDone = (s: SetupStatus) => setupSteps.filter((step) => s[step.key]).length

// "Skip for now" in the setup wizard: remembered for this browser session so
// the Overview doesn't send a brand-new practice straight back to setup.
const SKIP_KEY = 'lumid.setup.skipped'

export function markSetupSkipped(): void {
  try { sessionStorage.setItem(SKIP_KEY, '1') } catch { /* storage unavailable — router state still carries it */ }
}

export function setupSkipped(): boolean {
  try { return sessionStorage.getItem(SKIP_KEY) === '1' } catch { return false }
}
