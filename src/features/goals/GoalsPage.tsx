import { t, type Key } from '../../i18n'
import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import type { GoalDto, GoalPeriod, GoalStatus } from './api'
import { GoalFormDialog, type GoalFormMode } from './GoalFormDialog'
import { DueBadge, ProgressRing } from './widgets'
import { activeByUrgency, daysLeft, nextStep, PERIODS, progressOf, useGoals, useUpdateStep } from './queries'

const QUOTES: Key[] = [
  'Mỗi bước nhỏ hôm nay là một bước gần hơn tới đích.',
  'Kỷ luật là cầu nối giữa mục tiêu và thành tựu.',
  'Đừng đợi động lực, hãy bắt đầu và động lực sẽ đến.',
  'Thành công là tổng của những nỗ lực nhỏ lặp lại mỗi ngày.',
  'Tập trung vào tiến bộ, không phải sự hoàn hảo.',
]

const STATUS_TABS: { value: GoalStatus; label: Key }[] = [
  { value: 'Active', label: 'Đang thực hiện' },
  { value: 'Completed', label: 'Đã hoàn thành' },
  { value: 'Abandoned', label: 'Đã tạm dừng' },
]

export function GoalsPage() {
  const { data: goals, isPending, isError } = useGoals()
  const [params] = useSearchParams()
  const [status, setStatus] = useState<GoalStatus>('Active')
  const [period, setPeriod] = useState<GoalPeriod | null>(null)
  const [form, setForm] = useState<GoalFormMode | null>(null)
  const [quote] = useState(() => QUOTES[new Date().getDate() % QUOTES.length])

  const all = goals ?? []
  const active = activeByUrgency(all)
  const focus = active[0]
  const shown = all
    .filter((g) => g.status === status && (!period || g.period === period))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  // Older reminder notifications link to /goals?goal=<id>.
  const legacyId = params.get('goal')
  if (legacyId) return <Navigate to={`/goals/${legacyId}`} replace />

  return (
    <div className="goals-page">
      <header className="page-header row-between">
        <div>
          <h1>{t('Mục tiêu')}</h1>
          <p className="muted goal-quote">“{t(quote)}”</p>
        </div>
        <button className="btn-primary" onClick={() => setForm({ kind: 'create' })}>
          {t('+ Mục tiêu mới')}
        </button>
      </header>

      {isPending && <p className="muted">{t('Đang tải…')}</p>}
      {isError && <p className="form-error">{t('Không tải được mục tiêu.')}</p>}

      {goals && all.length === 0 && (
        <section className="card goal-empty">
          <div className="goal-empty-icon" aria-hidden>🎯</div>
          <h2>{t('Bắt đầu với mục tiêu đầu tiên')}</h2>
          <p className="muted">{t('Viết ra điều bạn muốn đạt được, chia nhỏ thành từng chặng và để DO-IT nhắc bạn mỗi ngày.')}</p>
          <button className="btn-primary" onClick={() => setForm({ kind: 'create' })}>
            {t('Tạo mục tiêu')}
          </button>
        </section>
      )}

      {focus && <FocusHero goal={focus} />}

      {all.length > 0 && (
        <>
          <div className="goal-stats">
            <Stat value={active.length} label="Đang thực hiện" tone="primary" />
            <Stat value={all.filter((g) => g.status === 'Completed').length} label="Đã hoàn thành" tone="success" />
            <Stat value={active.filter((g) => daysLeft(g) < 0).length} label="Quá hạn" tone="danger" />
            <Stat
              value={`${active.length ? Math.round(active.reduce((s, g) => s + progressOf(g), 0) / active.length) : 0}%`}
              label="Tiến độ trung bình"
              tone="warm"
            />
          </div>

          <div className="row-between wrap goal-filters">
            <div className="tabs" role="tablist">
              {STATUS_TABS.map((s) => (
                <button key={s.value} role="tab" aria-selected={status === s.value} className={status === s.value ? 'active' : undefined} onClick={() => setStatus(s.value)}>
                  {t(s.label)} <span className="tab-count">{all.filter((g) => g.status === s.value).length}</span>
                </button>
              ))}
            </div>
            <div className="goal-chips">
              <button className={period === null ? 'goal-chip active' : 'goal-chip'} onClick={() => setPeriod(null)}>
                {t('Tất cả')}
              </button>
              {PERIODS.map((p) => (
                <button key={p.value} className={period === p.value ? 'goal-chip active' : 'goal-chip'} onClick={() => setPeriod(p.value)}>
                  <span aria-hidden>{p.icon}</span> {t(p.label)}
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="muted center">{t('Không có mục tiêu nào ở đây.')}</p>
          ) : (
            <div className="goal-grid">
              {shown.map((g) => (
                <GoalCard key={g.id} goal={g} />
              ))}
            </div>
          )}
        </>
      )}

      <GoalFormDialog mode={form} onClose={() => setForm(null)} />
    </div>
  )
}

function Stat({ value, label, tone }: { value: number | string; label: Key; tone: string }) {
  return (
    <div className={`goal-stat tone-${tone}`}>
      <strong>{value}</strong>
      <span>{t(label)}</span>
    </div>
  )
}

/** The most urgent active goal, front and centre. */
function FocusHero({ goal }: { goal: GoalDto }) {
  const toggle = useUpdateStep()
  const step = nextStep(goal)
  const days = daysLeft(goal)
  return (
    <section className={`goal-hero period-${goal.period.toLowerCase()}`}>
      <ProgressRing percent={progressOf(goal)} size={112} />
      <div className="goal-hero-body">
        <span className="goal-hero-label">{t('Tiêu điểm của bạn')}</span>
        <Link className="goal-hero-title" to={`/goals/${goal.id}`}>
          {goal.title}
        </Link>
        {step ? (
          <div className="goal-hero-next">
            <span>{t('Việc cần làm tiếp:')}</span>
            <strong>{step.title}</strong>
            <button className="btn-hero" disabled={toggle.isPending} onClick={() => toggle.mutate({ id: goal.id, stepId: step.id, isDone: true })}>
              {t('✓ Đã xong')}
            </button>
          </div>
        ) : (
          <p className="goal-hero-next">{goal.steps.length ? t('Mọi chặng đã xong, hãy đánh dấu hoàn thành!') : t('Hãy chia mục tiêu thành các chặng nhỏ.')}</p>
        )}
      </div>
      <div className="goal-hero-countdown">
        <strong>{Math.abs(days)}</strong>
        <span>{days < 0 ? t('ngày quá hạn') : days === 0 ? t('hạn chót hôm nay') : t('ngày còn lại')}</span>
      </div>
    </section>
  )
}

function GoalCard({ goal }: { goal: GoalDto }) {
  const step = nextStep(goal)
  const done = goal.steps.filter((s) => s.isDone).length
  const period = PERIODS.find((p) => p.value === goal.period)!
  return (
    <Link className={`goal-card period-${goal.period.toLowerCase()} status-${goal.status.toLowerCase()}`} to={`/goals/${goal.id}`}>
      <div className="goal-card-top">
        <span className="goal-period">
          <span aria-hidden>{period.icon}</span> {t(period.label)}
        </span>
        <DueBadge goal={goal} />
      </div>
      <div className="goal-card-main">
        <ProgressRing percent={progressOf(goal)} size={64} />
        <div className="grow">
          <h3>{goal.title}</h3>
          {goal.steps.length > 0 && <small className="muted">{t('{done}/{total} chặng', { done, total: goal.steps.length })}</small>}
        </div>
      </div>
      {goal.status === 'Active' && step && (
        <p className="goal-next">
          <span aria-hidden>➜</span> {step.title}
        </p>
      )}
      {goal.reminderTime && goal.status === 'Active' && (
        <small className="goal-remind">🔔 {t('Nhắc lúc {time} mỗi ngày', { time: goal.reminderTime.slice(0, 5) })}</small>
      )}
    </Link>
  )
}


