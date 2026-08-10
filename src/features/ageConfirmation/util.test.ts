import {getAge} from '#/lib/strings/time'
import {MIN_ACCESS_AGE} from '#/ageAssurance/const'
import {
  ADULT_AGE,
  birthdateFromAgeConfirmation,
  isAgeConfirmationComplete,
} from '#/features/ageConfirmation/util'

/*
 * `#/ageAssurance/util` pulls in the server data context, which reaches the
 * session and native animation layers. The helpers under test are pure.
 */
jest.mock('#/ageAssurance/data')

describe('isAgeConfirmationComplete', () => {
  it('is false before the minimum age question is answered', () => {
    expect(
      isAgeConfirmationComplete({
        isOverMinAccessAge: undefined,
        isLegalAdult: undefined,
      }),
    ).toBe(false)
  })

  /* A person under the minimum age never sees the adult question. */
  it('is true after a no to the minimum age question', () => {
    expect(
      isAgeConfirmationComplete({
        isOverMinAccessAge: false,
        isLegalAdult: undefined,
      }),
    ).toBe(true)
  })

  it('is false while the adult question is unanswered', () => {
    expect(
      isAgeConfirmationComplete({
        isOverMinAccessAge: true,
        isLegalAdult: undefined,
      }),
    ).toBe(false)
  })

  it('is true when both questions are answered', () => {
    expect(
      isAgeConfirmationComplete({
        isOverMinAccessAge: true,
        isLegalAdult: false,
      }),
    ).toBe(true)
  })
})

describe('birthdateFromAgeConfirmation', () => {
  it('returns nothing while answers are missing', () => {
    expect(
      birthdateFromAgeConfirmation({
        isOverMinAccessAge: true,
        isLegalAdult: undefined,
      }),
    ).toBeUndefined()
  })

  it('maps a legal adult to the adult age', () => {
    const birthdate = birthdateFromAgeConfirmation({
      isOverMinAccessAge: true,
      isLegalAdult: true,
    })
    expect(getAge(birthdate!)).toBe(ADULT_AGE)
  })

  it('maps a non-adult over the minimum age to the minimum age', () => {
    const birthdate = birthdateFromAgeConfirmation({
      isOverMinAccessAge: true,
      isLegalAdult: false,
    })
    expect(getAge(birthdate!)).toBe(MIN_ACCESS_AGE)
  })

  /*
   * The birthdate lands below the minimum so the existing signup checks block
   * the account without a separate rule.
   */
  it('maps a person under the minimum age below that minimum', () => {
    const birthdate = birthdateFromAgeConfirmation({
      isOverMinAccessAge: false,
      isLegalAdult: undefined,
    })
    expect(getAge(birthdate!)).toBeLessThan(MIN_ACCESS_AGE)
  })

  /* An adult answer cannot override a denial of the minimum age. */
  it('prefers the minimum age denial over a contradictory adult answer', () => {
    const birthdate = birthdateFromAgeConfirmation({
      isOverMinAccessAge: false,
      isLegalAdult: true,
    })
    expect(getAge(birthdate!)).toBeLessThan(MIN_ACCESS_AGE)
  })
})
