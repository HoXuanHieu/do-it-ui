import { locale, t } from '../../i18n'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { HealthProfileDto } from './api'
import { MedicationCard } from './MedicationReminder'
import { ProfileFormDialog } from './ProfileFormDialog'
import { BMI_LABEL, GOALS, labelOf, num, useHealthProfiles } from './queries'

export function Disclaimer() {
  return <p className="health-disclaimer">ⓘ {t('DO-IT không cung cấp chẩn đoán y tế. Các chỉ số chỉ mang tính ước tính tham khảo.')}</p>
}

/** /health: the user's health profiles (self, family members). */
export function HealthPage() {
  const { data: profiles, isPending, isError } = useHealthProfiles()
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="health-page">
      <header className="page-header row-between">
        <div>
          <h1>{t('Sức khỏe')}</h1>
          <p className="muted">{t('Mỗi hồ sơ có đánh giá, thực đơn, lịch tập và theo dõi chỉ số riêng.')}</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>{t('+ Hồ sơ mới')}</button>
      </header>

      {isPending && <p className="muted">{t('Đang tải…')}</p>}
      {isError && <p className="form-error">{t('Không tải được hồ sơ sức khỏe.')}</p>}

      {profiles?.length === 0 && (
        <section className="card health-empty">
          <div aria-hidden className="health-empty-icon">🩺</div>
          <h2>{t('Tạo hồ sơ sức khỏe đầu tiên')}</h2>
          <p className="muted">{t('Nhập chiều cao, cân nặng, mức vận động và mục tiêu để nhận đánh giá, gợi ý ăn uống và lịch tập phù hợp.')}</p>
          <button className="btn-primary" onClick={() => setCreating(true)}>{t('Tạo hồ sơ')}</button>
        </section>
      )}

      <div className="health-grid">
        {profiles?.map((p) => <ProfileCard key={p.id} p={p} />)}
      </div>

      <MedicationCard />

      <Disclaimer />
      <ProfileFormDialog open={creating} onClose={() => setCreating(false)} onSaved={(p) => navigate(`/health/${p.id}`)} />
    </div>
  )
}

function ProfileCard({ p }: { p: HealthProfileDto }) {
  const a = p.assessment
  const goal = GOALS.find((g) => g.value === p.goal)!
  return (
    <Link className="card health-card" to={`/health/${p.id}`}>
      <div className="row-between">
        <h3>{p.name}</h3>
        <span className={`bmi-pill bmi-${a.bmiCategory.toLowerCase()}`}>BMI {num(a.bmi)} · {t(BMI_LABEL[a.bmiCategory])}</span>
      </div>
      <p className="muted">
        {t('{age} tuổi', { age: a.age })} · {num(p.heightCm)} cm · {num(p.weightKg)} kg
      </p>
      <p>
        <span aria-hidden>{goal.icon}</span> {t(labelOf(GOALS, p.goal))} · <strong>{a.dailyCalories}</strong> {t('kcal/ngày')}
      </p>
      {p.nextCheckInAt && (
        <small className="muted">🔔 {t('Đo lại vào {date}', { date: new Date(p.nextCheckInAt).toLocaleDateString(locale()) })}</small>
      )}
    </Link>
  )
}
