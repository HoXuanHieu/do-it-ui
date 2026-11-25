import { locale, t } from '../../i18n'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { eventsOnDay } from '../calendar/layout'
import { categoryClass, STATUS_LABEL } from '../calendar/meta'
import { useEventsInRange } from '../calendar/queries'
import { usePreferences } from '../account/queries'
import { ProgressBar } from '../finance/components'
import { monthKeyOf, monthRange, useBudget, useSummary } from '../finance/queries'
import { addDays, formatTime, startOfDay, toDateKey } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { activeByUrgency, daysLeft, nextStep, progressOf, useGoals } from '../goals/queries'
import { ProgressRing } from '../goals/widgets'

export function DashboardPage() {
  const { user } = useAuth()
  const [today] = useState(() => new Date())
  const todayLabel = new Intl.DateTimeFormat(locale(), { dateStyle: 'full' }).format(today)
  return (
    <>
      <header className="page-header">
        <h1>{user?.fullName ? t('Xin chào, {name}', { name: user.fullName }) : t('Xin chào')}</h1>
        <p className="muted">{todayLabel}</p>
      </header>
      {/* FR-DASH-001: remaining widgets are wired up as their modules land (Sprint 3–6). */}
      <div className="grid">
        <TodaySchedule day={today} />
        <FinanceToday day={today} />
        <MonthBudget day={today} />
        <GoalsToday />
        {(['Sức khỏe hôm nay'] as const).map((k) => (
          <section key={k} className="card">
            <h2>{t(k)}</h2>
            <p className="muted">{t('Chưa có dữ liệu.')}</p>
          </section>
        ))}
      </div>
    </>
  )
}

/** FR-DASH-002: current-day events in chronological order; FR-DASH-005: links into the calendar. */
function TodaySchedule({ day }: { day: Date }) {
  const from = startOfDay(day)
  const { data, isPending, isError } = useEventsInRange(from, addDays(from, 1))
  const items = data ? eventsOnDay(data, day) : []

  return (
    <section className="card today-card">
      <div className="row-between">
        <h2>{t('Lịch hôm nay')}</h2>
        <Link to={`/calendar?view=day&date=${toDateKey(day)}`} className="small">
          {t('Xem lịch →')}
        </Link>
      </div>
      {isPending && <p className="muted">{t('Đang tải…')}</p>}
      {isError && <p className="form-error">{t('Không tải được lịch.')}</p>}
      {data && items.length === 0 && <p className="muted">{t('Hôm nay không có sự kiện nào.')}</p>}
      <ul className="agenda">
        {items.map((e) => (
          <li key={e.id} className={`status-${e.status.toLowerCase()}`}>
            <Link to={`/calendar?view=day&date=${toDateKey(day)}&event=${e.id}`}>
              <span className={`dot ${categoryClass(e.category)}`} aria-hidden />
              <span className="agenda-time">{e.isAllDay ? t('Cả ngày') : formatTime(new Date(e.startAt))}</span>
              <span className="agenda-title">{e.title}</span>
              {e.status !== 'Planned' && <small className="muted">{t(STATUS_LABEL[e.status])}</small>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** FR-DASH-004: today's and this month's income / expenses. */
function FinanceToday({ day }: { day: Date }) {
  const key = toDateKey(day)
  const { from, to } = monthRange(monthKeyOf(day))
  const today = useSummary(key, key)
  const month = useSummary(from, to)
  const currency = usePreferences().data?.currency ?? 'VND'
  const fmt = (n: number | undefined) => (n == null ? '…' : formatMoney(n, today.data?.currencyCode ?? currency))
  return (
    <section className="card dash-finance">
      <div className="row-between">
        <h2>{t('Tài chính')}</h2>
        <Link to="/finance" className="small">{t('Giao dịch →')}</Link>
      </div>
      {(today.isError || month.isError) && <p className="form-error">{t('Không tải được dữ liệu.')}</p>}
      <dl>
        <dt>{t('Thu hôm nay')}</dt>
        <dd className="amount-income">{fmt(today.data?.income)}</dd>
        <dt>{t('Chi hôm nay')}</dt>
        <dd className="amount-expense">{fmt(today.data?.expense)}</dd>
        <dt>{t('Thu tháng này')}</dt>
        <dd className="amount-income">{fmt(month.data?.income)}</dd>
        <dt>{t('Chi tháng này')}</dt>
        <dd className="amount-expense">{fmt(month.data?.expense)}</dd>
      </dl>
    </section>
  )
}

/** FR-DASH-004: remaining monthly budget. */
function MonthBudget({ day }: { day: Date }) {
  const month = monthKeyOf(day)
  const { data, isPending, isError } = useBudget(month)
  const total = data?.total
  return (
    <section className="card dash-finance">
      <div className="row-between">
        <h2>{t('Ngân sách tháng')}</h2>
        <Link to={`/finance?tab=budget&month=${month}`} className="small">{t('Chi tiết →')}</Link>
      </div>
      {isPending && <p className="muted">{t('Đang tải…')}</p>}
      {isError && <p className="form-error">{t('Không tải được ngân sách.')}</p>}
      {data && !data.exists && (
        <p className="muted">
          {t('Chưa đặt ngân sách.')} <Link to={`/finance?tab=budget&month=${month}`}>{t('Tạo ngay')}</Link>
        </p>
      )}
      {data?.exists && !total && <p className="muted">{t('Chỉ đặt hạn mức theo danh mục.')}</p>}
      {total && (
        <div className="budget-line">
          <ProgressBar percent={total.percent} thresholds={data!.alertThresholds} />
          <dl>
            <dt>{t('Đã chi')}</dt>
            <dd>{formatMoney(total.spent, data!.currencyCode)} ({total.percent.toLocaleString('en-US')}%)</dd>
            <dt>{total.remaining < 0 ? t('Vượt') : t('Còn lại')}</dt>
            <dd className={total.remaining < 0 ? 'amount-expense' : 'amount-income'}>{formatMoney(Math.abs(total.remaining), data!.currencyCode)}</dd>
          </dl>
        </div>
      )}
    </section>
  )
}

/** Keeps the most urgent active goals in sight every time the app opens. */
function GoalsToday() {
  const { data, isPending, isError } = useGoals()
  const goals = data ? activeByUrgency(data).slice(0, 3) : []
  return (
    <section className="card dash-goals">
      <div className="row-between">
        <h2>{t('Mục tiêu')}</h2>
        <Link to="/goals" className="small">
          {t('Xem tất cả →')}
        </Link>
      </div>
      {isPending && <p className="muted">{t('Đang tải…')}</p>}
      {isError && <p className="form-error">{t('Không tải được mục tiêu.')}</p>}
      {data && goals.length === 0 && (
        <p className="muted">
          {t('Chưa có mục tiêu đang thực hiện.')} <Link to="/goals">{t('Tạo ngay')}</Link>
        </p>
      )}
      <ul>
        {goals.map((g) => {
          const d = daysLeft(g)
          return (
            <li key={g.id} className={`period-${g.period.toLowerCase()}`}>
              <Link to={`/goals/${g.id}`}>
                <ProgressRing percent={progressOf(g)} size={44} />
                <span className="grow">
                  <strong>{g.title}</strong>
                  <small>
                    {d < 0 ? t('Quá hạn {n} ngày', { n: -d }) : d === 0 ? t('Hạn hôm nay') : t('Còn {n} ngày', { n: d })}
                    {nextStep(g) && ` · ➜ ${nextStep(g)!.title}`}
                  </small>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
