import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '../../components/Dialog'
import { Field } from '../../components/Form'
import type { EventCategory, EventDetailDto, EventInput, EventStatus } from '../../lib/api'
import { addDays, combine, parseDateKey, toDateKey, toTimeValue } from '../../lib/dates'
import { applyServerErrors } from '../../lib/forms'
import { CATEGORIES, MAX_REMINDERS, REMINDERS, STATUSES } from './meta'
import { useCreateEvent, useUpdateEvent } from './queries'

const schema = z
  .object({
    title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề').max(200, 'Tối đa 200 ký tự'),
    isAllDay: z.boolean(),
    startDate: z.string().min(1, 'Chọn ngày bắt đầu'),
    startTime: z.string(),
    endDate: z.string().min(1, 'Chọn ngày kết thúc'),
    endTime: z.string(),
    category: z.enum(['Work', 'Personal', 'Meeting', 'Health', 'Study', 'Other']),
    status: z.enum(['Planned', 'Completed', 'Cancelled']),
    location: z.string().max(200, 'Tối đa 200 ký tự'),
    description: z.string().max(4000, 'Tối đa 4000 ký tự'),
    reminders: z.array(z.string()).max(MAX_REMINDERS, `Tối đa ${MAX_REMINDERS} lời nhắc`),
    note: z.string().max(4000, 'Tối đa 4000 ký tự'),
  })
  .superRefine((v, ctx) => {
    const range = toRange(v)
    if (!range) {
      ctx.addIssue({ code: 'custom', path: ['startTime'], message: 'Thời gian không hợp lệ' })
      return
    }
    // BR-TM-001
    if (range.end <= range.start)
      ctx.addIssue({
        code: 'custom',
        path: [v.isAllDay ? 'endDate' : 'endTime'],
        message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
      })
  })

type FormValues = z.infer<typeof schema>

/** All-day: [start date 00:00, end date + 1 day 00:00) in local time; end date in the form is inclusive. */
function toRange(v: Pick<FormValues, 'isAllDay' | 'startDate' | 'startTime' | 'endDate' | 'endTime'>) {
  if (v.isAllDay) {
    const s = parseDateKey(v.startDate)
    const e = parseDateKey(v.endDate)
    return s && e ? { start: s, end: addDays(e, 1) } : null
  }
  const s = combine(v.startDate, v.startTime)
  const e = combine(v.endDate, v.endTime)
  return s && e ? { start: s, end: e } : null
}

export type EventFormMode = { kind: 'create'; start: Date; allDay: boolean } | { kind: 'edit'; event: EventDetailDto }

function defaults(mode: EventFormMode): FormValues {
  if (mode.kind === 'create') {
    const end = mode.allDay ? mode.start : new Date(mode.start.getTime() + 60 * 60_000)
    return {
      title: '',
      isAllDay: mode.allDay,
      startDate: toDateKey(mode.start),
      startTime: mode.allDay ? '09:00' : toTimeValue(mode.start),
      endDate: toDateKey(end),
      endTime: mode.allDay ? '10:00' : toTimeValue(end),
      category: 'Other',
      status: 'Planned',
      location: '',
      description: '',
      reminders: mode.allDay ? [] : ['15'],
      note: '',
    }
  }
  const e = mode.event
  const start = new Date(e.startAt)
  const end = new Date(e.endAt)
  const lastDay = e.isAllDay ? addDays(end, -1) : end
  return {
    title: e.title,
    isAllDay: e.isAllDay,
    startDate: toDateKey(start),
    startTime: toTimeValue(start),
    endDate: toDateKey(lastDay),
    endTime: toTimeValue(end),
    category: e.category,
    status: e.status,
    location: e.location ?? '',
    description: e.description ?? '',
    reminders: e.reminderOffsets.map(String),
    note: '',
  }
}

