import {t} from '@lingui/core/macro'

import {isNetworkError} from '#/lib/strings/errors'
import {BluemojiUploadError} from '../upload'

/** A message for the user for whatever went wrong installing or saving. */
export function describeError(e: unknown): string {
  if (e instanceof BluemojiUploadError) {
    if (e.code === 'alias-taken') {
      return t`You already have an emoji with that name. Pick a different name.`
    }
    if (e.code === 'invalid-alias' || e.code === 'invalid-provenance') {
      return e.message
    }
    if (e.code === 'not-copyable') {
      return t`The creator has not allowed this to be copied.`
    }
  }
  if (isNetworkError(e)) {
    return t`Could not reach the network. Check your connection.`
  }
  return t`Something went wrong. Please try again.`
}
