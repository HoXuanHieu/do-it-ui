import { locale, t, tx } from '../../i18n'
import { useState } from 'react'
import { ConfirmDialog, Modal } from '../../components/Dialog'
import { ApiError } from '../../lib/api'
import type { BudgetLineDto, BudgetOverviewDto } from './api'
import { applyServerErrors } from '../../lib/forms'
import { formatAmountInput, formatMoney, parseAmount } from '../../lib/money'
import { AmountInput, MonthSwitcher, ProgressBar } from './components'
import { parseMonthKey, shiftMonth, useBudget, useCategories, useCopyBudget, useDeleteBudget, useSaveBudget } from './queries'

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
            <button className="btn-ghost" onClick={() => setEditing(true)}>{t('Sửa ngân sách')}</button>
            <button className="btn-ghost danger" onClick={() => setConfirmDelete(true)}>{t('Xóa')}</button>
          </div>
        )}
      </div>

      {isPending && <p className="muted">{t('Đang tải…')}</p>}
      {isError && <p className="form-error">{t('Không tải được ngân sách.')}</p>}

      {budget && !budget.exists && (
        <section className="card empty">
          <h2>{t('Chưa có ngân sách cho tháng {m}/{y}', monthVars(month))}</h2>
          <p className="muted">
            {t('Đã chi {amount} trong tháng. Đặt hạn mức để theo dõi và nhận cảnh báo khi chi tiêu đạt {thresholds}.', {
              amount: formatMoney(budget.totalSpent, budget.currencyCode),
              thresholds: percentList(budget.alertThresholds, 'conjunction'),
            })}
          </p>
          <div className="row center-row">
            <button className="btn-primary" onClick={() => setEditing(true)}>{t('Tạo ngân sách')}</button>
            <button
              className="btn-ghost"
              disabled={copy.isPending}
              onClick={() =>
                copy.mutate(month, {
                  onError: (e) =>
                    setCopyError(e instanceof ApiError && e.status === 404
                      ? t('Tháng {m}/{y} chưa có ngân sách để sao chép.', monthVars(shiftMonth(month, -1)))
                      : t('Không sao chép được ngân sách.')),
                })
              }
            >
              {t('Sao chép từ tháng trước')}
            </button>
          </div>
          {copyError && <p className="form-error">{copyError}</p>}
        </section>
      )}

      {budget?.exists && <BudgetOverview budget={budget} />}

      <Modal open={editing} title={t('Ngân sách tháng {m}/{y}', monthVars(month))} onClose={() => setEditing(false)}>
        {editing && budget && <BudgetForm month={month} budget={budget} onDone={() => setEditing(false)} />}
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title={t('Xóa ngân sách tháng này?')}
        message={t('Hạn mức và lịch sử cảnh báo của tháng sẽ bị xóa. Giao dịch không bị ảnh hưởng.')}
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
          <p className="muted">{t('Không đặt tổng hạn mức. Tổng đã chi:')} <strong>{formatMoney(budget.totalSpent, c)}</strong></p>
        </section>
      )}

      <section className="card">
        <h2>{t('Theo danh mục')}</h2>
        {budget.categories.length === 0 && <p className="muted">{t('Chưa đặt hạn mức theo danh mục.')}</p>}
        <ul className="budget-lines">
          {budget.categories.map((l) => (
            <li key={l.categoryId}>
              <BudgetLine line={l} currency={c} thresholds={budget.alertThresholds} />
            </li>
          ))}
        </ul>
        {budget.unbudgetedSpent > 0 && (
          <p className="muted small">{t('Chi tiêu ở danh mục không đặt hạn mức: {amount}', { amount: formatMoney(budget.unbudgetedSpent, c) })}</p>
        )}
        <p className="muted small">{t('Cảnh báo khi đạt {thresholds} hạn mức.', { thresholds: percentList(budget.alertThresholds, 'unit') })}</p>
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
          {/* server sends its own labels for the total / deleted-category lines */}
          <strong>{tx(line.name)}</strong>
          {line.isArchived && <small className="muted">({t('đã lưu trữ')})</small>}
        </span>
        <span className={over ? 'amount-expense' : undefined}>{line.percent.toLocaleString('en-US')}%</span>
      </div>
      <ProgressBar percent={line.percent} thresholds={thresholds} />
      <div className="row-between small">
        <span className="muted">{t('Đã chi {spent} / {limit}', { spent: formatMoney(line.spent, currency), limit: formatMoney(line.limit, currency) })}</span>
        <span className={over ? 'amount-expense' : 'muted'}>
          {over ? t('Vượt {amount}', { amount: formatMoney(-line.remaining, currency) }) : t('Còn lại {amount}', { amount: formatMoney(line.remaining, currency) })}
        </span>
      </div>
    </div>
  )
}

