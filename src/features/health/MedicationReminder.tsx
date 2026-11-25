import { t } from '../../i18n'
import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react'
import { Modal } from '../../components/Dialog'
import { useAuth } from '../auth/AuthContext'

// shortcut: stored in this browser's localStorage (per user), reminds only while the app is open; move to backend + push notifications if reminders must reach other devices.
export interface Medication {
  id: string
  name: string
  time: string // HH:mm, local time
  takenOn?: string // YYYY-MM-DD of the last "taken" confirmation
}

const SNOOZE_MS = 10 * 60_000
const listeners = new Set<() => void>()
const keyOf = (userId: string) => `doit.meds.${userId}`
const today = () => new Date().toLocaleDateString('sv') // YYYY-MM-DD in local time
const nowHm = () => new Date().toTimeString().slice(0, 5)

function read(userId: string): string {
  try {
    return localStorage.getItem(keyOf(userId)) ?? '[]'
  } catch {
    return '[]'
  }
}

function write(userId: string, meds: Medication[]) {
  try {
    localStorage.setItem(keyOf(userId), JSON.stringify(meds))
  } catch {
    // private mode: nothing persists
  }
  listeners.forEach((f) => f())
}

function subscribe(f: () => void) {
  listeners.add(f)
  window.addEventListener('storage', f) // other tabs
  return () => {
    listeners.delete(f)
    window.removeEventListener('storage', f)
  }
}

function useMedications() {
  const userId = useAuth().user?.id ?? 'anon'
  const raw = useSyncExternalStore(subscribe, () => read(userId))
  let meds: Medication[] = []
  try {
    meds = JSON.parse(raw)
  } catch {
    // corrupted value: start fresh
  }
  return [meds, (next: Medication[]) => write(userId, next)] as const
}

/** Meds whose time has passed today and that were not confirmed yet. */
const dueMedications = (meds: Medication[], day: string, hm: string) =>
  meds.filter((m) => m.time <= hm && m.takenOn !== day)

/** Health page card: add / remove daily medication reminders. */
export function MedicationCard() {
  const [meds, save] = useMedications()
  const [name, setName] = useState('')
  const [time, setTime] = useState('08:00')

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    // a reminder whose time already passed today starts tomorrow, so adding it does not pop up at once
    const takenOn = time <= nowHm() ? today() : undefined
    save([...meds, { id: crypto.randomUUID(), name: name.trim(), time, takenOn }].sort((a, b) => a.time.localeCompare(b.time)))
    setName('')
  }

  return (
    <section className="card med-card">
      <h2>💊 {t('Nhắc uống thuốc')}</h2>
      <form className="med-form" onSubmit={add}>
        <input aria-label={t('Tên thuốc')} placeholder={t('Tên thuốc')} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
        <input aria-label={t('Giờ uống')} type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
        <button className="btn-primary" type="submit" disabled={!name.trim()}>{t('Thêm')}</button>
      </form>
      {meds.length === 0 ? (
        <p className="muted">{t('Chưa có lời nhắc nào.')}</p>
      ) : (
        <ul className="med-list">
          {meds.map((m) => (
            <li key={m.id}>
              <strong>{m.time}</strong> {m.name}
              {m.takenOn === today() && <span className="muted"> · ✓ {t('Đã uống hôm nay')}</span>}
              <button className="icon-btn" aria-label={t('Xóa')} onClick={() => save(meds.filter((x) => x.id !== m.id))}>×</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Mounted in the app shell: pops up when a medication is due; closing snoozes it for 10 minutes. */
export function MedicationReminderPopup() {
  const [meds, save] = useMedications()
  const [now, setNow] = useState(() => new Date())
  const [snoozedUntil, setSnoozedUntil] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000) // re-evaluate the clock every 30 s
    return () => clearInterval(id)
  }, [])

  const day = now.toLocaleDateString('sv')
  const due = now.getTime() < snoozedUntil ? [] : dueMedications(meds, day, now.toTimeString().slice(0, 5))

  const snooze = () => setSnoozedUntil(Date.now() + SNOOZE_MS)

  const markTaken = () => {
    const ids = new Set(due.map((m) => m.id))
    save(meds.map((m) => (ids.has(m.id) ? { ...m, takenOn: day } : m)))
  }

  return (
    <Modal open={due.length > 0} title={t('Đến giờ uống thuốc')} onClose={snooze} size="sm">
      <ul className="med-list">
        {due.map((m) => (
          <li key={m.id}>
            <strong>{m.time}</strong> 💊 {m.name}
          </li>
        ))}
      </ul>
      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={snooze}>
          {t('Nhắc lại sau 10 phút')}
        </button>
        <button type="button" className="btn-primary" onClick={markTaken}>
          {t('Đã uống')}
        </button>
      </div>
    </Modal>
  )
}
