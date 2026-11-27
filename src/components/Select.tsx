import { Children, isValidElement, useLayoutEffect, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { usePopover } from './usePopover'

/** Plain text of an <option>'s children, e.g. {icon} {label} → "🎯 Giảm cân". */
const textOf = (n: ReactNode): string =>
  typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(textOf).join('') : isValidElement<{ children?: ReactNode }>(n) ? textOf(n.props.children) : ''

const Chevron = ({ up }: { up: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const Check = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * Drop-in for <select>: same <option> children, same props (register(), value / onChange, aria-label, disabled),
 * drawn as a themed field + list panel. A hidden native <select> keeps the value, so react-hook-form and onChange work unchanged.
 */
export function Select({ children, className, disabled, ref, 'aria-label': ariaLabel, ...rest }: ComponentProps<'select'> & { ref?: Ref<HTMLSelectElement> }) {
  const { open, setOpen, show, close, pos, trigger, pop, onKeyDown } = usePopover(300)
  const native = useRef<HTMLSelectElement | null>(null)
  const options = Children.toArray(children)
    .filter(isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>)
    .map((o) => ({ value: String(o.props.value ?? textOf(o.props.children)), label: textOf(o.props.children).trim(), disabled: !!o.props.disabled }))

  // uncontrolled (register): react-hook-form writes the native value directly, so read it back after every render
  const [domValue, setDomValue] = useState('')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs every render on purpose; the guard below stops loops
  useLayoutEffect(() => {
    const v = native.current?.value ?? ''
    if (v !== domValue) setDomValue(v)
  })
  const value = rest.value != null ? String(rest.value) : domValue
  const current = options.find((o) => o.value === value)

  const pick = (v: string) => {
    const el = native.current!
    el.value = v
    el.dispatchEvent(new Event('change', { bubbles: true })) // reaches register()'s / the caller's onChange
    setDomValue(v)
    close()
  }

  const typed = useRef({ text: '', at: 0 })
  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    const move = (n: number) => items[Math.max(0, Math.min(items.length - 1, n))]?.focus()
    if (e.key === 'ArrowDown') move(i + 1)
    else if (e.key === 'ArrowUp') move(i - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(items.length - 1)
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // type-ahead: jump to the first option starting with the typed letters (long lists such as time zones)
      const now = Date.now()
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + e.key.toLowerCase(), at: now }
      items.find((b) => b.textContent?.trim().toLowerCase().startsWith(typed.current.text))?.focus()
    } else return
    e.preventDefault()
  }

  return (
    <span className={`select${className ? ` ${className}` : ''}`} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        className={`select-trigger${open ? ' open' : ''}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ? `${ariaLabel}: ${current?.label ?? ''}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            show()
          }
        }}
      >
        <span className="select-value">{current?.label ?? '—'}</span>
        <Chevron up={open} />
      </button>
      <select
        {...rest}
        ref={(el) => {
          native.current = el
          if (typeof ref === 'function') ref(el)
          else if (ref) ref.current = el
        }}
        hidden
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
      >
        {children}
      </select>
      {open && (
        <div ref={pop} className="select-pop" style={pos} role="listbox" aria-label={ariaLabel} onKeyDown={onListKey}>
          {options.map((o) => {
            const selected = o.value === value
            return (
              <button key={o.value} type="button" role="option" aria-selected={selected} disabled={o.disabled}
                className={selected ? 'selected' : undefined} onClick={() => pick(o.value)}>
                <span>{o.label}</span>
                {selected && <Check />}
              </button>
            )
          })}
        </div>
      )}
    </span>
  )
}
