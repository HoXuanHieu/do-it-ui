import { t } from '../../i18n'
import { formatMoney } from '../../lib/money'
import { JARS } from './api'
import { BudgetLine } from './BudgetTab'
import { MonthSwitcher } from './components'
import { useJars, useSyncJars } from './queries'

/** 6-jar method: the month's income split over the jars, expenses paid from the jar they are assigned to. */
export function JarsTab({ month, onMonthChange }: { month: string; onMonthChange: (m: string) => void }) {
  const { data, isPending, isError } = useJars(month)
  const sync = useSyncJars()
  const c = data?.currencyCode ?? 'VND'

  return (
    <div className="stack-lg">
      <div className="row-between wrap">
        <MonthSwitcher value={month} onChange={onMonthChange} />
        <button className="btn-primary" disabled={!data?.unassignedCount || sync.isPending} onClick={() => sync.mutate(month)}>
          {sync.isPending ? t('Đang đồng bộ…') : t('Đồng bộ chi tiêu tháng này')}
        </button>
      </div>

      {isPending && <p className="muted">{t('Đang tải…')}</p>}
      {isError && <p className="form-error">{t('Không tải được các hũ.')}</p>}
      {sync.isError && <p className="form-error" role="alert">{t('Không đồng bộ được, vui lòng thử lại.')}</p>}

      {data && data.unassignedCount > 0 && (
        <p className="notice" role="status">
          {t('Có {count} khoản chi ({amount}) chưa được xếp vào hũ nào. Bấm “Đồng bộ” để tự xếp theo danh mục; sau đó có thể đổi hũ của từng khoản ở tab Giao dịch.', { count: data.unassignedCount, amount: formatMoney(data.unassignedSpent, c) })}
        </p>
      )}

      {data && (
        <section className="card">
          <h2>{t('Thu nhập tháng: {amount}', { amount: formatMoney(data.income, c) })}</h2>
          {data.income === 0 && <p className="muted">{t('Chưa có khoản thu trong tháng nên các hũ chưa có tiền.')}</p>}
          <ul className="budget-lines">
            {data.jars.map((j) => (
              <li key={j.jar}>
                <BudgetLine
                  currency={c}
                  thresholds={[80, 100]}
                  line={{
                    categoryId: null,
                    name: `${t(JARS[j.jar].label)} · ${j.percent}%`,
                    color: JARS[j.jar].color,
                    limit: j.allocated,
                    spent: j.spent,
                    remaining: j.remaining,
                    // An empty jar that was spent from is over, not 0%.
                    percent: j.allocated > 0 ? Math.round((j.spent / j.allocated) * 1000) / 10 : j.spent > 0 ? 100 : 0,
                    isArchived: false,
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