export function EventFormDialog({
  mode,
  onClose,
  onSaved,
}: {
  mode: EventFormMode | null
  onClose: () => void
  onSaved: (event: EventDetailDto) => void
}) {
  return (
    <Modal open={!!mode} title={mode?.kind === 'edit' ? 'Sửa sự kiện' : 'Tạo sự kiện'} onClose={onClose}>
      {mode && <EventForm key={mode.kind === 'edit' ? mode.event.id : mode.start.toISOString()} mode={mode} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  )
}

function EventForm({ mode, onClose, onSaved }: { mode: EventFormMode; onClose: () => void; onSaved: (e: EventDetailDto) => void }) {
  const create = useCreateEvent()
  const update = useUpdateEvent()
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, setError, setValue, control, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(mode),
  })
  const isAllDay = useWatch({ control, name: 'isAllDay' })
  const reminders = useWatch({ control, name: 'reminders' }) ?? []
  const startDate = useWatch({ control, name: 'startDate' })

  const onSubmit = handleSubmit(async (v) => {
    setFormError('')
    const range = toRange(v)!
    const input: EventInput = {
      title: v.title.trim(),
      startAt: range.start.toISOString(),
      endAt: range.end.toISOString(),
      isAllDay: v.isAllDay,
      description: v.description.trim() || null,
      location: v.location.trim() || null,
      category: v.category as EventCategory,
      reminderOffsets: v.reminders.map(Number),
    }
    try {
      const saved =
        mode.kind === 'create'
          ? await create.mutateAsync({ ...input, note: v.note.trim() || null })
          : await update.mutateAsync({ id: mode.event.id, body: { ...input, status: v.status as EventStatus } })
      onSaved(saved)
    } catch (e) {
      setFormError(applyServerErrors(e, setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="form-grid event-form">
      <Field label="Tiêu đề" error={formState.errors.title?.message}>
        <input autoFocus maxLength={200} placeholder="VD: Họp nhóm, Khám răng…" {...register('title')} />
      </Field>

      <label className="check span-all">
        <input
          type="checkbox"
          {...register('isAllDay', {
            onChange: (e) => {
              if (e.target.checked) setValue('reminders', [])
            },
          })}
        />
        Cả ngày
      </label>

      <Field label="Bắt đầu" error={formState.errors.startDate?.message ?? formState.errors.startTime?.message}>
        <div className="row-tight">
          <input
            type="date"
            {...register('startDate', {
              onChange: (e) => {
                // keep the end date from falling before the new start date
                setValue('endDate', e.target.value)
              },
            })}
          />
          {!isAllDay && <input type="time" step={300} {...register('startTime')} />}
        </div>
      </Field>
      <Field label="Kết thúc" error={formState.errors.endDate?.message ?? formState.errors.endTime?.message}>
        <div className="row-tight">
          <input type="date" min={startDate} {...register('endDate')} />
          {!isAllDay && <input type="time" step={300} {...register('endTime')} />}
        </div>
      </Field>

      <Field label="Phân loại" error={formState.errors.category?.message}>
        <select {...register('category')}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Địa điểm" error={formState.errors.location?.message}>
        <input maxLength={200} {...register('location')} />
      </Field>
      {mode.kind === 'edit' && (
        <Field label="Trạng thái" error={formState.errors.status?.message}>
          <select {...register('status')}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="field span-all">
        <span>Mô tả</span>
        <textarea rows={3} maxLength={4000} {...register('description')} />
        {formState.errors.description && <small className="field-error">{formState.errors.description.message}</small>}
      </div>

      <fieldset className="fieldset span-all">
        <legend>Nhắc nhở</legend>
        <div className="check-grid">
          {REMINDERS.map((r) => {
            const checked = reminders.includes(String(r.value))
            return (
              <label key={r.value} className="check">
                <input
                  type="checkbox"
                  value={String(r.value)}
                  disabled={!checked && reminders.length >= MAX_REMINDERS}
                  {...register('reminders')}
                />
                {r.label}
              </label>
            )
          })}
        </div>
        {formState.errors.reminders && <small className="field-error">{formState.errors.reminders.message}</small>}
      </fieldset>

      {mode.kind === 'create' && (
        <div className="field span-all">
          <span>Ghi chú (không bắt buộc)</span>
          <textarea rows={2} maxLength={4000} {...register('note')} />
        </div>
      )}

      {formError && <p className="form-error span-all" role="alert">{formError}</p>}
      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Hủy bỏ
        </button>
        <button className="btn-primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Đang lưu…' : mode.kind === 'create' ? 'Tạo sự kiện' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  )
}
