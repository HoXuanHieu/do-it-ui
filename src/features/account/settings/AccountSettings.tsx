import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState, type ComponentProps } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '../../../components/Dialog'
import { Field, PasswordInput } from '../../../components/Form'
import { applyServerErrors, PASSWORD_HINT } from '../../../lib/forms'
import { useAuth } from '../../auth/AuthContext'
import { changePasswordSchema, type ChangePasswordForm } from '../../auth/schemas'
import { PreferencesCard } from './PreferencesCard'

/** Settings › Tài khoản: region, notifications, password (FR-SH-004 + FR-AUTH-005). */
export function AccountSettings() {
  return (
    <div className="stack">
      <PreferencesCard title="Khu vực & thông báo">
        {({ register, formState: { errors } }, options, prefs) => (
          <>
            <TimeZoneField current={prefs.timeZone} error={errors.timeZone?.message} {...register('timeZone')} />
            <Field label="Tiền tệ" error={errors.currency?.message}>
              <select {...register('currency')}>
                {options.currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
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
    <Field label="Múi giờ" error={error} hint={browserZone !== current ? `Trình duyệt đang dùng ${browserZone}` : undefined}>
      <select {...select}>
        {zones.map((z) => (
          <option key={z} value={z}>
            {z}
          </option>
        ))}
      </select>
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
          <h2>Mật khẩu</h2>
          {done ? (
            <p className="notice" role="status">Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.</p>
          ) : (
            <p className="muted">Đổi mật khẩu sẽ đăng xuất bạn khỏi các thiết bị khác.</p>
          )}
        </div>
        <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
          Đổi mật khẩu
        </button>
      </div>
      <Modal open={open} title="Đổi mật khẩu" size="sm" onClose={() => setOpen(false)}>
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
      <Field label="Mật khẩu hiện tại" error={formState.errors.currentPassword?.message}>
        <PasswordInput autoComplete="current-password" autoFocus {...register('currentPassword')} />
      </Field>
      <Field label="Mật khẩu mới" error={formState.errors.newPassword?.message} hint={PASSWORD_HINT}>
        <PasswordInput autoComplete="new-password" {...register('newPassword')} />
      </Field>
      <Field label="Xác nhận mật khẩu mới" error={formState.errors.confirmPassword?.message}>
        <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
      </Field>
      {message && <p className="form-error" role="alert">{message}</p>}
      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Hủy bỏ
        </button>
        <button className="btn-primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Đang lưu…' : 'Đổi mật khẩu'}
        </button>
      </div>
    </form>
  )
}
