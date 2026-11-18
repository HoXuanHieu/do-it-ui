import { useSyncExternalStore } from 'react'
import type en from './locales/en.json'

// Vietnamese source text is the key; each ./locales/<lang>.json maps it to that language.
// Adding a language = add <lang>.json (same keys as en.json) + the code in backend PreferenceOptions.Languages.
// en.json is the reference key list: t() only accepts its keys, so new UI text without a translation fails tsc,
// and scripts/check-i18n.mjs fails the build when another locale file misses or adds keys.
// Same Vietnamese word with two meanings: add a '|context' suffix to the key (dropped when shown in Vietnamese).
export type Key = keyof typeof en

const SOURCE = 'vi'
const STORAGE_KEY = 'doit.lang'
const loaders = import.meta.glob<Record<string, string>>('./locales/*.json', { import: 'default' })
const fileOf = (l: string) => `./locales/${l}.json`
const supported = (l: string | null | undefined): string => (l && (l === SOURCE || fileOf(l) in loaders) ? l : SOURCE)

let lang = SOURCE
let dict: Record<string, string> = {}
let pending = 0
const listeners = new Set<() => void>()

/** Loads the language file (only the selected one is downloaded), then re-renders the app. */
export async function setLanguage(next: string) {
  const l = supported(next)
  const req = ++pending
  const d = l === SOURCE ? {} : await loaders[fileOf(l)]()
  if (req !== pending || l === lang) return // a newer switch won, or nothing changed
  lang = l
  dict = d
  document.documentElement.lang = l
  try {
    localStorage.setItem(STORAGE_KEY, l)
  } catch {
    // private mode: language still applies for this session
  }
  listeners.forEach((f) => f())
}

/** Call once before the first render so a stored language shows without a flash of Vietnamese. */
export function initLanguage() {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  return setLanguage(supported(stored)).catch(() => undefined) // a failed download falls back to Vietnamese
}

/** Locale for Intl formatters (dates, relative time); language codes are valid BCP 47 tags. */
export const locale = () => lang

/** Re-renders on language change. The app root keys on this, so plain t() calls below it stay fresh. */
export const useLanguage = () =>
  useSyncExternalStore(
    (f) => (listeners.add(f), () => listeners.delete(f)),
    () => lang,
  )

/** Translate. Call at render time, never at module level (the value would freeze in one language). */
export function t(key: Key, vars?: Record<string, string | number>): string {
  const s = dict[key] ?? key.replace(/\|.*$/, '') // missing translation falls back to Vietnamese
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s
}

/** For strings that may or may not be keys (zod messages, server text): translate when known, else pass through. */
export const tx = (s: string) => dict[s] ?? s
