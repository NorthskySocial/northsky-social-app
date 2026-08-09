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
  $type?: string
  /** The full snippet text, stored inline. */
  contents?: string
  /** e.g. `test.ts` - the language is inferred from its extension. */
  filename?: string
  description?: string
  createdAt?: string
}
