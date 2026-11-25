import { t } from '../../i18n'
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
    { value: 'transactions', label: t('Giao dịch') },
    jarMode ? { value: 'jars', label: t('6 hũ') } : { value: 'budget', label: t('Ngân sách') },
    { value: 'categories', label: t('Danh mục|tab') },
  ]
  const tab = tabs.some((x) => x.value === params.get('tab')) ? params.get('tab') : 'transactions'

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) next.set(k, v)
    setParams(next)
  }

  return (
    <>
      <header className="page-header row-between wrap">
        <h1>{t('Tài chính')}</h1>
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
          {t('Quản lý theo 6 hũ')}
        </label>
      </header>
      <nav className="tabs" role="tablist" aria-label={t('Tài chính')}>
        {tabs.map((x) => (
          <button key={x.value} role="tab" aria-selected={tab === x.value} className={tab === x.value ? 'active' : undefined}
            onClick={() => update({ tab: x.value })}>
            {x.label}
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
