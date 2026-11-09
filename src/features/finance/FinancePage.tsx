import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BudgetTab } from './BudgetTab'
import { CategoriesTab } from './CategoriesTab'
import { monthKeyOf, parseMonthKey } from './queries'
import { TransactionsTab } from './TransactionsTab'

const TABS = [
  { value: 'transactions', label: 'Giao dịch' },
  { value: 'budget', label: 'Ngân sách' },
  { value: 'categories', label: 'Danh mục' },
] as const

type Tab = (typeof TABS)[number]['value']

/** Financial Management module (SRS §4.5). URL: /finance?tab=transactions|budget|categories&month=yyyy-MM */
export function FinancePage() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'transactions') as Tab
  const [currentMonth] = useState(() => monthKeyOf(new Date()))
  const month = parseMonthKey(params.get('month')) ? params.get('month')! : currentMonth

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) next.set(k, v)
    setParams(next)
  }

  return (
    <>
      <header className="page-header">
        <h1>Tài chính</h1>
      </header>
      <nav className="tabs" role="tablist" aria-label="Tài chính">
        {TABS.map((t) => (
          <button key={t.value} role="tab" aria-selected={tab === t.value} className={tab === t.value ? 'active' : undefined}
            onClick={() => update({ tab: t.value })}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'transactions' && <TransactionsTab month={month} onMonthChange={(m) => update({ month: m })} />}
      {tab === 'budget' && <BudgetTab month={month} onMonthChange={(m) => update({ month: m })} />}
      {tab === 'categories' && <CategoriesTab />}
    </>
  )
}
