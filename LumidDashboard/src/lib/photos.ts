// Profile photos: an uploaded image (Supabase storage, `avatars` bucket) or one
// of Lumid's illustrated avatars, stored in photo_path as `preset:<id>`.
import { env, isDemoMode } from './env'
import { db } from './supabase'

/** Illustrated people: original, simple portraits with varied skin, hair and style. */
interface Person { id: string; label: string; bg: string; skin: string; hair: string; top: string; style: 'short' | 'long' | 'bun' | 'curly' | 'wrap' | 'beard' | 'bob' | 'waves'; glasses?: boolean }

export const PHOTO_PRESETS: readonly Person[] = [
  { id: 'person-1', label: 'Long dark hair', bg: '#e8f6dc', skin: '#c98d62', hair: '#2b1d16', top: '#5fbf3a', style: 'long' },
  { id: 'person-2', label: 'Short hair with glasses', bg: '#e1effb', skin: '#e2b08a', hair: '#3a2a20', top: '#3c86c4', style: 'short', glasses: true },
  { id: 'person-3', label: 'Headscarf', bg: '#eee9fb', skin: '#b97a52', hair: '#7a5ab8', top: '#6b55c2', style: 'wrap' },
  { id: 'person-4', label: 'Beard', bg: '#ffead8', skin: '#8d5a3b', hair: '#1f1612', top: '#d9692a', style: 'beard' },
  { id: 'person-5', label: 'Hair in a bun', bg: '#fde7ec', skin: '#f0c9a6', hair: '#5a3825', top: '#d25d7d', style: 'bun' },
  { id: 'person-6', label: 'Curly hair', bg: '#fff1d6', skin: '#6e4329', hair: '#1c1410', top: '#e59a1a', style: 'curly' },
  { id: 'person-7', label: 'Bob haircut with glasses', bg: '#e6f4ee', skin: '#d9a07a', hair: '#8a4b2a', top: '#2f8a62', style: 'bob', glasses: true },
  { id: 'person-8', label: 'Wavy grey hair', bg: '#f1f4e4', skin: '#e6b994', hair: '#9aa0a6', top: '#7c8f2d', style: 'waves' },
]
export type PresetId = string

