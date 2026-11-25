// Built-in suggestion content (no public food/exercise database in the MVP, SUP-HE-03).
// Values are typical estimates per serving, not medical advice (SUP-HE-06).
import type { Key } from '../../i18n'
import type { ActivityLevel, BmiCategory, HealthCondition, HealthGoal, HealthProfileDto, MealType, MeasurementDto } from './api'

export interface Dish {
  name: Key
  meals: MealType[]
  unit: Key
  kcal: number
  p: number
  c: number
  f: number
  /** High glycaemic / sugary: left out for diabetes. */
  highGi?: boolean
}

export const DISHES: Dish[] = [
  { name: 'Phở bò', meals: ['Breakfast', 'Lunch'], unit: 'tô', kcal: 450, p: 25, c: 55, f: 12 },
  { name: 'Bánh mì trứng', meals: ['Breakfast'], unit: 'ổ', kcal: 380, p: 15, c: 45, f: 15, highGi: true },
  { name: 'Xôi gà', meals: ['Breakfast'], unit: 'phần', kcal: 500, p: 20, c: 70, f: 15, highGi: true },
  { name: 'Yến mạch sữa chua trái cây', meals: ['Breakfast'], unit: 'bát', kcal: 320, p: 14, c: 50, f: 7 },
  { name: 'Bún bò Huế', meals: ['Breakfast', 'Lunch'], unit: 'tô', kcal: 480, p: 26, c: 58, f: 15 },
  { name: 'Trứng luộc và khoai lang', meals: ['Breakfast'], unit: 'phần', kcal: 300, p: 14, c: 40, f: 10 },
  { name: 'Cơm gạo lứt, ức gà, rau luộc', meals: ['Lunch', 'Dinner'], unit: 'phần', kcal: 520, p: 40, c: 60, f: 10 },
  { name: 'Cơm, cá kho, canh rau', meals: ['Lunch', 'Dinner'], unit: 'phần', kcal: 600, p: 32, c: 75, f: 18 },
  { name: 'Cơm thịt kho trứng', meals: ['Lunch', 'Dinner'], unit: 'phần', kcal: 700, p: 30, c: 80, f: 28, highGi: true },
  { name: 'Bún chả', meals: ['Lunch'], unit: 'phần', kcal: 550, p: 28, c: 65, f: 20 },
  { name: 'Cơm tấm sườn', meals: ['Lunch'], unit: 'đĩa', kcal: 750, p: 35, c: 85, f: 30, highGi: true },
  { name: 'Cơm, đậu phụ sốt cà chua, rau', meals: ['Lunch', 'Dinner'], unit: 'phần', kcal: 500, p: 22, c: 70, f: 14 },
  { name: 'Salad cá ngừ', meals: ['Lunch', 'Dinner'], unit: 'đĩa', kcal: 350, p: 30, c: 15, f: 18 },
  { name: 'Cơm, canh chua cá', meals: ['Lunch', 'Dinner'], unit: 'phần', kcal: 520, p: 30, c: 68, f: 12 },
  { name: 'Bò xào rau củ, cơm gạo lứt', meals: ['Lunch', 'Dinner'], unit: 'phần', kcal: 580, p: 35, c: 62, f: 18 },
  { name: 'Miến gà', meals: ['Dinner', 'Breakfast'], unit: 'tô', kcal: 420, p: 25, c: 55, f: 10 },
  { name: 'Chuối', meals: ['Snack'], unit: 'quả', kcal: 105, p: 1, c: 27, f: 0 },
  { name: 'Sữa chua không đường', meals: ['Snack'], unit: 'hộp', kcal: 100, p: 6, c: 8, f: 5 },
  { name: 'Hạnh nhân (30 g)', meals: ['Snack'], unit: 'phần', kcal: 170, p: 6, c: 6, f: 15 },
  { name: 'Táo', meals: ['Snack'], unit: 'quả', kcal: 95, p: 0, c: 25, f: 0 },
  { name: 'Sinh tố bơ', meals: ['Snack'], unit: 'ly', kcal: 300, p: 4, c: 30, f: 20, highGi: true },
  { name: 'Sữa tươi không đường', meals: ['Snack'], unit: 'hộp', kcal: 120, p: 6, c: 9, f: 6 },
]

export interface MealSuggestion {
  meal: MealType
  dish: Dish
  servings: number
  kcal: number
}

/**
 * One day's menu around the calorie target: each meal gets its share, the closest dishes are rotated by date
 * (variety day to day) and scaled in half servings (0.5–2).
 */
export function suggestMenu(daily: number, conditions: HealthCondition[], dayNumber: number, shares: { value: MealType; share: number }[]) {
  const diabetic = conditions.includes('Diabetes')
  return shares.map(({ value: meal, share }, i): MealSuggestion => {
    const budget = daily * share
    const options = DISHES.filter((d) => d.meals.includes(meal) && !(diabetic && d.highGi))
      .sort((a, b) => Math.abs(a.kcal - budget) - Math.abs(b.kcal - budget))
      .slice(0, 3)
    const dish = options[(dayNumber + i) % options.length]
    const servings = Math.min(2, Math.max(0.5, Math.round((budget / dish.kcal) * 2) / 2))
    return { meal, dish, servings, kcal: Math.round(dish.kcal * servings) }
  })
}

