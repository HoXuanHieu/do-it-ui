// Currency formatting (Supplement SUP-FI-03: VND shown without decimals).

const ZERO_DECIMALS = new Set(['VND', 'JPY', 'KRW'])

export const currencyDecimals = (currency: string) => (ZERO_DECIMALS.has(currency) ? 0 : 2)

const cache = new Map<string, Intl.NumberFormat>()

export function formatMoney(amount: number, currency: string, opts: { signed?: boolean; compact?: boolean } = {}) {
  const key = `${currency}|${opts.compact ? 'c' : ''}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      minimumFractionDigits: opts.compact ? 0 : currencyDecimals(currency),
      maximumFractionDigits: opts.compact ? 1 : currencyDecimals(currency),
      notation: opts.compact ? 'compact' : 'standard',
    })
    cache.set(key, f)
  }
  const s = f.format(Math.abs(amount))
  if (!opts.signed || amount === 0) return amount < 0 ? `-${s}` : s
  return `${amount > 0 ? '+' : '−'}${s}`
}

/** Parse user input like "1.250.000" or "12,5" according to the currency's decimals. */
export function parseAmount(raw: string, currency: string): number | null {
  const s = raw.trim().replace(/\s/g, '')
  if (!s) return null
  let normalized: string
  if (currencyDecimals(currency) === 0) {
    normalized = s.replace(/[.,]/g, '')
  } else {
    // vi-VN: "." thousands, "," decimals; also accept a plain "12.50"
    const lastComma = s.lastIndexOf(',')
    const lastDot = s.lastIndexOf('.')
    if (lastComma > lastDot) normalized = s.replace(/\./g, '').replace(',', '.')
    else if (lastDot > -1 && s.length - lastDot - 1 <= 2) normalized = s.replace(/,/g, '')
    else normalized = s.replace(/[.,]/g, '')
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

/** Format a number for display in an amount input (no currency symbol). */
export function formatAmountInput(amount: number | null | undefined, currency: string) {
  if (amount == null) return ''
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: currencyDecimals(currency),
  }).format(amount)
}
