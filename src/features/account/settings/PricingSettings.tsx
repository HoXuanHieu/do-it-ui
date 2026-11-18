import { t } from '../../../i18n'

/** Settings › Pricing: placeholder until plans/billing are built. */
export function PricingSettings() {
  return (
    <section className="card">
      <h2>{t('Gói dịch vụ')}</h2>
      <p className="muted">{t('Tính năng này sẽ được phát triển trong các sprint tiếp theo.')}</p>
    </section>
  )
}
