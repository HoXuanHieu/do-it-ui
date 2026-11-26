import { t, type Key } from '../../i18n'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Field, PasswordInput } from '../../components/Form'
import { ApiError } from '../../lib/api'
import { applyServerErrors, PASSWORD_HINT } from '../../lib/forms'
import { LegalLinks } from '../legal/LegalPage'
import { authApi } from './api'
import { useAuth } from './AuthContext'
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordForm,
  type LoginForm,
  type RegisterForm,
  type ResetPasswordForm,
} from './schemas'

function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">DO-IT</div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        <LegalLinks />
      </section>
    </main>
  )
}

export function LoginPage() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, setError, formState } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  if (status === 'authenticated') return <Navigate to="/" replace />

  const onSubmit = handleSubmit(async (v) => {
    setFormError('')
    try {
      await login(v.email, v.password)
      const from = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(from, { replace: true })
    } catch (e) {
      // Email existence is checked first server-side, so 401 here means wrong password.
      if (e instanceof ApiError && e.status === 401) setError('password', { message: 'Mật khẩu không đúng.' satisfies Key })
      else setFormError(applyServerErrors(e, setError))
    }
  })

  return (
    <AuthCard title={t('Đăng nhập')} subtitle={t('Quản lý thời gian, sức khỏe và tài chính của bạn.')}>
      <form onSubmit={onSubmit} noValidate>
        <Field label="Email" error={formState.errors.email?.message}>
          <input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label={t('Mật khẩu')} error={formState.errors.password?.message}>
          <PasswordInput autoComplete="current-password" {...register('password')} />
        </Field>
        <Link to="/forgot-password" className="small-link">
          {t('Quên mật khẩu?')}
        </Link>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <button className="btn-primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('Đang đăng nhập…') : t('Đăng nhập')}
        </button>
      </form>
      <p className="muted center">
        {t('Chưa có tài khoản?')} <Link to="/register">{t('Đăng ký')}</Link>
      </p>
    </AuthCard>
  )
}

export function RegisterPage() {
  const { register: signUp, status } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, setError, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  if (status === 'authenticated') return <Navigate to="/" replace />

  const onSubmit = handleSubmit(async (v) => {
    setFormError('')
    try {
      await signUp({ ...v, fullName: v.fullName?.trim() || undefined })
      navigate('/', { replace: true })
    } catch (e) {
      setFormError(applyServerErrors(e, setError))
    }
  })

  return (
    <AuthCard title={t('Tạo tài khoản')} subtitle={t('Bắt đầu sắp xếp cuộc sống của bạn với DO-IT.')}>
      <form onSubmit={onSubmit} noValidate>
        <Field label={t('Họ tên (không bắt buộc)')} error={formState.errors.fullName?.message}>
          <input autoComplete="name" {...register('fullName')} />
        </Field>
        <Field label="Email" error={formState.errors.email?.message}>
          <input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label={t('Mật khẩu')} error={formState.errors.password?.message} hint={t(PASSWORD_HINT)}>
          <PasswordInput autoComplete="new-password" {...register('password')} />
        </Field>
        <Field label={t('Xác nhận mật khẩu')} error={formState.errors.confirmPassword?.message}>
          <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
        </Field>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <button className="btn-primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('Đang tạo tài khoản…') : t('Đăng ký')}
        </button>
        <p className="muted small">
          {t('Bằng việc đăng ký, bạn đồng ý với')} <Link to="/terms">{t('Điều khoản sử dụng')}</Link> {t('và')}{' '}
          <Link to="/privacy">{t('Chính sách quyền riêng tư')}</Link>.
        </p>
      </form>
      <p className="muted center">
        {t('Đã có tài khoản?')} <Link to="/login">{t('Đăng nhập')}</Link>
      </p>
    </AuthCard>
  )
}

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, setError, formState } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = handleSubmit(async (v) => {
    setFormError('')
    try {
      await authApi.forgotPassword(v.email)
      setSentTo(v.email)
    } catch (e) {
      setFormError(applyServerErrors(e, setError))
    }
  })

  return (
    <AuthCard title={t('Quên mật khẩu')} subtitle={t('Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.')}>
      {sentTo ? (
        <p className="notice" role="status">
          {t('Nếu')} <strong>{sentTo}</strong> {t('đã được đăng ký, bạn sẽ nhận được email trong vài phút. Liên kết có hiệu lực 1 giờ.')}
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <Field label="Email" error={formState.errors.email?.message}>
            <input type="email" autoComplete="email" {...register('email')} />
          </Field>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <button className="btn-primary" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t('Đang gửi…') : t('Gửi liên kết')}
          </button>
        </form>
      )}
      <p className="muted center">
        <Link to="/login">{t('Quay lại đăng nhập')}</Link>
      </p>
    </AuthCard>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const userId = params.get('uid')
  const token = params.get('token')
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, formState } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = handleSubmit(async (v) => {
    setFormError('')
    try {
      await authApi.resetPassword({ userId: userId!, token: token!, ...v })
      setDone(true)
    } catch (e) {
      // "token" errors have no matching input: surface them as a form message.
      setFormError(applyServerErrors(e))
    }
  })

  const invalidLink = !userId || !token

  return (
    <AuthCard title={t('Đặt lại mật khẩu')} subtitle={t('Chọn mật khẩu mới cho tài khoản của bạn.')}>
      {done ? (
        <p className="notice" role="status">
          {t('Mật khẩu đã được đặt lại. Mọi phiên đăng nhập cũ đã bị đăng xuất.')} <Link to="/login">{t('Đăng nhập ngay')}</Link>
        </p>
      ) : invalidLink ? (
        <p className="form-error" role="alert">
          {t('Liên kết không hợp lệ.')} <Link to="/forgot-password">{t('Yêu cầu liên kết mới')}</Link>
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <Field label={t('Mật khẩu mới')} error={formState.errors.newPassword?.message} hint={t(PASSWORD_HINT)}>
            <PasswordInput autoComplete="new-password" {...register('newPassword')} />
          </Field>
          <Field label={t('Xác nhận mật khẩu')} error={formState.errors.confirmPassword?.message}>
            <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
          </Field>
          {formError && (
            <p className="form-error" role="alert">
              {formError} <Link to="/forgot-password">{t('Yêu cầu liên kết mới')}</Link>
            </p>
          )}
          <button className="btn-primary" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t('Đang lưu…') : t('Đặt lại mật khẩu')}
          </button>
        </form>
      )}
      {!done && (
        <p className="muted center">
          <Link to="/login">{t('Quay lại đăng nhập')}</Link>
        </p>
      )}
    </AuthCard>
  )
}
