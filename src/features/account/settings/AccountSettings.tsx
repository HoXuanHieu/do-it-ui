import { t } from '../../../i18n'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState, type ComponentProps } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '../../../components/Dialog'
import { Field, PasswordInput } from '../../../components/Form'
import { applyServerErrors, PASSWORD_HINT } from '../../../lib/forms'
import { useAuth } from '../../auth/AuthContext'
import { changePasswordSchema, type ChangePasswordForm } from '../../auth/schemas'
import { PreferencesCard } from './PreferencesCard'
import { Select } from '../../../components/Select'

/** Settings › Tài khoản: region, notifications, password (FR-SH-004 + FR-AUTH-005). */
export function AccountSettings() {
  return (
    <div className="stack">
      <PreferencesCard title={t('Khu vực & thông báo')}>
        {({ register, formState: { errors } }, options, prefs) => (
          <>
            <TimeZoneField current={prefs.timeZone} error={errors.timeZone?.message} {...register('timeZone')} />
            <Field label={t('Tiền tệ')} error={errors.currency?.message}>
              <Select {...register('currency')}>
                {options.currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <fieldset className="fieldset span-all">
              <legend>{t('Thông báo')}</legend>
              <label className="check">
                <input type="checkbox" {...register('inAppNotifications')} /> {t('Thông báo trong ứng dụng')}
              </label>
              <label className="check">
                <input type="checkbox" {...register('emailNotifications')} /> {t('Thông báo qua email')}
              </label>
              <small className="muted">{t('Thông báo bảo mật (đổi mật khẩu…) luôn được gửi.')}</small>
            </fieldset>
          </>
        )}
      </PreferencesCard>
      <ChangePasswordCard />
    </div>
  )
}

function TimeZoneField({ current, error, ...select }: { current: string; error?: string } & ComponentProps<'select'>) {
  const zones = useMemo(() => {
    const all = Intl.supportedValuesOf('timeZone')
    return all.includes(current) ? all : [current, ...all]
  }, [current])
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <Field label={t('Múi giờ')} error={error} hint={browserZone !== current ? t('Trình duyệt đang dùng {zone}', { zone: browserZone }) : undefined}>
      <Select {...select}>
        {zones.map((z) => (
          <option key={z} value={z}>
            {z}
          </option>
        ))}
      </Select>
    </Field>
  )
}

function ChangePasswordCard() {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)

  return (
    <section className="card">
      <div className="row-between wrap" style={{ alignItems: 'center' }}>
        <div>
          <h2>{t('Mật khẩu')}</h2>
          {done ? (
            <p className="notice" role="status">{t('Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.')}</p>
          ) : (
            <p className="muted">{t('Đổi mật khẩu sẽ đăng xuất bạn khỏi các thiết bị khác.')}</p>
          )}
        </div>
        <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
          {t('Đổi mật khẩu')}
        </button>
      </div>
      <Modal open={open} title={t('Đổi mật khẩu')} size="sm" onClose={() => setOpen(false)}>
        {open && <PasswordForm onCancel={() => setOpen(false)} onDone={() => { setOpen(false); setDone(true) }} />}
      </Modal>
    </section>
  )
}

function PasswordForm({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const { changePassword } = useAuth()
  const [message, setMessage] = useState('')
  const { register, handleSubmit, setError, formState } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  })

  const onSubmit = handleSubmit(async (v) => {
    setMessage('')
    try {
      await changePassword(v)
      onDone()
    } catch (e) {
      setMessage(applyServerErrors(e, setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="stack">
      <Field label={t('Mật khẩu hiện tại')} error={formState.errors.currentPassword?.message}>
        <PasswordInput autoComplete="current-password" autoFocus {...register('currentPassword')} />
      </Field>
      <Field label={t('Mật khẩu mới')} error={formState.errors.newPassword?.message} hint={t(PASSWORD_HINT)}>
        <PasswordInput autoComplete="new-password" {...register('newPassword')} />
      </Field>
      <Field label={t('Xác nhận mật khẩu mới')} error={formState.errors.confirmPassword?.message}>
        <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
      </Field>
      {message && <p className="form-error" role="alert">{message}</p>}
      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          {t('Hủy bỏ')}
        </button>
        <button className="btn-primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('Đang lưu…') : t('Đổi mật khẩu')}
        </button>
      </div>
    </form>
  )
}
