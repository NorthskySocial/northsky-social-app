function matchGifdexPost(url: URL) {
  if (url.protocol !== 'https:' || url.hostname !== 'gifdex.net') return null

  // The share URL contains the owner DID and the GIF's blob CID.
  return url.pathname.match(
    /^\/profile\/(did:plc:[a-z2-7]{24})\/post\/[a-z2-7]{13}:(baf[a-z2-7]+)\/?$/,
  )
}

export function isGifdexUrl(url: URL): boolean {
  return matchGifdexPost(url) !== null
}

export function getGifdexImageUri(url: URL): string | undefined {
  const match = matchGifdexPost(url)
  if (!match) return

  const [, did, cid] = match
  return `https://media.gifdex.net/media/gif/${did}/${cid}.webp`
}
