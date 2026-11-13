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

export function DashboardPage() {
  const { user } = useAuth()
  const [today] = useState(() => new Date())
  const todayLabel = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(today)
  return (
    <>
      <header className="page-header">
        <h1>Xin chào{user?.fullName ? `, ${user.fullName}` : ''}</h1>
        <p className="muted">{todayLabel}</p>
      </header>
      {/* FR-DASH-001: remaining widgets are wired up as their modules land (Sprint 3–6). */}
      <div className="grid">
        <TodaySchedule day={today} />
        <FinanceToday day={today} />
        <MonthBudget day={today} />
        {['Sức khỏe hôm nay', 'Mục tiêu'].map((t) => (
          <section key={t} className="card">
            <h2>{t}</h2>
            <p className="muted">Chưa có dữ liệu.</p>
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
        <h2>Lịch hôm nay</h2>
        <Link to={`/calendar?view=day&date=${toDateKey(day)}`} className="small">
          Xem lịch →
        </Link>
      </div>
      {isPending && <p className="muted">Đang tải…</p>}
      {isError && <p className="form-error">Không tải được lịch.</p>}
      {data && items.length === 0 && <p className="muted">Hôm nay không có sự kiện nào.</p>}
      <ul className="agenda">
        {items.map((e) => (
          <li key={e.id} className={`status-${e.status.toLowerCase()}`}>
            <Link to={`/calendar?view=day&date=${toDateKey(day)}&event=${e.id}`}>
              <span className={`dot ${categoryClass(e.category)}`} aria-hidden />
              <span className="agenda-time">{e.isAllDay ? 'Cả ngày' : formatTime(new Date(e.startAt))}</span>
              <span className="agenda-title">{e.title}</span>
              {e.status !== 'Planned' && <small className="muted">{STATUS_LABEL[e.status]}</small>}
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
        <h2>Tài chính</h2>
        <Link to="/finance" className="small">Giao dịch →</Link>
      </div>
      {(today.isError || month.isError) && <p className="form-error">Không tải được dữ liệu.</p>}
      <dl>
        <dt>Thu hôm nay</dt>
        <dd className="amount-income">{fmt(today.data?.income)}</dd>
        <dt>Chi hôm nay</dt>
        <dd className="amount-expense">{fmt(today.data?.expense)}</dd>
        <dt>Thu tháng này</dt>
        <dd className="amount-income">{fmt(month.data?.income)}</dd>
        <dt>Chi tháng này</dt>
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
        <h2>Ngân sách tháng</h2>
        <Link to={`/finance?tab=budget&month=${month}`} className="small">Chi tiết →</Link>
      </div>
      {isPending && <p className="muted">Đang tải…</p>}
      {isError && <p className="form-error">Không tải được ngân sách.</p>}
      {data && !data.exists && (
        <p className="muted">
          Chưa đặt ngân sách. <Link to={`/finance?tab=budget&month=${month}`}>Tạo ngay</Link>
        </p>
      )}
      {data?.exists && !total && <p className="muted">Chỉ đặt hạn mức theo danh mục.</p>}
      {total && (
        <div className="budget-line">
          <ProgressBar percent={total.percent} thresholds={data!.alertThresholds} />
          <dl>
            <dt>Đã chi</dt>
            <dd>{formatMoney(total.spent, data!.currencyCode)} ({total.percent.toLocaleString('vi-VN')}%)</dd>
            <dt>{total.remaining < 0 ? 'Vượt' : 'Còn lại'}</dt>
            <dd className={total.remaining < 0 ? 'amount-expense' : 'amount-income'}>{formatMoney(Math.abs(total.remaining), data!.currencyCode)}</dd>
          </dl>
        </div>
      )}
    </section>
  )
}
