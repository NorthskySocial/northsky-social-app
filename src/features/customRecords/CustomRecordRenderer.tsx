import {createElement} from 'react'
import {type AppBskyFeedDefs} from '@atproto/api'

import {getCustomRecordRenderer} from './registry'

/**
 * Renders a raw embed/record via a registered custom-lexicon renderer.
 *
 * Returns null when the embed has no `$type` or no renderer is registered for
 * it, which preserves upstream's behavior of rendering nothing for unknown
 * embeds.
 */
export function CustomRecordRenderer({
  embed,
}: {
  embed: AppBskyFeedDefs.PostView['embed']
}) {
  const $type = typeof embed?.$type === 'string' ? embed.$type : undefined
  if (!$type) return null

  const renderer = getCustomRecordRenderer($type)
  if (!renderer) return null

  // `renderer` is a stable reference retrieved from the registry, not a
  // component created during render, so dispatch via createElement.
  return createElement(renderer, {record: embed as Record<string, unknown>})
}
