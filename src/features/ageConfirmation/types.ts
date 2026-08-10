/**
 * The answers to the age confirmation questions. `undefined` means the person
 * has not answered yet.
 */
export type AgeConfirmation = {
  /** The person confirms they are at least `MIN_ACCESS_AGE` years old. */
  isOverMinAccessAge: boolean | undefined
  /**
   * The person confirms they are a legal adult in the country or state where
   * they live. The app applies a single threshold of `ADULT_AGE`, because the
   * downstream rules only compare against 18.
   */
  isLegalAdult: boolean | undefined
}

export const EMPTY_AGE_CONFIRMATION: AgeConfirmation = {
  isOverMinAccessAge: undefined,
  isLegalAdult: undefined,
}
