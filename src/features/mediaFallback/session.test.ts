import {renderHook} from '@testing-library/react-native'

import {useAccountMediaSession} from './context'

const image =
  'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:alice/a@jpeg'
const nextImage = image.replace('a@jpeg', 'b@jpeg')
const video = 'https://video.bsky.app/watch/did:plc:alice/blob/playlist.m3u8'

it('shares working routes within the active account and retires them on switch or logout', () => {
  const {result, rerender} = renderHook(
    ({did}: {did: string | undefined}) => useAccountMediaSession(did),
    {initialProps: {did: 'alice'}},
  )
  const first = result.current
  first.rememberRead(image)
  rerender({did: 'alice'})
  expect(result.current.preferredUrl(nextImage)).toBe(
    nextImage.replace('cdn.bsky.app', 'cdn.coffeencode.cc'),
  )
  expect(result.current.preferredUrl(video)).toBe(video)
  first.rememberRead(video)
  expect(
    result.current.preferredUrl(
      video.replace('playlist.m3u8', 'thumbnail.jpg'),
    ),
  ).toContain('video.blacksky.community/stream/')
  expect(first.preferBlackskyUploads).toBe(false)
  rerender({did: 'bob'})
  first.preferBlackskyUploads = true
  expect(result.current.preferBlackskyUploads).toBe(false)
  expect(result.current.preferredUrl(image)).toBe(image)
  rerender({did: 'alice'})
  expect(result.current.preferBlackskyUploads).toBe(false)
  result.current.rememberRead(image)
  rerender({did: undefined})
  expect(result.current.preferredUrl(image)).toBe(image)
  rerender({did: 'alice'})
  expect(result.current.preferredUrl(image)).toBe(image)
})
