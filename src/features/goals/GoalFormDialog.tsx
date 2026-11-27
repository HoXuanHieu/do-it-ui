import { t, tx } from '../../i18n'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '../../components/Dialog'
import { Field } from '../../components/Form'
import { DateInput } from '../../components/DateInput'
import { TimeInput } from '../../components/TimeInput'
import { addDays, parseDateKey, startOfWeek, toDateKey } from '../../lib/dates'
import { applyServerErrors } from '../../lib/forms'
import type { GoalDto, GoalPeriod } from './api'
import { PERIODS, useCreateGoal, useUpdateGoal } from './queries'

const schema = z
  .object({
    title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề').max(200, 'Tối đa 200 ký tự'),
    period: z.enum(['Day', 'Week', 'Month', 'Year']),
    startDate: z.string().min(1, 'Chọn ngày bắt đầu'),
    dueDate: z.string().min(1, 'Chọn hạn hoàn thành'),
    description: z.string().max(4000, 'Tối đa 4000 ký tự'),
    plan: z.string().max(4000, 'Tối đa 4000 ký tự'),
    remind: z.boolean(),
    reminderTime: z.string(),
    steps: z
      .array(
        z.object({
          id: z.string().nullable(),
          title: z.string().trim().min(1, 'Nhập nội dung chặng').max(200, 'Tối đa 200 ký tự'),
          dueDate: z.string(),
          isDone: z.boolean(),
          result: z.string().nullable(),
        }),
      )
      .max(50, 'Tối đa 50 chặng'),
  })
  .superRefine((v, ctx) => {
    if (v.dueDate < v.startDate)
      ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'Hạn hoàn thành phải từ ngày bắt đầu trở đi' })
    if (v.remind && !v.reminderTime) ctx.addIssue({ code: 'custom', path: ['reminderTime'], message: 'Chọn giờ nhắc' })
  })

type FormValues = z.infer<typeof schema>

/** Default due date for a period: today / Sunday of this week / end of this month / end of this year. */
function dueFor(period: GoalPeriod, from = new Date()) {
  if (period === 'Day') return toDateKey(from)
  if (period === 'Week') return toDateKey(addDays(startOfWeek(from), 6))
  if (period === 'Month') return toDateKey(new Date(from.getFullYear(), from.getMonth() + 1, 0))
  return toDateKey(new Date(from.getFullYear(), 11, 31))
}

function defaults(goal: GoalDto | null): FormValues {
  if (!goal)
    return {
      title: '',
      period: 'Month',
      startDate: toDateKey(new Date()),
      dueDate: dueFor('Month'),
      description: '',
      plan: '',
      remind: true,
      reminderTime: '08:00',
      steps: [],
    }
  return {
    title: goal.title,
    period: goal.period,
    startDate: goal.startDate,
    dueDate: goal.dueDate,
    description: goal.description ?? '',
    plan: goal.plan ?? '',
    remind: !!goal.reminderTime,
    reminderTime: goal.reminderTime?.slice(0, 5) ?? '08:00',
    steps: goal.steps.map((s) => ({ id: s.id, title: s.title, dueDate: s.dueDate ?? '', isDone: s.isDone, result: s.result })),
  }
}

export type GoalFormMode = { kind: 'create' } | { kind: 'edit'; goal: GoalDto }

export function GoalFormDialog({ mode, onClose }: { mode: GoalFormMode | null; onClose: () => void }) {
  return (
    <Modal open={!!mode} title={mode?.kind === 'edit' ? t('Sửa mục tiêu') : t('Mục tiêu mới')} onClose={onClose}>
      {mode && <GoalForm key={mode.kind === 'edit' ? mode.goal.id : 'new'} goal={mode.kind === 'edit' ? mode.goal : null} onClose={onClose} />}
    </Modal>
  )
}

