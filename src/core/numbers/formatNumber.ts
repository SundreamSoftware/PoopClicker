import { LargeNumber } from './LargeNumber'

type Formattable = LargeNumber | number | { m: number; e: number }

const SUFFIXES = [
  '',
  'K',
  'M',
  'B',
  'T',
  'Qa',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc',
  'UDc',
  'DDc',
  'TDc',
  'QaDc',
  'QiDc',
  'SxDc',
  'SpDc',
  'OcDc',
  'NoDc',
  'Vg',
] as const

export function formatNumber(value: Formattable, digits = 2): string {
  const n =
    typeof value === 'object' && value !== null && 'm' in value && 'e' in value
      ? LargeNumber.deserialize(value)
      : LargeNumber.from(value as number | LargeNumber)
  if (!n.isFinite()) return '0'
  if (n.isZero()) return '0'

  const abs = n.abs()
  const sign = n.mantissa < 0 ? '-' : ''

  if (abs.exponent < 3) {
    const raw = abs.toNumber()
    if (raw < 10) return `${sign}${raw.toFixed(Math.min(digits, 2)).replace(/\.?0+$/, '')}`
    if (raw < 100) return `${sign}${raw.toFixed(1).replace(/\.0$/, '')}`
    return `${sign}${Math.floor(raw)}`
  }

  const group = Math.floor(abs.exponent / 3)
  const remainder = abs.exponent % 3
  const display = abs.mantissa * 10 ** remainder

  if (group < SUFFIXES.length) {
    const formatted =
      display >= 100
        ? display.toFixed(0)
        : display >= 10
          ? display.toFixed(1).replace(/\.0$/, '')
          : display.toFixed(digits).replace(/\.?0+$/, '')
    return `${sign}${formatted}${SUFFIXES[group]}`
  }

  return `${sign}${abs.mantissa.toFixed(digits)}e${abs.exponent}`
}

export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '0%'
  return `${(value * 100).toFixed(digits)}%`
}

export function formatMultiplier(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return 'x1'
  return `x${value.toFixed(digits)}`
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}
