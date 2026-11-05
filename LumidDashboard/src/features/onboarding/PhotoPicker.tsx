import { useRef, useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Check, UserPlus, X } from '../../lib/icons'
import { PHOTO_PRESETS, photoSrc, presetPath, uploadPhoto } from '../../lib/photos'

interface Props { name: string; value: string | null; onChange: (path: string | null) => void }

/** Profile picture: upload a photo, pick an illustrated avatar, or keep initials. */
export function PhotoPicker({ name, value, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null); setBusy(true)
    try { onChange(await uploadPhoto(file)) } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.') } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <fieldset>
      <legend className="field-label">Your picture</legend>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative shrink-0 w-fit">
          <Avatar name={name || '?'} src={photoSrc(value)} size={76} />
          {value && (
            <button type="button" className="ob-photo-clear" aria-label="Remove picture, use initials" onClick={() => onChange(null)}><X size={12} /></button>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="ob-upload" onClick={() => input.current?.click()} disabled={busy}>
              <UserPlus size={15} aria-hidden="true" />{busy ? 'Uploading…' : value && !value.startsWith('preset:') ? 'Change photo' : 'Upload a photo'}
            </button>
            <span className="text-[12px] text-[var(--ob-muted)]">or pick an avatar</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Avatars">
            {PHOTO_PRESETS.map((p) => {
              const on = value === presetPath(p.id)
              return (
                <button key={p.id} type="button" role="radio" aria-checked={on} aria-label={`Avatar: ${p.label.toLowerCase()}`} className="ob-preset-avatar" data-on={on}
                  onClick={() => onChange(on ? null : presetPath(p.id))}>
                  <img src={photoSrc(presetPath(p.id)) ?? ''} alt="" />
                  {on && <span className="ob-preset-avatar__tick" aria-hidden="true"><Check size={10} strokeWidth={3} /></span>}
                </button>
              )
            })}
          </div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true"
            onChange={(e) => void onFile(e.target.files?.[0])} />
          <p className={`ob-hint ${error ? '!text-[#c62f57]' : ''}`} role={error ? 'alert' : undefined}>
            {error ?? 'A friendly photo helps patients feel at ease. Square works best.'}
          </p>
        </div>
      </div>
    </fieldset>
  )
}