/** Vars for month keys: vi uses {m}/{y}, en uses the month name. */
function monthVars(key: string) {
  const d = parseMonthKey(key)!
  return { m: d.getMonth() + 1, y: d.getFullYear(), month: d.toLocaleDateString(locale(), { month: 'long' }) }
}

const percentList = (values: number[], type: 'conjunction' | 'unit') =>
  new Intl.ListFormat(locale(), { type }).format(values.map((v) => `${v}%`))

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
    if (total.trim() && (parsedTotal == null || parsedTotal <= 0)) return setError(t('Tổng hạn mức không hợp lệ.'))
    const lines: { categoryId: string; limit: number }[] = []
    for (const [categoryId, raw] of Object.entries(limits)) {
      if (!raw.trim()) continue
      const n = parseAmount(raw, currency)
      if (n == null || n <= 0) return setError(t('Hạn mức danh mục phải là số lớn hơn 0.'))
      lines.push({ categoryId, limit: n })
    }
    if (parsedTotal == null && lines.length === 0) return setError(t('Nhập tổng hạn mức hoặc ít nhất một hạn mức danh mục.'))
    if (thresholds.length === 0) return setError(t('Chọn ít nhất một ngưỡng cảnh báo.'))
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
        <span>{t('Tổng hạn mức tháng (để trống nếu chỉ đặt theo danh mục)')}</span>
        <AmountInput currency={currency} value={total} onChange={(e) => setTotal(e.target.value)} placeholder={t('VD: 10,000,000')} autoFocus />
      </label>

      <fieldset className="fieldset">
        <legend>{t('Hạn mức theo danh mục chi')}</legend>
        <div className="limit-grid">
          {expense.map((c) => (
            <label key={c.id} className="limit-row">
              <span className="row"><span className="dot" style={{ background: c.color }} aria-hidden />{tx(c.name)}</span>
              <AmountInput currency={currency} placeholder="—" value={limits[c.id] ?? ''}
                onChange={(e) => setLimits((l) => ({ ...l, [c.id]: e.target.value }))} />
            </label>
          ))}
        </div>
        {/* Supplement SUP-FI-04 */}
        {parsedTotal != null && categorySum > parsedTotal && (
          <p className="warn small">{t('Tổng hạn mức các danh mục ({amount}) lớn hơn tổng ngân sách.', { amount: formatMoney(categorySum, currency) })}</p>
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend>{t('Cảnh báo khi chi tiêu đạt')}</legend>
        <div className="row">
          {THRESHOLD_OPTIONS.map((n) => (
            <label key={n} className="check">
              <input type="checkbox" checked={thresholds.includes(n)}
                onChange={(e) => setThresholds((cur) => (e.target.checked ? [...cur, n].sort((a, b) => a - b) : cur.filter((x) => x !== n)))} />
              {n}%
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onDone}>{t('Hủy bỏ')}</button>
        <button className="btn-primary" disabled={save.isPending}>{save.isPending ? t('Đang lưu…') : t('Lưu ngân sách')}</button>
      </div>
    </form>
  )
}
