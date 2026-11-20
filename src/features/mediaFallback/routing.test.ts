import {fallbackMediaUrl, isAccessDenial} from './routing'

it('preserves image presets and maps public video paths to Blacksky streams', () => {
  const path = '/img/feed_fullsize/plain/did:plc:alice/blob@jpeg'
  expect(fallbackMediaUrl('https://cdn.bsky.app' + path)).toBe(
    'https://cdn.coffeencode.cc' + path,
  )
  for (const name of ['playlist.m3u8', 'thumbnail.jpg']) {
    expect(
      fallbackMediaUrl(
        'https://video.bsky.app/watch/did%3Aplc%3Aalice/blob/' + name,
      ),
    ).toBe(
      'https://video.blacksky.community/stream/did%3Aplc%3Aalice/blob/' + name,
    )
  }
  for (const uri of [
    'https://cdn.bsky.app' + path + '?token=x',
    'https://cdn.coffeencode.cc' + path,
    'https://other.example' + path,
  ])
    expect(fallbackMediaUrl(uri)).toBeUndefined()
})

it('recognizes authorization and moderation denials', () => {
  for (const error of [
    {status: 403},
    {status: 401},
    {error: 'AccountTakedown'},
    new Error('Account taken down'),
  ])
    expect(isAccessDenial(error)).toBe(true)
  for (const error of [
    {status: 429},
    {status: 503},
    new Error('Invalid video'),
  ])
    expect(isAccessDenial(error)).toBe(false)
})
