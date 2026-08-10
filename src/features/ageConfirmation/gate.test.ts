import {resolveAgeConfirmationGate} from '#/features/ageConfirmation/gate'

/*
 * `resolveAgeConfirmationGate` is pure, but its module pulls in the session,
 * age assurance and storage layers. Stub them with factories so the real
 * modules, and the native code they load, stay out of the test.
 */
jest.mock('#/state/session', () => ({useSession: jest.fn()}))
jest.mock('#/ageAssurance/data', () => ({
  useOtherRequiredDataQuery: jest.fn(),
}))
jest.mock('#/storage', () => ({account: {}, useStorage: jest.fn()}))

/* An account that has never declared an age, on a normal session. */
const NEEDS_CONFIRMATION = {
  isGateEnabled: true,
  hasSession: true,
  isAppPasswordSession: false,
  hasAcknowledgedNotice: false,
  isReadSuccessful: true,
  birthdate: undefined,
}

describe('resolveAgeConfirmationGate', () => {
  it('asks an account that has never declared an age', () => {
    expect(resolveAgeConfirmationGate(NEEDS_CONFIRMATION)).toBe('confirm')
  })

  it('asks nothing when the brand flag is off', () => {
    expect(
      resolveAgeConfirmationGate({
        ...NEEDS_CONFIRMATION,
        isGateEnabled: false,
      }),
    ).toBe('none')
  })

  it('asks nothing without a session', () => {
    expect(
      resolveAgeConfirmationGate({...NEEDS_CONFIRMATION, hasSession: false}),
    ).toBe('none')
  })

  it('asks nothing once a birthdate is known', () => {
    expect(
      resolveAgeConfirmationGate({
        ...NEEDS_CONFIRMATION,
        birthdate: '1994-04-16T00:00:00.000Z',
      }),
    ).toBe('none')
  })

  /*
   * The read is pending or it failed. Blocking here would lock an account out
   * of the app over a network error, so the gate opens instead.
   */
  it('opens while the read has not succeeded', () => {
    expect(
      resolveAgeConfirmationGate({
        ...NEEDS_CONFIRMATION,
        isReadSuccessful: false,
      }),
    ).toBe('none')
  })

  it('opens on a failed read even for an app password session', () => {
    expect(
      resolveAgeConfirmationGate({
        ...NEEDS_CONFIRMATION,
        isAppPasswordSession: true,
        isReadSuccessful: false,
      }),
    ).toBe('none')
  })

  describe('app password sessions', () => {
    it('shows the limits notice', () => {
      expect(
        resolveAgeConfirmationGate({
          ...NEEDS_CONFIRMATION,
          isAppPasswordSession: true,
        }),
      ).toBe('appPasswordNotice')
    })

    it('stops showing the notice once accepted', () => {
      expect(
        resolveAgeConfirmationGate({
          ...NEEDS_CONFIRMATION,
          isAppPasswordSession: true,
          hasAcknowledgedNotice: true,
        }),
      ).toBe('none')
    })

    /*
     * An app password cannot write personal details, so this session must
     * never reach the questions.
     */
    it('never asks the questions', () => {
      const gate = resolveAgeConfirmationGate({
        ...NEEDS_CONFIRMATION,
        isAppPasswordSession: true,
      })
      expect(gate).not.toBe('confirm')
    })

    it('ignores an acknowledgement on a normal session', () => {
      expect(
        resolveAgeConfirmationGate({
          ...NEEDS_CONFIRMATION,
          hasAcknowledgedNotice: true,
        }),
      ).toBe('confirm')
    })
  })
})
