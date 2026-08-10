import {getAge} from '#/lib/strings/time'
import {initialState, reducer, type SignupState} from '#/screens/Signup/state'
import {MIN_ACCESS_AGE} from '#/ageAssurance/const'
import {EMPTY_AGE_CONFIRMATION} from '#/features/ageConfirmation/types'
import {ADULT_AGE} from '#/features/ageConfirmation/util'

/*
 * The reducer is pure, but its module and the birthdate helper reach the
 * session, shell, analytics and age assurance layers, which pull in the native
 * animation code. Stub them so only the reducer runs.
 */
jest.mock('#/ageAssurance/data')
jest.mock('#/state/session', () => ({useSessionApi: jest.fn()}))
jest.mock('#/state/shell', () => ({useOnboardingDispatch: jest.fn()}))
jest.mock('#/analytics', () => ({useAnalytics: jest.fn()}))

function setAgeConfirmation(
  state: SignupState,
  value: SignupState['ageConfirmation'],
): SignupState {
  return reducer(state, {type: 'setAgeConfirmation', value})
}

describe('reducer: setAgeConfirmation', () => {
  it('leaves the date alone while an answer is missing', () => {
    const next = setAgeConfirmation(initialState, {
      isOverMinAccessAge: true,
      isLegalAdult: undefined,
    })
    expect(next.ageConfirmation.isOverMinAccessAge).toBe(true)
    expect(next.dateOfBirth).toBe(initialState.dateOfBirth)
  })

  it('derives the adult age from a complete adult answer', () => {
    const next = setAgeConfirmation(initialState, {
      isOverMinAccessAge: true,
      isLegalAdult: true,
    })
    expect(getAge(next.dateOfBirth)).toBe(ADULT_AGE)
  })

  it('derives the minimum age from a complete non-adult answer', () => {
    const next = setAgeConfirmation(initialState, {
      isOverMinAccessAge: true,
      isLegalAdult: false,
    })
    expect(getAge(next.dateOfBirth)).toBe(MIN_ACCESS_AGE)
  })

  /* The date must block the step, so signup needs no rule of its own. */
  it('derives an age below the minimum from a denial', () => {
    const next = setAgeConfirmation(initialState, {
      isOverMinAccessAge: false,
      isLegalAdult: undefined,
    })
    expect(getAge(next.dateOfBirth)).toBeLessThan(MIN_ACCESS_AGE)
  })

  it('derives a new date when the answer changes', () => {
    const adult = setAgeConfirmation(initialState, {
      isOverMinAccessAge: true,
      isLegalAdult: true,
    })
    const minor = setAgeConfirmation(adult, {
      isOverMinAccessAge: true,
      isLegalAdult: false,
    })
    expect(getAge(minor.dateOfBirth)).toBe(MIN_ACCESS_AGE)
  })

  it('starts with no answers', () => {
    expect(initialState.ageConfirmation).toEqual(EMPTY_AGE_CONFIRMATION)
  })
})
