import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { ConfirmDialog, Modal } from '../../components/Dialog'
import { Field } from '../../components/Form'
import { toDateKey } from '../../lib/dates'
import type { CategoryDto, TransactionDto, TransactionType } from '../../lib/financeApi'
import { applyServerErrors } from '../../lib/forms'
import { formatAmountInput, parseAmount } from '../../lib/money'
import { AmountInput } from './components'
import { useCategories, useDeleteTransaction, useSaveTransaction } from './queries'

export type TransactionDialogMode =
  | { kind: 'create'; type: TransactionType; date?: string }
  | { kind: 'edit'; tx: TransactionDto }

/** Largest amount safely representable as a JS number with 2 decimals (backend allows more). */
const MAX = 9_999_999_999_999

function makeSchema(currency: string) {
  return z
    .object({
      type: z.enum(['Income', 'Expense']),
      amount: z.string(),
      categoryId: z.string().min(1, 'Chọn danh mục'),
      date: z.string().min(1, 'Chọn ngày'),
      description: z.string().max(500, 'Tối đa 500 ký tự'),
      note: z.string().max(2000, 'Tối đa 2000 ký tự'),
    })
    .superRefine((v, ctx) => {
      const n = parseAmount(v.amount, currency)
      // BR-FI-001
      if (n == null || n <= 0 || n > MAX)
        ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Nhập số tiền lớn hơn 0 (tối đa 2 chữ số thập phân)' })
    })
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>

export function TransactionDialog({
  mode,
  currency,
  onClose,
}: {
  mode: TransactionDialogMode | null
  currency: string
  onClose: () => void
}) {
  const title =
    mode?.kind === 'edit' ? 'Sửa giao dịch' : mode?.type === 'Income' ? 'Thêm khoản thu' : 'Thêm khoản chi'
  return (
    <Modal open={!!mode} title={title} onClose={onClose}>
      {mode && (
        <TransactionForm
          key={mode.kind === 'edit' ? mode.tx.id : `${mode.type}-${mode.date ?? ''}`}
          mode={mode}
          currency={mode.kind === 'edit' ? mode.tx.currencyCode : currency}
          onClose={onClose}
        />
      )}
    </Modal>
  )
}

function TransactionForm({ mode, currency, onClose }: { mode: TransactionDialogMode; currency: string; onClose: () => void }) {
  const { data: categories = [] } = useCategories(true)
  const save = useSaveTransaction()
  const remove = useDeleteTransaction()
  const [formError, setFormError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [todayKey] = useState(() => toDateKey(new Date()))

  const initial: FormValues =
    mode.kind === 'edit'
      ? {
          type: mode.tx.type,
          amount: formatAmountInput(mode.tx.amount, currency),
          categoryId: mode.tx.categoryId,
          date: mode.tx.date,
          description: mode.tx.description ?? '',
          note: mode.tx.note ?? '',
        }
      : { type: mode.type, amount: '', categoryId: '', date: mode.date ?? todayKey, description: '', note: '' }

  const { register, handleSubmit, setError, setValue, control, formState } = useForm<FormValues>({
    resolver: zodResolver(makeSchema(currency)),
    defaultValues: initial,
  })
  const type = useWatch({ control, name: 'type' })
  const currentCategory = mode.kind === 'edit' ? mode.tx.categoryId : null
  // Archived categories are hidden, except the one an edited transaction already uses.
  const options = categories.filter((c: CategoryDto) => c.type === type && (!c.isArchived || c.id === currentCategory))

  const onSubmit = handleSubmit(async (v) => {
    setFormError('')
    try {
      await save.mutateAsync({
        id: mode.kind === 'edit' ? mode.tx.id : undefined,
        body: {
          type: v.type,
          amount: parseAmount(v.amount, currency)!,
          categoryId: v.categoryId,
          date: v.date,
          description: v.description.trim() || null,
          note: v.note.trim() || null,
        },
      })
      onClose()
    } catch (e) {
      setFormError(applyServerErrors(e, setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="form-grid tx-form">
      <div className="segmented span-all type-toggle" role="radiogroup" aria-label="Loại giao dịch">
        {(['Expense', 'Income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            className={type === t ? `active ${t === 'Income' ? 'income' : 'expense'}` : undefined}
            onClick={() => {
              setValue('type', t)
              setValue('categoryId', '')
            }}
          >
            {t === 'Expense' ? 'Khoản chi' : 'Khoản thu'}
          </button>
        ))}
      </div>

      <Field label="Số tiền" error={formState.errors.amount?.message}>
        <AmountInput currency={currency} autoFocus placeholder="0" {...register('amount')} />
      </Field>
      <Field label="Ngày" error={formState.errors.date?.message}>
        <input type="date" {...register('date')} />
      </Field>

      <Field label="Danh mục" error={formState.errors.categoryId?.message}>
        <select {...register('categoryId')}>
          <option value="">— Chọn danh mục —</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isArchived ? ' (đã lưu trữ)' : ''}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Mô tả" error={formState.errors.description?.message}>
        <input maxLength={500} placeholder="VD: Ăn trưa, Grab…" {...register('description')} />
      </Field>

      <div className="field span-all">
        <span>Ghi chú</span>
        <textarea rows={2} maxLength={2000} {...register('note')} />
        {formState.errors.note && <small className="field-error">{formState.errors.note.message}</small>}
      </div>

      {formError && <p className="form-error span-all" role="alert">{formError}</p>}
      <div className="form-actions">
        {mode.kind === 'edit' && (
          <button type="button" className="btn-ghost danger" onClick={() => setConfirming(true)}>
            Xóa
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn-ghost" onClick={onClose}>
          Hủy bỏ
        </button>
        <button className="btn-primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>

      {mode.kind === 'edit' && (
        <ConfirmDialog
          open={confirming}
          title="Xóa giao dịch?"
          message="Giao dịch sẽ bị xóa khỏi lịch sử và các báo cáo."
          busy={remove.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={() =>
            remove.mutate(mode.tx.id, {
              onSuccess: () => {
                setConfirming(false)
                onClose()
              },
            })
          }
        />
      )}
    </form>
  )
}
