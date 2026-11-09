import { useState } from 'react'
import { ConfirmDialog, Modal } from '../../components/Dialog'
import { Field } from '../../components/Form'
import type { CategoryDto, TransactionType } from '../../lib/financeApi'
import { applyServerErrors } from '../../lib/forms'
import { ColorSwatchPicker } from './components'
import { useCategories, useDeleteCategory, useRestoreCategory, useSaveCategory } from './queries'

type Editing = { kind: 'create'; type: TransactionType } | { kind: 'edit'; category: CategoryDto }

/** FR-FI-007 + Supplement SUP-FI-06 (archive instead of delete when used). */
export function CategoriesTab() {
  const [showArchived, setShowArchived] = useState(false)
  const { data = [], isPending, isError } = useCategories(true)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [deleting, setDeleting] = useState<CategoryDto | null>(null)
  const [notice, setNotice] = useState('')
  const remove = useDeleteCategory()
  const restore = useRestoreCategory()

  const visible = data.filter((c) => showArchived || !c.isArchived)

  return (
    <div className="stack-lg">
      <div className="row-between wrap">
        <label className="check">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Hiện danh mục đã lưu trữ
        </label>
        {notice && <p className="notice slim" role="status">{notice}</p>}
      </div>
      {isPending && <p className="muted">Đang tải…</p>}
      {isError && <p className="form-error">Không tải được danh mục.</p>}

      <div className="two-col">
        {(['Expense', 'Income'] as const).map((type) => (
          <section key={type} className="card">
            <div className="row-between">
              <h2>{type === 'Expense' ? 'Danh mục chi' : 'Danh mục thu'}</h2>
              <button className="btn-ghost" onClick={() => setEditing({ kind: 'create', type })}>+ Thêm</button>
            </div>
            <ul className="cat-list">
              {visible.filter((c) => c.type === type).map((c) => (
                <li key={c.id} className={c.isArchived ? 'archived' : undefined}>
                  <span className="cat-badge" style={{ background: c.color }} aria-hidden>{c.name.charAt(0)}</span>
                  <span className="grow">
                    {c.name}
                    {c.isDefault && <small className="muted"> · mặc định</small>}
                    {c.isArchived && <small className="muted"> · đã lưu trữ</small>}
                  </span>
                  {c.isArchived ? (
                    <button className="btn-link" disabled={restore.isPending} onClick={() => restore.mutate(c.id)}>Khôi phục</button>
                  ) : (
                    <>
                      <button className="btn-link" onClick={() => setEditing({ kind: 'edit', category: c })}>Sửa</button>
                      {!c.isDefault && (
                        <button className="btn-link danger" onClick={() => setDeleting(c)}>Xóa</button>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Modal open={!!editing} title={editing?.kind === 'edit' ? 'Sửa danh mục' : 'Thêm danh mục'} onClose={() => setEditing(null)} size="sm">
        {editing && <CategoryForm key={editing.kind === 'edit' ? editing.category.id : editing.type} editing={editing} onDone={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Xóa danh mục?"
        message={
          <>
            Nếu <strong>{deleting?.name}</strong> đã có giao dịch hoặc ngân sách, danh mục sẽ được <strong>lưu trữ</strong> để giữ lịch sử
            (có thể khôi phục).
          </>
        }
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          remove.mutate(deleting!.id, {
            onSuccess: (r) => {
              setNotice(r.result === 'archived' ? `Đã lưu trữ “${deleting!.name}”.` : `Đã xóa “${deleting!.name}”.`)
              setDeleting(null)
            },
          })
        }
      />
    </div>
  )
}

function CategoryForm({ editing, onDone }: { editing: Editing; onDone: () => void }) {
  const save = useSaveCategory()
  const [name, setName] = useState(editing.kind === 'edit' ? editing.category.name : '')
  const [color, setColor] = useState(editing.kind === 'edit' ? editing.category.color : '#1971c2')
  const [error, setError] = useState('')
  const type = editing.kind === 'edit' ? editing.category.type : editing.type

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim()) return setError('Vui lòng nhập tên danh mục')
        setError('')
        try {
          await save.mutateAsync({ id: editing.kind === 'edit' ? editing.category.id : undefined, name: name.trim(), color, type })
          onDone()
        } catch (err) {
          setError(applyServerErrors(err))
        }
      }}
    >
      <p className="muted">{type === 'Expense' ? 'Danh mục chi' : 'Danh mục thu'}</p>
      <Field label="Tên danh mục" error={error}>
        <input autoFocus maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="field">
        <span>Màu</span>
        <ColorSwatchPicker value={color} onChange={setColor} />
      </div>
      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onDone}>Hủy bỏ</button>
        <button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </form>
  )
}
