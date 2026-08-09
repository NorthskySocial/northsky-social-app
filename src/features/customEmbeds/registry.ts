import {type AppBskyEmbedExternal} from '@atproto/api'

import {tangledStringHandler} from '#/features/customEmbeds/tangledString'
import {type CustomEmbedHandler} from '#/features/customEmbeds/types'

/**
 * northsky: ordered list of custom embed handlers. To add one, implement a
 * handler in its own directory and append it here. The first handler whose
 * `match` returns true wins; otherwise upstream's default external embed
 * rendering takes over.
 */
const handlers: CustomEmbedHandler[] = [tangledStringHandler]

export function matchCustomEmbed(
  view: AppBskyEmbedExternal.ViewExternal,
): CustomEmbedHandler | null {
  return handlers.find(handler => handler.match(view)) ?? null
}
