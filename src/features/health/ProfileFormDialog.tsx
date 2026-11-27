import { t, tx } from '../../i18n'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '../../components/Dialog'
import { Field } from '../../components/Form'
import { DateInput } from '../../components/DateInput'
import { applyServerErrors } from '../../lib/forms'
import type { HealthCondition, HealthProfileDto, HealthProfileInput } from './api'
import { ACTIVITY, CONDITIONS, GOALS, parseNum, SEXES, useCreateProfile, useUpdateProfile } from './queries'
import { Select } from '../../components/Select'

const number = (min: number, max: number, required: boolean) =>
  z.string().refine((s) => {
    const n = parseNum(s)
    return n == null ? !required && !s.trim() : n >= min && n <= max
  }, 'Số không hợp lệ hoặc ngoài khoảng cho phép')

const schema = z.object({
  name: z.string().trim().min(1, 'Nhập tên hồ sơ').max(100, 'Tối đa 100 ký tự'),
  birthDate: z.string().min(1, 'Chọn ngày sinh'),
  sex: z.enum(['Male', 'Female']),
  heightCm: number(50, 250, true),
  weightKg: number(10, 400, true),
  targetWeightKg: number(10, 400, false),
  activityLevel: z.enum(['Sedentary', 'Light', 'Moderate', 'Active', 'VeryActive']),
  goal: z.enum(['LoseWeight', 'Maintain', 'GainWeight', 'Fitness']),
  conditions: z.array(z.string()),
  calorieTarget: number(800, 6000, false),
  checkInEveryDays: number(1, 365, false),
  notes: z.string().max(2000, 'Tối đa 2000 ký tự'),
})
type FormValues = z.infer<typeof schema>

const todayKey = () => new Date().toLocaleDateString('sv') // YYYY-MM-DD, local
const str = (n: number | null) => (n == null ? '' : String(n))

function toInput(v: FormValues): HealthProfileInput {
  return {
    name: v.name.trim(),
    birthDate: v.birthDate,
    sex: v.sex,
    heightCm: parseNum(v.heightCm)!,
    weightKg: parseNum(v.weightKg)!,
    targetWeightKg: parseNum(v.targetWeightKg),
    activityLevel: v.activityLevel,
    goal: v.goal,
    conditions: v.conditions as HealthCondition[],
    calorieTarget: parseNum(v.calorieTarget) && Math.round(parseNum(v.calorieTarget)!),
    checkInEveryDays: parseNum(v.checkInEveryDays) && Math.round(parseNum(v.checkInEveryDays)!),
    notes: v.notes.trim() || null,
  }
}

