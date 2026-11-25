// Currency formatting (Supplement SUP-FI-03: VND shown without decimals).

const ZERO_DECIMALS = new Set(['VND', 'JPY', 'KRW'])

export const currencyDecimals = (currency: string) => (ZERO_DECIMALS.has(currency) ? 0 : 2)

const cache = new Map<string, Intl.NumberFormat>()

/** "10,000,000 VND" — comma thousands, dot decimals, currency code suffix. */
export function formatMoney(amount: number, currency: string, opts: { signed?: boolean; compact?: boolean } = {}) {
  const key = `${currency}|${opts.compact ? 'c' : ''}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: opts.compact ? 0 : currencyDecimals(currency),
      maximumFractionDigits: opts.compact ? 1 : currencyDecimals(currency),
      notation: opts.compact ? 'compact' : 'standard',
    })
    cache.set(key, f)
  }
  const s = `${f.format(Math.abs(amount))} ${currency}`
  if (!opts.signed || amount === 0) return amount < 0 ? `-${s}` : s
  return `${amount > 0 ? '+' : '−'}${s}`
}

/** Parse user input like "1,250,000" or "12.5" according to the currency's decimals. */
export function parseAmount(raw: string, currency: string): number | null {
  const s = raw.trim().replace(/[\s,]/g, '')
  if (!s) return null
  const normalized = currencyDecimals(currency) === 0 ? s.replace(/\./g, '') : s
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

/** Format a number for display in an amount input (no currency symbol). */
export function formatAmountInput(amount: number | null | undefined, currency: string) {
  if (amount == null) return ''
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: currencyDecimals(currency),
  }).format(amount)
}

/** Live-format what the user is typing: "1250000" -> "1,250,000", keeps a partial "12." fraction. */
export function formatAmountTyping(raw: string, currency: string) {
  const dec = currencyDecimals(currency)
  const [int, ...frac] = raw.replace(dec ? /[^\d.]/g : /\D/g, '').split('.')
  const grouped = int.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac.length ? `${grouped}.${frac.join('').slice(0, dec)}` : grouped
}
