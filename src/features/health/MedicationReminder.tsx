import { t, type Key } from '../../i18n'
import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react'
import { ConfirmDialog, Modal } from '../../components/Dialog'
import { DateInput } from '../../components/DateInput'
import { Field } from '../../components/Form'
import { TimeInput } from '../../components/TimeInput'
import { addDays, DAY_MS, formatDate, parseDateKey, toDateKey } from '../../lib/dates'
import { usePreferences } from '../account/queries'
import { useAuth } from '../auth/AuthContext'
import { Select } from '../../components/Select'

// shortcut: stored in this browser's localStorage (per user), reminds only while the app is open; move to backend + push notifications if reminders must reach other devices.
export type MealTiming = 'before' | 'after' | 'with' | 'any'
export type DoseStatus = 'taken' | 'missed'
export interface Medication {
  id: string
  name: string
  amount: number // how much per dose, in `unit`
  unit: Key // one of UNITS
  timing: MealTiming
  times: string[] // HH:mm, local time, sorted; one med, several doses a day
  note?: string
  start: string // YYYY-MM-DD, first day of the course
  end?: string // YYYY-MM-DD, last day of the course; none = ongoing
  log: Record<string, DoseStatus> // "YYYY-MM-DD HH:mm" → what happened to that dose
  createdAt: string // "YYYY-MM-DD HH:mm": doses before it are not counted in the stats
  from?: string // "YYYY-MM-DD HH:mm" of the last save: doses before it never pop up
}

const MEAL_TIMINGS: { value: MealTiming; label: Key }[] = [
  { value: 'after', label: 'Sau ăn' },
  { value: 'before', label: 'Trước ăn' },
  { value: 'with', label: 'Trong bữa ăn' },
  { value: 'any', label: 'Không phụ thuộc bữa ăn' },
]
const UNITS: Key[] = ['viên', 'viên nang', 'gói', 'ml', 'mg', 'giọt', 'ống', 'lần xịt']
const timingLabel = (v: MealTiming) => t(MEAL_TIMINGS.find((x) => x.value === v)?.label ?? 'Không phụ thuộc bữa ăn')
const doseLabel = (m: Medication) => `${m.amount} ${t(m.unit)}`
const subtitle = (m: Medication) => [doseLabel(m), timingLabel(m.timing)].join(' · ')

const SNOOZE_MS = 10 * 60_000
const listeners = new Set<() => void>()
const keyOf = (userId: string) => `doit.meds.${userId}`
const today = () => toDateKey(new Date())
const nowStamp = () => `${today()} ${new Date().toTimeString().slice(0, 5)}`
const daysBetween = (a: string, b: string) => Math.round((parseDateKey(b)!.getTime() - parseDateKey(a)!.getTime()) / DAY_MS)

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

/** Reads the current shape and the older ones (free-text `dose`, `taken` per time, one-time `{ time, takenOn }`). */
type Stored = Partial<Medication> & { dose?: string; taken?: Record<string, string>; time?: string; takenOn?: string }
function normalize(m: Stored): Medication {
  const times = m.times ?? (m.time ? [m.time] : [])
  const [, num, rest] = (m.dose ?? '').match(/^\s*([\d.,]+)\s*(.*)$/) ?? []
  const taken = m.taken ?? (m.time && m.takenOn ? { [m.time]: m.takenOn } : {})
  return {
    id: m.id ?? crypto.randomUUID(),
    name: m.name ?? '',
    amount: m.amount ?? (Number(num?.replace(',', '.')) || 1),
    unit: m.unit ?? (UNITS.find((u) => u === rest?.trim().toLowerCase()) ?? 'viên'),
    timing: m.timing ?? 'any',
    times,
    note: m.note,
    start: m.start ?? m.from?.slice(0, 10) ?? today(),
    end: m.end,
    log: m.log ?? Object.fromEntries(Object.entries(taken).map(([time, day]) => [`${day} ${time}`, 'taken' as const])),
    createdAt: m.createdAt ?? m.from ?? `${today()} 00:00`,
    from: m.from,
  }
}

function useMedications() {
  const userId = useAuth().user?.id ?? 'anon'
  const raw = useSyncExternalStore(subscribe, () => read(userId))
  let meds: Medication[] = []
  try {
    const v: unknown = JSON.parse(raw)
    if (Array.isArray(v)) meds = (v as Stored[]).map(normalize)
  } catch {
    // corrupted value: start fresh
  }
  return [meds, (next: Medication[]) => write(userId, next)] as const
}

const activeOn = (m: Medication, day: string) => m.start <= day && (!m.end || day <= m.end)

