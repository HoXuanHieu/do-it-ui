import { api, type Paged } from '../../lib/api'

// ---------- Finance module (SRS §4.5) ----------

export type TransactionType = 'Income' | 'Expense'

export interface CategoryDto {
  id: string
  name: string
  type: TransactionType
  color: string
  isDefault: boolean
  isArchived: boolean
}

export interface TransactionDto {
  id: string
  type: TransactionType
  amount: number
  currencyCode: string
  date: string // YYYY-MM-DD
  categoryId: string
  categoryName: string
  categoryColor: string
  description: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface TransactionInput {
  type: TransactionType
  amount: number
  categoryId: string
  date: string
  description: string | null
  note: string | null
}

export interface TransactionFilters {
  from?: string
  to?: string
  type?: TransactionType
  categoryId?: string
  minAmount?: number
  maxAmount?: number
  q?: string
  page?: number
  pageSize?: number
}

export interface FinanceSummaryDto {
  from: string
  to: string
  currencyCode: string
  income: number
  expense: number
  net: number
  savingsRate: number | null
  transactionCount: number
}

export interface BudgetLineDto {
  categoryId: string | null
  name: string
  color: string
  limit: number
  spent: number
  remaining: number
  percent: number
  isArchived: boolean
}

export interface BudgetOverviewDto {
  month: string // yyyy-MM
  exists: boolean
  currencyCode: string
  alertThresholds: number[]
  total: BudgetLineDto | null
  categories: BudgetLineDto[]
  totalSpent: number
  unbudgetedSpent: number
}

export interface BudgetInput {
  totalLimit: number | null
  categories: { categoryId: string; limit: number }[]
  alertThresholds: number[]
}

function query(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
  return q.toString()
}

export const financeApi = {
  categories: (includeArchived = false) =>
    api<CategoryDto[]>(`/finance/categories?${query({ includeArchived: includeArchived || undefined })}`),
  createCategory: (body: { name: string; type: TransactionType; color: string }) =>
    api<CategoryDto>('/finance/categories', { method: 'POST', json: body }),
  updateCategory: (id: string, body: { name: string; color: string }) =>
    api<CategoryDto>(`/finance/categories/${id}`, { method: 'PUT', json: body }),
  deleteCategory: (id: string) => api<{ result: 'deleted' | 'archived' }>(`/finance/categories/${id}`, { method: 'DELETE' }),
  restoreCategory: (id: string) => api<CategoryDto>(`/finance/categories/${id}/restore`, { method: 'POST' }),

  transactions: (f: TransactionFilters) =>
    api<Paged<TransactionDto>>(`/finance/transactions?${query({ ...f, q: f.q?.trim() || undefined })}`),
  summary: (from: string, to: string) => api<FinanceSummaryDto>(`/finance/transactions/summary?${query({ from, to })}`),
  createTransaction: (body: TransactionInput) => api<TransactionDto>('/finance/transactions', { method: 'POST', json: body }),
  updateTransaction: (id: string, body: TransactionInput) =>
    api<TransactionDto>(`/finance/transactions/${id}`, { method: 'PUT', json: body }),
  deleteTransaction: (id: string) => api<void>(`/finance/transactions/${id}`, { method: 'DELETE' }),

  budget: (month: string) => api<BudgetOverviewDto>(`/finance/budgets/${month}`),
  saveBudget: (month: string, body: BudgetInput) => api<BudgetOverviewDto>(`/finance/budgets/${month}`, { method: 'PUT', json: body }),
  deleteBudget: (month: string) => api<void>(`/finance/budgets/${month}`, { method: 'DELETE' }),
  copyBudget: (month: string) => api<BudgetOverviewDto>(`/finance/budgets/${month}/copy-from-previous`, { method: 'POST' }),
}
