import { useState } from 'react'
import { ConfirmDialog, Modal } from '../../components/Dialog'
import { ApiError } from '../../lib/api'
import type { BudgetLineDto, BudgetOverviewDto } from './api'
import { applyServerErrors } from '../../lib/forms'
import { formatAmountInput, formatMoney, parseAmount } from '../../lib/money'
import { AmountInput, MonthSwitcher, ProgressBar } from './components'
import { monthLabel, shiftMonth, useBudget, useCategories, useCopyBudget, useDeleteBudget, useSaveBudget } from './queries'

/** FR-FI-009..012: monthly budget, category limits, usage and remaining. */
export function BudgetTab({ month, onMonthChange }: { month: string; onMonthChange: (m: string) => void }) {
  const { data: budget, isPending, isError } = useBudget(month)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copyError, setCopyError] = useState('')
  const copy = useCopyBudget()
  const remove = useDeleteBudget()

  return (
    <div className="stack-lg">
      <div className="row-between wrap">
        <MonthSwitcher value={month} onChange={onMonthChange} />
        {budget?.exists && (
          <div className="row">
            <button className="btn-ghost" onClick={() => setEditing(true)}>Sửa ngân sách</button>
            <button className="btn-ghost danger" onClick={() => setConfirmDelete(true)}>Xóa</button>
          </div>
        )}
      </div>

      {isPending && <p className="muted">Đang tải…</p>}
      {isError && <p className="form-error">Không tải được ngân sách.</p>}

      {budget && !budget.exists && (
        <section className="card empty">
          <h2>Chưa có ngân sách cho {monthLabel(month).toLowerCase()}</h2>
          <p className="muted">
            Đã chi {formatMoney(budget.totalSpent, budget.currencyCode)} trong tháng. Đặt hạn mức để theo dõi và nhận cảnh báo khi
            chi tiêu đạt {budget.alertThresholds.join('% và ')}%.
          </p>
          <div className="row center-row">
            <button className="btn-primary" onClick={() => setEditing(true)}>Tạo ngân sách</button>
            <button
              className="btn-ghost"
              disabled={copy.isPending}
              onClick={() =>
                copy.mutate(month, {
                  onError: (e) =>
                    setCopyError(e instanceof ApiError && e.status === 404
                      ? `${monthLabel(shiftMonth(month, -1))} chưa có ngân sách để sao chép.`
                      : 'Không sao chép được ngân sách.'),
                })
              }
            >
              Sao chép từ tháng trước
            </button>
          </div>
          {copyError && <p className="form-error">{copyError}</p>}
        </section>
      )}

      {budget?.exists && <BudgetOverview budget={budget} />}

      <Modal open={editing} title={`Ngân sách ${monthLabel(month).toLowerCase()}`} onClose={() => setEditing(false)}>
        {editing && budget && <BudgetForm month={month} budget={budget} onDone={() => setEditing(false)} />}
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Xóa ngân sách tháng này?"
        message="Hạn mức và lịch sử cảnh báo của tháng sẽ bị xóa. Giao dịch không bị ảnh hưởng."
        busy={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate(month, { onSuccess: () => setConfirmDelete(false) })}
      />
    </div>
  )
}

function BudgetOverview({ budget }: { budget: BudgetOverviewDto }) {
  const c = budget.currencyCode
  return (
    <>
      {budget.total ? (
        <section className="card budget-total">
          <BudgetLine line={budget.total} currency={c} thresholds={budget.alertThresholds} big />
        </section>
      ) : (
        <section className="card">
          <p className="muted">Không đặt tổng hạn mức. Tổng đã chi: <strong>{formatMoney(budget.totalSpent, c)}</strong></p>
        </section>
      )}

      <section className="card">
        <h2>Theo danh mục</h2>
        {budget.categories.length === 0 && <p className="muted">Chưa đặt hạn mức theo danh mục.</p>}
        <ul className="budget-lines">
          {budget.categories.map((l) => (
            <li key={l.categoryId}>
              <BudgetLine line={l} currency={c} thresholds={budget.alertThresholds} />
            </li>
          ))}
        </ul>
        {budget.unbudgetedSpent > 0 && (
          <p className="muted small">Chi tiêu ở danh mục không đặt hạn mức: {formatMoney(budget.unbudgetedSpent, c)}</p>
        )}
        <p className="muted small">Cảnh báo khi đạt {budget.alertThresholds.map((t) => `${t}%`).join(', ')} hạn mức.</p>
      </section>
    </>
  )
}

