import {Image} from 'expo-image'

import {web} from '#/alf'
import {bluemojiImageUrl, pickInlineCid} from './api'
import {useBluemojiItem} from './queries'
import {type BluemojiFacetFeature} from './types'

/**
 * Renders a `blue.moji.richtext.facet` inline in post text.
 *
 * The facet is self-attested by whoever wrote the post, so nothing is drawn
 * from it directly: the image, alt text and content-warning flag all come from
 * the AppView's copy of the emoji record. While that loads, if it fails, or if
 * the emoji is gone, the colon-wrapped alias shows instead, which is how
 * unsupported facets degrade elsewhere.
 *
 * Emoji flagged `adultOnly` on the source record are shown as text. There is
 * no tap-to-reveal inside running text, so the safe fallback is to not draw
 * the image.
 */
export function BluemojiInline({
  feature,
  fallbackText,
  size,
}: {
  feature: BluemojiFacetFeature
  fallbackText: string
  /** Rendered height and width in px; usually a little over the font size. */
  size: number
}) {
  const {data: item} = useBluemojiItem(feature.did, feature.name)

  const cid = item && !item.adultOnly ? pickInlineCid(item.formats) : undefined
  if (!item || !cid) return <>{fallbackText}</>

  return (
    <Image
      source={{uri: bluemojiImageUrl(item.did, cid)}}
      alt={item.alt || item.name}
      contentFit="contain"
      cachePolicy="memory-disk"
      style={[{width: size, height: size}, web({verticalAlign: 'middle'})]}
    />
  )
}
