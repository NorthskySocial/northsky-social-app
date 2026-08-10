/**
 * Constants and types for Tangled "strings" - sharable code snippets on
 * atproto. See https://tangled.org. A string's code lives inline in the record
 * (`contents`), so a client only needs to read the record to render it - no
 * blob fetch.
 */

export const STRING_COLLECTION = 'sh.tangled.string'

/**
 * Subset of the `sh.tangled.string` record we render. The record may carry more
 * fields; only what the card reads is typed here.
 */
export type TangledStringValue = {
  /** The full snippet text, stored inline. An empty string is a valid snippet. */
  contents: string
  /** e.g. `test.ts` - the language is inferred from its extension. */
  filename?: string
  description?: string
}

/**
 * Checks a record value read from another repo before the card renders it.
 *
 * The value is external data with no schema guarantee, so every field the card
 * touches is verified here: `contents` is split into lines and the rest reach a
 * `<Text>`. Returns null when the record cannot be rendered, which the query
 * turns into its error state.
 */
export function parseTangledStringValue(
  value: unknown,
): TangledStringValue | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.contents !== 'string') return null
  return {
    contents: record.contents,
    // A non-string here is dropped rather than rejected: the snippet still
    // reads fine without a filename, only its language detection is lost.
    ...(typeof record.filename === 'string'
      ? {filename: record.filename}
      : null),
    ...(typeof record.description === 'string'
      ? {description: record.description}
      : null),
  }
}
