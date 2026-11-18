import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Field } from '../../components/Form'
import { applyServerErrors } from '../../lib/forms'
import { profileApi, type Gender, type ProfileDto } from './api'
import { useAuth } from '../auth/AuthContext'
import { useAvatarUrl, useProfile, useSetProfile } from './queries'

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'Male', label: 'Nam' },
  { value: 'Female', label: 'Nữ' },
  { value: 'Other', label: 'Khác' },
  { value: 'PreferNotToSay', label: 'Không muốn tiết lộ' },
]

const todayIso = () => new Date().toISOString().slice(0, 10)

const schema = z.object({
  fullName: z.string().max(150, 'Tối đa 150 ký tự'),
  dateOfBirth: z
    .string()
    .refine((v) => v === '' || (v >= '1900-01-01' && v <= todayIso()), 'Ngày sinh phải từ năm 1900 đến hôm nay'),
  gender: z.enum(['', 'Male', 'Female', 'Other', 'PreferNotToSay']),
})
type Form = z.infer<typeof schema>

const MAX_AVATAR = 2 * 1024 * 1024

/** FR-AUTH-004 */
export function ProfilePage() {
  const { data: profile, isPending, isError } = useProfile()

  return (
    <>
      <header className="page-header">
        <h1>Hồ sơ cá nhân</h1>
        <p className="muted">Thông tin cơ bản của bạn. Múi giờ và tiền tệ nằm trong Cài đặt.</p>
      </header>
      {isPending && <p className="muted">Đang tải…</p>}
      {isError && <p className="form-error">Không tải được hồ sơ.</p>}
      {profile && (
        <div className="stack">
          <AvatarCard profile={profile} />
          {/* key: re-init the form when the server copy changes */}
          <ProfileForm key={profile.updatedAt} profile={profile} />
        </div>
      )}
    </>
  )
}

function AvatarCard({ profile }: { profile: ProfileDto }) {
  const setProfile = useSetProfile()
  const avatarUrl = useAvatarUrl(profile)
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const initials = (profile.fullName || profile.email).trim().charAt(0).toUpperCase()

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    if (file.size > MAX_AVATAR) return setError('Ảnh tối đa 2 MB.')
    setBusy(true)
    try {
      setProfile(await profileApi.uploadAvatar(file))
    } catch (err) {
      setError(applyServerErrors(err))
    } finally {
      setBusy(false)
    }
  }

  async function onRemove() {
    setBusy(true)
    try {
      await profileApi.deleteAvatar()
      setProfile({ ...profile, hasAvatar: false, updatedAt: new Date().toISOString() })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card avatar-card">
      <div className="avatar avatar-lg" aria-hidden={!avatarUrl}>
        {avatarUrl ? <img src={avatarUrl} alt="Ảnh đại diện" /> : <span>{initials}</span>}
      </div>
      <div className="stack-sm">
        <strong>{profile.fullName || 'Chưa đặt tên'}</strong>
        <span className="muted">{profile.email}</span>
        <div className="row">
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? 'Đang xử lý…' : profile.hasAvatar ? 'Đổi ảnh' : 'Tải ảnh lên'}
          </button>
          {profile.hasAvatar && (
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => void onRemove()}>
              Xóa ảnh
            </button>
          )}
        </div>
        <small className="muted">JPEG, PNG hoặc WebP, tối đa 2 MB.</small>
        {error && <small className="field-error" role="alert">{error}</small>}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void onPick(e)} />
      </div>
    </section>
  )
}

function ProfileForm({ profile }: { profile: ProfileDto }) {
  const setProfile = useSetProfile()
  const { reloadUser } = useAuth()
  const [status, setStatus] = useState('')
  const { register, handleSubmit, setError, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: profile.fullName ?? '',
      dateOfBirth: profile.dateOfBirth ?? '',
      gender: profile.gender ?? '',
    },
  })

  const onSubmit = handleSubmit(async (v) => {
    setStatus('')
    try {
      const updated = await profileApi.update({
        fullName: v.fullName.trim() || null,
        dateOfBirth: v.dateOfBirth || null,
        gender: v.gender || null,
      })
      await reloadUser()
      setProfile(updated)
    } catch (e) {
      setStatus(applyServerErrors(e, setError))
    }
  })

  return (
    <section className="card">
      <h2>Thông tin cá nhân</h2>
      <form onSubmit={onSubmit} noValidate className="form-grid">
        <Field label="Họ tên" error={formState.errors.fullName?.message}>
          <input autoComplete="name" {...register('fullName')} />
        </Field>
        <Field label="Ngày sinh" error={formState.errors.dateOfBirth?.message}>
          <input type="date" min="1900-01-01" max={todayIso()} {...register('dateOfBirth')} />
        </Field>
        <Field label="Giới tính" error={formState.errors.gender?.message}>
          <select {...register('gender')}>
            <option value="">— Chưa chọn —</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        {status && <p className="form-error" role="alert">{status}</p>}
        <div className="form-actions">
          <button className="btn-primary" disabled={formState.isSubmitting || !formState.isDirty}>
            {formState.isSubmitting ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </section>
  )
}
