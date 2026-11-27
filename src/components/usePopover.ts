import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

/**
 * Field + floating panel (TimeInput, DateInput). The panel is position: fixed so it escapes a dialog's scroll box;
 * it opens upwards when there is no room below and closes on outside click, scroll, resize and Esc.
 */
export function usePopover(height = 320) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; minWidth?: number; top?: number; bottom?: number }>({ left: 0 })
  const trigger = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)

  const show = () => {
    const r = trigger.current!.getBoundingClientRect()
    const below = window.innerHeight - r.bottom
    const left = Math.max(8, Math.min(r.left, window.innerWidth - Math.max(300, r.width) - 8))
    const minWidth = r.width
    setPos(below < height && r.top > below ? { left, minWidth, bottom: window.innerHeight - r.top + 6 } : { left, minWidth, top: r.bottom + 6 })
    setOpen(true)
  }
  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    // centre the chosen item of a scrolling list (scrollIntoView would also scroll the page and close the panel)
    const sel = pop.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (sel?.parentElement) sel.parentElement.scrollTop = sel.offsetTop - sel.parentElement.clientHeight / 2
    sel?.focus({ preventScroll: true }) // keyboard users continue from the chosen item
    const outside = (e: Event) => !pop.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)
    const onDown = (e: Event) => outside(e) && setOpen(false)
    const onScroll = (e: Event) => outside(e) && setOpen(false) // a fixed panel would drift away from its field
    const onResize = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  /** Put on the wrapper: Esc closes the panel, not the surrounding dialog. */
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      e.stopPropagation()
      close()
    }
  }

  return { open, setOpen, show, close, pos, trigger, pop, onKeyDown }
}
