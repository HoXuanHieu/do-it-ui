import { t, type Key } from '../../i18n'
import { useSearchParams } from 'react-router-dom'
import { AccountSettings } from './settings/AccountSettings'
import { AppearanceSettings } from './settings/AppearanceSettings'
import { PricingSettings } from './settings/PricingSettings'

const TABS = [
  { value: 'account', label: 'Tài khoản' as Key, Component: AccountSettings },
  { value: 'appearance', label: 'Giao diện' as Key, Component: AppearanceSettings },
  { value: 'pricing', label: 'Gói dịch vụ' as Key, Component: PricingSettings },
]

/** Settings page. URL: /settings?tab=account|appearance|pricing */
export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const current = TABS.find((t) => t.value === params.get('tab')) ?? TABS[0]

  return (
    <>
      <header className="page-header">
        <h1>{t('Cài đặt')}</h1>
      </header>
      <nav className="tabs" role="tablist" aria-label={t('Cài đặt')}>
        {TABS.map((tab) => (
          <button key={tab.value} role="tab" aria-selected={tab === current} className={tab === current ? 'active' : undefined}
            onClick={() => setParams({ tab: tab.value })}>
            {t(tab.label)}
          </button>
        ))}
      </nav>
      <current.Component />
    </>
  )
}
