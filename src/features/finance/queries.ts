import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { financeApi, type BudgetInput, type TransactionFilters, type TransactionInput } from './api'
import { toDateKey } from '../../lib/dates'
import { notificationKeys } from '../notifications/queries'

export const financeKeys = {
  all: ['finance'] as const,
  categories: (includeArchived: boolean) => ['finance', 'categories', includeArchived] as const,
  transactions: (f: TransactionFilters) => ['finance', 'transactions', f] as const,
  summary: (from: string, to: string) => ['finance', 'summary', from, to] as const,
  budget: (month: string) => ['finance', 'budget', month] as const,
  jars: (month: string) => ['finance', 'jars', month] as const,
}

// ---------- Month helpers ("yyyy-MM") ----------

export const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export function parseMonthKey(key: string | null | undefined): Date | null {
  const m = key?.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1) : null
}

export function shiftMonth(key: string, n: number) {
  const d = parseMonthKey(key)!
  return monthKeyOf(new Date(d.getFullYear(), d.getMonth() + n, 1))
}

/** Inclusive YYYY-MM-DD bounds of a month. */
export function monthRange(key: string) {
  const d = parseMonthKey(key)!
  return { from: toDateKey(d), to: toDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
}

export const monthLabel = (key: string) => {
  const d = parseMonthKey(key)!
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`
}

// ---------- Queries ----------

export const useCategories = (includeArchived = false) =>
  useQuery({ queryKey: financeKeys.categories(includeArchived), queryFn: () => financeApi.categories(includeArchived) })

export const useTransactions = (f: TransactionFilters) =>
  useQuery({ queryKey: financeKeys.transactions(f), queryFn: () => financeApi.transactions(f), placeholderData: keepPreviousData })

export const useSummary = (from: string, to: string) =>
  useQuery({ queryKey: financeKeys.summary(from, to), queryFn: () => financeApi.summary(from, to), placeholderData: keepPreviousData })

export const useBudget = (month: string) =>
  useQuery({ queryKey: financeKeys.budget(month), queryFn: () => financeApi.budget(month), placeholderData: keepPreviousData })

export const useJars = (month: string) =>
  useQuery({ queryKey: financeKeys.jars(month), queryFn: () => financeApi.jars(month), placeholderData: keepPreviousData })

// ---------- Mutations ----------

/** Any finance write can move totals, budgets and (budget-alert) notifications: refresh them all. */
function useFinanceMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: financeKeys.all })
      void qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export const useSaveTransaction = () =>
  useFinanceMutation(({ id, body }: { id?: string; body: TransactionInput }) =>
    id ? financeApi.updateTransaction(id, body) : financeApi.createTransaction(body),
  )

export const useDeleteTransaction = () => useFinanceMutation((id: string) => financeApi.deleteTransaction(id))

export const useSaveCategory = () =>
  useFinanceMutation(
    ({ id, name, color, type }: { id?: string; name: string; color: string; type: 'Income' | 'Expense' }) =>
      id ? financeApi.updateCategory(id, { name, color }) : financeApi.createCategory({ name, color, type }),
  )

export const useDeleteCategory = () => useFinanceMutation((id: string) => financeApi.deleteCategory(id))
export const useRestoreCategory = () => useFinanceMutation((id: string) => financeApi.restoreCategory(id))

export const useSaveBudget = () =>
  useFinanceMutation(({ month, body }: { month: string; body: BudgetInput }) => financeApi.saveBudget(month, body))
export const useDeleteBudget = () => useFinanceMutation((month: string) => financeApi.deleteBudget(month))
export const useCopyBudget = () => useFinanceMutation((month: string) => financeApi.copyBudget(month))

export const useSetJarMode = () => useFinanceMutation((enabled: boolean) => financeApi.setJarMode(enabled))
export const useSyncJars = () => useFinanceMutation((month: string) => financeApi.syncJars(month))
