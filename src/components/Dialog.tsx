import { useEffect, useRef, type ReactNode } from 'react'

/** Accessible modal on top of the native <dialog> (focus trap, Esc to close, backdrop). */
export function Modal({
  open,
  title,
  onClose,
  children,
  size = 'md',
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md'
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        // click on the backdrop (the dialog element itself, outside the panel)
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="modal-panel">
          <header className="modal-header">
            <h2>{title}</h2>
            <button type="button" className="icon-btn" aria-label="Đóng" onClick={onClose}>
              ×
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}

/** SRS §6.1: confirmation for destructive operations. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Xóa',
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel} size="sm">
      <p>{message}</p>
      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
          Hủy bỏ
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Đang xử lý…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
