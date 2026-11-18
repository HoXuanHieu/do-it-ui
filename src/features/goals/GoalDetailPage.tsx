import { t } from '../../i18n'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../../components/Dialog'
import { formatDate, parseDateKey } from '../../lib/dates'
import { usePreferences } from '../account/queries'
import type { GoalDto, GoalStepDto } from './api'
import { GoalFormDialog } from './GoalFormDialog'
import { nextStep, PERIODS, progressOf, useDeleteGoal, useGoals, useSetGoalStatus, useUpdateStep } from './queries'
import { DueBadge, ProgressRing } from './widgets'

/** /goals/:id: one goal with its details, plan and steps. */
export function GoalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: goals, isPending, isError } = useGoals()
  const toggle = useUpdateStep()
  const setStatus = useSetGoalStatus()
  const remove = useDeleteGoal()
  const [confirm, setConfirm] = useState(false)
  const [editing, setEditing] = useState(false)
  const dateFormat = usePreferences().data?.dateFormat
  const fmt = (key: string) => formatDate(parseDateKey(key)!, dateFormat)

  const back = (
    <Link to="/goals" className="goal-back">
      {t('← Tất cả mục tiêu')}
    </Link>
  )
  if (isPending) return <p className="muted">{t('Đang tải…')}</p>
  if (isError) return <p className="form-error">{t('Không tải được mục tiêu.')}</p>
  const goal = goals.find((g) => g.id === id)
  if (!goal)
    return (
      <div className="goals-page">
        {back}
        <p className="muted">{t('Không tìm thấy mục tiêu này.')}</p>
      </div>
    )

  const period = PERIODS.find((p) => p.value === goal.period)!
  const done = goal.steps.filter((s) => s.isDone).length
  const allDone = goal.steps.length > 0 && done === goal.steps.length
  const next = nextStep(goal)
  const busy = setStatus.isPending

  return (
    <div className={`goals-page goal-detail-page period-${goal.period.toLowerCase()}`}>
      {back}

      <section className="goal-hero">
        <ProgressRing percent={progressOf(goal)} size={120} />
        <div className="goal-hero-body">
          <span className="goal-hero-label">
            <span aria-hidden>{period.icon}</span> {t(period.label)} · {fmt(goal.startDate)} → {fmt(goal.dueDate)}
          </span>
          <h1 className="goal-hero-title">{goal.title}</h1>
          <div className="row">
            <DueBadge goal={goal} />
            {goal.reminderTime && goal.status === 'Active' && (
              <small>🔔 {t('Nhắc lúc {time} mỗi ngày', { time: goal.reminderTime.slice(0, 5) })}</small>
            )}
          </div>
        </div>
        <div className="goal-hero-actions">
          {goal.status === 'Active' ? (
            <>
              {!allDone && (
                <button className="btn-hero" disabled={busy} onClick={() => setStatus.mutate({ id: goal.id, status: 'Completed' })}>
                  {t('Hoàn thành')}
                </button>
              )}
              <button className="btn-hero-ghost" onClick={() => setEditing(true)}>
                {t('Sửa')}
              </button>
              <button className="btn-hero-ghost" disabled={busy} onClick={() => setStatus.mutate({ id: goal.id, status: 'Abandoned' })}>
                {t('Tạm dừng')}
              </button>
            </>
          ) : (
            <button className="btn-hero" disabled={busy} onClick={() => setStatus.mutate({ id: goal.id, status: 'Active' })}>
              {t('Tiếp tục thực hiện')}
            </button>
          )}
          <button className="btn-hero-ghost" onClick={() => setConfirm(true)}>
            {t('Xóa')}
          </button>
        </div>
      </section>

      {allDone && goal.status === 'Active' && (
        <div className="goal-celebrate" role="status">
          <span aria-hidden>🎉</span> {t('Tuyệt vời! Bạn đã hoàn thành mọi chặng.')}
          <button className="btn-primary" disabled={busy} onClick={() => setStatus.mutate({ id: goal.id, status: 'Completed' })}>
            {t('Đánh dấu hoàn thành')}
          </button>
        </div>
      )}
      {(toggle.isError || setStatus.isError) && <p className="form-error">{t('Không lưu được, vui lòng thử lại.')}</p>}

      <div className="goal-detail-grid">
        <div className="stack-lg">
          <section className="card">
            <h2>🎯 {t('Cần đạt được')}</h2>
            <p className="prewrap">{goal.description ?? <span className="muted">{t('Chưa có mô tả.')}</span>}</p>
          </section>
          <section className="card">
            <h2>🧭 {t('Cách thực hiện')}</h2>
            <p className="prewrap">{goal.plan ?? <span className="muted">{t('Chưa có kế hoạch.')}</span>}</p>
          </section>
        </div>

        <section className="card goal-steps-card">
          <div className="row-between">
            <h2>✅ {t('Các chặng')}</h2>
            {goal.steps.length > 0 && <small className="muted">{t('{done}/{total} chặng', { done, total: goal.steps.length })}</small>}
          </div>
          {goal.steps.length === 0 && <p className="muted">{t('Chưa có chặng nào. Bấm “Sửa” để chia nhỏ mục tiêu.')}</p>}
          <ol className="step-timeline">
            {goal.steps.map((s) => (
              <StepItem key={s.id} goal={goal} step={s} isNext={s === next} due={s.dueDate && fmt(s.dueDate)} />
            ))}
          </ol>
        </section>
      </div>

      <GoalFormDialog mode={editing ? { kind: 'edit', goal } : null} onClose={() => setEditing(false)} />
      <ConfirmDialog
        open={confirm}
        title={t('Xóa mục tiêu?')}
        message={t('Mục tiêu “{title}” và các chặng của nó sẽ bị xóa.', { title: goal.title })}
        busy={remove.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => remove.mutate(goal.id, { onSuccess: () => navigate('/goals', { replace: true }) })}
      />
    </div>
  )
}

