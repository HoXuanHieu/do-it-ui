// Local-time date helpers for the calendar UI (no external date library).
// Weeks start on Monday (Supplement §3, ISO 8601).

export const DAY_MS = 86_400_000

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes())
}

export function addMonths(d: Date, n: number) {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay))
}

export function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7 // Monday = 0
  return addDays(startOfDay(d), -day)
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar date as YYYY-MM-DD (URL / <input type="date">). */
export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDateKey(key: string | null | undefined): Date | null {
  const m = key?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

/** HH:mm for <input type="time">. */
export function toTimeValue(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Combine a YYYY-MM-DD and HH:mm in local time. */
export function combine(dateKey: string, time: string): Date | null {
  const d = parseDateKey(dateKey)
  const t = time.match(/^(\d{2}):(\d{2})$/)
  if (!d || !t) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Number(t[1]), Number(t[2]))
}

/** Format with the user's date-format preference (dd/MM/yyyy | MM/dd/yyyy | yyyy-MM-dd). */
export function formatDate(d: Date, pattern = 'dd/MM/yyyy') {
  return pattern
    .replace('yyyy', String(d.getFullYear()))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('dd', pad(d.getDate()))
}

export function formatTime(d: Date) {
  return toTimeValue(d)
}

const weekdayLong = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' })
const weekdayShort = new Intl.DateTimeFormat('vi-VN', { weekday: 'short' })

export const weekdayName = (d: Date, style: 'long' | 'short' = 'short') =>
  (style === 'long' ? weekdayLong : weekdayShort).format(d)

export function monthTitle(d: Date) {
  return `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`
}

export function minutesIntoDay(d: Date, day: Date) {
  return Math.round((d.getTime() - startOfDay(day).getTime()) / 60_000)
}

/** Does [start, end) overlap the local calendar day? */
export function overlapsDay(start: Date, end: Date, day: Date) {
  const s = startOfDay(day)
  const e = addDays(s, 1)
  return start < e && end > s
}
