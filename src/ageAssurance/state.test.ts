<<<<<<< HEAD
import {AgeAssuranceAccess, AgeAssuranceStatus} from '#/ageAssurance/types'
import {app} from '#/lexicons'

/*
 * `computeAgeAssuranceState` is pure, but its module pulls in the session,
 * geolocation and storage layers. Stub them with factories so the real
 * modules, and the native code they load, stay out of the test.
 */
jest.mock('#/ageAssurance/data')
jest.mock('#/state/session', () => ({useSession: jest.fn()}))
jest.mock('#/geolocation', () => ({useGeolocation: jest.fn()}))
jest.mock('#/storage', () => ({device: {get: jest.fn()}}))

/*
 * Loads `state.ts` with the brand flag forced to a given value. The flag is a
 * module constant, so each value needs a separate module registry.
 */
function loadState(enabled: boolean) {
  let mod!: typeof import('#/ageAssurance/state')
  jest.isolateModules(() => {
    jest.doMock('#/ageAssurance/const', () => ({
      ...jest.requireActual('#/ageAssurance/const'),
      AGE_ASSURANCE_ENABLED: enabled,
    }))
    mod = require('#/ageAssurance/state')
  })
  return mod
}

/*
 * A region that denies access to everybody. If the disable flag works, this
 * config must not change the result for a signed-in account.
 */
const DENY_ALL_CONFIG = {
  regions: [
    {
      countryCode: 'GB',
      minAccessAge: 18,
      rules: [
        app.bsky.ageassurance.defs.configRegionRuleDefault.build({
          access: AgeAssuranceAccess.None,
        }),
      ],
    },
  ],
}

const GB = {countryCode: 'GB', regionCode: undefined}

describe('computeAgeAssuranceState with age assurance off', () => {
  it('grants full access to a signed-in account the rules would deny', () => {
    const {computeAgeAssuranceState} = loadState(false)
    expect(
      computeAgeAssuranceState({
        hasSession: true,
        geolocation: GB,
        config: DENY_ALL_CONFIG,
        metadata: {declaredAge: 14, birthdate: undefined},
      }),
    ).toEqual({
      status: AgeAssuranceStatus.Assured,
      access: AgeAssuranceAccess.Full,
    })
  })

  it('grants full access even when the server reports a blocked account', () => {
    const {computeAgeAssuranceState} = loadState(false)
    expect(
      computeAgeAssuranceState({
        hasSession: true,
        geolocation: GB,
        config: DENY_ALL_CONFIG,
        state: {status: 'blocked', access: 'none'},
      }),
    ).toEqual({
      status: AgeAssuranceStatus.Assured,
      access: AgeAssuranceAccess.Full,
    })
  })

  it('grants full access when the config fetch failed', () => {
    const {computeAgeAssuranceState} = loadState(false)
    expect(
      computeAgeAssuranceState({
        hasSession: true,
        geolocation: GB,
      }),
    ).toEqual({
      status: AgeAssuranceStatus.Assured,
      access: AgeAssuranceAccess.Full,
    })
  })

  /*
   * Logged-out moderation defaults are not an age assurance rule, so the flag
   * must not change them.
   */
  it('keeps safe access for logged-out visitors', () => {
    const {computeAgeAssuranceState} = loadState(false)
    expect(
      computeAgeAssuranceState({
        hasSession: false,
        geolocation: GB,
        config: DENY_ALL_CONFIG,
      }),
    ).toEqual({
      status: AgeAssuranceStatus.Unknown,
      access: AgeAssuranceAccess.Safe,
    })
  })
})

describe('computeAgeAssuranceState with age assurance on', () => {
  it('applies the region rules again', () => {
    const {computeAgeAssuranceState} = loadState(true)
    expect(
      computeAgeAssuranceState({
        hasSession: true,
        geolocation: GB,
        config: DENY_ALL_CONFIG,
        metadata: {declaredAge: 14, birthdate: undefined},
      }),
    ).toEqual({
      lastInitiatedAt: undefined,
=======
import {computeAgeAssuranceState} from '#/ageAssurance/state'
import {AgeAssuranceAccess, AgeAssuranceStatus} from '#/ageAssurance/types'

jest.mock('#/ageAssurance/data', () => ({}))
jest.mock('#/ageAssurance/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
  },
}))
jest.mock('#/state/session', () => ({}))

const geolocation = {
  countryCode: undefined,
  regionCode: undefined,
}

describe('computeAgeAssuranceState', () => {
  it('computes access while required account data is pending', () => {
    expect(
      computeAgeAssuranceState({
        hasSession: true,
        geolocation,
        config: {regions: []},
        otherRequiredDataStatus: 'pending',
      }),
    ).toMatchObject({
>>>>>>> upstream/main
      status: AgeAssuranceStatus.Unknown,
      access: AgeAssuranceAccess.None,
    })
  })
<<<<<<< HEAD
=======

  it('denies access when required account data fails', () => {
    expect(
      computeAgeAssuranceState({
        hasSession: true,
        geolocation,
        config: {regions: []},
        otherRequiredDataStatus: 'error',
      }),
    ).toEqual({
      status: AgeAssuranceStatus.Unknown,
      access: AgeAssuranceAccess.None,
      error: 'account-data',
    })
  })

  it('computes access after a successful response without a birthdate', () => {
    expect(
      computeAgeAssuranceState({
        hasSession: true,
        geolocation,
        config: {regions: []},
        metadata: {birthdate: undefined},
        otherRequiredDataStatus: 'success',
      }),
    ).toMatchObject({
      status: AgeAssuranceStatus.Unknown,
      access: AgeAssuranceAccess.None,
    })
  })

  it('preserves authoritative terminal server state without account data', () => {
    expect(
      computeAgeAssuranceState({
        hasSession: true,
        geolocation: {countryCode: 'AA', regionCode: undefined},
        config: {
          regions: [
            {
              countryCode: 'AA',
              minAccessAge: 13,
              rules: [],
            },
          ],
        },
        state: {status: 'blocked', access: 'none'},
        otherRequiredDataStatus: 'error',
      }),
    ).toMatchObject({
      status: AgeAssuranceStatus.Blocked,
      access: AgeAssuranceAccess.None,
    })
  })
>>>>>>> upstream/main
})
