// Self-check for the health suggestion rules. Run: node scripts/check-health-catalog.ts (Node 22.18+ strips types).
import assert from 'node:assert/strict'
import { DISHES, EXERCISES, maxLevel, suggestMenu, suggestWeek, type PlanInput } from '../src/features/health/catalog.ts'

const shares = [
  { value: 'Breakfast', share: 0.25 },
  { value: 'Lunch', share: 0.35 },
  { value: 'Dinner', share: 0.3 },
  { value: 'Snack', share: 0.1 },
] as const

// Menu lands near the target and never serves high-GI dishes to diabetics.
for (let day = 0; day < 14; day++) {
  const menu = suggestMenu(2000, ['Diabetes'], day, [...shares])
  const total = menu.reduce((s, m) => s + m.kcal, 0)
  assert.ok(Math.abs(total - 2000) <= 400, `menu total ${total} far from 2000`)
  assert.ok(menu.every((m) => !m.dish.highGi && m.dish.meals.includes(m.meal)))
}
assert.ok(DISHES.length > 0)

// Body condition filters exercises and caps intensity.
const base: PlanInput = { goal: 'LoseWeight', activityLevel: 'Moderate', conditions: [], age: 30, bmiCategory: 'Normal', weightKg: 70 }
assert.equal(maxLevel(base), 3)
assert.equal(maxLevel({ ...base, age: 65 }), 1)
assert.equal(maxLevel({ ...base, bmiCategory: 'Obese' }), 2)
const knees = suggestWeek({ ...base, conditions: ['JointPain', 'BackPain'] }, 0)
assert.equal(knees.length, 4)
for (const d of knees) {
  assert.ok(d.exercises.length > 0, `no exercise for ${d.focus}`)
  assert.ok(d.exercises.every((e) => !e.avoid.includes('JointPain') && !e.avoid.includes('BackPain')))
}
const heart = suggestWeek({ ...base, activityLevel: 'VeryActive', conditions: ['HeartOrBloodPressure'] }, 3)
assert.ok(heart.every((d) => d.exercises.every((e) => e.level === 1)))
assert.ok(EXERCISES.some((e) => e.focus === 'strength' && e.level === 1), 'gentle strength option must exist')

console.log('health catalog: OK')