export type Focus = 'cardio' | 'strength' | 'flex'

export interface Exercise {
  name: Key
  focus: Focus
  /** Metabolic equivalent, for the calorie estimate. */
  met: number
  /** 1 gentle … 3 hard */
  level: 1 | 2 | 3
  dose: Key
  how: Key
  avoid: HealthCondition[]
}

export const EXERCISES: Exercise[] = [
  { name: 'Đi bộ nhanh', focus: 'cardio', met: 4.3, level: 1, dose: '20–30 phút', how: 'Bước dài, vung tay, thở đều; nói chuyện được nhưng hơi hụt hơi.', avoid: [] },
  { name: 'Đạp xe', focus: 'cardio', met: 6.8, level: 2, dose: '20–30 phút', how: 'Giữ nhịp đều, chỉnh yên ngang hông để gối không gập quá sâu.', avoid: [] },
  { name: 'Bơi lội', focus: 'cardio', met: 6, level: 2, dose: '20–30 phút', how: 'Bơi chậm liên tục, nghỉ 1 phút sau mỗi 5 phút.', avoid: [] },
  { name: 'Chạy bộ', focus: 'cardio', met: 8, level: 3, dose: '20–30 phút', how: 'Khởi động 5 phút, chạy nhẹ chân, tiếp đất bằng giữa bàn chân.', avoid: ['JointPain', 'HeartOrBloodPressure'] },
  { name: 'Nhảy dây', focus: 'cardio', met: 11, level: 3, dose: '10 × 1 phút', how: 'Nhảy 1 phút, nghỉ 30 giây; bật thấp bằng mũi chân.', avoid: ['JointPain', 'HeartOrBloodPressure'] },
  { name: 'HIIT', focus: 'cardio', met: 8, level: 3, dose: '8 × 30 giây', how: 'Gắng sức 30 giây (jumping jack, burpee), nghỉ 30 giây.', avoid: ['JointPain', 'BackPain', 'HeartOrBloodPressure'] },
  { name: 'Squat', focus: 'strength', met: 5, level: 2, dose: '3 × 12', how: 'Chân rộng bằng vai, hạ hông như ngồi ghế, gối không vượt mũi chân.', avoid: ['JointPain'] },
  { name: 'Hít đất', focus: 'strength', met: 3.8, level: 2, dose: '3 × 10', how: 'Thân thẳng, hạ ngực gần sàn; quỳ gối nếu còn yếu.', avoid: [] },
  { name: 'Hít đất tựa tường', focus: 'strength', met: 2.5, level: 1, dose: '3 × 15', how: 'Đứng cách tường một sải tay, đẩy người ra vào chậm rãi.', avoid: [] },
  { name: 'Plank', focus: 'strength', met: 3.8, level: 2, dose: '3 × 30 giây', how: 'Chống khuỷu tay, siết bụng, người thẳng từ đầu tới gót.', avoid: [] },
  { name: 'Cầu mông', focus: 'strength', met: 3, level: 1, dose: '3 × 15', how: 'Nằm ngửa co gối, đẩy hông lên, siết mông 2 giây rồi hạ.', avoid: [] },
  { name: 'Gập bụng', focus: 'strength', met: 3.8, level: 2, dose: '3 × 15', how: 'Nâng vai khỏi sàn bằng cơ bụng, không kéo cổ.', avoid: ['BackPain'] },
  { name: 'Tạ đơn toàn thân', focus: 'strength', met: 5, level: 3, dose: '3 × 10', how: 'Đẩy vai, chèo tạ, gập tay; chọn mức tạ nâng được 10 lần chuẩn.', avoid: ['BackPain', 'HeartOrBloodPressure'] },
  { name: 'Yoga', focus: 'flex', met: 2.5, level: 1, dose: '20–30 phút', how: 'Chuỗi tư thế cơ bản, thở sâu, không cố quá giới hạn.', avoid: [] },
  { name: 'Giãn cơ toàn thân', focus: 'flex', met: 2.3, level: 1, dose: '10–15 phút', how: 'Giữ mỗi động tác 20–30 giây: đùi, bắp chân, lưng, vai.', avoid: [] },
  { name: 'Đi bộ thư giãn', focus: 'flex', met: 3, level: 1, dose: '20 phút', how: 'Đi chậm, thả lỏng vai, hít thở sâu.', avoid: [] },
]

export const FOCUS_LABEL: Record<Focus, Key> = { cardio: 'Tim mạch', strength: 'Sức mạnh', flex: 'Dẻo dai & phục hồi' }

const DAYS_PER_WEEK: Record<ActivityLevel, number[]> = {
  // weekday index, Monday = 0
  Sedentary: [0, 2, 4],
  Light: [0, 2, 4],
  Moderate: [0, 1, 3, 5],
  Active: [0, 1, 2, 4, 5],
  VeryActive: [0, 1, 2, 4, 5],
}