function personSvg(p: Person): string {
  const back = {
    long: `<path d="M18 31c0-12 6-19 14-19s14 7 14 19v17c-3 2-6 3-8 3V31H26v20c-2 0-5-1-8-3Z" fill="${p.hair}"/>`,
    bob: `<path d="M19 31c0-11 6-18 13-18s13 7 13 18v8c-2 2-5 2-7 2V31H26v10c-2 0-5 0-7-2Z" fill="${p.hair}"/>`,
    wrap: `<path d="M17 31c0-11 7-19 15-19s15 8 15 19v9c0 7-7 11-15 11s-15-4-15-11Z" fill="${p.hair}"/>`,
    waves: `<path d="M19 30c0-10 6-17 13-17s13 7 13 17c2 4 1 9-2 11 0-4-1-7-3-9H24c-2 2-3 5-3 9-3-2-4-7-2-11Z" fill="${p.hair}"/>`,
  } as Record<string, string>
  const front = {
    long: `<path d="M21 28c0-8 5-13 11-13s11 5 11 13c-3-4-7-6-11-6s-8 2-11 6Z" fill="${p.hair}"/>`,
    short: `<path d="M20 28c-1-10 5-15 12-15s13 5 12 15c-2-5-6-7-12-7s-10 2-12 7Z" fill="${p.hair}"/>`,
    bun: `<circle cx="32" cy="12" r="5.5" fill="${p.hair}"/><path d="M21 27c0-8 5-12 11-12s11 4 11 12c-3-4-7-5-11-5s-8 1-11 5Z" fill="${p.hair}"/>`,
    curly: [[22, 22], [26, 17], [32, 15], [38, 17], [42, 22], [21, 28], [43, 28]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${p.hair}"/>`).join(''),
    wrap: `<path d="M20 29c1-8 6-13 12-13s11 5 12 13c-3-3-7-4-12-4s-9 1-12 4Z" fill="${p.hair}"/>`,
    beard: `<path d="M21 26c0-8 5-11 11-11s11 3 11 11c-2-3-6-4-11-4s-9 1-11 4Z" fill="${p.hair}"/><path d="M21 29c0 9 5 14 11 14s11-5 11-14c-2 4-6 5-11 5s-9-1-11-5Z" fill="${p.hair}"/>`,
    bob: `<path d="M20 29c0-9 5-14 12-14s12 5 12 14c-4-3-6-6-7-8-3 3-10 6-17 8Z" fill="${p.hair}"/>`,
    waves: `<path d="M20 28c0-9 5-14 12-14s12 5 12 14c-2-3-4-5-7-5-2 2-6 3-10 2-3 0-5 1-7 3Z" fill="${p.hair}"/>`,
  }[p.style]
  const mouth = p.style === 'beard'
    ? '<path d="M29 35.5c1.8 1.2 4.2 1.2 6 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
    : '<path d="M28.5 34c2 1.8 5 1.8 7 0" stroke="#7a3b2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
  const glasses = p.glasses
    ? '<g fill="none" stroke="#2b2b2b" stroke-width="1.4"><circle cx="27.5" cy="28.5" r="3.6"/><circle cx="36.5" cy="28.5" r="3.6"/><path d="M31.1 28.5h1.8"/></g>'
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${p.bg}"/>${back[p.style] ?? ''}`
    + `<path d="M11 64c0-11 9-18 21-18s21 7 21 18Z" fill="${p.top}"/><path d="M27 40h10v7c-1.5 2-8.5 2-10 0Z" fill="${p.skin}"/>`
    + `<ellipse cx="32" cy="29" rx="11" ry="12.5" fill="${p.skin}"/>${front}`
    + `<circle cx="27.5" cy="29" r="1.4" fill="#2b1d16"/><circle cx="36.5" cy="29" r="1.4" fill="#2b1d16"/>${mouth}${glasses}</svg>`
}

const presetUrls = new Map<string, string>()
function presetUrl(id: string): string | null {
  const p = PHOTO_PRESETS.find((x) => x.id === id)
  if (!p) return null
  let url = presetUrls.get(id)
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(personSvg(p))}`
    presetUrls.set(id, url)
  }
  return url
}

export const presetPath = (id: PresetId) => `preset:${id}`

// Demo mode keeps uploads in memory: path → object URL.
const demoUploads = new Map<string, string>()

/** Image URL for a stored photo_path, or null for initials. */
export function photoSrc(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('preset:')) return presetUrl(path.slice(7))
  if (demoUploads.has(path)) return demoUploads.get(path)!
  if (isDemoMode || !env.supabaseUrl) return null
  return `${env.supabaseUrl}/storage/v1/object/public/avatars/${path.split('/').map(encodeURIComponent).join('/')}`
}

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024

/** Square-crops and shrinks an image to 512px WebP, so uploads stay small and fast. */
async function toSquareWebp(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that image'))), 'image/webp', 0.86))
}

/** Uploads a profile photo and returns its photo_path. */
export async function uploadPhoto(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) throw new Error('Choose a JPG, PNG or WebP image.')
  if (file.size > MAX_PHOTO_BYTES) throw new Error('That image is over 10 MB. Try a smaller one.')
  const blob = await toSquareWebp(file)
  if (isDemoMode) {
    const path = `demo/${crypto.randomUUID()}.webp`
    demoUploads.set(path, URL.createObjectURL(blob))
    return path
  }
  const { data: auth } = await db().auth.getUser()
  const uid = auth.user?.id
  if (!uid) throw new Error('Sign in again to upload a photo.')
  const path = `${uid}/${crypto.randomUUID()}.webp`
  const { error } = await db().storage.from('avatars').upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: false })
  if (error) throw new Error('Upload failed. Check your connection and try again.')
  return path
}
