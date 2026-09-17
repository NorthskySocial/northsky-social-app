import {
  DEFAULT_INTERVAL,
  defaultLinkInterval,
  type DonationsConfig,
  encodeDid,
  getDonationUrl,
  getPresetAmounts,
  parseDonationsConfig,
} from '#/features/support/links'

jest.mock('#/logger', () => ({
  logger: {warn: jest.fn()},
}))

const CONFIG: DonationsConfig = {
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
      portalUrl: 'https://billing.stripe.com/p/login/tetsuo',
    }
    expect(parseDonationsConfig(JSON.stringify(served))).toEqual(served)
  })

  it('keeps the portal url when checkout is off', () => {
    expect(
      parseDonationsConfig(
        '{"currency":"usd","checkout":false,"portalUrl":"https://billing.stripe.com/p/login/tetsuo"}',
      ),
    ).toEqual({
      currency: 'usd',
      checkout: false,
      portalUrl: 'https://billing.stripe.com/p/login/tetsuo',
    })
  })

  it('drops a bad portal url but keeps the rest of the config', () => {
    for (const bad of [
      'akira',
      'billing.stripe.com/p/login/tetsuo',
      'http://billing.stripe.com/p/login/tetsuo',
      'javascript:alert(1)',
    ]) {
      expect(
        parseDonationsConfig(
          JSON.stringify({currency: 'usd', checkout: true, portalUrl: bad}),
        ),
      ).toEqual({currency: 'usd', checkout: true})
    }
  })
})

describe('defaultLinkInterval', () => {
  it('starts on monthly when monthly links exist', () => {
    expect(defaultLinkInterval(CONFIG)).toBe('monthly')
    expect(DEFAULT_INTERVAL).toBe('monthly')
  })

  it('starts on one-time when no monthly link exists', () => {
    expect(
      defaultLinkInterval({currency: 'usd', oneTime: CONFIG.oneTime}),
    ).toBe('oneTime')
    expect(defaultLinkInterval({currency: 'usd'})).toBe('oneTime')
  })

  it('ignores a monthly section that has only a custom link', () => {
    expect(
      defaultLinkInterval({
        currency: 'usd',
        monthly: {custom: 'https://donate.stripe.com/custom-monthly'},
      }),
    ).toBe('oneTime')
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
    const config: DonationsConfig = {
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
