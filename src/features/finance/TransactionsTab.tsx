import { useEffect, useState } from 'react'
import { formatDate, parseDateKey, weekdayName } from '../../lib/dates'
import type { TransactionDto, TransactionType } from '../../lib/financeApi'
import { formatMoney, parseAmount } from '../../lib/money'
import { usePreferences } from '../account/queries'
import { MonthSwitcher } from './components'
import { monthRange, useCategories, useSummary, useTransactions } from './queries'
import { TransactionDialog, type TransactionDialogMode } from './TransactionDialog'

const PAGE_SIZE = 30

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** FR-FI-001..006, 008: monthly transaction history with summary, filters and search. */
export function TransactionsTab({ month, onMonthChange }: { month: string; onMonthChange: (m: string) => void }) {
  const prefs = usePreferences().data
  const currency = prefs?.currency ?? 'VND'
  const dateFormat = prefs?.dateFormat
  const { from, to } = monthRange(month)

  const [type, setType] = useState<TransactionType | ''>('')
  const [categoryId, setCategoryId] = useState('')
  const [search, setSearch] = useState('')
  const [minRaw, setMinRaw] = useState('')
  const [maxRaw, setMaxRaw] = useState('')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<TransactionDialogMode | null>(null)

  const q = useDebounced(search, 300)
  const min = parseAmount(useDebounced(minRaw, 400), currency) ?? undefined
  const max = parseAmount(useDebounced(maxRaw, 400), currency) ?? undefined

  // Reset paging whenever the filter set changes.
  const filterKey = `${month}|${type}|${categoryId}|${q}|${min}|${max}`
  const [lastKey, setLastKey] = useState(filterKey)
  if (filterKey !== lastKey) {
    setLastKey(filterKey)
    setPage(1)
  }

  const { data: categories = [] } = useCategories(true)
  const summary = useSummary(from, to)
  const list = useTransactions({
    from, to, type: type || undefined, categoryId: categoryId || undefined, q: q || undefined,
    minAmount: min, maxAmount: max, page, pageSize: PAGE_SIZE,
  })

  const items = list.data?.items ?? []
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.totalCount / PAGE_SIZE)) : 1
  const groups = groupByDate(items)
  const filtered = !!(type || categoryId || q || min || max)
  const s = summary.data

  return (
    <div className="stack-lg">
      <div className="row-between wrap">
        <MonthSwitcher value={month} onChange={onMonthChange} />
        <div className="row">
          <button className="btn-ghost income-btn" onClick={() => setDialog({ kind: 'create', type: 'Income' })}>
            + Khoản thu
          </button>
          <button className="btn-primary" onClick={() => setDialog({ kind: 'create', type: 'Expense' })}>
            + Khoản chi
          </button>
        </div>
      </div>

      {/* Summary (BR-FI-004: income and expense separate) */}
      <div className="stat-grid">
        <Stat label="Tổng thu" value={s ? formatMoney(s.income, s.currencyCode) : '…'} tone="income" />
        <Stat label="Tổng chi" value={s ? formatMoney(s.expense, s.currencyCode) : '…'} tone="expense" />
        <Stat label="Chênh lệch" value={s ? formatMoney(s.net, s.currencyCode, { signed: true }) : '…'} tone={s && s.net < 0 ? 'expense' : 'income'} />
        <Stat label="Tỷ lệ tiết kiệm" value={s ? (s.savingsRate == null ? '—' : `${s.savingsRate.toLocaleString('vi-VN')}%`) : '…'} />
      </div>

      {/* FR-FI-006 / FR-FI-008 */}
      <div className="row filters">
        <input type="search" className="input grow" placeholder="Tìm mô tả, ghi chú, danh mục…" value={search}
          onChange={(e) => setSearch(e.target.value)} aria-label="Tìm giao dịch" />
        <select className="input" value={type} onChange={(e) => { setType(e.target.value as TransactionType | ''); setCategoryId('') }} aria-label="Loại">
          <option value="">Thu &amp; chi</option>
          <option value="Income">Chỉ khoản thu</option>
          <option value="Expense">Chỉ khoản chi</option>
        </select>
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Danh mục">
          <option value="">Tất cả danh mục</option>
          {categories.filter((c) => !type || c.type === type).map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.isArchived ? ' (đã lưu trữ)' : ''}</option>
          ))}
        </select>
        <input className="input amount-filter" inputMode="decimal" placeholder="Từ số tiền" value={minRaw}
          onChange={(e) => setMinRaw(e.target.value)} aria-label="Số tiền tối thiểu" />
        <input className="input amount-filter" inputMode="decimal" placeholder="Đến số tiền" value={maxRaw}
          onChange={(e) => setMaxRaw(e.target.value)} aria-label="Số tiền tối đa" />
        {filtered && (
          <button className="btn-link" onClick={() => { setType(''); setCategoryId(''); setSearch(''); setMinRaw(''); setMaxRaw('') }}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      <section className="card list-card">
        {list.isPending && <p className="muted pad">Đang tải…</p>}
        {list.isError && <p className="form-error pad">Không tải được giao dịch.</p>}
        {list.data && items.length === 0 && (
          <div className="empty pad">
            <p className="muted">{filtered ? 'Không có giao dịch phù hợp bộ lọc.' : 'Chưa có giao dịch nào trong tháng này.'}</p>
            {!filtered && (
              <button className="btn-primary" onClick={() => setDialog({ kind: 'create', type: 'Expense' })}>
                Ghi khoản chi đầu tiên
              </button>
            )}
          </div>
        )}
        {groups.map(([date, txs]) => {
          const d = parseDateKey(date)!
          const dayNet = txs.reduce((sum, t) => sum + (t.type === 'Income' ? t.amount : -t.amount), 0)
          return (
            <div key={date} className="tx-group">
              <div className="tx-date">
                <span>{weekdayName(d, 'long')}, {formatDate(d, dateFormat)}</span>
                <span className={dayNet >= 0 ? 'amount-income' : 'amount-expense'}>
                  {formatMoney(dayNet, txs[0].currencyCode, { signed: true })}
                </span>
              </div>
              <ul className="tx-list">
                {txs.map((t) => (
                  <li key={t.id}>
                    <button className="tx-row" onClick={() => setDialog({ kind: 'edit', tx: t })}>
                      <span className="cat-badge" style={{ background: t.categoryColor }} aria-hidden>
                        {t.categoryName.charAt(0)}
                      </span>
                      <span className="tx-main">
                        <strong>{t.description || t.categoryName}</strong>
                        <small className="muted">{t.description ? t.categoryName : ''}{t.note ? `${t.description ? ' · ' : ''}${t.note}` : ''}</small>
                      </span>
                      <span className={`tx-amount ${t.type === 'Income' ? 'amount-income' : 'amount-expense'}`}>
                        {formatMoney(t.type === 'Income' ? t.amount : -t.amount, t.currencyCode, { signed: true })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>

      {totalPages > 1 && (
        <nav className="pager" aria-label="Phân trang">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Trước</button>
          <span className="muted">Trang {page}/{totalPages} · {list.data?.totalCount} giao dịch</span>
          <button className="btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau →</button>
        </nav>
      )}

      <TransactionDialog mode={dialog} currency={currency} onClose={() => setDialog(null)} />
    </div>
  )
}

export function Stat({ label, value, tone, hint }: { label: string; value: string; tone?: 'income' | 'expense'; hint?: string }) {
  return (
    <div className="card stat">
      <span className="muted">{label}</span>
      <strong className={tone ? `amount-${tone}` : undefined}>{value}</strong>
      {hint && <small className="muted">{hint}</small>}
    </div>
  )
}

function groupByDate(items: TransactionDto[]) {
  const map = new Map<string, TransactionDto[]>()
  for (const t of items) map.set(t.date, [...(map.get(t.date) ?? []), t])
  return [...map.entries()]
}
