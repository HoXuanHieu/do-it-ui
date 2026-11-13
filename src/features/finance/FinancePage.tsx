import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BudgetTab } from './BudgetTab'
import { CategoriesTab } from './CategoriesTab'
import { JarsTab } from './JarsTab'
import { monthKeyOf, parseMonthKey, useJars, useSetJarMode } from './queries'
import { TransactionsTab } from './TransactionsTab'

/** Financial Management module (SRS §4.5). URL: /finance?tab=transactions|budget|jars|categories&month=yyyy-MM */
export function FinancePage() {
  const [params, setParams] = useSearchParams()
  const [currentMonth] = useState(() => monthKeyOf(new Date()))
  const month = parseMonthKey(params.get('month')) ? params.get('month')! : currentMonth

  // Per-user switch: 6-jar management replaces the budget tab.
  const jarMode = useJars(month).data?.enabled ?? false
  const setJarMode = useSetJarMode()
  const tabs = [
    { value: 'transactions', label: 'Giao dịch' },
    jarMode ? { value: 'jars', label: '6 hũ' } : { value: 'budget', label: 'Ngân sách' },
    { value: 'categories', label: 'Danh mục' },
  ]
  const tab = tabs.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'transactions'

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) next.set(k, v)
    setParams(next)
  }

  return (
    <>
      <header className="page-header row-between wrap">
        <h1>Tài chính</h1>
        <label className="check">
          <input
            type="checkbox"
            role="switch"
            checked={jarMode}
            disabled={setJarMode.isPending}
            onChange={(e) => {
              const on = e.target.checked
              setJarMode.mutate(on, { onSuccess: () => update({ tab: on ? 'jars' : 'budget' }) })
            }}
          />
          Quản lý theo 6 hũ
        </label>
      </header>
      <nav className="tabs" role="tablist" aria-label="Tài chính">
        {tabs.map((t) => (
          <button key={t.value} role="tab" aria-selected={tab === t.value} className={tab === t.value ? 'active' : undefined}
            onClick={() => update({ tab: t.value })}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'transactions' && <TransactionsTab month={month} jarMode={jarMode} onMonthChange={(m) => update({ month: m })} />}
      {tab === 'budget' && <BudgetTab month={month} onMonthChange={(m) => update({ month: m })} />}
      {tab === 'jars' && <JarsTab month={month} onMonthChange={(m) => update({ month: m })} />}
      {tab === 'categories' && <CategoriesTab />}
    </>
  )
}
