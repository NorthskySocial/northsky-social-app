import {AgeAssuranceAccess, AgeAssuranceStatus} from '#/ageAssurance/types'
import {getAgeAssuranceRegionConfigForGeolocation} from '#/ageAssurance/util'
import {type app} from '#/lexicons'

jest.mock('#/ageAssurance/data')

/*
 * Platform scoping is applied locally in `util.ts` (the SDK region matcher
 * takes no platform filter). The jest preset is `jest-expo/ios`, so
 * `AGE_ASSURANCE_PLATFORM` resolves to `ios` in these tests.
 */
describe('getAgeAssuranceRegionConfigForGeolocation', () => {
  const region = (
    countryCode: string,
    regionCode?: string,
    platforms?: app.bsky.ageassurance.defs.ConfigRegion['platforms'],
  ): app.bsky.ageassurance.defs.ConfigRegion => ({
    countryCode,
    regionCode,
    platforms,
    minAccessAge: 13,
    rules: [],
  })

  it('skips regions for other platforms and continues matching', () => {
    const web = region('US', undefined, ['web'])
    const ios = region('US', undefined, ['ios'])

    expect(
      getAgeAssuranceRegionConfigForGeolocation(
        {regions: [web, ios]},
        {countryCode: 'US', regionCode: undefined},
      ),
    ).toBe(ios)
  })

  it('matches a region-specific config before a later country config', () => {
    const texas = region('US', 'TX')
    const us = region('US')

    expect(
      getAgeAssuranceRegionConfigForGeolocation(
        {regions: [texas, us]},
        {countryCode: 'US', regionCode: 'TX'},
      ),
    ).toBe(texas)
  })
})

/*
 * Loads `util.ts` with the adult age gate forced to a given value. The flag is
 * a module constant, so each value needs a separate module registry.
 */
function loadUtil(adultAgeGateEnabled: boolean) {
  let mod!: typeof import('#/ageAssurance/util')
  jest.isolateModules(() => {
    jest.doMock('#/ageAssurance/const', () => ({
      ...jest.requireActual('#/ageAssurance/const'),
      ADULT_AGE_GATE_ENABLED: adultAgeGateEnabled,
    }))
    mod = require('#/ageAssurance/util')
  })
  return mod
}

const REGION_CONFIG = {
  countryCode: '*',
  minAccessAge: 13,
  rules: [],
}

/* The state an account gets when age assurance is off. */
const FULL_ACCESS = {
  status: AgeAssuranceStatus.Assured,
  access: AgeAssuranceAccess.Full,
}

/* The state an account gets when age assurance is on and denies access. */
const SAFE_ACCESS = {
  status: AgeAssuranceStatus.Unknown,
  access: AgeAssuranceAccess.Safe,
}

const UNDER_AGE = {declaredAge: 14, birthdate: undefined}

describe('computeAgeAssuranceFlags with the adult age gate off', () => {
  it('ignores an under-18 declared age', () => {
    const {computeAgeAssuranceFlags} = loadUtil(false)
    const flags = computeAgeAssuranceFlags({
      state: FULL_ACCESS,
      regionConfig: REGION_CONFIG,
      metadata: UNDER_AGE,
    })
    expect(flags.isDeclaredUnderAdultAge).toBe(false)
    expect(flags.adultContentDisabled).toBe(false)
    expect(flags.groupChatDisabled).toBe(false)
    expect(flags.chatDisabled).toBe(false)
    expect(flags.isAgeRestricted).toBe(false)
  })

  it('keeps reporting the declared age itself', () => {
    const {computeAgeAssuranceFlags} = loadUtil(false)
    const flags = computeAgeAssuranceFlags({
      state: FULL_ACCESS,
      regionConfig: REGION_CONFIG,
      metadata: UNDER_AGE,
    })
    expect(flags.hasDeclaredAge).toBe(true)
    expect(flags.isOverRegionMinAccessAge).toBe(true)
  })

  /*
   * The two toggles are independent. Age assurance still restricts an account
   * that it denies access to, even with the adult age gate off.
   */
  it('still restricts an account that age assurance denies', () => {
    const {computeAgeAssuranceFlags} = loadUtil(false)
    const flags = computeAgeAssuranceFlags({
      state: SAFE_ACCESS,
      regionConfig: REGION_CONFIG,
      metadata: UNDER_AGE,
    })
    expect(flags.isDeclaredUnderAdultAge).toBe(false)
    expect(flags.isAgeRestricted).toBe(true)
    expect(flags.adultContentDisabled).toBe(true)
    expect(flags.chatDisabled).toBe(true)
  })
})

describe('computeAgeAssuranceFlags with the adult age gate on', () => {
  it('gates an under-18 declared age', () => {
    const {computeAgeAssuranceFlags} = loadUtil(true)
    const flags = computeAgeAssuranceFlags({
      state: FULL_ACCESS,
      regionConfig: REGION_CONFIG,
      metadata: UNDER_AGE,
    })
    expect(flags.isDeclaredUnderAdultAge).toBe(true)
    expect(flags.adultContentDisabled).toBe(true)
    expect(flags.groupChatDisabled).toBe(true)
  })

  /*
   * The other direction of independence. The gate applies even when age
   * assurance is off, which is what grants the full access passed in here.
   */
  it('leaves direct chat alone when age assurance is off', () => {
    const {computeAgeAssuranceFlags} = loadUtil(true)
    const flags = computeAgeAssuranceFlags({
      state: FULL_ACCESS,
      regionConfig: REGION_CONFIG,
      metadata: UNDER_AGE,
    })
    expect(flags.isAgeRestricted).toBe(false)
    expect(flags.chatDisabled).toBe(false)
  })

  it('treats a missing declared age as under age', () => {
    const {computeAgeAssuranceFlags} = loadUtil(true)
    const flags = computeAgeAssuranceFlags({
      state: FULL_ACCESS,
      regionConfig: REGION_CONFIG,
      metadata: undefined,
    })
    expect(flags.isDeclaredUnderAdultAge).toBe(true)
    expect(flags.hasDeclaredAge).toBe(false)
  })
})
