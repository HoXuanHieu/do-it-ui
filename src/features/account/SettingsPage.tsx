import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Field } from '../../components/Form'
import { applyServerErrors, PASSWORD_HINT } from '../../lib/forms'
import type { PreferenceOptionsDto, PreferencesDto, Theme } from './api'
import { useAuth } from '../auth/AuthContext'
import { changePasswordSchema, type ChangePasswordForm } from '../auth/schemas'
import { usePreferenceOptions, usePreferences, useUpdatePreferences } from './queries'

const THEME_LABEL: Record<Theme, string> = { System: 'Theo hệ thống', Light: 'Sáng', Dark: 'Tối' }
const LANGUAGE_LABEL: Record<string, string> = { vi: 'Tiếng Việt', en: 'English' }
const DATE_FORMAT_LABEL: Record<string, string> = {
  'dd/MM/yyyy': '31/12/2026',
  'MM/dd/yyyy': '12/31/2026',
  'yyyy-MM-dd': '2026-12-31',
}

/** FR-SH-004 + FR-AUTH-005 (change password) */
export function SettingsPage() {
  const prefs = usePreferences()
  const options = usePreferenceOptions()

  return (
    <>
      <header className="page-header">
        <h1>Cài đặt</h1>
      </header>
      <div className="stack">
        {prefs.data && options.data ? (
          <PreferencesForm key={JSON.stringify(prefs.data)} prefs={prefs.data} options={options.data} />
        ) : (
          <section className="card">
            <p className="muted">{prefs.isError || options.isError ? 'Không tải được cài đặt.' : 'Đang tải…'}</p>
          </section>
        )}
        <ChangePasswordCard />
      </div>
    </>
  )
}

function useTimeZones(current: string) {
  return useMemo(() => {
    const zones = Intl.supportedValuesOf('timeZone')
    return zones.includes(current) ? zones : [current, ...zones]
  }, [current])
}

function PreferencesForm({ prefs, options }: { prefs: PreferencesDto; options: PreferenceOptionsDto }) {
  const update = useUpdatePreferences()
  const timeZones = useTimeZones(prefs.timeZone)
  const [message, setMessage] = useState('')
  const { register, handleSubmit, setError, formState } = useForm<PreferencesDto>({ defaultValues: prefs })

  const onSubmit = handleSubmit(async (v) => {
    setMessage('')
    try {
      await update.mutateAsync(v)
    } catch (e) {
      setMessage(applyServerErrors(e, setError))
    }
  })

  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <section className="card">
      <h2>Tùy chọn</h2>
      <form onSubmit={onSubmit} noValidate className="form-grid">
        <Field
          label="Múi giờ"
          error={formState.errors.timeZone?.message}
          hint={browserZone !== prefs.timeZone ? `Trình duyệt đang dùng ${browserZone}` : undefined}
        >
          <select {...register('timeZone')}>
            {timeZones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tiền tệ" error={formState.errors.currency?.message}>
          <select {...register('currency')}>
            {options.currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Định dạng ngày" error={formState.errors.dateFormat?.message}>
          <select {...register('dateFormat')}>
            {options.dateFormats.map((f) => (
              <option key={f} value={f}>
                {DATE_FORMAT_LABEL[f] ?? f} ({f})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Giao diện" error={formState.errors.theme?.message}>
          <select {...register('theme')}>
            {options.themes.map((t) => (
              <option key={t} value={t}>
                {THEME_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ngôn ngữ" error={formState.errors.language?.message} hint="Giao diện tiếng Anh sẽ có ở bản sau.">
          <select {...register('language')}>
            {options.languages.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABEL[l] ?? l}
              </option>
            ))}
          </select>
        </Field>
        <fieldset className="fieldset span-all">
          <legend>Thông báo</legend>
          <label className="check">
            <input type="checkbox" {...register('inAppNotifications')} /> Thông báo trong ứng dụng
          </label>
          <label className="check">
            <input type="checkbox" {...register('emailNotifications')} /> Thông báo qua email
          </label>
          <small className="muted">Thông báo bảo mật (đổi mật khẩu…) luôn được gửi.</small>
        </fieldset>
        {message && <p className="form-error span-all" role="alert">{message}</p>}
        <div className="form-actions">
          <button className="btn-primary" disabled={formState.isSubmitting || !formState.isDirty}>
            {formState.isSubmitting ? 'Đang lưu…' : 'Lưu cài đặt'}
          </button>
        </div>
      </form>
    </section>
  )
}

function ChangePasswordCard() {
  const { changePassword } = useAuth()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const { register, handleSubmit, setError, reset, formState } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  })

  const onSubmit = handleSubmit(async (v) => {
    setMessage(null)
    try {
      await changePassword(v)
      reset()
      setMessage({ ok: true, text: 'Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.' })
    } catch (e) {
      const text = applyServerErrors(e, setError)
      if (text) setMessage({ ok: false, text })
    }
  })

  return (
    <section className="card">
      <h2>Đổi mật khẩu</h2>
      <form onSubmit={onSubmit} noValidate className="form-grid">
        <Field label="Mật khẩu hiện tại" error={formState.errors.currentPassword?.message}>
          <input type="password" autoComplete="current-password" {...register('currentPassword')} />
        </Field>
        <Field label="Mật khẩu mới" error={formState.errors.newPassword?.message} hint={PASSWORD_HINT}>
          <input type="password" autoComplete="new-password" {...register('newPassword')} />
        </Field>
        <Field label="Xác nhận mật khẩu mới" error={formState.errors.confirmPassword?.message}>
          <input type="password" autoComplete="new-password" {...register('confirmPassword')} />
        </Field>
        {message && (
          <p className={message.ok ? 'notice span-all' : 'form-error span-all'} role={message.ok ? 'status' : 'alert'}>
            {message.text}
          </p>
        )}
        <div className="form-actions">
          <button className="btn-primary" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Đang lưu…' : 'Đổi mật khẩu'}
          </button>
        </div>
      </form>
    </section>
  )
}
