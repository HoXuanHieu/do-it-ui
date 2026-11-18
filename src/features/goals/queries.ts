import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DAY_MS, parseDateKey, startOfDay } from '../../lib/dates'
import { goalsApi, type GoalDto, type GoalInput, type GoalPeriod, type GoalStatus } from './api'
import type { Key } from '../../i18n'

export const goalKeys = { all: ['goals'] as const }

/** All goals of the user (a handful to a few hundred): filtered client-side. */
export const useGoals = () => useQuery({ queryKey: goalKeys.all, queryFn: goalsApi.list })

/** Every write returns the goal: patch it into the cached list. */
function useGoalWrite<TArgs>(fn: (args: TArgs) => Promise<GoalDto>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (goal) => {
      qc.setQueryData<GoalDto[]>(goalKeys.all, (list) =>
        list ? (list.some((g) => g.id === goal.id) ? list.map((g) => (g.id === goal.id ? goal : g)) : [...list, goal]) : list,
      )
    },
  })
}

export const useCreateGoal = () => useGoalWrite((body: GoalInput) => goalsApi.create(body))
export const useUpdateGoal = () => useGoalWrite(({ id, body }: { id: string; body: GoalInput }) => goalsApi.update(id, body))
export const useSetGoalStatus = () =>
  useGoalWrite(({ id, status }: { id: string; status: GoalStatus }) => goalsApi.setStatus(id, status))
export const useUpdateStep = () =>
  useGoalWrite(({ id, stepId, ...patch }: { id: string; stepId: string; isDone?: boolean; result?: string }) =>
    goalsApi.updateStep(id, stepId, patch))

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onSuccess: (_, id) => qc.setQueryData<GoalDto[]>(goalKeys.all, (list) => list?.filter((g) => g.id !== id)),
  })
}

// ---------- derived values ----------

export const PERIODS: { value: GoalPeriod; label: Key; icon: string }[] = [
  { value: 'Day', label: 'Trong ngày', icon: '☀️' },
  { value: 'Week', label: 'Trong tuần', icon: '📅' },
  { value: 'Month', label: 'Trong tháng', icon: '🌙' },
  { value: 'Year', label: 'Trong năm', icon: '🏔️' },
]

/** 0–100; a completed goal is 100 even without steps. */
export function progressOf(g: GoalDto) {
  if (g.status === 'Completed') return 100
  if (g.steps.length === 0) return 0
  return Math.round((g.steps.filter((s) => s.isDone).length / g.steps.length) * 100)
}

/** Whole days from today (local) to the due date; negative = overdue. */
export function daysLeft(g: GoalDto, today = new Date()) {
  return Math.round((parseDateKey(g.dueDate)!.getTime() - startOfDay(today).getTime()) / DAY_MS)
}

export const nextStep = (g: GoalDto) => g.steps.find((s) => !s.isDone) ?? null

/** Active goals, most urgent first. */
export const activeByUrgency = (goals: GoalDto[]) =>
  goals.filter((g) => g.status === 'Active').sort((a, b) => a.dueDate.localeCompare(b.dueDate))