/** Doses whose time has passed today, inside the course, and not marked taken or missed yet. */
const dueDoses = (meds: Medication[], day: string, hm: string) =>
  meds.flatMap((m) =>
    activeOn(m, day)
      ? m.times.filter((x) => x <= hm && !m.log[`${day} ${x}`] && !(m.from && `${day} ${x}` < m.from)).map((time) => ({ med: m, time }))
      : [],
  )

/** Doses scheduled so far in the course (up to `now` or the end date) and how many of them were taken. */
function courseStats(m: Medication, now: string) {
  let due = 0
  let taken = 0
  const last = m.end && m.end < now.slice(0, 10) ? m.end : now.slice(0, 10)
  for (let d = parseDateKey(m.start)!, day = m.start; day <= last; d = addDays(d, 1), day = toDateKey(d)) {
    for (const x of m.times) {
      const k = `${day} ${x}`
      if (k < m.createdAt || k > now) continue
      due++
      if (m.log[k] === 'taken') taken++
    }
  }
  return { due, taken, missed: due - taken }
}

const firstTime = (m: Medication) => m.times[0] ?? '99:99'

/** One dose with its two checkboxes: taken / forgot. Unticking both clears the dose. */
function DoseRow({ time, status, onChange, children }: { time: string; status?: DoseStatus | null; onChange: (s: DoseStatus | null) => void; children?: ReactNode }) {
  return (
    <div className={`med-dose-row${status ? ` ${status}` : ''}`}>
      <strong>{time}</strong>
      {children}
      <label className="check">
        <input type="checkbox" checked={status === 'taken'} onChange={(e) => onChange(e.target.checked ? 'taken' : null)} />
        {t('Đã uống')}
      </label>
      <label className="check">
        <input type="checkbox" checked={status === 'missed'} onChange={(e) => onChange(e.target.checked ? 'missed' : null)} />
        {t('Quên uống')}
      </label>
    </div>
  )
}

