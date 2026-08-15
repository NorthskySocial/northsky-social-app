import {
  clampAmountCents,
  DEFAULT_AMOUNT_CENTS,
  defaultPresetCents,
  isAmountInRange,
  parseAmountInput,
} from '#/features/support/amount'

describe('parseAmountInput', () => {
  it('reads whole and fractional amounts', () => {
    expect(parseAmountInput('7')).toBe(700)
    expect(parseAmountInput('7.5')).toBe(750)
    expect(parseAmountInput('7.05')).toBe(705)
    expect(parseAmountInput(' 12 ')).toBe(1200)
  })

  it('accepts a comma as the decimal separator', () => {
    expect(parseAmountInput('7,50')).toBe(750)
  })

  it('rejects text that is not an amount', () => {
    for (const input of ['', '.', 'ten', '7.005', '-5', '1e3', '$7']) {
      expect(parseAmountInput(input)).toBeNull()
    }
  })
})

describe('clampAmountCents', () => {
  it('holds the amount inside the range', () => {
    expect(clampAmountCents(50, 100, 5000)).toBe(100)
    expect(clampAmountCents(9999, 100, 5000)).toBe(5000)
    expect(clampAmountCents(700, 100, 5000)).toBe(700)
  })
})

describe('defaultPresetCents', () => {
  it('picks the default when the deployment offers it', () => {
    expect(defaultPresetCents([500, 1000, 2500, 5000])).toBe(
      DEFAULT_AMOUNT_CENTS,
    )
    expect(defaultPresetCents([300, 500])).toBe(DEFAULT_AMOUNT_CENTS)
  })

  it('falls back to the first preset when the default is absent', () => {
    expect(defaultPresetCents([300, 1000])).toBe(300)
  })
})

describe('isAmountInRange', () => {
  it('includes both bounds', () => {
    expect(isAmountInRange(100, 100, 5000)).toBe(true)
    expect(isAmountInRange(5000, 100, 5000)).toBe(true)
    expect(isAmountInRange(99, 100, 5000)).toBe(false)
    expect(isAmountInRange(5001, 100, 5000)).toBe(false)
  })
})
