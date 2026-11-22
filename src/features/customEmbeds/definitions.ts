import {isTangledStringUrl} from '#/features/customEmbeds/tangledString/detect'

/**
 * Register custom link embeds here. Animated image providers share playback,
 * consent, and preferences. Rich cards supply their own renderer.
 */
export const customLinkEmbeds = {
  tangledString: {
    presentation: 'richCard',
    matches: isTangledStringUrl,
  },
  gifdex: {
    presentation: 'animatedImage',
    label: 'Gifdex',
    getImageUri: parseGifdexUrl,
  },
} as const

type CustomLinkEmbeds = typeof customLinkEmbeds
type AnimatedImageProvider = Extract<
  CustomLinkEmbeds[keyof CustomLinkEmbeds],
  {presentation: 'animatedImage'}
>

export type AnimatedImageSource = {
  [
    K in keyof CustomLinkEmbeds
  ]: CustomLinkEmbeds[K] extends AnimatedImageProvider ? K : never
}[keyof CustomLinkEmbeds]

export const animatedImageProviders = Object.entries(customLinkEmbeds).filter(
  (entry): entry is [AnimatedImageSource, AnimatedImageProvider] =>
    entry[1].presentation === 'animatedImage',
)

function parseGifdexUrl(url: URL) {
  if (url.protocol !== 'https:' || url.hostname !== 'gifdex.net') return

  // The share URL contains the owner DID and the GIF's blob CID.
  const match = url.pathname.match(
    /^\/profile\/(did:plc:[a-z2-7]{24})\/post\/[a-z2-7]{13}:(baf[a-z2-7]+)\/?$/,
  )
  if (!match) return

  const [, did, cid] = match
  return `https://media.gifdex.net/media/gif/${did}/${cid}.webp`
}
