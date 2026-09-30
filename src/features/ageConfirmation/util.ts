import {MIN_ACCESS_AGE} from '#/ageAssurance/const'
import {getBirthdateStringFromAge} from '#/ageAssurance/util'
import {type AgeConfirmation} from '#/features/ageConfirmation/types'

/**
 * The age the app treats as adult. The confirmation question asks about the
 * local legal adult age, which is 18 in most places and higher in a few. The
 * app stores one threshold because every downstream rule compares against 18.
 */
export const ADULT_AGE = 18

/**
 * Whether the person answered every question that applies. A person who is
 * under the minimum access age does not get the adult question, so their
 * answer set is complete after one answer.
 */
export function isAgeConfirmationComplete({
  isOverMinAccessAge,
  isLegalAdult,
}: AgeConfirmation): boolean {
  if (isOverMinAccessAge === undefined) return false
  if (!isOverMinAccessAge) return true
  return isLegalAdult !== undefined
}

/**
 * Applies an answer to the minimum age question. A No clears the adult
 * answer, because a person under the minimum age never answers that question.
 */
export function withMinAccessAgeAnswer(
  current: AgeConfirmation,
  isOverMinAccessAge: boolean,
): AgeConfirmation {
  return {
    isOverMinAccessAge,
    isLegalAdult: isOverMinAccessAge ? current.isLegalAdult : undefined,
  }
}

/**
 * Applies an answer to the adult question. The minimum age answer stays as it
 * is, because the question only appears after a Yes to it.
 */
export function withLegalAdultAnswer(
  current: AgeConfirmation,
  isLegalAdult: boolean,
): AgeConfirmation {
  return {
    isOverMinAccessAge: current.isOverMinAccessAge,
    isLegalAdult,
  }
}

/**
 * Converts the answers into the birthdate the rest of the app already reads.
 *
 * The app has no way to store a boolean age declaration. The `declaredAge`
 * preference (`BskyPreferences` in `@bsky/sdk`) is read-only, and the PDS
 * derives it from the birthdate that `setPersonalDetails` writes. So the
 * answers become a synthetic birthdate,
 * and every consumer of `declaredAge` keeps working without a change.
 *
 * A person who denies the minimum access age gets a birthdate below that
 * minimum. This makes the existing signup checks block the account, so the
 * caller does not need its own rule for that case.
 *
 * Returns `undefined` while answers are missing.
 */
export function birthdateFromAgeConfirmation(
  confirmation: AgeConfirmation,
): Date | undefined {
  const {isOverMinAccessAge, isLegalAdult} = confirmation
  if (!isAgeConfirmationComplete(confirmation)) return undefined
  if (!isOverMinAccessAge) {
    return new Date(getBirthdateStringFromAge(MIN_ACCESS_AGE - 1))
  }
  return new Date(
    getBirthdateStringFromAge(isLegalAdult ? ADULT_AGE : MIN_ACCESS_AGE),
  )
}
