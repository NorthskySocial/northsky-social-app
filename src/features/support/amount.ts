export const DEFAULT_MIN_CENTS = 100
export const DEFAULT_MAX_CENTS = 100000
export const DEFAULT_AMOUNT_CENTS = 500

/**
 * The preset to select first. A deployment can set its own presets, so the
 * default is used only when it is one of them. Otherwise no preset button would
 * look selected, and the first preset is chosen instead.
 */
export function defaultPresetCents(presets: number[]): number {
  if (presets.includes(DEFAULT_AMOUNT_CENTS)) return DEFAULT_AMOUNT_CENTS
  return presets[0] ?? DEFAULT_AMOUNT_CENTS
}

/**
 * Reads a typed amount into the smallest currency unit. Returns null when the
 * text is not an amount, so the caller can keep the field in an invalid state
 * rather than guess.
 */
export function parseAmountInput(input: string): number | null {
  const trimmed = input.trim().replace(',', '.')
  if (!/^\d*\.?\d{0,2}$/.test(trimmed) || trimmed === '' || trimmed === '.') {
    return null
  }
  const cents = Math.round(Number(trimmed) * 100)
  return Number.isFinite(cents) ? cents : null
}

export function clampAmountCents(
  cents: number,
  minCents = DEFAULT_MIN_CENTS,
  maxCents = DEFAULT_MAX_CENTS,
): number {
  return Math.min(Math.max(cents, minCents), maxCents)
}

export function isAmountInRange(
  cents: number,
  minCents = DEFAULT_MIN_CENTS,
  maxCents = DEFAULT_MAX_CENTS,
): boolean {
  return cents >= minCents && cents <= maxCents
}
