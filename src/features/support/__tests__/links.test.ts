import {
  encodeDid,
  getDonationUrl,
  getPresetAmounts,
  parseDonationsConfig,
} from '#/features/support/links'

jest.mock('#/logger', () => ({
  logger: {warn: jest.fn()},
}))

const CONFIG = {
  currency: 'usd',
  oneTime: {
    custom: 'https://donate.stripe.com/custom',
    '1000': 'https://donate.stripe.com/ten',
    '500': 'https://donate.stripe.com/five',
  },
  monthly: {
    '500': 'https://donate.stripe.com/five-monthly',
  },
}

describe('parseDonationsConfig', () => {
  it('returns null when unset', () => {
    expect(parseDonationsConfig(undefined)).toBeNull()
    expect(parseDonationsConfig('')).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    expect(parseDonationsConfig('{nope')).toBeNull()
  })

  it('returns null when a link is not a URL', () => {
    expect(
      parseDonationsConfig(
        '{"currency":"usd","oneTime":{"500":"lain-iwakura"}}',
      ),
    ).toBeNull()
  })

  it('parses a links-only config', () => {
    expect(parseDonationsConfig(JSON.stringify(CONFIG))).toEqual(CONFIG)
  })

  it('parses the fields the server adds', () => {
    const served = {
      ...CONFIG,
      checkout: true,
      publishableKey: 'pk_test_motoko',
      presetsCents: [500, 1000],
      minCents: 100,
      maxCents: 100000,
    }
    expect(parseDonationsConfig(JSON.stringify(served))).toEqual(served)
  })
})

describe('getPresetAmounts', () => {
  it('sorts amounts and skips the custom link', () => {
    expect(getPresetAmounts(CONFIG, 'oneTime')).toEqual([500, 1000])
  })

  it('returns an empty list for an interval without links', () => {
    expect(getPresetAmounts({currency: 'usd'}, 'monthly')).toEqual([])
  })
})

describe('getDonationUrl', () => {
  it('resolves a configured amount', () => {
    expect(getDonationUrl(CONFIG, 'oneTime', 500)).toBe(
      'https://donate.stripe.com/five',
    )
  })

  it('returns undefined for a tier that the deployment did not configure', () => {
    expect(getDonationUrl(CONFIG, 'monthly', 1000)).toBeUndefined()
  })

  it('has no custom link for monthly', () => {
    expect(getDonationUrl(CONFIG, 'monthly', 'custom')).toBeUndefined()
  })

  it('appends the encoded did when signed in', () => {
    expect(getDonationUrl(CONFIG, 'oneTime', 500, 'did:plc:motoko')).toBe(
      'https://donate.stripe.com/five?client_reference_id=ZGlkOnBsYzptb3Rva28',
    )
  })

  it('preserves an existing query string', () => {
    const config = {
      currency: 'usd',
      oneTime: {'500': 'https://donate.stripe.com/five?locale=en'},
    }
    expect(getDonationUrl(config, 'oneTime', 500, 'did:plc:motoko')).toBe(
      'https://donate.stripe.com/five?locale=en&client_reference_id=ZGlkOnBsYzptb3Rva28',
    )
  })
})

describe('encodeDid', () => {
  it('produces a value Stripe accepts and that decodes back', () => {
    const did = 'did:plc:kusanagi'
    const encoded = encodeDid(did)

    expect(encoded).toMatch(/^[A-Za-z0-9\-_]+$/)
    expect(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))).toBe(did)
  })
})
