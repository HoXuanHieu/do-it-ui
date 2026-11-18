import { t } from '../../i18n'
import type { GoalDto } from './api'
import { daysLeft } from './queries'

/** Circular progress with the percentage in the middle. */
export function ProgressRing({ percent, size }: { percent: number; size: number }) {
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <svg className="progress-ring" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={t('Tiến độ {p}%', { p: percent })}>
      <circle className="ring-track" cx="50" cy="50" r={r} />
      <circle className="ring-fill" cx="50" cy="50" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} />
      <text x="50" y="50" dominantBaseline="central" textAnchor="middle">
        {percent}%
      </text>
    </svg>
  )
}

/** Status / deadline pill: completed, paused, overdue, due soon. */
export function DueBadge({ goal }: { goal: GoalDto }) {
  if (goal.status === 'Completed') return <span className="due-badge done">{t('🎉 Hoàn thành')}</span>
  if (goal.status === 'Abandoned') return <span className="due-badge">{t('Tạm dừng')}</span>
  const d = daysLeft(goal)
  const cls = d < 0 ? 'over' : d <= 3 ? 'soon' : ''
  return (
    <span className={`due-badge ${cls}`}>
      {d < 0 ? t('Quá hạn {n} ngày', { n: -d }) : d === 0 ? t('Hạn hôm nay') : t('Còn {n} ngày', { n: d })}
    </span>
  )
}
