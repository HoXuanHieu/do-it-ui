import { useEffect, useRef } from 'react'
import type { EventSummaryDto } from '../../lib/api'
import { addDays, formatTime, isSameDay, overlapsDay, startOfMonth, startOfWeek, weekdayName } from '../../lib/dates'
import { eventsOnDay, layoutDay } from './layout'
import { categoryClass } from './meta'

export type CalendarView = 'month' | 'week' | 'day'

interface ViewProps {
  date: Date
  today: Date
  events: EventSummaryDto[]
  onOpenEvent: (id: string) => void
  onCreateAt: (start: Date, allDay: boolean) => void
  onOpenDay: (day: Date) => void
}

function chipClass(e: EventSummaryDto) {
  return `chip ${categoryClass(e.category)} status-${e.status.toLowerCase()}`
}

function EventChip({ e, onOpen }: { e: EventSummaryDto; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      className={chipClass(e)}
      title={e.title}
      onClick={(ev) => {
        ev.stopPropagation()
        onOpen(e.id)
      }}
    >
      {!e.isAllDay && <span className="chip-time">{formatTime(new Date(e.startAt))}</span>}
      <span className="chip-title">{e.title}</span>
    </button>
  )
}

const MAX_CHIPS = 3

/** FR-TM-001 monthly view: 6 weeks × 7 days, Monday first. */
export function MonthView({ date, today, events, onOpenEvent, onCreateAt, onOpenDay }: ViewProps) {
  const first = startOfWeek(startOfMonth(date))
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i))

  return (
    <div className="month" role="grid" aria-label="Lịch tháng">
      <div className="month-head" role="row">
        {days.slice(0, 7).map((d) => (
          <div key={d.toISOString()} role="columnheader" className="month-weekday">
            {weekdayName(d)}
          </div>
        ))}
      </div>
      <div className="month-grid">
        {days.map((d) => {
          const dayEvents = eventsOnDay(events, d)
          const outside = d.getMonth() !== date.getMonth()
          return (
            <div
              key={d.toISOString()}
              role="gridcell"
              className={`month-cell${outside ? ' outside' : ''}${isSameDay(d, today) ? ' today' : ''}`}
              onClick={() => onCreateAt(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9), false)}
            >
              <button
                type="button"
                className="day-num"
                aria-label={`Xem ngày ${d.getDate()}/${d.getMonth() + 1}`}
                onClick={(ev) => {
                  ev.stopPropagation()
                  onOpenDay(d)
                }}
              >
                {d.getDate()}
              </button>
              <div className="month-events">
                {dayEvents.slice(0, MAX_CHIPS).map((e) => (
                  <EventChip key={e.id} e={e} onOpen={onOpenEvent} />
                ))}
                {dayEvents.length > MAX_CHIPS && (
                  <button
                    type="button"
                    className="more-link"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      onOpenDay(d)
                    }}
                  >
                    +{dayEvents.length - MAX_CHIPS} nữa
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const HOUR_PX = 48
const HOURS = Array.from({ length: 24 }, (_, h) => h)

/** FR-TM-001 weekly (7 columns) and daily (1 column) time grid. */
export function TimeGridView({ date, today, events, onOpenEvent, onCreateAt, onOpenDay, days: dayCount }: ViewProps & { days: 1 | 7 }) {
  const first = dayCount === 7 ? startOfWeek(date) : date
  const days = Array.from({ length: dayCount }, (_, i) => addDays(first, i))
  const scroller = useRef<HTMLDivElement>(null)

  // Start scrolled to 07:00 like most calendar apps.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 7 * HOUR_PX
  }, [dayCount])

  const nowMinutes = today.getHours() * 60 + today.getMinutes()

  return (
    <div className={`timegrid days-${dayCount}`} style={{ ['--hour' as string]: `${HOUR_PX}px` }}>
      <div className="tg-head">
        <div className="tg-gutter" />
        {days.map((d) => (
          <button
            key={d.toISOString()}
            type="button"
            className={`tg-dayhead${isSameDay(d, today) ? ' today' : ''}`}
            onClick={() => onOpenDay(d)}
            disabled={dayCount === 1}
          >
            <span>{weekdayName(d, dayCount === 1 ? 'long' : 'short')}</span>
            <strong>{d.getDate()}</strong>
          </button>
        ))}
      </div>

      <div className="tg-allday">
        <div className="tg-gutter">Cả ngày</div>
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className="tg-allday-cell"
            onClick={() => onCreateAt(new Date(d.getFullYear(), d.getMonth(), d.getDate()), true)}
          >
            {events
              .filter((e) => e.isAllDay && overlapsDay(new Date(e.startAt), new Date(e.endAt), d))
              .map((e) => (
                <EventChip key={e.id} e={e} onOpen={onOpenEvent} />
              ))}
          </div>
        ))}
      </div>

      <div className="tg-body" ref={scroller}>
        <div className="tg-hours">
          {HOURS.map((h) => (
            <div key={h} className="tg-hour-label">
              {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
            </div>
          ))}
        </div>
        {days.map((d) => (
          <div key={d.toISOString()} className="tg-col">
            {HOURS.map((h) => (
              <div
                key={h}
                className="tg-slot"
                role="button"
                tabIndex={-1}
                aria-label={`Tạo sự kiện lúc ${h}:00`}
                onClick={() => onCreateAt(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h), false)}
              />
            ))}
            {isSameDay(d, today) && <div className="now-line" style={{ top: (nowMinutes / 60) * HOUR_PX }} />}
            {layoutDay(events, d).map((p) => (
              <button
                key={p.event.id}
                type="button"
                className={`tg-event ${chipClass(p.event)}`}
                style={{
                  top: (p.top / 60) * HOUR_PX,
                  height: Math.max((p.height / 60) * HOUR_PX - 2, 18),
                  left: `calc(${(p.col / p.cols) * 100}% + 2px)`,
                  width: `calc(${100 / p.cols}% - 4px)`,
                }}
                title={p.event.title}
                onClick={() => onOpenEvent(p.event.id)}
              >
                <span className="chip-title">{p.event.title}</span>
                <span className="chip-time">
                  {p.continuesBefore ? '…' : formatTime(new Date(p.event.startAt))} –{' '}
                  {p.continuesAfter ? '…' : formatTime(new Date(p.event.endAt))}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
