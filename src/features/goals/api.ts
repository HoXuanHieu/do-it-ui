import { api } from '../../lib/api'

export type GoalPeriod = 'Day' | 'Week' | 'Month' | 'Year'
export type GoalStatus = 'Active' | 'Completed' | 'Abandoned'

export interface GoalStepDto {
  id: string
  title: string
  dueDate: string | null
  isDone: boolean
  completedAt: string | null
  result: string | null
}

export interface GoalDto {
  id: string
  title: string
  description: string | null
  plan: string | null
  period: GoalPeriod
  status: GoalStatus
  startDate: string
  dueDate: string
  /** "HH:mm:ss" local time, null = no reminder */
  reminderTime: string | null
  nextRemindAt: string | null
  steps: GoalStepDto[]
  createdAt: string
  updatedAt: string
}

export interface GoalInput {
  title: string
  period: GoalPeriod
  startDate: string
  dueDate: string
  description: string | null
  plan: string | null
  reminderTime: string | null
  steps: { id: string | null; title: string; dueDate: string | null; isDone: boolean; result: string | null }[]
}

export const goalsApi = {
  list: () => api<GoalDto[]>('/goals'),
  create: (body: GoalInput) => api<GoalDto>('/goals', { method: 'POST', json: body }),
  update: (id: string, body: GoalInput) => api<GoalDto>(`/goals/${id}`, { method: 'PUT', json: body }),
  setStatus: (id: string, status: GoalStatus) => api<GoalDto>(`/goals/${id}/status`, { method: 'PATCH', json: { status } }),
  /** Omitted fields stay unchanged; result '' clears it. */
  updateStep: (id: string, stepId: string, patch: { isDone?: boolean; result?: string }) =>
    api<GoalDto>(`/goals/${id}/steps/${stepId}`, { method: 'PATCH', json: patch }),
  remove: (id: string) => api<void>(`/goals/${id}`, { method: 'DELETE' }),
}
