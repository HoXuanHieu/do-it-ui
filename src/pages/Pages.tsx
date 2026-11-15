export function ComingSoonPage({ title }: { title: string }) {
  return (
    <>
      <header className="page-header">
        <h1>{title}</h1>
      </header>
      <section className="card">
        <p className="muted">Module này sẽ được phát triển trong các sprint tiếp theo.</p>
      </section>
    </>
  )
}

export function NotFoundPage() {
  return <ComingSoonPage title="Không tìm thấy trang" />
}