export function BudgetLine({ line, currency, thresholds, big }: { line: BudgetLineDto; currency: string; thresholds: number[]; big?: boolean }) {
  const over = line.remaining < 0
  return (
    <div className={big ? 'budget-line big' : 'budget-line'}>
      <div className="row-between">
        <span className="row">
          {!big && <span className="dot" style={{ background: line.color }} aria-hidden />}
          <strong>{line.name}</strong>
          {line.isArchived && <small className="muted">(đã lưu trữ)</small>}
        </span>
        <span className={over ? 'amount-expense' : undefined}>{line.percent.toLocaleString('vi-VN')}%</span>
      </div>
      <ProgressBar percent={line.percent} thresholds={thresholds} />
      <div className="row-between small">
        <span className="muted">Đã chi {formatMoney(line.spent, currency)} / {formatMoney(line.limit, currency)}</span>
        <span className={over ? 'amount-expense' : 'muted'}>
          {over ? `Vượt ${formatMoney(-line.remaining, currency)}` : `Còn lại ${formatMoney(line.remaining, currency)}`}
        </span>
      </div>
    </div>
  )
}

const THRESHOLD_OPTIONS = [50, 70, 80, 90, 100]

function BudgetForm({ month, budget, onDone }: { month: string; budget: BudgetOverviewDto; onDone: () => void }) {
  const currency = budget.currencyCode
  const save = useSaveBudget()
  const { data: categories = [] } = useCategories(false)
  const expense = categories.filter((c) => c.type === 'Expense')

  const [total, setTotal] = useState(formatAmountInput(budget.total?.limit, currency))
  const [limits, setLimits] = useState<Record<string, string>>(() =>
    Object.fromEntries(budget.categories.filter((l) => l.categoryId).map((l) => [l.categoryId!, formatAmountInput(l.limit, currency)])),
  )
  const [thresholds, setThresholds] = useState<number[]>(budget.alertThresholds)
  const [error, setError] = useState('')

  const parsedTotal = total.trim() ? parseAmount(total, currency) : null
  const categorySum = Object.values(limits).reduce((s, v) => s + (parseAmount(v, currency) ?? 0), 0)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (total.trim() && (parsedTotal == null || parsedTotal <= 0)) return setError('Tổng hạn mức không hợp lệ.')
    const lines: { categoryId: string; limit: number }[] = []
    for (const [categoryId, raw] of Object.entries(limits)) {
      if (!raw.trim()) continue
      const n = parseAmount(raw, currency)
      if (n == null || n <= 0) return setError('Hạn mức danh mục phải là số lớn hơn 0.')
      lines.push({ categoryId, limit: n })
    }
    if (parsedTotal == null && lines.length === 0) return setError('Nhập tổng hạn mức hoặc ít nhất một hạn mức danh mục.')
    if (thresholds.length === 0) return setError('Chọn ít nhất một ngưỡng cảnh báo.')
    try {
      await save.mutateAsync({ month, body: { totalLimit: parsedTotal, categories: lines, alertThresholds: thresholds } })
      onDone()
    } catch (err) {
      setError(applyServerErrors(err))
    }
  }

  return (
    <form onSubmit={submit} noValidate className="budget-form">
      <label className="field">
        <span>Tổng hạn mức tháng (để trống nếu chỉ đặt theo danh mục)</span>
        <AmountInput currency={currency} value={total} onChange={(e) => setTotal(e.target.value)} placeholder="VD: 10.000.000" autoFocus />
      </label>

      <fieldset className="fieldset">
        <legend>Hạn mức theo danh mục chi</legend>
        <div className="limit-grid">
          {expense.map((c) => (
            <label key={c.id} className="limit-row">
              <span className="row"><span className="dot" style={{ background: c.color }} aria-hidden />{c.name}</span>
              <AmountInput currency={currency} placeholder="—" value={limits[c.id] ?? ''}
                onChange={(e) => setLimits((l) => ({ ...l, [c.id]: e.target.value }))} />
            </label>
          ))}
        </div>
        {/* Supplement SUP-FI-04 */}
        {parsedTotal != null && categorySum > parsedTotal && (
          <p className="warn small">Tổng hạn mức các danh mục ({formatMoney(categorySum, currency)}) lớn hơn tổng ngân sách.</p>
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend>Cảnh báo khi chi tiêu đạt</legend>
        <div className="row">
          {THRESHOLD_OPTIONS.map((t) => (
            <label key={t} className="check">
              <input type="checkbox" checked={thresholds.includes(t)}
                onChange={(e) => setThresholds((cur) => (e.target.checked ? [...cur, t].sort((a, b) => a - b) : cur.filter((x) => x !== t)))} />
              {t}%
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onDone}>Hủy bỏ</button>
        <button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu ngân sách'}</button>
      </div>
    </form>
  )
}
