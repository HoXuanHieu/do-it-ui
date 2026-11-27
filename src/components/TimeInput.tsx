import { t } from '../i18n'
import { useState } from 'react'
import { usePopover } from './usePopover'

type Period = 'AM' | 'PM'
const pad = (n: number) => String(n).padStart(2, '0')

/** "HH:mm" (24 h) → "hh:mm AM|PM" */
const formatTime12 = (v: string) => {
  const [h, m] = v.split(':').map(Number)
  return `${pad(h % 12 || 12)}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`
}

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" strokeLinecap="round" />
  </svg>
)
const Chevron = ({ up }: { up: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * Time field: a button showing "09:30 AM" that opens a scrollable list of times (every `step` minutes) next to an AM / PM toggle.
 * Value is "HH:mm" (24 h) or ''. `optional` adds a clear (×) action. Colors are theme tokens, so light / dark follow automatically.
 */
export function TimeInput({
  value,
  onChange,
  step = 15,
  optional,
  disabled,
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  step?: number
  optional?: boolean
  disabled?: boolean
  'aria-label'?: string
}) {
  const v = value ? value.slice(0, 5) : ''
  const [h24, min] = v ? v.split(':').map(Number) : [NaN, NaN]
  const { open, setOpen, show, close, pos, trigger, pop, onKeyDown } = usePopover()
  const [period, setPeriod] = useState<Period>('AM')
  const label = ariaLabel ?? t('Giờ')

  // minutes into a 12 h half, starting at 12:00 like a clock face
  const slots = Array.from({ length: 720 / step }, (_, i) => i * step)
  const current = v ? (h24 % 12) * 60 + min : null
  if (current != null && !slots.includes(current)) slots.push(current) // keep an off-step value (e.g. 08:07) listed
  slots.sort((a, b) => a - b)
  const currentPeriod: Period = h24 < 12 ? 'AM' : 'PM'

  const pick = (slot: number, per: Period) => onChange(`${pad(Math.floor(slot / 60) + (per === 'PM' ? 12 : 0))}:${pad(slot % 60)}`)

  return (
    <span className="time-input" onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        className={`time-trigger${open ? ' open' : ''}`}
        disabled={disabled}
        aria-label={v ? `${label}: ${formatTime12(v)}` : label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (open) return setOpen(false)
          setPeriod(v ? currentPeriod : new Date().getHours() < 12 ? 'AM' : 'PM')
          show()
        }}
      >
        <ClockIcon />
        <span className={v ? 'time-value' : 'time-value empty'}>{v ? formatTime12(v) : '--:--'}</span>
        <Chevron up={open} />
      </button>
      {open && (
        <div ref={pop} className="time-pop" style={pos}>
          <div className="time-list" role="listbox" aria-label={label}>
            {slots.map((s) => {
              const selected = current === s && currentPeriod === period
              return (
                <button key={s} type="button" role="option" aria-selected={selected}
                  className={selected ? 'selected' : s % 60 === 0 ? 'hour' : undefined}
                  onClick={() => {
                    pick(s, period)
                    close()
                  }}>
                  {pad(Math.floor(s / 60) || 12)}:{pad(s % 60)}
                </button>
              )
            })}
          </div>
          <div className="time-period" role="group" aria-label="AM / PM">
            {(['AM', 'PM'] as const).map((x) => (
              <button key={x} type="button" aria-pressed={period === x} className={period === x ? 'active' : undefined}
                onClick={() => {
                  setPeriod(x)
                  if (current != null) pick(current, x) // as in the design: switching AM / PM moves the chosen time
                }}>
                {x}
              </button>
            ))}
            {optional && v && (
              <button type="button" className="time-clear" aria-label={t('Xóa')} title={t('Xóa')}
                onClick={() => {
                  onChange('')
                  close()
                }}>
                ×
              </button>
            )}
          </div>
        </div>
      )}
    </span>
  )
}
