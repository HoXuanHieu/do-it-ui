import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Key } from '../../i18n'
import {
  healthApi,
  type ActivityLevel,
  type BmiCategory,
  type FoodEntryInput,
  type HealthCondition,
  type HealthGoal,
  type HealthProfileDto,
  type HealthProfileInput,
  type MealType,
  type MeasurementInput,
  type WorkoutInput,
} from './api'

export const healthKeys = {
  all: ['health'] as const,
  profiles: ['health', 'profiles'] as const,
  measurements: (id: string) => ['health', 'measurements', id] as const,
  foods: (id: string, from: string, to: string) => ['health', 'foods', id, from, to] as const,
  workouts: (id: string, from: string, to: string) => ['health', 'workouts', id, from, to] as const,
  /** Under 'foods' so a food write (which may add a new dish) refreshes it. */
  dishes: ['health', 'foods', 'dishes'] as const,
}

/** All profiles of the user (at most 20): one list, detail pages read from it. */
export const useHealthProfiles = () => useQuery({ queryKey: healthKeys.profiles, queryFn: healthApi.list })

/** Profile writes return the profile: patch it into the cached list. */
function useProfileWrite<TArgs>(fn: (args: TArgs) => Promise<HealthProfileDto>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (p) => {
      qc.setQueryData<HealthProfileDto[]>(healthKeys.profiles, (list) =>
        list ? (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p]) : list,
      )
      void qc.invalidateQueries({ queryKey: healthKeys.measurements(p.id) })
    },
  })
}

export const useCreateProfile = () => useProfileWrite((body: HealthProfileInput) => healthApi.create(body))
export const useUpdateProfile = () =>
  useProfileWrite(({ id, body }: { id: string; body: HealthProfileInput }) => healthApi.update(id, body))
export const useAddMeasurement = () =>
  useProfileWrite(({ id, body }: { id: string; body: MeasurementInput }) => healthApi.addMeasurement(id, body))
export const useRemoveMeasurement = () =>
  useProfileWrite(({ id, mid }: { id: string; mid: string }) => healthApi.removeMeasurement(id, mid))

export function useDeleteProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => healthApi.remove(id),
    onSuccess: (_, id) => qc.setQueryData<HealthProfileDto[]>(healthKeys.profiles, (list) => list?.filter((p) => p.id !== id)),
  })
}

export const useMeasurements = (id: string) =>
  useQuery({ queryKey: healthKeys.measurements(id), queryFn: () => healthApi.measurements(id) })

export const useFoods = (id: string, from: string, to: string) =>
  useQuery({ queryKey: healthKeys.foods(id, from, to), queryFn: () => healthApi.foods(id, from, to) })

export const useDishes = () => useQuery({ queryKey: healthKeys.dishes, queryFn: healthApi.dishes, staleTime: 5 * 60_000 })

export const useWorkouts = (id: string, from: string, to: string) =>
  useQuery({ queryKey: healthKeys.workouts(id, from, to), queryFn: () => healthApi.workouts(id, from, to) })

/** Diary and workout writes: refetch the ranges of that profile (day, week and history views overlap). */
function useEntryWrite<TArgs>(kind: 'foods' | 'workouts', fn: (args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health', kind] }),
  })
}

export const useSaveFood = (profileId: string) =>
  useEntryWrite('foods', ({ body, id }: { body: FoodEntryInput; id?: string }) => healthApi.saveFood(profileId, body, id))
export const useRemoveFood = (profileId: string) => useEntryWrite('foods', (id: string) => healthApi.removeFood(profileId, id))
export const useSaveWorkout = (profileId: string) =>
  useEntryWrite('workouts', ({ body, id }: { body: WorkoutInput; id?: string }) => healthApi.saveWorkout(profileId, body, id))
export const useRemoveWorkout = (profileId: string) =>
  useEntryWrite('workouts', (id: string) => healthApi.removeWorkout(profileId, id))

/** Same request with only the check-in interval changed (the progress tab edits just that). */
export const withCheckIn = (p: HealthProfileDto, days: number | null): HealthProfileInput => ({
  name: p.name,
  birthDate: p.birthDate,
  sex: p.sex,
  heightCm: p.heightCm,
  weightKg: p.weightKg,
  targetWeightKg: p.targetWeightKg,
  activityLevel: p.activityLevel,
  goal: p.goal,
  conditions: p.conditions,
  calorieTarget: p.calorieTarget,
  notes: p.notes,
  checkInEveryDays: days,
})

// ---------- labels ----------

export const SEXES: { value: 'Male' | 'Female'; label: Key }[] = [
  { value: 'Male', label: 'Nam' },
  { value: 'Female', label: 'Nữ' },
]

export const ACTIVITY: { value: ActivityLevel; label: Key; hint: Key }[] = [
  { value: 'Sedentary', label: 'Ít vận động', hint: 'Làm việc văn phòng, hầu như không tập' },
  { value: 'Light', label: 'Vận động nhẹ', hint: 'Tập 1–3 buổi/tuần' },
  { value: 'Moderate', label: 'Vận động vừa', hint: 'Tập 3–5 buổi/tuần' },
  { value: 'Active', label: 'Vận động nhiều', hint: 'Tập 6–7 buổi/tuần' },
  { value: 'VeryActive', label: 'Vận động rất nhiều', hint: 'Lao động nặng hoặc tập 2 lần/ngày' },
]

export const GOALS: { value: HealthGoal; label: Key; icon: string }[] = [
  { value: 'LoseWeight', label: 'Giảm cân', icon: '🔥' },
  { value: 'Maintain', label: 'Giữ cân', icon: '⚖️' },
  { value: 'GainWeight', label: 'Tăng cân', icon: '💪' },
  { value: 'Fitness', label: 'Nâng cao thể lực', icon: '🏃' },
]

export const CONDITIONS: { value: HealthCondition; label: Key }[] = [
  { value: 'JointPain', label: 'Đau khớp / gối' },
  { value: 'BackPain', label: 'Đau lưng' },
  { value: 'HeartOrBloodPressure', label: 'Tim mạch / huyết áp' },
  { value: 'Diabetes', label: 'Tiểu đường' },
]

export const MEALS: { value: MealType; label: Key; icon: string; share: number }[] = [
  { value: 'Breakfast', label: 'Bữa sáng', icon: '🌅', share: 0.25 },
  { value: 'Lunch', label: 'Bữa trưa', icon: '☀️', share: 0.35 },
  { value: 'Dinner', label: 'Bữa tối', icon: '🌙', share: 0.3 },
  { value: 'Snack', label: 'Bữa phụ', icon: '🍎', share: 0.1 },
]

export const BMI_LABEL: Record<BmiCategory, Key> = {
  Underweight: 'Thiếu cân',
  Normal: 'Bình thường',
  Overweight: 'Thừa cân',
  Obese: 'Béo phì',
}

export const labelOf = <T extends string>(list: { value: T; label: Key }[], v: T) => list.find((x) => x.value === v)!.label

/** "70" / "70.5"; trims trailing zeros. */
export const num = (n: number, digits = 1) => String(Math.round(n * 10 ** digits) / 10 ** digits)

/** Parses a decimal typed with "," or "."; null when empty or invalid. */
export function parseNum(s: string): number | null {
  const v = s.trim().replace(',', '.')
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