function GoalForm({ goal, onClose }: { goal: GoalDto | null; onClose: () => void }) {
  const create = useCreateGoal()
  const update = useUpdateGoal()
  const [formError, setFormError] = useState('')
  const [newStep, setNewStep] = useState('')
  const { register, handleSubmit, setError, setValue, getValues, control, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(goal),
  })
  const steps = useFieldArray({ control, name: 'steps' })
  const remind = useWatch({ control, name: 'remind' })
  const startDate = useWatch({ control, name: 'startDate' })
  const errors = formState.errors

  const addStep = () => {
    const title = newStep.trim()
    if (!title) return
    steps.append({ id: null, title, dueDate: '', isDone: false, result: null }, { shouldFocus: false })
    setNewStep('')
  }

  const onSubmit = handleSubmit(async (v) => {
    setFormError('')
    const body = {
      title: v.title.trim(),
      period: v.period,
      startDate: v.startDate,
      dueDate: v.dueDate,
      description: v.description.trim() || null,
      plan: v.plan.trim() || null,
      reminderTime: v.remind ? `${v.reminderTime}:00` : null,
      steps: v.steps.map((s) => ({ id: s.id, title: s.title.trim(), dueDate: s.dueDate || null, isDone: s.isDone, result: s.result })),
    }
    try {
      if (goal) await update.mutateAsync({ id: goal.id, body })
      else await create.mutateAsync(body)
      onClose()
    } catch (e) {
      setFormError(applyServerErrors(e, setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="form-grid goal-form">
      <div className="span-all">
        <Field label={t('Bạn muốn đạt được điều gì?')} error={errors.title?.message}>
          <input autoFocus maxLength={200} placeholder={t('VD: Chạy bộ 10km, Đọc 12 cuốn sách…')} {...register('title')} />
        </Field>
      </div>

      <fieldset className="fieldset span-all">
        <legend>{t('Thời hạn')}</legend>
        <div className="period-picker" role="radiogroup">
          {PERIODS.map((p) => (
            <label key={p.value} className={`period-option period-${p.value.toLowerCase()}`}>
              <input
                type="radio"
                value={p.value}
                {...register('period', { onChange: (e) => setValue('dueDate', dueFor(e.target.value as GoalPeriod, parseDateKey(getValues('startDate')) ?? new Date())) })}
              />
              <span>
                <span aria-hidden>{p.icon}</span> {t(p.label)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label={t('Bắt đầu')} error={errors.startDate?.message}>
        <Controller control={control} name="startDate" render={({ field }) => <DateInput value={field.value} onChange={field.onChange} />} />
      </Field>
      <Field label={t('Hạn hoàn thành')} error={errors.dueDate?.message}>
        <Controller control={control} name="dueDate" render={({ field }) => <DateInput min={startDate} value={field.value} onChange={field.onChange} />} />
      </Field>

      <div className="field span-all">
        <span>{t('Chi tiết mục tiêu: cần làm gì, đạt kết quả ra sao?')}</span>
        <textarea rows={3} maxLength={4000} placeholder={t('Mô tả cụ thể, đo lường được. VD: Chạy liền 10km dưới 60 phút.')} {...register('description')} />
        {errors.description && <small className="field-error">{tx(errors.description.message ?? '')}</small>}
      </div>
      <div className="field span-all">
        <span>{t('Cách để hoàn thành')}</span>
        <textarea rows={3} maxLength={4000} placeholder={t('Kế hoạch, thói quen, nguồn lực cần có… VD: Chạy 3 buổi/tuần, tăng 1km mỗi tuần.')} {...register('plan')} />
        {errors.plan && <small className="field-error">{tx(errors.plan.message ?? '')}</small>}
      </div>

      <fieldset className="fieldset span-all">
        <legend>{t('Các chặng nhỏ')}</legend>
        {steps.fields.length === 0 && <p className="muted small">{t('Chia mục tiêu thành từng chặng nhỏ để dễ bắt đầu và theo dõi tiến độ.')}</p>}
        <ol className="step-editor">
          {steps.fields.map((f, i) => (
            <li key={f.id}>
              <span className="step-num">{i + 1}</span>
              <div className="grow">
                <input aria-label={t('Chặng {n}', { n: i + 1 })} maxLength={200} {...register(`steps.${i}.title`)} />
                {errors.steps?.[i]?.title && <small className="field-error">{tx(errors.steps[i].title.message ?? '')}</small>}
              </div>
              <Controller control={control} name={`steps.${i}.dueDate`} render={({ field }) => <DateInput optional aria-label={t('Hạn của chặng')} value={field.value ?? ''} onChange={field.onChange} />} />
              <button type="button" className="icon-btn" aria-label={t('Lên')} disabled={i === 0} onClick={() => steps.move(i, i - 1)}>↑</button>
              <button type="button" className="icon-btn" aria-label={t('Xuống')} disabled={i === steps.fields.length - 1} onClick={() => steps.move(i, i + 1)}>↓</button>
              <button type="button" className="icon-btn" aria-label={t('Xóa')} onClick={() => steps.remove(i)}>×</button>
            </li>
          ))}
        </ol>
        <div className="row-tight">
          <input
            className="input grow"
            maxLength={200}
            value={newStep}
            placeholder={t('Thêm chặng mới rồi nhấn Enter')}
            onChange={(e) => setNewStep(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addStep()
              }
            }}
          />
          <button type="button" className="btn-ghost" onClick={addStep} disabled={steps.fields.length >= 50}>
            {t('+ Thêm')}
          </button>
        </div>
        {errors.steps?.message && <small className="field-error">{tx(errors.steps.message)}</small>}
      </fieldset>

      <fieldset className="fieldset span-all">
        <legend>{t('Nhắc nhở')}</legend>
        <div className="row">
          <label className="check">
            <input type="checkbox" {...register('remind')} />
            {t('Nhắc tôi mỗi ngày lúc')}
          </label>
          <Controller control={control} name="reminderTime" render={({ field }) => <TimeInput disabled={!remind} aria-label={t('Giờ nhắc')} value={field.value} onChange={field.onChange} />} />
        </div>
        {errors.reminderTime && <small className="field-error">{tx(errors.reminderTime.message ?? '')}</small>}
      </fieldset>

      {formError && <p className="form-error span-all" role="alert">{formError}</p>}
      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>
          {t('Hủy bỏ')}
        </button>
        <button className="btn-primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('Đang lưu…') : goal ? t('Lưu thay đổi') : t('Tạo mục tiêu')}
        </button>
      </div>
    </form>
  )
}