export function ProfileFormDialog({
  open,
  profile,
  onClose,
  onSaved,
}: {
  open: boolean
  profile?: HealthProfileDto
  onClose: () => void
  onSaved?: (p: HealthProfileDto) => void
}) {
  return (
    <Modal open={open} title={profile ? t('Sửa hồ sơ sức khỏe') : t('Tạo hồ sơ sức khỏe')} onClose={onClose}>
      {open && <ProfileForm profile={profile} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  )
}

function ProfileForm({ profile, onClose, onSaved }: { profile?: HealthProfileDto; onClose: () => void; onSaved?: (p: HealthProfileDto) => void }) {
  const create = useCreateProfile()
  const update = useUpdateProfile()
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, setError, control, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: profile
      ? {
          name: profile.name,
          birthDate: profile.birthDate,
          sex: profile.sex,
          heightCm: str(profile.heightCm),
          weightKg: str(profile.weightKg),
          targetWeightKg: str(profile.targetWeightKg),
          activityLevel: profile.activityLevel,
          goal: profile.goal,
          conditions: profile.conditions,
          calorieTarget: str(profile.calorieTarget),
          checkInEveryDays: str(profile.checkInEveryDays),
          notes: profile.notes ?? '',
        }
      : {
          name: '', birthDate: '', sex: 'Male', heightCm: '', weightKg: '', targetWeightKg: '', activityLevel: 'Light',
          goal: 'Maintain', conditions: [], calorieTarget: '', checkInEveryDays: '14', notes: '',
        },
  })
  const e = formState.errors

  const onSubmit = handleSubmit(async (v) => {
    setFormError('')
    try {
      const body = toInput(v)
      const saved = profile ? await update.mutateAsync({ id: profile.id, body }) : await create.mutateAsync(body)
      onClose()
      onSaved?.(saved)
    } catch (err) {
      setFormError(applyServerErrors(err, setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="form-grid">
      <Field label={t('Tên hồ sơ')} error={e.name?.message}>
        <input autoFocus maxLength={100} placeholder={t('VD: Tôi, Bố, Mẹ…')} {...register('name')} />
      </Field>
      <Field label={t('Ngày sinh')} error={e.birthDate?.message}>
        <Controller control={control} name="birthDate" render={({ field }) => <DateInput min="1900-01-01" max={todayKey()} value={field.value} onChange={field.onChange} />} />
      </Field>
      <Field label={t('Giới tính')}>
        <Select {...register('sex')}>
          {SEXES.map((s) => <option key={s.value} value={s.value}>{t(s.label)}</option>)}
        </Select>
      </Field>
      <Field label={t('Mục tiêu')}>
        <Select {...register('goal')}>
          {GOALS.map((g) => <option key={g.value} value={g.value}>{g.icon} {t(g.label)}</option>)}
        </Select>
      </Field>
      <Field label={t('Chiều cao (cm)')} error={e.heightCm?.message}>
        <input inputMode="decimal" placeholder="170" {...register('heightCm')} />
      </Field>
      <Field label={t('Cân nặng (kg)')} error={e.weightKg?.message}>
        <input inputMode="decimal" placeholder="65" {...register('weightKg')} />
      </Field>
      <Field label={t('Cân nặng mục tiêu (kg)')} error={e.targetWeightKg?.message} hint={t('Không bắt buộc')}>
        <input inputMode="decimal" {...register('targetWeightKg')} />
      </Field>
      <Field label={t('Mức độ vận động')} className="span-all">
        <Select {...register('activityLevel')}>
          {ACTIVITY.map((a) => <option key={a.value} value={a.value}>{t(a.label)} — {t(a.hint)}</option>)}
        </Select>
      </Field>

      <fieldset className="fieldset span-all">
        <legend>{t('Tình trạng cần lưu ý')}</legend>
        <div className="row">
          {CONDITIONS.map((c) => (
            <label key={c.value} className="check">
              <input type="checkbox" value={c.value} {...register('conditions')} /> {t(c.label)}
            </label>
          ))}
        </div>
        <small className="muted">{t('Dùng để loại bỏ bài tập và món ăn không phù hợp.')}</small>
      </fieldset>

      <Field label={t('Calo mục tiêu mỗi ngày (kcal)')} error={e.calorieTarget?.message} hint={t('Để trống để hệ thống tự ước tính')}>
        <input inputMode="numeric" {...register('calorieTarget')} />
      </Field>
      <Field label={t('Nhắc đo lại chỉ số sau (ngày)')} error={e.checkInEveryDays?.message} hint={t('Để trống để tắt nhắc nhở')}>
        <input inputMode="numeric" {...register('checkInEveryDays')} />
      </Field>

      <div className="field span-all">
        <span>{t('Ghi chú sức khỏe')}</span>
        <textarea rows={2} maxLength={2000} placeholder={t('VD: dị ứng hải sản, đang uống thuốc huyết áp…')} {...register('notes')} />
        {e.notes && <small className="field-error">{tx(e.notes.message ?? '')}</small>}
      </div>

      {formError && <p className="form-error span-all" role="alert">{formError}</p>}
      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>{t('Hủy bỏ')}</button>
        <button className="btn-primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('Đang lưu…') : t('Lưu')}
        </button>
      </div>
    </form>
  )
}
