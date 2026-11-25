import { t, type Key } from '../i18n'

export function ComingSoonPage({ title }: { title: Key }) {
  return (
    <>
      <header className="page-header">
        <h1>{t(title)}</h1>
      </header>
      <section className="card">
        <p className="muted">{t('Module này sẽ được phát triển trong các sprint tiếp theo.')}</p>
      </section>
    </>
  )
}

export function NotFoundPage() {
  return <ComingSoonPage title="Không tìm thấy trang" />
}
