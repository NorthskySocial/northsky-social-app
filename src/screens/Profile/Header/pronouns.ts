/**
 * northsky: helpers for the free-form profile pronouns field.
 *
 * Pronouns are stored as the standard `pronouns` text field on the
 * `app.bsky.actor.profile` record.
 */

/** Maximum length (in graphemes) accepted for the pronouns field. */
export const MAX_PRONOUNS = 20

/**
 * Normalize a pronouns input for writing to the profile record. Trailing
 * whitespace is trimmed and an empty value becomes `undefined`, so saving an
 * empty field clears it rather than writing an empty string.
 */
export function normalizePronouns(input: string): string | undefined {
  return input.trimEnd() || undefined
}
