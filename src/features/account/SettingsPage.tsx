import { useSearchParams } from 'react-router-dom'
import { AccountSettings } from './settings/AccountSettings'
import { AppearanceSettings } from './settings/AppearanceSettings'
import { PricingSettings } from './settings/PricingSettings'

const TABS = [
  { value: 'account', label: 'Tài khoản', Component: AccountSettings },
  { value: 'appearance', label: 'Giao diện', Component: AppearanceSettings },
  { value: 'pricing', label: 'Gói dịch vụ', Component: PricingSettings },
]

/** Settings page. URL: /settings?tab=account|appearance|pricing */
export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const current = TABS.find((t) => t.value === params.get('tab')) ?? TABS[0]

  return (
    <>
      <header className="page-header">
        <h1>Cài đặt</h1>
      </header>
      <nav className="tabs" role="tablist" aria-label="Cài đặt">
        {TABS.map((t) => (
          <button key={t.value} role="tab" aria-selected={t === current} className={t === current ? 'active' : undefined}
            onClick={() => setParams({ tab: t.value })}>
            {t.label}
          </button>
        ))}
      </nav>
      <current.Component />
    </>
  )
}
