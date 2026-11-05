import { describe, expect, it } from 'vitest'
import { profileSchema } from '../schemas'
import { PHOTO_PRESETS, photoSrc, presetPath } from '../photos'

const base = { display_name: 'Dr. Anjali Menon' }

describe('profile photos', () => {
  it('accepts every illustrated avatar', () => {
    for (const p of PHOTO_PRESETS) expect(profileSchema.safeParse({ ...base, photo_path: presetPath(p.id) }).success).toBe(true)
  })
  it('accepts uploaded paths and null, rejects anything else', () => {
    expect(profileSchema.safeParse({ ...base, photo_path: '0b0f3c2e-1111-2222-3333-444455556666/a1.webp' }).success).toBe(true)
    expect(profileSchema.safeParse({ ...base, photo_path: null }).success).toBe(true)
    expect(profileSchema.safeParse({ ...base, photo_path: '../etc/passwd' }).success).toBe(false)
    expect(profileSchema.safeParse({ ...base, photo_path: 'https://x.test/a.png' }).success).toBe(false)
  })
  it('renders presets as inline images and nothing for unknown values', () => {
    expect(photoSrc(presetPath(PHOTO_PRESETS[0]!.id))).toMatch(/^data:image\/svg\+xml/)
    expect(photoSrc('preset:nope')).toBeNull()
    expect(photoSrc(null)).toBeNull()
  })
})