/** Health page tab: one card per medication with today's doses, course progress, stats and extend. */
export function MedicationTab() {
  const [meds, save] = useMedications()
  const [editing, setEditing] = useState<Medication | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Medication | null>(null)
  const [extending, setExtending] = useState<Medication | null>(null)
  const pattern = usePreferences().data?.dateFormat
  const fmt = (key: string) => formatDate(parseDateKey(key)!, pattern)
  const day = today()
  const now = nowStamp()

  const setStatus = (m: Medication, time: string, s: DoseStatus | null) => {
    const log = { ...m.log }
    if (s) log[`${day} ${time}`] = s
    else delete log[`${day} ${time}`]
    save(meds.map((x) => (x.id === m.id ? { ...x, log } : x)))
  }

  const upsert = (m: Medication) => {
    const next = meds.some((x) => x.id === m.id) ? meds.map((x) => (x.id === m.id ? m : x)) : [...meds, m]
    save(next.sort((a, b) => firstTime(a).localeCompare(firstTime(b))))
    setEditing(null)
    setExtending(null)
  }

  const todays = meds.filter((m) => activeOn(m, day))
  const doses = todays.reduce((n, m) => n + m.times.length, 0)
  const done = todays.reduce((n, m) => n + m.times.filter((x) => m.log[`${day} ${x}`] === 'taken').length, 0)

  return (
    <section className="card med-card">
      <div className="row-between">
        <div>
          <h2>💊 {t('Nhắc uống thuốc')}</h2>
          {doses > 0 && <p className="muted">{t('Hôm nay: {done}/{total} liều', { done, total: doses })}</p>}
        </div>
        <button className="btn-primary" onClick={() => setEditing('new')}>{t('+ Thêm thuốc')}</button>
      </div>

      {meds.length === 0 ? (
        <p className="muted">{t('Chưa có lời nhắc nào.')}</p>
      ) : (
        <div className="med-grid">
          {meds.map((m) => {
            const s = courseStats(m, now)
            const ended = !!m.end && m.end < day
            return (
              <article key={m.id} className={`med-tile${ended ? ' ended' : ''}`}>
                <div className="row-between">
                  <strong className="med-name">💊 {m.name}</strong>
                  <div className="row-tight">
                    <button className="btn-ghost btn-sm" onClick={() => setEditing(m)}>{t('Sửa')}</button>
                    <button className="icon-btn" aria-label={t('Xóa')} onClick={() => setDeleting(m)}>×</button>
                  </div>
                </div>
                <p className="muted">{subtitle(m)}</p>
                <p className="muted">
                  📅 {fmt(m.start)} → {m.end ? fmt(m.end) : t('Không thời hạn')}
                  {m.end && activeOn(m, day) && ` · ${t('Ngày {day}/{total}', { day: daysBetween(m.start, day) + 1, total: daysBetween(m.start, m.end) + 1 })}`}
                  {m.start > day && ` · ${t('Chưa bắt đầu')}`}
                </p>
                {m.note && <p className="muted">{m.note}</p>}

                {activeOn(m, day) && (
                  <div className="med-doses">
                    {m.times.map((time) => (
                      <DoseRow key={time} time={time} status={m.log[`${day} ${time}`]} onChange={(st) => setStatus(m, time, st)} />
                    ))}
                  </div>
                )}

                {s.due > 0 && (
                  <p className="med-stats">
                    {t('Đã uống {taken}/{due} liều', { taken: s.taken, due: s.due })}
                    {s.missed > 0 && <span className="danger"> · {t('Thiếu {n} liều', { n: s.missed })}</span>}
                  </p>
                )}
                {ended && (
                  <div className="row-between med-ended">
                    <span>✅ {t('Đã hết liệu trình')}</span>
                    <button className="btn-primary btn-sm" onClick={() => setExtending(m)}>{t('Gia hạn')}</button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <Modal open={editing != null} title={editing === 'new' ? t('Thêm thuốc') : t('Sửa thuốc')} onClose={() => setEditing(null)}>
        {editing && <MedicationForm med={editing === 'new' ? undefined : editing} onCancel={() => setEditing(null)} onSave={upsert} />}
      </Modal>
      <Modal open={extending != null} title={t('Gia hạn {name}', { name: extending?.name ?? '' })} onClose={() => setExtending(null)} size="sm">
        {extending && <ExtendForm med={extending} onCancel={() => setExtending(null)} onSave={upsert} />}
      </Modal>
      <ConfirmDialog
        open={deleting != null}
        title={t('Xóa thuốc')}
        message={t('Xóa "{name}" và tất cả lời nhắc của thuốc này?', { name: deleting?.name ?? '' })}
        confirmLabel={t('Xóa')}
        onConfirm={() => {
          save(meds.filter((x) => x.id !== deleting?.id))
          setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      />
    </section>
  )
}

/** Adds days after the end of the course; defaults to enough days to make up the missed doses. */
function ExtendForm({ med, onCancel, onSave }: { med: Medication; onCancel: () => void; onSave: (m: Medication) => void }) {
  const missed = courseStats(med, nowStamp()).missed
  const [days, setDays] = useState(String(Math.max(1, Math.ceil(missed / Math.max(1, med.times.length)))))
  const n = Math.floor(Number(days))
  // shortcut: when the course ended before yesterday, the days in between count as missed in the stats; track gaps if that matters.
  const base = med.end! < today() ? toDateKey(addDays(parseDateKey(today())!, -1)) : med.end!
  const end = n > 0 ? toDateKey(addDays(parseDateKey(base)!, n)) : base

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (n > 0 && n <= 365) onSave({ ...med, end, from: nowStamp() })
  }

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      {missed > 0 && <p className="muted span-all">{t('Thiếu {n} liều', { n: missed })}</p>}
      <Field label={t('Gia hạn thêm (ngày)')} className="span-all">
        <input type="number" min={1} max={365} step={1} inputMode="numeric" autoFocus value={days} onChange={(e) => setDays(e.target.value)} />
      </Field>
      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>{t('Hủy bỏ')}</button>
        <button className="btn-primary" disabled={!(n > 0 && n <= 365)}>{t('Gia hạn')}</button>
      </div>
    </form>
  )
}

function MedicationForm({ med, onCancel, onSave }: { med?: Medication; onCancel: () => void; onSave: (m: Medication) => void }) {
  const [name, setName] = useState(med?.name ?? '')
  const [amount, setAmount] = useState(med ? String(med.amount) : '1')
  const [unit, setUnit] = useState<Key>(med?.unit ?? 'viên')
  const [timing, setTiming] = useState<MealTiming>(med?.timing ?? 'after')
  const [times, setTimes] = useState<string[]>(med?.times.length ? med.times : ['08:00'])
  const [start, setStart] = useState(med?.start ?? today())
  const [end, setEnd] = useState(() => med?.end ?? toDateKey(addDays(parseDateKey(today())!, 6)))
  const [note, setNote] = useState(med?.note ?? '')
  const unique = [...new Set(times)].sort()
  const qty = Number(amount.replace(',', '.'))
  const qtyOk = Number.isFinite(qty) && qty > 0 && qty <= 10000
  const datesOk = !!start && (!end || end >= start)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || unique.length === 0 || !qtyOk || !datesOk) return
    // doses already past at save time do not pop up (they can still be ticked by hand)
    const from = nowStamp()
    onSave({
      id: med?.id ?? crypto.randomUUID(),
      name: name.trim(),
      amount: qty,
      unit,
      timing,
      times: unique,
      note: note.trim() || undefined,
      start,
      end: end || undefined,
      log: med?.log ?? {},
      createdAt: med?.createdAt ?? from,
      from,
    })
  }

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      <Field label={t('Tên thuốc')} className="span-all">
        <input autoFocus maxLength={100} placeholder={t('VD: Vitamin C')} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={t('Liều lượng')} error={qtyOk ? undefined : t('Liều lượng phải lớn hơn 0.')}>
        <input type="number" min={0} step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label={t('Đơn vị')}>
        <Select value={unit} onChange={(e) => setUnit(e.target.value as Key)}>
          {UNITS.map((u) => <option key={u} value={u}>{t(u)}</option>)}
        </Select>
      </Field>
      <Field label={t('Ngày bắt đầu')}>
        <DateInput aria-label={t('Ngày bắt đầu')} value={start} onChange={setStart} />
      </Field>
      <Field label={t('Ngày kết thúc')} hint={t('Để trống nếu dùng lâu dài')} error={datesOk ? undefined : t('Ngày kết thúc phải sau ngày bắt đầu.')}>
        <DateInput aria-label={t('Ngày kết thúc')} value={end} onChange={setEnd} min={start} optional />
      </Field>
      <Field label={t('Thời điểm uống')} className="span-all">
        <Select value={timing} onChange={(e) => setTiming(e.target.value as MealTiming)}>
          {MEAL_TIMINGS.map((x) => <option key={x.value} value={x.value}>{t(x.label)}</option>)}
        </Select>
      </Field>
      <fieldset className="fieldset span-all">
        <legend>{t('Giờ nhắc trong ngày')}</legend>
        <div className="med-times">
          {times.map((x, i) => (
            <span key={i} className="row-tight">
              <TimeInput aria-label={t('Giờ uống')} value={x} onChange={(v) => setTimes(times.map((y, j) => (j === i ? v : y)))} />
              {times.length > 1 && (
                <button type="button" className="icon-btn" aria-label={t('Xóa')} onClick={() => setTimes(times.filter((_, j) => j !== i))}>×</button>
              )}
            </span>
          ))}
          {times.length < 8 && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => setTimes([...times, '12:00'])}>{t('+ Thêm giờ')}</button>
          )}
        </div>
        {unique.length < times.length && <small className="muted">{t('Giờ trùng nhau sẽ được gộp lại.')}</small>}
      </fieldset>
      <div className="field span-all">
        <span>{t('Ghi chú')}</span>
        <textarea rows={2} maxLength={500} placeholder={t('VD: uống với nhiều nước')} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>{t('Hủy bỏ')}</button>
        <button className="btn-primary" disabled={!name.trim() || !qtyOk || !datesOk}>{t('Lưu')}</button>
      </div>
    </form>
  )
}

/** Mounted in the app shell: pops up when doses are due; mark each taken or forgotten. Closing snoozes for 10 minutes. */
export function MedicationReminderPopup() {
  const [meds, save] = useMedications()
  const [now, setNow] = useState(() => new Date())
  const [snoozedUntil, setSnoozedUntil] = useState(0)
  const [choice, setChoice] = useState<Record<string, DoseStatus | null>>({}) // rows changed in the popup; default is taken

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000) // re-evaluate the clock every 30 s
    return () => clearInterval(id)
  }, [])

  const day = toDateKey(now)
  const due = now.getTime() < snoozedUntil ? [] : dueDoses(meds, day, now.toTimeString().slice(0, 5))
  const keyOfDose = (d: { med: Medication; time: string }) => `${d.med.id}@${d.time}`
  const statusOf = (d: { med: Medication; time: string }) => { const k = keyOfDose(d); return k in choice ? choice[k] : 'taken' }

  const snooze = () => {
    setSnoozedUntil(now.getTime() + SNOOZE_MS) // `now` lags real time by ≤ 30 s; fine for a 10-minute snooze
    setChoice({})
  }

  const confirm = () => {
    const picked = due.filter((d) => statusOf(d))
    save(meds.map((m) => {
      const mine = picked.filter((d) => d.med.id === m.id)
      return mine.length ? { ...m, log: { ...m.log, ...Object.fromEntries(mine.map((d) => [`${day} ${d.time}`, statusOf(d)!])) } } : m
    }))
    if (picked.length < due.length) snooze() // the unticked ones come back in 10 minutes
    else setChoice({})
  }

  return (
    <Modal open={due.length > 0} title={t('Đến giờ uống thuốc')} onClose={snooze} size="sm">
      <div className="med-doses">
        {due.map((d) => (
          <DoseRow key={keyOfDose(d)} time={d.time} status={statusOf(d)} onChange={(s) => setChoice((c) => ({ ...c, [keyOfDose(d)]: s }))}>
            <span className="med-dose-name">💊 {d.med.name} <span className="muted">· {subtitle(d.med)}</span></span>
          </DoseRow>
        ))}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={snooze}>{t('Nhắc lại sau 10 phút')}</button>
        <button type="button" className="btn-primary" onClick={confirm}>{t('Xác nhận')}</button>
      </div>
    </Modal>
  )
}