const ROTATION: Record<HealthGoal, Focus[]> = {
  LoseWeight: ['cardio', 'strength', 'cardio', 'strength', 'cardio'],
  Maintain: ['cardio', 'strength', 'flex', 'cardio', 'strength'],
  GainWeight: ['strength', 'cardio', 'strength', 'strength', 'flex'],
  Fitness: ['strength', 'cardio', 'strength', 'cardio', 'flex'],
}

export interface PlanDay {
  /** Monday = 0 */
  weekday: number
  focus: Focus
  minutes: number
  exercises: Exercise[]
  kcal: number
}

export interface PlanInput {
  goal: HealthGoal
  activityLevel: ActivityLevel
  conditions: HealthCondition[]
  age: number
  bmiCategory: BmiCategory
  weightKg: number
}

/** Highest exercise level the body condition allows. */
export function maxLevel(p: PlanInput): 1 | 2 | 3 {
  if (p.age >= 60 || p.conditions.includes('HeartOrBloodPressure')) return 1
  if (p.bmiCategory === 'Obese' || p.activityLevel === 'Sedentary') return 2
  return 3
}

/** A week of workouts from the goal (focus rotation), activity level (days, minutes) and body condition (safe exercises). */
export function suggestWeek(p: PlanInput, weekNumber: number): PlanDay[] {
  const level = maxLevel(p)
  const minutes = p.activityLevel === 'Sedentary' ? 30 : p.activityLevel === 'Light' ? 35 : 45
  return DAYS_PER_WEEK[p.activityLevel].map((weekday, i) => {
    const focus = ROTATION[p.goal][i]
    const pool = EXERCISES.filter((e) => e.focus === focus && e.level <= level && !e.avoid.some((c) => p.conditions.includes(c)))
    // rotate the pool week to week so the plan does not repeat exactly
    const start = pool.length ? (weekNumber + i) % pool.length : 0
    const exercises = [...pool.slice(start), ...pool.slice(0, start)].slice(0, focus === 'strength' ? 3 : 2)
    const met = exercises.length ? exercises.reduce((s, e) => s + e.met, 0) / exercises.length : 3
    return { weekday, focus, minutes, exercises, kcal: Math.round((met * p.weightKg * minutes) / 60) }
  })
}

// ---------- body composition estimates ----------

export type FatLevel = 'Essential' | 'Athletic' | 'Fit' | 'Average' | 'High'

export const FAT_LEVEL_LABEL: Record<FatLevel, Key> = {
  Essential: 'Rất thấp',
  Athletic: 'Vận động viên',
  Fit: 'Cân đối',
  Average: 'Trung bình',
  High: 'Cao',
}

/** Full years between two YYYY-MM-DD keys. */
export function ageOn(birth: string, day: string) {
  const [by, bm, bd] = birth.split('-').map(Number)
  const [y, m, d] = day.split('-').map(Number)
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0)
}

/**
 * Estimates derived from one measurement (not a diagnosis):
 * - BMI = kg / m².
 * - Body fat %: the measured value if entered; else RFM from waist (Woolcott 2018, JAMA):
 *   64 − 20 × height/waist (+12 for women); else from BMI (Deurenberg 1991):
 *   1.2 × BMI + 0.23 × age − 10.8 × male − 5.4 (children: 1.51 × BMI − 0.7 × age − 3.6 × male + 1.4).
 * - Waist-to-height ratio ≥ 0.5 = higher cardiometabolic risk.
 * - Body-fat bands per American Council on Exercise.
 */
export function bodyStats(p: HealthProfileDto, m: MeasurementDto) {
  const heightCm = m.heightCm ?? p.heightCm
  const bmi = m.weightKg / (heightCm / 100) ** 2
  const male = p.sex === 'Male' ? 1 : 0
  const age = ageOn(p.birthDate, m.date)
  const whtr = m.waistCm ? m.waistCm / heightCm : null
  const [raw, fatSource]: [number, 'measured' | 'waist' | 'bmi'] =
    m.bodyFatPercent != null ? [m.bodyFatPercent, 'measured']
    : whtr ? [64 - 20 / whtr + 12 * (1 - male), 'waist']
    : age < 18 ? [1.51 * bmi - 0.7 * age - 3.6 * male + 1.4, 'bmi']
    : [1.2 * bmi + 0.23 * age - 10.8 * male - 5.4, 'bmi']
  const fat = Math.min(70, Math.max(2, raw))
  const fatKg = (m.weightKg * fat) / 100
  const bands = male ? [6, 14, 18, 25] : [14, 21, 25, 32]
  const levels: FatLevel[] = ['Essential', 'Athletic', 'Fit', 'Average', 'High']
  return {
    bmi,
    // WHO Asia-Pacific cut-offs, same as the backend assessment
    bmiCategory: (bmi < 18.5 ? 'Underweight' : bmi < 23 ? 'Normal' : bmi < 25 ? 'Overweight' : 'Obese') as BmiCategory,
    whtr,
    fat,
    fatSource,
    fatKg,
    leanKg: m.weightKg - fatKg,
    fatLevel: levels[bands.filter((b) => fat >= b).length],
  }
}
