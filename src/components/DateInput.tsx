import { locale, t } from '../i18n'
import { useState } from 'react'
import { usePreferences } from '../features/account/queries'
import { addDays, addMonths, formatDate, isSameDay, parseDateKey, startOfMonth, startOfWeek, toDateKey } from '../lib/dates'
import { usePopover } from './usePopover'

const now = () => new Date()

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
  </svg>
)
const Arrow = ({ dir }: { dir: 'left' | 'right' | 'up' | 'down' }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d={{ left: 'M15 6l-6 6 6 6', right: 'M9 6l6 6-6 6', up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6' }[dir]} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * Date field: shows the date in the user's date format and opens a month calendar (Monday first) with a year picker.
 * Value is "YYYY-MM-DD" or ''; `min` / `max` disable days outside the range; `optional` adds a clear action.
 */
export function DateInput({
  value,
  onChange,
  min,
  max,
  optional,
  disabled,
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  min?: string
  max?: string
  optional?: boolean
  disabled?: boolean
  'aria-label'?: string
}) {
  const { open, setOpen, show, close, pos, trigger, pop, onKeyDown } = usePopover(380)
  const pattern = usePreferences().data?.dateFormat
  const selected = parseDateKey(value)
  const [view, setView] = useState(() => startOfMonth(selected ?? new Date()))
  const label = ariaLabel ?? t('Ngày')
  const today = now() // re-read each render so "today" stays right past midnight
  const text = selected ? formatDate(selected, pattern) : ''

  const first = startOfWeek(view)
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i))
  const weekdays = days.slice(0, 7).map((d) => d.toLocaleDateString(locale(), { weekday: 'narrow' }))
  const outOfRange = (key: string) => (!!min && key < min) || (!!max && key > max)
  const minYear = min ? +min.slice(0, 4) : today.getFullYear() - 100
  const maxYear = max ? +max.slice(0, 4) : today.getFullYear() + 10
  const years = Array.from({ length: Math.max(1, maxYear - minYear + 1) }, (_, i) => minYear + i)
  if (!years.includes(view.getFullYear())) years.push(view.getFullYear())
  years.sort((a, b) => a - b)

  const pick = (key: string) => {
    onChange(key)
    close()
  }

  return (
    <span className="time-input" onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        className={`time-trigger date-trigger${open ? ' open' : ''}`}
        disabled={disabled}
        aria-label={text ? `${label}: ${text}` : label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (open) return setOpen(false)
          setView(startOfMonth(selected ?? today))
          show()
        }}
      >
        <CalendarIcon />
        <span className={text ? 'time-value' : 'time-value empty'}>{text || (pattern ?? 'dd/MM/yyyy').toLowerCase()}</span>
        <Arrow dir={open ? 'up' : 'down'} />
      </button>
      {open && (
        <div ref={pop} className="time-pop date-pop" style={pos} role="dialog" aria-label={label}>
          <div className="date-head">
            <span className="date-title">
              {view.toLocaleDateString(locale(), { month: 'long' })}
              <select aria-label={t('Năm')} value={view.getFullYear()} onChange={(e) => setView(new Date(+e.target.value, view.getMonth(), 1))}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </span>
            <button type="button" className="date-nav" aria-label={t('Tháng trước')} onClick={() => setView(addMonths(view, -1))}><Arrow dir="left" /></button>
            <button type="button" className="date-nav" aria-label={t('Tháng sau')} onClick={() => setView(addMonths(view, 1))}><Arrow dir="right" /></button>
          </div>
          <div className="date-grid" role="grid">
            {weekdays.map((w, i) => <span key={i} className="date-dow" aria-hidden>{w}</span>)}
            {days.map((d) => {
              const key = toDateKey(d)
              const isSel = !!selected && isSameDay(d, selected)
              const cls = ['date-day', d.getMonth() !== view.getMonth() && 'other', isSameDay(d, today) && 'today', isSel && 'selected'].filter(Boolean).join(' ')
              return (
                <button key={key} type="button" className={cls} disabled={outOfRange(key)} aria-selected={isSel}
                  aria-label={formatDate(d, pattern)} onClick={() => pick(key)}>
                  {d.getDate()}
                </button>
              )
            })}
          </div>
          <div className="date-foot">
            {optional && value ? (
              <button type="button" className="btn-ghost btn-sm" onClick={() => pick('')}>{t('Xóa')}</button>
            ) : <span />}
            <button type="button" className="btn-primary btn-sm" disabled={outOfRange(toDateKey(today))} onClick={() => pick(toDateKey(today))}>
              {t('Hôm nay')}
            </button>
          </div>
        </div>
      )}
    </span>
  )
}
