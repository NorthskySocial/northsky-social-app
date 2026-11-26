import {
  getGifdexImageUri,
  isGifdexUrl,
} from '#/features/customEmbeds/gifdex/detect'
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
    matches: isGifdexUrl,
    getImageUri: getGifdexImageUri,
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
