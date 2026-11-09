import type { EventSummaryDto } from '../../lib/api'
import { addDays, minutesIntoDay, overlapsDay, startOfDay } from '../../lib/dates'

export interface PositionedEvent {
  event: EventSummaryDto
  /** minutes from local midnight, clipped to the day */
  top: number
  height: number
  /** column index and total columns inside its overlap cluster */
  col: number
  cols: number
  continuesBefore: boolean
  continuesAfter: boolean
}

const MIN_HEIGHT = 20 // minutes, so very short events stay clickable

/** All-day events (or spanning a whole day) go in the top strip rather than the time grid. */
export function isAllDayLike(e: EventSummaryDto) {
  return e.isAllDay
}

/**
 * Lay out timed events for one day column: clip to the day, group overlapping events into clusters
 * and assign each the first free column (greedy), Google-Calendar style.
 */
export function layoutDay(events: EventSummaryDto[], day: Date): PositionedEvent[] {
  const dayStart = startOfDay(day)
  const dayEnd = addDays(dayStart, 1)

  const items = events
    .filter((e) => !isAllDayLike(e))
    .map((e) => ({ e, s: new Date(e.startAt), en: new Date(e.endAt) }))
    .filter(({ s, en }) => overlapsDay(s, en, day))
    .map(({ e, s, en }) => {
      const top = Math.max(0, minutesIntoDay(s, day))
      const bottom = Math.min(24 * 60, en >= dayEnd ? 24 * 60 : minutesIntoDay(en, day))
      return { e, top, bottom: Math.max(bottom, top + MIN_HEIGHT), before: s < dayStart, after: en > dayEnd }
    })
    .sort((a, b) => a.top - b.top || b.bottom - a.bottom)

  const result: PositionedEvent[] = []
  let cluster: { item: (typeof items)[number]; col: number }[] = []
  let clusterEnd = -1
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((c) => c.col + 1))
    for (const c of cluster)
      result.push({
        event: c.item.e,
        top: c.item.top,
        height: c.item.bottom - c.item.top,
        col: c.col,
        cols,
        continuesBefore: c.item.before,
        continuesAfter: c.item.after,
      })
    cluster = []
  }

  for (const item of items) {
    if (cluster.length && item.top >= clusterEnd) flush()
    const used = new Set(cluster.filter((c) => c.item.bottom > item.top).map((c) => c.col))
    let col = 0
    while (used.has(col)) col++
    cluster.push({ item, col })
    clusterEnd = Math.max(clusterEnd, item.bottom)
  }
  if (cluster.length) flush()
  return result
}

/** Events touching a day, all-day first, then by start time (FR-DASH-002 chronological order). */
export function eventsOnDay(events: EventSummaryDto[], day: Date) {
  return events
    .filter((e) => overlapsDay(new Date(e.startAt), new Date(e.endAt), day))
    .sort((a, b) => Number(b.isAllDay) - Number(a.isAllDay) || a.startAt.localeCompare(b.startAt))
}
