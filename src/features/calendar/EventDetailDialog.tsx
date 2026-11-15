import { useState } from 'react'
import { ConfirmDialog, Modal } from '../../components/Dialog'
import { ApiError } from '../../lib/api'
import type { EventDetailDto, EventNoteDto, EventStatus } from './api'
import { addDays, formatDate, formatTime, isSameDay, weekdayName } from '../../lib/dates'
import { usePreferences } from '../account/queries'
import { CATEGORY_LABEL, categoryClass, reminderLabel, STATUS_LABEL } from './meta'
import { useDeleteEvent, useEventDetail, useNoteMutations, useSetEventStatus } from './queries'

/** FR-TM-005 (details), FR-TM-010 (status), FR-TM-004 (delete), FR-TM-006 (notes). */
export function EventDetailDialog({
  eventId,
  onClose,
  onEdit,
}: {
  eventId: string | null
  onClose: () => void
  onEdit: (event: EventDetailDto) => void
}) {
  const { data: event, isPending, error } = useEventDetail(eventId)
  const notFound = error instanceof ApiError && error.status === 404

  return (
    <Modal open={!!eventId} title={event?.title ?? 'Sự kiện'} onClose={onClose}>
      {isPending && <p className="muted">Đang tải…</p>}
      {notFound && <p className="muted">Sự kiện không tồn tại hoặc đã bị xóa.</p>}
      {error && !notFound && <p className="form-error">Không tải được sự kiện.</p>}
      {event && <EventDetail event={event} onClose={onClose} onEdit={onEdit} />}
    </Modal>
  )
}

function useWhen(event: EventDetailDto) {
  const fmt = usePreferences().data?.dateFormat
  const start = new Date(event.startAt)
  const end = new Date(event.endAt)
  const day = (d: Date) => `${weekdayName(d, 'long')}, ${formatDate(d, fmt)}`
  if (event.isAllDay) {
    const last = addDays(end, -1)
    return isSameDay(start, last) ? `${day(start)} · Cả ngày` : `${day(start)} → ${day(last)} · Cả ngày`
  }
  return isSameDay(start, end)
    ? `${day(start)} · ${formatTime(start)} – ${formatTime(end)}`
    : `${day(start)} ${formatTime(start)} → ${day(end)} ${formatTime(end)}`
}

function EventDetail({ event, onClose, onEdit }: { event: EventDetailDto; onClose: () => void; onEdit: (e: EventDetailDto) => void }) {
  const setStatus = useSetEventStatus()
  const remove = useDeleteEvent()
  const [confirming, setConfirming] = useState(false)
  const when = useWhen(event)

  const changeStatus = (status: EventStatus) => setStatus.mutate({ id: event.id, status })

  return (
    <div className="event-detail">
      <div className="row">
        <span className={`tag tag-cat ${categoryClass(event.category)}`}>{CATEGORY_LABEL[event.category]}</span>
        <span className={`tag status-tag status-${event.status.toLowerCase()}`}>{STATUS_LABEL[event.status]}</span>
      </div>

      <dl className="detail-list">
        <dt>Thời gian</dt>
        <dd>{when}</dd>
        {event.location && (
          <>
            <dt>Địa điểm</dt>
            <dd>{event.location}</dd>
          </>
        )}
        <dt>Nhắc nhở</dt>
        <dd>{event.reminderOffsets.length ? event.reminderOffsets.map(reminderLabel).join(', ') : 'Không'}</dd>
        {event.description && (
          <>
            <dt>Mô tả</dt>
            <dd className="pre-wrap">{event.description}</dd>
          </>
        )}
      </dl>

      <div className="row">
        {event.status !== 'Completed' && (
          <button className="btn-ghost" disabled={setStatus.isPending} onClick={() => changeStatus('Completed')}>
            ✓ Hoàn thành
          </button>
        )}
        {event.status !== 'Cancelled' && (
          <button className="btn-ghost" disabled={setStatus.isPending} onClick={() => changeStatus('Cancelled')}>
            Hủy sự kiện
          </button>
        )}
        {event.status !== 'Planned' && (
          <button className="btn-ghost" disabled={setStatus.isPending} onClick={() => changeStatus('Planned')}>
            Đặt lại “Đã lên lịch”
          </button>
        )}
        <span className="spacer" />
        <button className="btn-ghost" onClick={() => onEdit(event)}>
          Sửa
        </button>
        <button className="btn-ghost danger" onClick={() => setConfirming(true)}>
          Xóa
        </button>
      </div>

      <Notes event={event} />

      <ConfirmDialog
        open={confirming}
        title="Xóa sự kiện?"
        message={
          <>
            Sự kiện <strong>{event.title}</strong> cùng ghi chú và lời nhắc sẽ bị xóa.
          </>
        }
        busy={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          remove.mutate(event.id, {
            onSuccess: () => {
              setConfirming(false)
              onClose()
            },
          })
        }
      />
    </div>
  )
}

function Notes({ event }: { event: EventDetailDto }) {
  const { add } = useNoteMutations(event.id)
  const [draft, setDraft] = useState('')

  const submit = () => {
    const content = draft.trim()
    if (!content) return
    add.mutate(content, { onSuccess: () => setDraft('') })
  }

  return (
    <section className="notes">
      <h3>Ghi chú ({event.notes.length})</h3>
      <ul className="note-list">
        {event.notes.map((n) => (
          <NoteItem key={n.id} eventId={event.id} note={n} />
        ))}
      </ul>
      <div className="note-add">
        <textarea
          rows={2}
          maxLength={4000}
          placeholder="Thêm ghi chú…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit()
          }}
        />
        <button className="btn-primary" disabled={!draft.trim() || add.isPending} onClick={submit}>
          Thêm
        </button>
      </div>
    </section>
  )
}

function NoteItem({ eventId, note }: { eventId: string; note: EventNoteDto }) {
  const { update, remove } = useNoteMutations(eventId)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.content)
  const [confirming, setConfirming] = useState(false)
  const fmt = usePreferences().data?.dateFormat
  const updated = new Date(note.updatedAt)

  return (
    <li className="note">
      {editing ? (
        <>
          <textarea rows={3} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          <div className="row">
            <button
              className="btn-primary"
              disabled={!text.trim() || update.isPending}
              onClick={() => update.mutate({ noteId: note.id, content: text }, { onSuccess: () => setEditing(false) })}
            >
              Lưu
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                setText(note.content)
                setEditing(false)
              }}
            >
              Hủy bỏ
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="pre-wrap">{note.content}</p>
          <div className="row note-meta">
            <small className="muted">
              {formatDate(updated, fmt)} {formatTime(updated)}
            </small>
            <button className="btn-link" onClick={() => setEditing(true)}>
              Sửa
            </button>
            <button className="btn-link danger" onClick={() => setConfirming(true)}>
              Xóa
            </button>
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirming}
        title="Xóa ghi chú?"
        message="Ghi chú này sẽ bị xóa vĩnh viễn."
        busy={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => remove.mutate(note.id, { onSuccess: () => setConfirming(false) })}
      />
    </li>
  )
}
