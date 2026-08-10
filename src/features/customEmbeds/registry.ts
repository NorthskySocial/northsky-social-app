import {type ComponentType} from 'react'
import {type AppBskyEmbedExternal} from '@atproto/api'

import {tangledStringHandler} from '#/features/customEmbeds/tangledString'
import {
  type CustomEmbedComponentProps,
  type CustomEmbedHandler,
} from '#/features/customEmbeds/types'

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

/**
 * The component the composer should render for `view`, or null to leave it to
 * upstream's link card.
 *
 * A handler that defines `Preview` gets it; one that does not falls back to its
 * full card, which is the right default for a card cheap enough to build while
 * composing.
 */
export function matchCustomEmbedPreview(
  view: AppBskyEmbedExternal.ViewExternal,
): ComponentType<CustomEmbedComponentProps> | null {
  const handler = matchCustomEmbed(view)
  if (!handler) return null
  return handler.Preview ?? handler.Component
}
