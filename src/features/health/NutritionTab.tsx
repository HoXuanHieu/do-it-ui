import { t, tx } from '../../i18n'
import { useState } from 'react'
import { ConfirmDialog, Modal } from '../../components/Dialog'
import { Field } from '../../components/Form'
import { addDays, DAY_MS, parseDateKey, toDateKey, weekdayName } from '../../lib/dates'
import { applyServerErrors } from '../../lib/forms'
import type { FoodEntryDto, FoodEntryInput, HealthProfileDto, MealType } from './api'
import { DISHES, suggestMenu } from './catalog'
import { MEALS, num, parseNum, useFoods, useRemoveFood, useSaveFood } from './queries'

const sum = (list: FoodEntryDto[], f: (e: FoodEntryDto) => number | null) => list.reduce((s, e) => s + (f(e) ?? 0), 0)

/** Eaten vs target: under 80% low, 80–110% on target, above over. */
function verdict(eaten: number, target: number) {
  const r = eaten / target
  if (eaten === 0) return { cls: 'none', text: t('Chưa ghi món nào hôm nay.') }
  if (r < 0.8) return { cls: 'low', text: t('Còn thiếu {kcal} kcal so với mục tiêu.', { kcal: Math.round(target - eaten) }) }
  if (r <= 1.1) return { cls: 'ok', text: t('Đạt mục tiêu năng lượng, tốt lắm!') }
  return { cls: 'over', text: t('Vượt {kcal} kcal so với mục tiêu.', { kcal: Math.round(eaten - target) }) }
}

