import { locale, t, tx } from '../../i18n'
import { useState } from 'react'
import { ConfirmDialog, Modal } from '../../components/Dialog'
import { Field } from '../../components/Form'
import { addDays, DAY_MS, parseDateKey, startOfWeek, toDateKey, weekdayName } from '../../lib/dates'
import { applyServerErrors } from '../../lib/forms'
import type { HealthProfileDto, WorkoutDto, WorkoutInput } from './api'
import { FOCUS_LABEL, maxLevel, suggestWeek, type PlanDay } from './catalog'
import { parseNum, useRemoveWorkout, useSaveWorkout, useWorkouts } from './queries'

const LEVEL_LABEL = { 1: 'nhẹ', 2: 'vừa', 3: 'cao' } as const

const planToInput = (day: PlanDay, date: string): WorkoutInput => ({
  date,
  time: null,
  name: t(FOCUS_LABEL[day.focus]),
  durationMinutes: day.minutes,
  exercises: day.exercises.map((e) => `${t(e.name)} — ${t(e.dose)}`).join('\n'),
  caloriesBurned: day.kcal,
  notes: null,
  isDone: false,
})

export function WorkoutTab({ p }: { p: HealthProfileDto }) {
  const [monday, setMonday] = useState(() => startOfWeek(new Date()))
  const from = toDateKey(monday)
  const { data: sessions = [], isPending } = useWorkouts(p.id, from, toDateKey(addDays(monday, 6)))
  const save = useSaveWorkout(p.id)
  const remove = useRemoveWorkout(p.id)
  const [dialog, setDialog] = useState<{ workout?: WorkoutDto; date: string } | null>(null)
  const [deleting, setDeleting] = useState<WorkoutDto | null>(null)

  const input = { ...p, age: p.assessment.age, bmiCategory: p.assessment.bmiCategory }
  const plan = suggestWeek(input, Math.floor(monday.getTime() / (7 * DAY_MS)))
  const level = maxLevel(input)
  const done = sessions.filter((s) => s.isDone)
  const [todayKey] = useState(() => toDateKey(new Date()))
  // Suggestions only for days without a session and not in the past.
  const open = plan.filter((d) => {
    const key = toDateKey(addDays(monday, d.weekday))
    return key >= todayKey && !sessions.some((s) => s.date === key)
  })

  const toggle = (w: WorkoutDto) => {
    const { id, completedAt: _, ...body } = w
    save.mutate({ id, body: { ...body, isDone: !w.isDone } })
  }

  return (
    <div className="stack-lg">
      <div className="row-between wrap">
        <div className="row">
          <button className="btn-ghost" onClick={() => setMonday(addDays(monday, -7))} aria-label={t('Tuần trước')}>‹</button>
          <strong>{t('Tuần {from} – {to}', { from: monday.toLocaleDateString(locale()), to: addDays(monday, 6).toLocaleDateString(locale()) })}</strong>
          <button className="btn-ghost" onClick={() => setMonday(addDays(monday, 7))} aria-label={t('Tuần sau')}>›</button>
          <button className="btn-link" onClick={() => setMonday(startOfWeek(new Date()))}>{t('Tuần này')}</button>
        </div>
        <div className="row">
          {open.length > 0 && (
            <button className="btn-ghost" disabled={save.isPending}
              onClick={() => void Promise.all(open.map((d) => save.mutateAsync({ body: planToInput(d, toDateKey(addDays(monday, d.weekday))) })))}>
              {t('Thêm cả tuần gợi ý vào lịch')}
            </button>
          )}
          <button className="btn-primary" onClick={() => setDialog({ date: todayKey })}>{t('+ Buổi tập')}</button>
        </div>
      </div>

      <section className="card">
        <div className="macro-row">
          <span>✅ {t('Đã hoàn thành')} <strong>{done.length}/{sessions.length}</strong> {t('buổi')}</span>
          <span>⏱ <strong>{done.reduce((s, w) => s + w.durationMinutes, 0)}</strong> {t('phút')}</span>
          <span>🔥 <strong>{done.reduce((s, w) => s + (w.caloriesBurned ?? 0), 0)}</strong> kcal</span>
          <span className="muted">{t('Cường độ phù hợp: {level}', { level: t(LEVEL_LABEL[level]) })}</span>
        </div>
        <small className="muted">
          {t('Lịch gợi ý dựa trên mục tiêu, mức vận động và tình trạng cơ thể; các bài không phù hợp với tình trạng của bạn đã được loại bỏ.')}
        </small>
      </section>

      {isPending && <p className="muted">{t('Đang tải…')}</p>}
      {save.isError && <p className="form-error">{t('Không lưu được, vui lòng thử lại.')}</p>}

      <div className="workout-week">
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(monday, i)
          const key = toDateKey(d)
          const daySessions = sessions.filter((s) => s.date === key)
          const suggestion = open.find((x) => x.weekday === i)
          return (
            <section key={key} className={key === todayKey ? 'workout-day today' : 'workout-day'}>
              <header className="row-between">
                <strong>{weekdayName(d, 'long')}</strong>
                <button className="btn-link" aria-label={t('Thêm buổi tập')} onClick={() => setDialog({ date: key })}>+</button>
              </header>
              <small className="muted">{d.toLocaleDateString(locale())}</small>

              {daySessions.map((w) => (
                <div key={w.id} className={w.isDone ? 'workout-item done' : 'workout-item'}>
                  <label className="check">
                    <input type="checkbox" checked={w.isDone} disabled={save.isPending} onChange={() => toggle(w)} />
                    <button className="btn-link" onClick={() => setDialog({ workout: w, date: w.date })}>{w.name}</button>
                  </label>
                  <small className="muted">
                    {w.time && `${w.time.slice(0, 5)} · `}{w.durationMinutes} {t('phút')}{w.caloriesBurned ? ` · ~${w.caloriesBurned} kcal` : ''}
                  </small>
                  {w.exercises && <p className="prewrap small">{w.exercises}</p>}
                  <button className="btn-link danger small" onClick={() => setDeleting(w)}>{t('Xóa')}</button>
                </div>
              ))}

              {suggestion && <Suggestion day={suggestion} busy={save.isPending}
                onAdd={() => save.mutate({ body: planToInput(suggestion, key) })} />}
              {!daySessions.length && !suggestion && <small className="muted">{key < todayKey ? '—' : t('Nghỉ ngơi')}</small>}
            </section>
          )
        })}
      </div>

      <WorkoutDialog state={dialog} profileId={p.id} onClose={() => setDialog(null)} />
      <ConfirmDialog
        open={!!deleting}
        title={t('Xóa buổi tập?')}
        message={deleting?.name}
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}

