import { api } from '../../lib/api'

export type BodySex = 'Male' | 'Female'
export type ActivityLevel = 'Sedentary' | 'Light' | 'Moderate' | 'Active' | 'VeryActive'
export type HealthGoal = 'LoseWeight' | 'Maintain' | 'GainWeight' | 'Fitness'
export type HealthCondition = 'JointPain' | 'BackPain' | 'HeartOrBloodPressure' | 'Diabetes'
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
export type BmiCategory = 'Underweight' | 'Normal' | 'Overweight' | 'Obese'

export interface HealthAssessment {
  age: number
  bmi: number
  bmiCategory: BmiCategory
  healthyWeightMinKg: number
  healthyWeightMaxKg: number
  bmr: number
  tdee: number
  estimatedCalories: number
  /** Manual target if set, else the estimate. */
  dailyCalories: number
  isCalorieEstimated: boolean
  proteinG: number
  carbsG: number
  fatG: number
  waterMl: number
  weeksToTarget: number | null
  waistRisk: boolean | null
}

export interface MeasurementDto {
  id: string
  date: string
  weightKg: number
  heightCm: number | null
  bodyFatPercent: number | null
  waistCm: number | null
}

export interface HealthProfileDto {
  id: string
  name: string
  birthDate: string
  sex: BodySex
  heightCm: number
  weightKg: number
  targetWeightKg: number | null
  activityLevel: ActivityLevel
  goal: HealthGoal
  conditions: HealthCondition[]
  calorieTarget: number | null
  notes: string | null
  checkInEveryDays: number | null
  nextCheckInAt: string | null
  latestMeasurement: MeasurementDto | null
  assessment: HealthAssessment
  createdAt: string
  updatedAt: string
}

export interface HealthProfileInput {
  name: string
  birthDate: string
  sex: BodySex
  heightCm: number
  weightKg: number
  activityLevel: ActivityLevel
  goal: HealthGoal
  targetWeightKg: number | null
  conditions: HealthCondition[]
  calorieTarget: number | null
  notes: string | null
  checkInEveryDays: number | null
}

export interface MeasurementInput {
  date: string
  weightKg: number
  heightCm: number | null
  bodyFatPercent: number | null
  waistCm: number | null
}

export interface FoodEntryDto {
  id: string
  date: string
  meal: MealType
  name: string
  quantity: number
  unit: string
  calories: number
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  isPlanned: boolean
}
/** `category` is only used when the name is a new dish (it joins the shared catalog). */
export type FoodEntryInput = Omit<FoodEntryDto, 'id'> & { category?: string }

/** Shared dish catalog (all users); nutrition per 1 unit. */
export interface DishDto {
  id: string
  name: string
  category: string
  unit: string
  calories: number
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
}

export interface WorkoutDto {
  id: string
  date: string
  /** "HH:mm:ss" */
  time: string | null
  name: string
  durationMinutes: number
  exercises: string | null
  caloriesBurned: number | null
  notes: string | null
  isDone: boolean
  completedAt: string | null
}
export type WorkoutInput = Omit<WorkoutDto, 'id' | 'completedAt'>

const base = (id: string) => `/health/profiles/${id}`

export const healthApi = {
  list: () => api<HealthProfileDto[]>('/health/profiles'),
  create: (body: HealthProfileInput) => api<HealthProfileDto>('/health/profiles', { method: 'POST', json: body }),
  update: (id: string, body: HealthProfileInput) => api<HealthProfileDto>(base(id), { method: 'PUT', json: body }),
  remove: (id: string) => api<void>(base(id), { method: 'DELETE' }),

  measurements: (id: string) => api<MeasurementDto[]>(`${base(id)}/measurements`),
  addMeasurement: (id: string, body: MeasurementInput) =>
    api<HealthProfileDto>(`${base(id)}/measurements`, { method: 'POST', json: body }),
  removeMeasurement: (id: string, mid: string) => api<HealthProfileDto>(`${base(id)}/measurements/${mid}`, { method: 'DELETE' }),

  foods: (id: string, from: string, to: string) => api<FoodEntryDto[]>(`${base(id)}/foods?from=${from}&to=${to}`),
  saveFood: (id: string, body: FoodEntryInput, foodId?: string) =>
    api<FoodEntryDto>(`${base(id)}/foods${foodId ? `/${foodId}` : ''}`, { method: foodId ? 'PUT' : 'POST', json: body }),
  removeFood: (id: string, foodId: string) => api<void>(`${base(id)}/foods/${foodId}`, { method: 'DELETE' }),
  dishes: () => api<DishDto[]>('/health/dishes'),

  workouts: (id: string, from: string, to: string) => api<WorkoutDto[]>(`${base(id)}/workouts?from=${from}&to=${to}`),
  saveWorkout: (id: string, body: WorkoutInput, workoutId?: string) =>
    api<WorkoutDto>(`${base(id)}/workouts${workoutId ? `/${workoutId}` : ''}`, { method: workoutId ? 'PUT' : 'POST', json: body }),
  removeWorkout: (id: string, workoutId: string) => api<void>(`${base(id)}/workouts/${workoutId}`, { method: 'DELETE' }),
}
