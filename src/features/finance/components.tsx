import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { formatAmountInput, parseAmount } from '../../lib/money'
import { monthKeyOf, monthLabel, shiftMonth } from './queries'

/** ‹ Tháng 11/2026 › with a native month picker. */
export function MonthSwitcher({ value, onChange }: { value: string; onChange: (month: string) => void }) {
  const [current] = useState(() => monthKeyOf(new Date()))
  return (
    <div className="row month-switcher">
      <div className="btn-group">
        <button className="btn-ghost" aria-label="Tháng trước" onClick={() => onChange(shiftMonth(value, -1))}>
          ‹
        </button>
        <button className="btn-ghost" aria-label="Tháng sau" onClick={() => onChange(shiftMonth(value, 1))}>
          ›
        </button>
      </div>
      <label className="month-label">
        <strong>{monthLabel(value)}</strong>
        <input
          type="month"
          className="input"
          value={value}
          aria-label="Chọn tháng"
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
      </label>
      {value !== current && (
        <button className="btn-link" onClick={() => onChange(current)}>
          Tháng này
        </button>
      )}
    </div>
  )
}

/**
 * Text input for money: accepts "1.250.000", "1250000", "12,5"; reformats on blur.
 * The form value is the raw string; parse with parseAmount on submit.
 */
export const AmountInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { currency: string }>(
  function AmountInput({ currency, onBlur, ...props }, ref) {
    return (
      <div className="amount-input">
        <input
          ref={ref}
          inputMode="decimal"
          autoComplete="off"
          {...props}
          onBlur={(e) => {
            const el = e.target
            const n = parseAmount(el.value, currency)
            const formatted = n == null ? null : formatAmountInput(n, currency)
            if (formatted != null && formatted !== el.value) {
              // Go through the native setter + input event so React / react-hook-form see the change.
              Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, formatted)
              el.dispatchEvent(new Event('input', { bubbles: true }))
            }
            onBlur?.(e)
          }}
        />
        <span className="amount-suffix">{currency}</span>
      </div>
    )
  },
)

/** FR-FI-011 progress bar coloured by alert thresholds. */
export function ProgressBar({ percent, thresholds }: { percent: number; thresholds: number[] }) {
  const warn = Math.min(...thresholds.filter((t) => t < 100), 80)
  const level = percent >= 100 ? 'over' : percent >= warn ? 'warn' : 'ok'
  return (
    <div
      className={`progress progress-${level}`}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-fill" style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  )
}

export function ColorSwatchPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [custom, setCustom] = useState(false)
  const palette = ['#2f9e44', '#0c8599', '#1971c2', '#5f3dc4', '#9c36b5', '#c2255c', '#e03131', '#e8590c', '#f08c00', '#868e96']
  return (
    <div className="swatches" role="radiogroup" aria-label="Màu">
      {palette.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value.toLowerCase() === c}
          aria-label={c}
          className={`swatch${value.toLowerCase() === c ? ' selected' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
      <label className={`swatch swatch-custom${custom ? ' selected' : ''}`} title="Màu khác">
        <input
          type="color"
          value={value}
          onChange={(e) => {
            setCustom(true)
            onChange(e.target.value)
          }}
        />
      </label>
    </div>
  )
}
