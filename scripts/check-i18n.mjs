// Every locale file must have exactly the keys of en.json (the reference list t() is typed against).
import { readdirSync, readFileSync } from 'node:fs'

const dir = new URL('../src/i18n/locales/', import.meta.url)
const load = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'))
const ref = Object.keys(load('en.json'))
let failed = false
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const locale = load(file)
  const keys = Object.keys(locale)
  const missing = ref.filter((k) => !(k in locale))
  const extra = keys.filter((k) => !ref.includes(k))
  const empty = keys.filter((k) => typeof locale[k] !== 'string' || !locale[k].trim())
  for (const [label, list] of [['missing', missing], ['not in en.json', extra], ['empty', empty]])
    if (list.length) {
      failed = true
      console.error(`${file}: ${list.length} ${label}:\n  ${list.join('\n  ')}`)
    }
}
if (failed) process.exit(1)
console.log('i18n: locale files OK')
