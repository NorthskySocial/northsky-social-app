import {Image} from 'expo-image'

import {useA11y} from '#/state/a11y'
import {useAutoplayDisabled} from '#/state/preferences'
import {web} from '#/alf'
import {useAdultEmojiVisible} from './adultPref'
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
 * Emoji flagged `adultOnly` on the source record are shown as text unless the
 * user has allowed them in Moderation (and has adult content enabled). There is
 * no tap-to-reveal inside running text, so the default is to not draw the image.
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
  const adultVisible = useAdultEmojiVisible()
  const {reduceMotionEnabled} = useA11y()
  const autoplayDisabled = useAutoplayDisabled()
  const animate = !reduceMotionEnabled && !autoplayDisabled

  const cid =
    item && (!item.adultOnly || adultVisible)
      ? pickInlineCid(item.formats, {animate})
      : undefined
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
