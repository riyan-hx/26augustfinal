import { useEffect, useState } from 'react'
import { FileText, Lock, Plus } from '../../lib/icons'
import { formatDateTime } from '../../lib/dates'
import { toApiError } from '../../lib/errors'
import { ErrorState, Skeleton } from '../../components/ui/StateViews'
import { useNoteBody, useNotes, useSaveNote } from './hooks'
import type { NoteMeta } from './api'

const draftKey = (patientId: string, noteId?: string) => `lumid:note-draft:${patientId}:${noteId ?? 'new'}`
type Draft = { body: string; focus: string; nextSteps: string }
const EMPTY: Draft = { body: '', focus: '', nextSteps: '' }

function readDraft(key: string): Draft | null {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as Draft : null } catch { return null }
}
function writeDraft(key: string, d: Draft | null) {
  try { if (d && (d.body || d.focus || d.nextSteps)) localStorage.setItem(key, JSON.stringify(d)); else localStorage.removeItem(key) } catch { /* storage unavailable */ }
}

/** Private session notes. Encrypted at rest; each body is decrypted only when opened. */
export function NotesPanel({ patientId }: { patientId: string }) {
  const notes = useNotes(patientId)
  const [editing, setEditing] = useState<NoteMeta | 'new' | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <section className="rounded-[12px] border border-[var(--hairline)] p-4" aria-labelledby="notes-h">
      <div className="flex items-center justify-between gap-2">
        <p id="notes-h" className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)] flex items-center gap-1.5"><FileText size={12} /> SESSION NOTES</p>
        {editing === null && <button className="btn-secondary !py-1.5" onClick={() => setEditing('new')}><Plus size={13} />New note</button>}
      </div>
      <p className="text-[11px] text-[var(--stone)] mt-1 flex items-center gap-1"><Lock size={11} /> Only you can read these. Stored encrypted.</p>

      {editing !== null && (
        <NoteEditor patientId={patientId} note={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
      )}

      {notes.isLoading && <div className="mt-3 space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>}
      {notes.error && <ErrorState compact error={notes.error} onRetry={() => void notes.refetch()} />}
      {notes.data && notes.data.length === 0 && editing === null && (
        <p className="text-[12px] text-[var(--stone)] mt-3">No notes yet. Write one after a session to keep track of focus and next steps.</p>
      )}
      <ul className="mt-3 divide-y divide-[var(--hairline)]">
        {notes.data?.map((n) => (
          <li key={n.id} className="py-3">
            <button type="button" className="w-full text-left" aria-expanded={openId === n.id} onClick={() => setOpenId(openId === n.id ? null : n.id)}>
              <p className="text-[11px] text-[var(--stone)]">{formatDateTime(n.createdAt)}{n.version > 1 ? ' · edited' : ''}</p>
              <p className="text-[13px] font-semibold mt-0.5">{n.focus || 'Session note'}</p>
              {n.nextSteps && <p className="text-[12px] text-[var(--slate)] mt-0.5 line-clamp-2">Next: {n.nextSteps}</p>}
            </button>
            {openId === n.id && editing === null && <NoteBody note={n} onEdit={() => setEditing(n)} />}
          </li>
        ))}
      </ul>
    </section>
  )
}

function NoteBody({ note, onEdit }: { note: NoteMeta; onEdit: () => void }) {
  const body = useNoteBody(note.id)
  return (
    <div className="mt-2 rounded-[10px] bg-[var(--color-canvas-parchment)] p-3">
      {body.isLoading && <Skeleton className="h-12" />}
      {body.error && <ErrorState compact error={body.error} onRetry={() => void body.refetch()} />}
      {body.data !== undefined && <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{body.data}</p>}
      <button className="btn-secondary mt-3 !py-1.5" onClick={onEdit} disabled={!body.data && body.data !== ''}>Edit</button>
    </div>
  )
}

function NoteEditor({ patientId, note, onDone }: { patientId: string; note?: NoteMeta; onDone: () => void }) {
  const key = draftKey(patientId, note?.id)
  const existing = useNoteBody(note?.id ?? null)
  const save = useSaveNote()
  const [draft, setDraft] = useState<Draft>(() => readDraft(key) ?? (note ? { body: '', focus: note.focus, nextSteps: note.nextSteps } : EMPTY))
  const [loaded, setLoaded] = useState(!note || !!readDraft(key))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  // Fill the body once the existing note is decrypted (unless a local draft was restored).
  if (!loaded && existing.data !== undefined) { setDraft((d) => ({ ...d, body: existing.data! })); setLoaded(true) }

  // Keep an offline draft so nothing is lost if the tab closes.
  useEffect(() => { if (loaded) writeDraft(key, draft) }, [key, draft, loaded])

  function submit() {
    setErrors({}); setNotice(null)
    save.mutate({ patientId, body: draft.body, focus: draft.focus, nextSteps: draft.nextSteps, noteId: note?.id, expectedVersion: note?.version }, {
      onSuccess: () => { writeDraft(key, null); onDone() },
      onError: (e) => { const err = toApiError(e); if (err.fields) setErrors(err.fields); else setNotice(err.userMessage) },
    })
  }
  function discard() { writeDraft(key, null); onDone() }

  return (
    <div className="mt-3 rounded-[12px] border border-[var(--hairline)] p-3 space-y-3">
      {notice && <p role="alert" className="text-[12px] rounded-xl bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)] px-3 py-2">{notice}</p>}
      <div>
        <label htmlFor="note-focus" className="field-label">Focus</label>
        <input id="note-focus" className="field" maxLength={300} placeholder="e.g. Work-related overwhelm" value={draft.focus} onChange={(e) => setDraft({ ...draft, focus: e.target.value })} />
        {errors.focus && <p className="form-error">{errors.focus}</p>}
      </div>
      <div>
        <label htmlFor="note-body" className="field-label">Note</label>
        {!loaded ? <Skeleton className="h-28" /> : (
          <textarea id="note-body" className="field" rows={6} maxLength={20000} value={draft.body} aria-invalid={!!errors.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        )}
        {errors.body && <p className="form-error">{errors.body}</p>}
      </div>
      <div>
        <label htmlFor="note-next" className="field-label">Next steps</label>
        <textarea id="note-next" className="field" rows={2} maxLength={1000} value={draft.nextSteps} onChange={(e) => setDraft({ ...draft, nextSteps: e.target.value })} />
        {errors.next_steps && <p className="form-error">{errors.next_steps}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button className="btn-primary" disabled={save.isPending || !loaded} onClick={submit}>{save.isPending ? 'Saving…' : 'Save note'}</button>
        <button className="btn-secondary" disabled={save.isPending} onClick={discard}>Discard</button>
        <span className="text-[11px] text-[var(--stone)] ml-auto">Draft saved on this device</span>
      </div>
    </div>
  )
}
