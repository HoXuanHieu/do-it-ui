import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { EventCategory, EventDetailDto, EventFilters, EventStatus } from './api'
import { addDays, addMonths, formatDate, monthTitle, parseDateKey, startOfDay, startOfMonth, startOfWeek, toDateKey } from '../../lib/dates'
import { usePreferences } from '../account/queries'
import { MonthView, TimeGridView, type CalendarView } from './CalendarViews'
import { EventDetailDialog } from './EventDetailDialog'
import { EventFormDialog, type EventFormMode } from './EventFormDialog'
import { CATEGORIES, STATUSES } from './meta'
import { useEventDetail, useEventsInRange } from './queries'

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: 'month', label: 'Tháng' },
  { value: 'week', label: 'Tuần' },
  { value: 'day', label: 'Ngày' },
]

function rangeFor(view: CalendarView, date: Date) {
  if (view === 'month') {
    const from = startOfWeek(startOfMonth(date))
    return { from, to: addDays(from, 42) }
  }
  if (view === 'week') {
    const from = startOfWeek(date)
    return { from, to: addDays(from, 7) }
  }
  const from = startOfDay(date)
  return { from, to: addDays(from, 1) }
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

/** Time Management module (SRS §4.3). URL: /calendar?view=month|week|day&date=YYYY-MM-DD&event=<id> */
export function CalendarPage() {
  const [params, setParams] = useSearchParams()
  const now = useNow()
  const dateFormat = usePreferences().data?.dateFormat

  const view = (VIEWS.some((v) => v.value === params.get('view')) ? params.get('view') : 'month') as CalendarView
  const dateKey = params.get('date') ?? toDateKey(now)
  const date = useMemo(() => parseDateKey(dateKey) ?? startOfDay(now), [dateKey, now])
  const openEventId = params.get('event')

  const [category, setCategory] = useState<EventCategory | ''>('')
  const [status, setStatus] = useState<EventStatus | ''>('')
  const [search, setSearch] = useState('')
  const q = useDebounced(search, 300)
  const filters: EventFilters = { category: category || undefined, status: status || undefined, q: q || undefined }

  const { from, to } = useMemo(() => rangeFor(view, date), [view, date])
  const events = useEventsInRange(from, to, filters)

  const [form, setForm] = useState<EventFormMode | null>(null)

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: patch.event !== undefined && Object.keys(patch).length === 1 })
  }

  // Deep link from a reminder notification (/calendar?event=id): jump to the event's day.
  const deepLinked = useEventDetail(openEventId && !params.get('date') ? openEventId : null)
  useEffect(() => {
    if (deepLinked.data && !params.get('date')) {
      const next = new URLSearchParams(params)
      next.set('date', toDateKey(new Date(deepLinked.data.startAt)))
      setParams(next, { replace: true })
    }
  }, [deepLinked.data, params, setParams])

  const step = (dir: 1 | -1) => {
    const next = view === 'month' ? addMonths(date, dir) : addDays(date, dir * (view === 'week' ? 7 : 1))
    update({ date: toDateKey(next) })
  }

  const title =
    view === 'month'
      ? monthTitle(date)
      : view === 'week'
        ? `${formatDate(from, dateFormat)} – ${formatDate(addDays(to, -1), dateFormat)}`
        : formatDate(date, dateFormat)

  const viewProps = {
    date,
    today: now,
    events: events.data ?? [],
    onOpenEvent: (id: string) => update({ event: id }),
    onCreateAt: (start: Date, allDay: boolean) => setForm({ kind: 'create', start, allDay }),
    onOpenDay: (day: Date) => update({ view: 'day', date: toDateKey(day) }),
  }

  const onSaved = (saved: EventDetailDto) => {
    setForm(null)
    update({ event: saved.id, date: toDateKey(new Date(saved.startAt)) })
  }

  const filtered = !!(category || status || q)

  return (
    <div className="calendar-page">
      <header className="cal-toolbar">
        <div className="row">
          <button className="btn-ghost" onClick={() => update({ date: toDateKey(new Date()) })}>
            Hôm nay
          </button>
          <div className="btn-group">
            <button className="btn-ghost" aria-label="Trước" onClick={() => step(-1)}>
              ‹
            </button>
            <button className="btn-ghost" aria-label="Sau" onClick={() => step(1)}>
              ›
            </button>
          </div>
          <h1 className="cal-title">{title}</h1>
          {events.isFetching && <span className="muted small">Đang tải…</span>}
        </div>
        <div className="row">
          <div className="segmented" role="tablist" aria-label="Chế độ xem">
            {VIEWS.map((v) => (
              <button
                key={v.value}
                role="tab"
                aria-selected={view === v.value}
                className={view === v.value ? 'active' : undefined}
                onClick={() => update({ view: v.value })}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button
            className="btn-primary"
            onClick={() => {
              const base = new Date()
              const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), base.getHours() + 1)
              setForm({ kind: 'create', start, allDay: false })
            }}
          >
            + Tạo sự kiện
          </button>
        </div>
      </header>

      {/* FR-TM-011 */}
      <div className="cal-filters row">
        <input
          type="search"
          className="input"
          placeholder="Tìm theo tiêu đề, mô tả, địa điểm…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Tìm kiếm sự kiện"
        />
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value as EventCategory | '')} aria-label="Phân loại">
          <option value="">Tất cả phân loại</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as EventStatus | '')} aria-label="Trạng thái">
          <option value="">Tất cả trạng thái</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {filtered && (
          <button
            className="btn-link"
            onClick={() => {
              setCategory('')
              setStatus('')
              setSearch('')
            }}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {events.isError && <p className="form-error">Không tải được sự kiện.</p>}

      <section className="card cal-card">
        {view === 'month' && <MonthView {...viewProps} />}
        {view === 'week' && <TimeGridView {...viewProps} days={7} />}
        {view === 'day' && <TimeGridView {...viewProps} days={1} />}
      </section>

      <EventDetailDialog
        eventId={form ? null : openEventId}
        onClose={() => update({ event: null })}
        onEdit={(event) => setForm({ kind: 'edit', event })}
      />
      <EventFormDialog mode={form} onClose={() => setForm(null)} onSaved={onSaved} />
    </div>
  )
}
