import { locale, t, tx, type Key } from '../../i18n'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '../../components/Dialog'
import { Field } from '../../components/Form'
import { DAY_MS, formatDate, parseDateKey, startOfDay, toDateKey } from '../../lib/dates'
import { applyServerErrors } from '../../lib/forms'
import { usePreferences } from '../account/queries'
import type { HealthProfileDto, MeasurementDto } from './api'
import { Disclaimer } from './HealthPage'
import { NutritionTab } from './NutritionTab'
import { ProfileFormDialog } from './ProfileFormDialog'
import {
  ACTIVITY, BMI_LABEL, CONDITIONS, GOALS, labelOf, num, parseNum, SEXES,
  useAddMeasurement, useDeleteProfile, useHealthProfiles, useMeasurements, useRemoveMeasurement, useUpdateProfile, withCheckIn,
} from './queries'
import { WorkoutTab } from './WorkoutTab'

const TABS: { value: string; label: Key }[] = [
  { value: 'overview', label: 'Đánh giá' },
  { value: 'nutrition', label: 'Chế độ ăn' },
  { value: 'workouts', label: 'Tập luyện' },
  { value: 'progress', label: 'Theo dõi chỉ số' },
]

/** Days since the latest measurement ≥ the check-in interval. */
function checkInDue(p: HealthProfileDto) {
  const last = parseDateKey(p.latestMeasurement?.date)
  if (!p.checkInEveryDays || !last) return false
  return (startOfDay(new Date()).getTime() - last.getTime()) / DAY_MS >= p.checkInEveryDays
}

