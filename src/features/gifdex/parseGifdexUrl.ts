import {type EmbedPlayerParams} from '#/lib/strings/embed-player'

export function parseGifdexUrl(url: URL): EmbedPlayerParams | undefined {
  if (url.protocol !== 'https:' || url.hostname !== 'gifdex.net') return

  // The share URL contains the owner DID and the GIF's blob CID.
  const match = url.pathname.match(
    /^\/profile\/(did:plc:[a-z2-7]{24})\/post\/[a-z2-7]{13}:(baf[a-z2-7]+)\/?$/,
  )
  if (!match) return

  const [, did, cid] = match
  return {
    type: 'gifdex_gif',
    source: 'gifdex',
    isGif: true,
    playerUri: `https://media.gifdex.net/media/gif/${did}/${cid}.webp`,
  }
}