/** One step: tick it, and write down what was actually achieved. */
function StepItem({ goal, step, isNext, due }: { goal: GoalDto; step: GoalStepDto; isNext: boolean; due: string | null }) {
  const update = useUpdateStep()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const active = goal.status === 'Active'

  const save = () =>
    update.mutate({ id: goal.id, stepId: step.id, result: draft.trim() }, { onSuccess: () => setEditing(false) })

  return (
    <li className={step.isDone ? 'done' : isNext ? 'next' : undefined}>
      <div className="step-row">
        <label className="check">
          <input
            type="checkbox"
            checked={step.isDone}
            disabled={update.isPending || !active}
            onChange={(e) => update.mutate({ id: goal.id, stepId: step.id, isDone: e.target.checked })}
          />
          <span className="step-title">{step.title}</span>
        </label>
        {due && <small className="muted">{due}</small>}
      </div>

      {editing ? (
        <div className="step-result-edit">
          <textarea
            autoFocus
            rows={2}
            maxLength={2000}
            value={draft}
            aria-label={t('Kết quả của chặng “{title}”', { title: step.title })}
            placeholder={t('VD: Chạy được 7km trong 48 phút, chân hơi mỏi.')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
          <div className="row-tight">
            <button type="button" className="btn-primary btn-sm" disabled={update.isPending} onClick={save}>
              {update.isPending ? t('Đang lưu…') : t('Lưu')}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(false)}>
              {t('Hủy bỏ')}
            </button>
          </div>
          {update.isError && <small className="form-error">{t('Không lưu được, vui lòng thử lại.')}</small>}
        </div>
      ) : step.result ? (
        <button type="button" className="step-result" disabled={!active} onClick={() => { setDraft(step.result ?? ''); setEditing(true) }}>
          <span className="step-result-label">{t('Kết quả:')}</span> {step.result}
        </button>
      ) : (
        active && (
          <button type="button" className="btn-link step-result-add" onClick={() => { setDraft(''); setEditing(true) }}>
            {t('+ Ghi kết quả')}
          </button>
        )
      )}
    </li>
  )
}