export function NutritionTab({ p }: { p: HealthProfileDto }) {
  const [day, setDay] = useState(() => toDateKey(new Date()))
  const date = parseDateKey(day)!
  const from = toDateKey(addDays(date, -6))
  const { data: week = [], isPending } = useFoods(p.id, from, day)
  const save = useSaveFood(p.id)
  const remove = useRemoveFood(p.id)
  const [dialog, setDialog] = useState<{ entry?: FoodEntryDto; meal: MealType } | null>(null)
  const [deleting, setDeleting] = useState<FoodEntryDto | null>(null)

  const target = p.assessment.dailyCalories
  const entries = week.filter((e) => e.date === day)
  const eaten = entries.filter((e) => !e.isPlanned)
  const planned = entries.filter((e) => e.isPlanned)
  const kcal = sum(eaten, (e) => e.calories)
  const v = verdict(kcal, target)
  const menu = suggestMenu(target, p.conditions, Math.round(date.getTime() / DAY_MS), MEALS)

  const applyMenu = () =>
    Promise.all(
      menu.map((m) =>
        save.mutateAsync({
          body: {
            date: day, meal: m.meal, name: t(m.dish.name), quantity: m.servings, unit: t(m.dish.unit), calories: m.kcal,
            proteinG: Math.round(m.dish.p * m.servings), carbsG: Math.round(m.dish.c * m.servings), fatG: Math.round(m.dish.f * m.servings),
            isPlanned: true,
          },
        }),
      ),
    )

  const markEaten = (e: FoodEntryDto) => {
    const { id, ...body } = e
    save.mutate({ id, body: { ...body, isPlanned: false } })
  }

  return (
    <div className="stack-lg">
      <div className="row">
        <button className="btn-ghost" onClick={() => setDay(toDateKey(addDays(date, -1)))} aria-label={t('Ngày trước')}>‹</button>
        <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label={t('Ngày')} />
        <button className="btn-ghost" onClick={() => setDay(toDateKey(addDays(date, 1)))} aria-label={t('Ngày sau')}>›</button>
        <button className="btn-link" onClick={() => setDay(toDateKey(new Date()))}>{t('Hôm nay')}</button>
      </div>

      <section className={`card kcal-card kcal-${v.cls}`}>
        <div className="row-between">
          <h2>{t('Năng lượng đã nạp')}</h2>
          <span><strong>{kcal}</strong> / {target} kcal {p.assessment.isCalorieEstimated && <span className="tag">{t('Ước tính')}</span>}</span>
        </div>
        <div className="kcal-bar"><span style={{ width: `${Math.min(100, (kcal / target) * 100)}%` }} /></div>
        <p>{v.text}</p>
        <div className="macro-row">
          <span>🥩 {t('Đạm')} <strong>{num(sum(eaten, (e) => e.proteinG), 0)}</strong>/{p.assessment.proteinG} g</span>
          <span>🍚 {t('Tinh bột')} <strong>{num(sum(eaten, (e) => e.carbsG), 0)}</strong>/{p.assessment.carbsG} g</span>
          <span>🥑 {t('Chất béo')} <strong>{num(sum(eaten, (e) => e.fatG), 0)}</strong>/{p.assessment.fatG} g</span>
          {planned.length > 0 && <span className="muted">🗓 {t('Đã lên kế hoạch thêm {kcal} kcal', { kcal: sum(planned, (e) => e.calories) })}</span>}
        </div>
      </section>

      <div className="health-two-col">
        <section className="card meal-list">
          <h2>{t('Nhật ký ăn uống')}</h2>
          {isPending && <p className="muted">{t('Đang tải…')}</p>}
          {MEALS.map((m) => {
            const items = entries.filter((e) => e.meal === m.value)
            return (
              <div key={m.value} className="meal-block">
                <div className="row-between">
                  <h3><span aria-hidden>{m.icon}</span> {t(m.label)} <small className="muted">{sum(items.filter((e) => !e.isPlanned), (e) => e.calories)} kcal</small></h3>
                  <button className="btn-link" onClick={() => setDialog({ meal: m.value })}>{t('+ Thêm món')}</button>
                </div>
                {items.map((e) => (
                  <div key={e.id} className={e.isPlanned ? 'food-row planned' : 'food-row'}>
                    <button className="food-name btn-link" onClick={() => setDialog({ entry: e, meal: e.meal })}>
                      {e.name} <small className="muted">{num(e.quantity)} {e.unit}</small>
                    </button>
                    <span>{e.calories} kcal</span>
                    {e.isPlanned && (
                      <button className="btn-ghost btn-sm" disabled={save.isPending} onClick={() => markEaten(e)}>{t('✓ Đã ăn')}</button>
                    )}
                    <button className="icon-btn" aria-label={t('Xóa')} onClick={() => setDeleting(e)}>×</button>
                  </div>
                ))}
              </div>
            )
          })}
          <small className="muted">{t('Món có viền nét đứt là món đã lên kế hoạch, chưa tính vào năng lượng đã nạp.')}</small>
        </section>

        <section className="card">
          <h2>🍽 {t('Gợi ý thực đơn')}</h2>
          <p className="muted">{t('Theo mục tiêu {kcal} kcal/ngày và tình trạng sức khỏe của hồ sơ.', { kcal: target })}</p>
          <ul className="menu-list">
            {menu.map((m) => (
              <li key={m.meal}>
                <span className="muted">{t(MEALS.find((x) => x.value === m.meal)!.label)}</span>
                <strong>{t(m.dish.name)}</strong>
                <small>{num(m.servings)} {t(m.dish.unit)} · {m.kcal} kcal</small>
              </li>
            ))}
          </ul>
          <p><strong>{t('Tổng: {kcal} kcal', { kcal: menu.reduce((s, m) => s + m.kcal, 0) })}</strong></p>
          <button className="btn-primary" disabled={save.isPending} onClick={() => void applyMenu()}>
            {t('Thêm vào kế hoạch ngày này')}
          </button>
          {save.isError && <p className="form-error">{t('Không lưu được, vui lòng thử lại.')}</p>}
        </section>
      </div>

      <section className="card">
        <h2>{t('7 ngày gần nhất')}</h2>
        <div className="week-bars">
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(date, i - 6)
            const k = toDateKey(d)
            const total = sum(week.filter((e) => e.date === k && !e.isPlanned), (e) => e.calories)
            return (
              <button key={k} className={k === day ? 'week-bar active' : 'week-bar'} onClick={() => setDay(k)}
                title={`${k}: ${total} kcal`}>
                <span className={`bar kcal-${verdict(total, target).cls}`} style={{ height: `${Math.min(100, (total / target) * 80)}%` }} />
                <small>{weekdayName(d)}</small>
                <small className="muted">{total}</small>
              </button>
            )
          })}
        </div>
        <small className="muted">{t('Vạch ngang là mục tiêu năng lượng mỗi ngày.')}</small>
      </section>

      <FoodDialog state={dialog} day={day} profileId={p.id} onClose={() => setDialog(null)} />
      <ConfirmDialog
        open={!!deleting}
        title={t('Xóa món ăn?')}
        message={deleting?.name}
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}

function FoodDialog({ state, day, profileId, onClose }: {
  state: { entry?: FoodEntryDto; meal: MealType } | null
  day: string
  profileId: string
  onClose: () => void
}) {
  return (
    <Modal open={!!state} title={state?.entry ? t('Sửa món ăn') : t('Thêm món ăn')} onClose={onClose}>
      {state && <FoodForm key={state.entry?.id ?? state.meal} state={state} day={day} profileId={profileId} onClose={onClose} />}
    </Modal>
  )
}