function Suggestion({ day, busy, onAdd }: { day: PlanDay; busy: boolean; onAdd: () => void }) {
  return (
    <div className="workout-item suggestion">
      <span className="muted small">{t('Gợi ý')}</span>
      <strong>{t(FOCUS_LABEL[day.focus])}</strong>
      <small className="muted">{day.minutes} {t('phút')} · ~{day.kcal} kcal</small>
      {day.exercises.map((e) => (
        <details key={e.name}>
          <summary>{t(e.name)} <small className="muted">{t(e.dose)}</small></summary>
          <small>{t(e.how)}</small>
        </details>
      ))}
      <button className="btn-ghost btn-sm" disabled={busy} onClick={onAdd}>{t('+ Thêm vào lịch')}</button>
    </div>
  )
}

function WorkoutDialog({ state, profileId, onClose }: { state: { workout?: WorkoutDto; date: string } | null; profileId: string; onClose: () => void }) {
  return (
    <Modal open={!!state} title={state?.workout ? t('Sửa buổi tập') : t('Thêm buổi tập')} onClose={onClose}>
      {state && <WorkoutForm key={state.workout?.id ?? state.date} state={state} profileId={profileId} onClose={onClose} />}
    </Modal>
  )
}

function WorkoutForm({ state, profileId, onClose }: { state: { workout?: WorkoutDto; date: string }; profileId: string; onClose: () => void }) {
  const save = useSaveWorkout(profileId)
  const w = state.workout
  const [v, setV] = useState({
    name: w?.name ?? '', date: w?.date ?? state.date, time: w?.time?.slice(0, 5) ?? '', duration: String(w?.durationMinutes ?? 30),
    exercises: w?.exercises ?? '', kcal: w?.caloriesBurned == null ? '' : String(w.caloriesBurned), notes: w?.notes ?? '', isDone: w?.isDone ?? false,
  })
  const [error, setError] = useState('')
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const duration = parseNum(v.duration), kcal = parseNum(v.kcal)
    if (!v.name.trim()) return setError(t('Nhập tên buổi tập.'))
    if (!parseDateKey(v.date)) return setError(t('Chọn ngày'))
    if (duration == null || duration < 1 || duration > 600) return setError(t('Thời lượng từ 1 đến 600 phút.'))
    if (kcal != null && kcal < 0) return setError(t('Calo không được âm.'))
    try {
      await save.mutateAsync({
        id: w?.id,
        body: {
          name: v.name.trim(), date: v.date, time: v.time ? `${v.time}:00` : null, durationMinutes: Math.round(duration),
          exercises: v.exercises.trim() || null, caloriesBurned: kcal == null ? null : Math.round(kcal), notes: v.notes.trim() || null, isDone: v.isDone,
        },
      })
      onClose()
    } catch (err) {
      setError(applyServerErrors(err))
    }
  }

  return (
    <form className="form-grid" onSubmit={(e) => void submit(e)} noValidate>
      <Field label={t('Tên buổi tập')}><input autoFocus maxLength={200} value={v.name} onChange={set('name')} placeholder={t('VD: Chạy bộ công viên')} /></Field>
      <Field label={t('Ngày')}><input type="date" value={v.date} onChange={set('date')} /></Field>
      <Field label={t('Giờ')} hint={t('Không bắt buộc')}><input type="time" value={v.time} onChange={set('time')} /></Field>
      <Field label={t('Thời lượng (phút)')}><input inputMode="numeric" value={v.duration} onChange={set('duration')} /></Field>
      <div className="field span-all">
        <span>{t('Bài tập (mỗi dòng một bài, VD: Squat 3 × 12 × 20 kg)')}</span>
        <textarea rows={4} maxLength={4000} value={v.exercises} onChange={set('exercises')} />
      </div>
      <Field label={t('Calo tiêu hao (kcal)')} hint={t('Không bắt buộc')}><input inputMode="numeric" value={v.kcal} onChange={set('kcal')} /></Field>
      <label className="check">
        <input type="checkbox" checked={v.isDone} onChange={(e) => setV({ ...v, isDone: e.target.checked })} /> {t('Đã hoàn thành')}
      </label>
      <div className="field span-all">
        <span>{t('Ghi chú')}</span>
        <textarea rows={2} maxLength={2000} value={v.notes} onChange={set('notes')} />
      </div>
      {error && <p className="form-error span-all" role="alert">{tx(error)}</p>}
      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>{t('Hủy bỏ')}</button>
        <button className="btn-primary" disabled={save.isPending}>{save.isPending ? t('Đang lưu…') : t('Lưu')}</button>
      </div>
    </form>
  )
}
