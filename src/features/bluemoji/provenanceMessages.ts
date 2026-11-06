import {type MessageDescriptor} from '@lingui/core'
import {msg} from '@lingui/core/macro'

import {
  ALL_RIGHTS_RESERVED,
  LICENSE_MAX_BYTES,
  licenseError,
  SOURCE_MAX_BYTES,
  sourceError,
} from './provenance'

/*
 * The validation helpers in `provenance.ts` are a copy of the reference
 * implementation and return English strings, which translators cannot reach.
 * So they are used here only to decide *whether* a value is valid; what the
 * user reads comes from the descriptors below, defined where Lingui can extract
 * them.
 */

const byteLength = (s: string) => new TextEncoder().encode(s).length

const INVALID_LICENSE = msg`Enter a valid license, like CC-BY-4.0 or MIT OR Apache-2.0.`
const LICENSE_TOO_LONG = msg`That license is too long.`
const INVALID_SOURCE = msg`Enter an http or https link, without spaces or a username and password.`
const SOURCE_TOO_LONG = msg`That link is too long.`

/** A translatable message if `value` is not a valid license, else null. */
export function licenseProblem(value: string): MessageDescriptor | null {
  const v = value.trim()
  if (!v) return null
  if (byteLength(v) > LICENSE_MAX_BYTES) return LICENSE_TOO_LONG
  return licenseError(v) === null ? null : INVALID_LICENSE
}

/** A translatable message if `value` is not a usable source link, else null. */
export function sourceProblem(value: string): MessageDescriptor | null {
  const v = value.trim()
  if (!v) return null
  if (byteLength(v) > SOURCE_MAX_BYTES) return SOURCE_TOO_LONG
  return sourceError(v) === null ? null : INVALID_SOURCE
}

/**
 * What each common license is, in words. The names themselves (MIT, CC BY) are
 * not translated; the descriptions around them are.
 */
export const LICENSE_DESCRIPTIONS: Record<string, MessageDescriptor> = {
  'CC0-1.0': msg`CC0 1.0: public domain dedication`,
  'CC-BY-4.0': msg`CC BY 4.0: attribution`,
  'CC-BY-SA-4.0': msg`CC BY-SA 4.0: attribution, share-alike`,
  'CC-BY-NC-4.0': msg`CC BY-NC 4.0: attribution, non-commercial`,
  'CC-BY-NC-SA-4.0': msg`CC BY-NC-SA 4.0: non-commercial, share-alike`,
  'CC-BY-ND-4.0': msg`CC BY-ND 4.0: attribution, no derivatives`,
  'CC-BY-NC-ND-4.0': msg`CC BY-NC-ND 4.0: non-commercial, no derivatives`,
  MIT: msg`MIT license`,
  'Apache-2.0': msg`Apache 2.0 license`,
  Unlicense: msg`The Unlicense: public domain`,
  [ALL_RIGHTS_RESERVED]: msg`All rights reserved: no copying`,
}

/** The short text on a license chip. Only "all rights reserved" is words. */
export const ALL_RIGHTS_RESERVED_CHIP = msg`All rights reserved`
