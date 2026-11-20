import {BRAND} from '#/brand/config'

export function fallbackMediaUrl(uri: string) {
  // Only forward public media paths. AppView URLs can contain credentials.
  const image =
    /^https:\/\/cdn\.bsky\.app(\/img\/[\w-]+\/plain\/[^/?#]+\/[\w@.-]+)$/.exec(
      uri,
    )
  if (image) return BRAND.fallbackImageCdn + image[1]
  const video =
    /^https:\/\/video\.bsky\.app\/watch\/([^/?#]+)\/([\w-]+)\/(playlist\.m3u8|thumbnail\.jpg)$/.exec(
      uri,
    )
  if (video)
    return BRAND.fallbackVideoService + '/stream/' + video.slice(1).join('/')
}

export function isAccessDenial(error: unknown) {
  if (!error || typeof error !== 'object') return false
  if ('status' in error && (error.status === 403 || error.status === 401))
    return true
  return ['error', 'message'].some(key =>
    /account[ _-]*(?:is |has been )?(taken?[ _-]*down|suspended)|user is not allowed to upload videos/i.test(
      String(Reflect.get(error, key)),
    ),
  )
}
