import { Link, useNavigate } from 'react-router-dom'
import { locale, t } from '../../i18n'
import { COPYRIGHT, legalDoc } from './content'

/** Public page (no login): /privacy or /terms. */
export function LegalPage({ doc }: { doc: 'privacy' | 'terms' }) {
  const navigate = useNavigate()
  const d = legalDoc(doc, locale())
  return (
    <main className="legal-page">
      <article className="auth-card legal-card">
        <button type="button" className="btn-ghost" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))}>
          ← {t('Quay lại')}
        </button>
        <h1>{d.title}</h1>
        <p className="muted">{d.updated}</p>
        {d.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.body.map((b, i) =>
              typeof b === 'string' ? <p key={i}>{b}</p> : <ul key={i}>{b.map((li) => <li key={li}>{li}</li>)}</ul>,
            )}
          </section>
        ))}
        <LegalLinks />
      </article>
    </main>
  )
}

/** "© 2026 DO-IT · Terms · Privacy" footer, shown on auth pages, legal pages and the sidebar. */
export function LegalLinks() {
  return (
    <p className="legal-links muted">
      {COPYRIGHT} · <Link to="/terms">{t('Điều khoản sử dụng')}</Link> · <Link to="/privacy">{t('Chính sách quyền riêng tư')}</Link>
    </p>
  )
}