/** /health/:id?tab=overview|nutrition|workouts|progress */
export function HealthProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data: profiles, isPending, isError } = useHealthProfiles()
  const remove = useDeleteProfile()
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const tab = TABS.some((x) => x.value === params.get('tab')) ? params.get('tab')! : 'overview'

  const back = <Link to="/health" className="goal-back">{t('← Tất cả hồ sơ')}</Link>
  if (isPending) return <p className="muted">{t('Đang tải…')}</p>
  if (isError) return <p className="form-error">{t('Không tải được hồ sơ sức khỏe.')}</p>
  const p = profiles.find((x) => x.id === id)
  if (!p) return <div>{back}<p className="muted">{t('Không tìm thấy hồ sơ này.')}</p></div>

  const goal = GOALS.find((g) => g.value === p.goal)!
  return (
    <div className="health-page">
      {back}
      <header className="page-header row-between wrap">
        <div>
          <h1>{p.name}</h1>
          <p className="muted">
            {t(labelOf(SEXES, p.sex))} · {t('{age} tuổi', { age: p.assessment.age })} · {num(p.heightCm)} cm · {num(p.weightKg)} kg ·{' '}
            {goal.icon} {t(goal.label)} · {t(labelOf(ACTIVITY, p.activityLevel))}
          </p>
        </div>
        <div className="row">
          <button className="btn-ghost" onClick={() => setEditing(true)}>{t('Sửa hồ sơ')}</button>
          <button className="btn-ghost danger" onClick={() => setConfirm(true)}>{t('Xóa')}</button>
        </div>
      </header>

      {checkInDue(p) && tab !== 'progress' && (
        <div className="health-due" role="status">
          🔔 {t('Đã đến lúc đánh giá lại chỉ số cơ thể.')}
          <button className="btn-primary btn-sm" onClick={() => setParams({ tab: 'progress' })}>{t('Cập nhật ngay')}</button>
        </div>
      )}

      <nav className="tabs" role="tablist" aria-label={p.name}>
        {TABS.map((x) => (
          <button key={x.value} role="tab" aria-selected={tab === x.value} className={tab === x.value ? 'active' : undefined}
            onClick={() => setParams({ tab: x.value })}>
            {t(x.label)}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <OverviewTab p={p} />}
      {tab === 'nutrition' && <NutritionTab p={p} />}
      {tab === 'workouts' && <WorkoutTab p={p} />}
      {tab === 'progress' && <ProgressTab p={p} />}

      <Disclaimer />
      <ProfileFormDialog open={editing} profile={p} onClose={() => setEditing(false)} />
      <ConfirmDialog
        open={confirm}
        title={t('Xóa hồ sơ sức khỏe?')}
        message={t('Hồ sơ “{name}” cùng nhật ký ăn uống, lịch tập và chỉ số sẽ bị xóa.', { name: p.name })}
        busy={remove.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => remove.mutate(p.id, { onSuccess: () => navigate('/health', { replace: true }) })}
      />
    </div>
  )
}

// ---------- overview ----------

/** Plain-language advice from the assessment and body conditions. */
function advice(p: HealthProfileDto): { tone: 'ok' | 'warn' | 'info'; text: string }[] {
  const a = p.assessment
  const out: { tone: 'ok' | 'warn' | 'info'; text: string }[] = []
  const bmiText: Record<string, Key> = {
    Underweight: 'Bạn đang thiếu cân: tăng khẩu phần, ưu tiên thực phẩm giàu đạm và tập sức mạnh.',
    Normal: 'Cân nặng đang trong ngưỡng khỏe mạnh, hãy duy trì chế độ ăn và vận động hiện tại.',
    Overweight: 'Bạn hơi thừa cân: giảm 300–500 kcal mỗi ngày và tăng vận động tim mạch.',
    Obese: 'Bạn ở ngưỡng béo phì: nên giảm cân từ từ khoảng 0,5 kg/tuần và tham khảo ý kiến bác sĩ.',
  }
  out.push({ tone: a.bmiCategory === 'Normal' ? 'ok' : 'warn', text: t(bmiText[a.bmiCategory]) })
  if (p.goal === 'LoseWeight' && a.bmiCategory === 'Underweight')
    out.push({ tone: 'warn', text: t('Mục tiêu giảm cân không phù hợp khi đang thiếu cân.') })
  if (p.goal === 'GainWeight' && (a.bmiCategory === 'Obese' || a.bmiCategory === 'Overweight'))
    out.push({ tone: 'warn', text: t('Mục tiêu tăng cân không phù hợp khi đang thừa cân.') })
  if (p.targetWeightKg != null && (p.targetWeightKg < a.healthyWeightMinKg || p.targetWeightKg > a.healthyWeightMaxKg))
    out.push({
      tone: 'warn',
      text: t('Cân nặng mục tiêu nằm ngoài khoảng khỏe mạnh ({min}–{max} kg).', { min: num(a.healthyWeightMinKg), max: num(a.healthyWeightMaxKg) }),
    })
  if (a.waistRisk) out.push({ tone: 'warn', text: t('Vòng eo vượt ngưỡng khuyến nghị: nguy cơ tim mạch và tiểu đường cao hơn.') })
  if (!a.isCalorieEstimated && Math.abs(a.dailyCalories - a.estimatedCalories) > a.estimatedCalories * 0.25)
    out.push({ tone: 'warn', text: t('Calo mục tiêu bạn đặt chênh nhiều so với mức ước tính ({kcal} kcal).', { kcal: a.estimatedCalories }) })
  const conditionText: Record<string, Key> = {
    JointPain: 'Đau khớp: ưu tiên bài tập ít tác động như đi bộ, đạp xe, bơi.',
    BackPain: 'Đau lưng: tránh gập bụng và nâng tạ nặng, tăng cường cơ lưng – mông nhẹ nhàng.',
    HeartOrBloodPressure: 'Tim mạch / huyết áp: chỉ tập cường độ nhẹ; hỏi ý kiến bác sĩ trước khi tăng cường độ.',
    Diabetes: 'Tiểu đường: hạn chế đồ ngọt, tinh bột trắng và chia nhỏ bữa ăn.',
  }
  for (const c of p.conditions) out.push({ tone: 'info', text: t(conditionText[c]) })
  out.push({ tone: 'info', text: t('Uống khoảng {ml} ml nước mỗi ngày.', { ml: a.waterMl }) })
  return out
}

function OverviewTab({ p }: { p: HealthProfileDto }) {
  const a = p.assessment
  // BMI scale 15–35 → 0–100%
  const marker = Math.min(100, Math.max(0, ((a.bmi - 15) / 20) * 100))
  return (
    <div className="health-overview">
      <section className="card">
        <h2>{t('Chỉ số khối cơ thể (BMI)')}</h2>
        <div className="row">
          <strong className="health-big">{num(a.bmi)}</strong>
          <span className={`bmi-pill bmi-${a.bmiCategory.toLowerCase()}`}>{t(BMI_LABEL[a.bmiCategory])}</span>
        </div>
        <div className="bmi-scale" aria-hidden>
          <span style={{ left: `${marker}%` }} />
        </div>
        <small className="muted">{t('Ngưỡng cho người châu Á: < 18,5 thiếu cân · 18,5–22,9 bình thường · 23–24,9 thừa cân · ≥ 25 béo phì')}</small>
      </section>

      <section className="card">
        <h2>{t('Cân nặng')}</h2>
        <p className="health-big">{num(p.weightKg)} kg</p>
        <p className="muted">{t('Khoảng khỏe mạnh: {min}–{max} kg', { min: num(a.healthyWeightMinKg), max: num(a.healthyWeightMaxKg) })}</p>
        {p.targetWeightKg != null && (
          <p>
            {t('Mục tiêu: {kg} kg', { kg: num(p.targetWeightKg) })}
            {a.weeksToTarget ? ` · ${t('khoảng {n} tuần (0,5 kg/tuần)', { n: a.weeksToTarget })}` : ` · ${t('đã đạt')}`}
          </p>
        )}
      </section>

      <section className="card">
        <h2>{t('Năng lượng mỗi ngày')}</h2>
        <p className="health-big">{a.dailyCalories} kcal</p>
        <p className="muted">
          {a.isCalorieEstimated ? <span className="tag">{t('Ước tính')}</span> : <span className="tag">{t('Tự đặt')}</span>}{' '}
          {t('BMR {bmr} · TDEE {tdee} kcal', { bmr: a.bmr, tdee: a.tdee })}
        </p>
        <div className="macro-row">
          <span>🥩 {t('Đạm')} <strong>{a.proteinG} g</strong></span>
          <span>🍚 {t('Tinh bột')} <strong>{a.carbsG} g</strong></span>
          <span>🥑 {t('Chất béo')} <strong>{a.fatG} g</strong></span>
          <span>💧 {t('Nước')} <strong>{num(a.waterMl / 1000)} L</strong></span>
        </div>
      </section>

      <section className="card span-all">
        <h2>{t('Đánh giá tổng quát')}</h2>
        <ul className="advice-list">
          {advice(p).map((x, i) => <li key={i} className={`advice-${x.tone}`}>{x.text}</li>)}
        </ul>
        {p.conditions.length > 0 && (
          <p className="muted">{t('Tình trạng:')} {p.conditions.map((c) => t(labelOf(CONDITIONS, c))).join(', ')}</p>
        )}
        {p.notes && <p className="muted prewrap">{p.notes}</p>}
      </section>
    </div>
  )
}

// ---------- progress ----------

function ProgressTab({ p }: { p: HealthProfileDto }) {
  const { data: list = [], isPending } = useMeasurements(p.id)
  const remove = useRemoveMeasurement()
  const dateFormat = usePreferences().data?.dateFormat
  const fmt = (key: string) => formatDate(parseDateKey(key)!, dateFormat)

  return (
    <div className="stack-lg">
      <CheckInCard p={p} />
      <MeasurementForm p={p} />
      <section className="card">
        <h2>{t('Biểu đồ cân nặng')}</h2>
        {list.length < 2 ? <p className="muted">{t('Cần ít nhất 2 lần đo để vẽ biểu đồ.')}</p> : <WeightChart list={list} p={p} fmt={fmt} />}
      </section>
      <section className="card list-card">
        <h2 className="pad">{t('Lịch sử đo')}</h2>
        {isPending ? <p className="muted pad">{t('Đang tải…')}</p> : (
          <table className="health-table">
            <thead>
              <tr>
                <th>{t('Ngày')}</th><th>{t('Cân nặng')}</th><th>BMI</th><th>{t('Mỡ cơ thể')}</th><th>{t('Vòng eo')}</th><th />
              </tr>
            </thead>
            <tbody>
              {list.map((m, i) => {
                const prev = list[i + 1]
                const diff = prev ? m.weightKg - prev.weightKg : 0
                const h = (m.heightCm ?? p.heightCm) / 100
                return (
                  <tr key={m.id}>
                    <td>{fmt(m.date)}</td>
                    <td>
                      {num(m.weightKg)} kg{' '}
                      {diff !== 0 && <small className={diff > 0 ? 'delta-up' : 'delta-down'}>{diff > 0 ? '▲' : '▼'} {num(Math.abs(diff))}</small>}
                    </td>
                    <td>{num(m.weightKg / (h * h))}</td>
                    <td>{m.bodyFatPercent != null ? `${num(m.bodyFatPercent)}%` : '—'}</td>
                    <td>{m.waistCm != null ? `${num(m.waistCm)} cm` : '—'}</td>
                    <td>
                      {list.length > 1 && (
                        <button className="icon-btn" aria-label={t('Xóa')} disabled={remove.isPending}
                          onClick={() => remove.mutate({ id: p.id, mid: m.id })}>×</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function CheckInCard({ p }: { p: HealthProfileDto }) {
  const update = useUpdateProfile()
  const [days, setDays] = useState(p.checkInEveryDays ? String(p.checkInEveryDays) : '')
  const n = parseNum(days)
  const valid = !days.trim() || (n != null && Number.isInteger(n) && n >= 1 && n <= 365)
  return (
    <section className={checkInDue(p) ? 'card health-due-card' : 'card'}>
      <h2>🔔 {t('Nhắc đánh giá lại chỉ số')}</h2>
      {checkInDue(p) && <p><strong>{t('Đã đến lúc đánh giá lại chỉ số cơ thể.')}</strong></p>}
      <div className="row">
        <label className="row">
          {t('Nhắc tôi đo lại sau')}
          <input className="input-sm" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} aria-invalid={!valid} />
          {t('ngày')}
        </label>
        {[7, 14, 30].map((d) => (
          <button key={d} type="button" className="goal-chip" onClick={() => setDays(String(d))}>{t('{n} ngày', { n: d })}</button>
        ))}
        <button className="btn-primary btn-sm" disabled={!valid || update.isPending}
          onClick={() => update.mutate({ id: p.id, body: withCheckIn(p, n && Math.round(n)) })}>
          {t('Lưu')}
        </button>
      </div>
      {!valid && <small className="field-error">{t('Nhập số ngày từ 1 đến 365, hoặc để trống để tắt.')}</small>}
      <small className="muted">
        {p.nextCheckInAt
          ? t('Lần nhắc tiếp theo: {date}. Mỗi lần ghi chỉ số mới sẽ tính lại từ đầu.', { date: new Date(p.nextCheckInAt).toLocaleString(locale()) })
          : t('Đang tắt nhắc nhở.')}
      </small>
    </section>
  )
}

function MeasurementForm({ p }: { p: HealthProfileDto }) {
  const add = useAddMeasurement()
  const [v, setV] = useState(() => ({ date: toDateKey(new Date()), weight: '', height: '', fat: '', waist: '' }))
  const [error, setError] = useState('')
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const weight = parseNum(v.weight)
    if (weight == null || weight < 10 || weight > 400) return setError(t('Nhập cân nặng từ 10 đến 400 kg.'))
    if (v.date > toDateKey(new Date())) return setError(t('Ngày đo không được ở tương lai.'))
    setError('')
    add.mutate(
      { id: p.id, body: { date: v.date, weightKg: weight, heightCm: parseNum(v.height), bodyFatPercent: parseNum(v.fat), waistCm: parseNum(v.waist) } },
      {
        onSuccess: () => setV({ ...v, weight: '', height: '', fat: '', waist: '' }),
        onError: (err) => setError(applyServerErrors(err)),
      },
    )
  }

  return (
    <section className="card">
      <h2>{t('Ghi chỉ số mới')}</h2>
      <form className="measure-form" onSubmit={submit} noValidate>
        <Field label={t('Ngày đo')}><input type="date" value={v.date} onChange={set('date')} /></Field>
        <Field label={t('Cân nặng (kg)')}><input inputMode="decimal" value={v.weight} onChange={set('weight')} placeholder={num(p.weightKg)} /></Field>
        <Field label={t('Chiều cao (cm)')}><input inputMode="decimal" value={v.height} onChange={set('height')} placeholder={num(p.heightCm)} /></Field>
        <Field label={t('Mỡ cơ thể (%)')}><input inputMode="decimal" value={v.fat} onChange={set('fat')} /></Field>
        <Field label={t('Vòng eo (cm)')}><input inputMode="decimal" value={v.waist} onChange={set('waist')} /></Field>
        <button className="btn-primary" disabled={add.isPending}>{add.isPending ? t('Đang lưu…') : t('Lưu chỉ số')}</button>
      </form>
      {error && <p className="form-error" role="alert">{tx(error)}</p>}
    </section>
  )
}

function WeightChart({ list, p, fmt }: { list: MeasurementDto[]; p: HealthProfileDto; fmt: (k: string) => string }) {
  const pts = [...list].reverse()
  const W = 640, H = 220, pad = 32
  const values = pts.map((m) => m.weightKg).concat(p.targetWeightKg ?? [])
  const lo = Math.floor(Math.min(...values) - 1), hi = Math.ceil(Math.max(...values) + 1)
  const t0 = parseDateKey(pts[0].date)!.getTime(), t1 = parseDateKey(pts.at(-1)!.date)!.getTime()
  const x = (d: string) => pad + ((parseDateKey(d)!.getTime() - t0) / Math.max(1, t1 - t0)) * (W - 2 * pad)
  const y = (kg: number) => H - pad - ((kg - lo) / (hi - lo)) * (H - 2 * pad)
  return (
    <svg className="weight-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('Biểu đồ cân nặng')}>
      <text x={4} y={y(hi) + 4}>{hi}</text>
      <text x={4} y={y(lo) + 4}>{lo}</text>
      {p.targetWeightKg != null && (
        <>
          <line className="target" x1={pad} x2={W - pad} y1={y(p.targetWeightKg)} y2={y(p.targetWeightKg)} />
          <text x={W - pad} y={y(p.targetWeightKg) - 6} textAnchor="end">{t('Mục tiêu')} {num(p.targetWeightKg)}</text>
        </>
      )}
      <polyline points={pts.map((m) => `${x(m.date)},${y(m.weightKg)}`).join(' ')} />
      {pts.map((m) => (
        <circle key={m.id} cx={x(m.date)} cy={y(m.weightKg)} r={4}>
          <title>{`${fmt(m.date)}: ${num(m.weightKg)} kg`}</title>
        </circle>
      ))}
      <text x={pad} y={H - 8}>{fmt(pts[0].date)}</text>
      <text x={W - pad} y={H - 8} textAnchor="end">{fmt(pts.at(-1)!.date)}</text>
    </svg>
  )
}