function FoodForm({ state, day, profileId, onClose }: {
  state: { entry?: FoodEntryDto; meal: MealType }
  day: string
  profileId: string
  onClose: () => void
}) {
  const save = useSaveFood(profileId)
  const e = state.entry
  const str = (n: number | null | undefined) => (n == null ? '' : String(n))
  const [v, setV] = useState({
    meal: state.meal, name: e?.name ?? '', quantity: str(e?.quantity ?? 1), unit: e?.unit ?? t('phần'),
    calories: str(e?.calories), protein: str(e?.proteinG), carbs: str(e?.carbsG), fat: str(e?.fatG), isPlanned: e?.isPlanned ?? false,
  })
  const [error, setError] = useState('')
  const set = (k: keyof typeof v) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: ev.target.value })

  const pick = (name: string) => {
    const d = DISHES.find((x) => t(x.name) === name)
    if (d) setV({ ...v, name, quantity: '1', unit: t(d.unit), calories: String(d.kcal), protein: String(d.p), carbs: String(d.c), fat: String(d.f) })
    else setV({ ...v, name })
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const quantity = parseNum(v.quantity), calories = parseNum(v.calories)
    const macros = [v.protein, v.carbs, v.fat].map(parseNum)
    if (!v.name.trim()) return setError(t('Nhập tên món.'))
    if (quantity == null || quantity <= 0) return setError(t('Số lượng phải lớn hơn 0.'))
    if (!v.unit.trim()) return setError(t('Nhập đơn vị.'))
    if (calories == null || calories < 0) return setError(t('Calo không được âm.'))
    if (macros.some((m) => m != null && m < 0)) return setError(t('Đạm, tinh bột, chất béo không được âm.'))
    const body: FoodEntryInput = {
      date: e?.date ?? day, meal: v.meal, name: v.name.trim(), quantity, unit: v.unit.trim(), calories: Math.round(calories),
      proteinG: macros[0], carbsG: macros[1], fatG: macros[2], isPlanned: v.isPlanned,
    }
    try {
      await save.mutateAsync({ id: e?.id, body })
      onClose()
    } catch (err) {
      setError(applyServerErrors(err))
    }
  }

  return (
    <form className="form-grid" onSubmit={(ev) => void submit(ev)} noValidate>
      <Field label={t('Tên món')}>
        <input autoFocus list="dish-list" maxLength={200} value={v.name} onChange={(ev) => pick(ev.target.value)} placeholder={t('Gõ hoặc chọn món gợi ý')} />
        <datalist id="dish-list">{DISHES.map((d) => <option key={d.name} value={t(d.name)} />)}</datalist>
      </Field>
      <Field label={t('Bữa')}>
        <select value={v.meal} onChange={set('meal')}>
          {MEALS.map((m) => <option key={m.value} value={m.value}>{t(m.label)}</option>)}
        </select>
      </Field>
      <Field label={t('Số lượng')}><input inputMode="decimal" value={v.quantity} onChange={set('quantity')} /></Field>
      <Field label={t('Đơn vị')}><input maxLength={30} value={v.unit} onChange={set('unit')} placeholder={t('g, bát, phần…')} /></Field>
      <Field label={t('Calo (kcal)')}><input inputMode="numeric" value={v.calories} onChange={set('calories')} /></Field>
      <Field label={t('Đạm (g)')} hint={t('Không bắt buộc')}><input inputMode="decimal" value={v.protein} onChange={set('protein')} /></Field>
      <Field label={t('Tinh bột (g)')} hint={t('Không bắt buộc')}><input inputMode="decimal" value={v.carbs} onChange={set('carbs')} /></Field>
      <Field label={t('Chất béo (g)')} hint={t('Không bắt buộc')}><input inputMode="decimal" value={v.fat} onChange={set('fat')} /></Field>
      <label className="check span-all">
        <input type="checkbox" checked={v.isPlanned} onChange={(ev) => setV({ ...v, isPlanned: ev.target.checked })} />
        {t('Chỉ là kế hoạch (chưa ăn)')}
      </label>
      {error && <p className="form-error span-all" role="alert">{tx(error)}</p>}
      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>{t('Hủy bỏ')}</button>
        <button className="btn-primary" disabled={save.isPending}>{save.isPending ? t('Đang lưu…') : t('Lưu')}</button>
      </div>
    </form>
  )
}
