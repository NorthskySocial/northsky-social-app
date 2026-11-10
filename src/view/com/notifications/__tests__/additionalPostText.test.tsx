import {describe, expect, it, jest} from '@jest/globals'
import {render} from '@testing-library/react-native'

import {AdditionalPostText} from '../NotificationFeedItem'

/*
 * The "liked / reposted your post" rows preview the post's text. They must
 * hand `RichText` the record's facets: given a bare string it re-detects
 * facets from the text alone and a Bluemoji facet is lost, so the custom emoji
 * shows as its `:alias:`.
 */
const mockRichText = jest.fn<(props: {value: unknown}) => null>(() => null)

jest.mock('#/components/RichText', () => ({
  RichText: (props: {value: unknown}) => mockRichText(props),
}))
jest.mock('#/alf', () => ({
  atoms: new Proxy({}, {get: () => ({})}),
  useTheme: () => ({atoms: new Proxy({}, {get: () => ({})}), palette: {}}),
  web: () => ({}),
  platform: () => ({}),
  native: () => ({}),
}))
// The rest of this file's imports are for rows this test does not render.
jest.mock('#/analytics', () => ({}))
jest.mock('#/components/Button', () => ({}))
jest.mock('#/components/Link', () => ({}))
jest.mock('#/components/MediaPreview', () => ({Embed: () => null}))
jest.mock('#/components/ProfileBadges', () => ({}))
jest.mock('#/components/ProfileCard', () => ({}))
jest.mock('#/components/ProfileHoverCard', () => ({}))
jest.mock('#/components/StarterPack/StarterPackCard', () => ({}))
jest.mock('#/components/SubtleHover', () => ({}))
jest.mock('#/components/Toast', () => ({}))
jest.mock('#/components/Typography', () => ({}))
jest.mock('#/components/icons/BellRinging', () => ({}))
jest.mock('#/components/icons/Check', () => ({}))
jest.mock('#/components/icons/Chevron', () => ({}))
jest.mock('#/components/icons/Contacts', () => ({}))
jest.mock('#/components/icons/Heart2', () => ({}))
jest.mock('#/components/icons/Person', () => ({}))
jest.mock('#/components/icons/Plus', () => ({}))
jest.mock('#/components/icons/Repost', () => ({}))
jest.mock('#/components/icons/StarterPack', () => ({}))
jest.mock('#/components/icons/VerifiedCheck', () => ({}))
jest.mock('#/env', () => ({}))
jest.mock('#/lib/constants', () => ({}))
jest.mock('#/lib/hooks/useAnimatedValue', () => ({}))
jest.mock('#/lib/routes/links', () => ({}))
jest.mock('#/lib/routes/types', () => ({}))
jest.mock('#/lib/strings/bidi', () => ({}))
jest.mock('#/lib/strings/display-names', () => ({}))
jest.mock('#/lib/strings/time', () => ({}))
jest.mock('#/logger', () => ({}))
jest.mock('#/state/cache/profile-shadow', () => ({}))
jest.mock('#/state/queries/notifications/feed', () => ({}))
jest.mock('#/state/queries/profile', () => ({}))
jest.mock('#/state/queries/unstable-profile-cache', () => ({}))
jest.mock('#/state/session', () => ({}))
jest.mock('#/view/com/feeds/FeedSourceCard', () => ({}))
jest.mock('#/view/com/post/Post', () => ({}))
jest.mock('#/view/com/util/TimeElapsed', () => ({}))
jest.mock('#/view/com/util/UserAvatar', () => ({}))
jest.mock('#/view/com/util/numeric/format', () => ({}))
jest.mock('@atproto/common-web', () => ({}))
jest.mock('@atproto/syntax', () => ({}))
jest.mock('@bsky/sdk/moderation', () => ({}))
jest.mock('@react-navigation/native', () => ({}))

const post = {
  uri: 'at://did:plc:a/app.bsky.feed.post/1',
  cid: 'bafy',
  author: {did: 'did:plc:a', handle: 'a.test'},
  record: {
    $type: 'app.bsky.feed.post',
    text: 'so lovely :party_heart:',
    createdAt: '2026-01-01T00:00:00Z',
    facets: [
      {
        index: {byteStart: 11, byteEnd: 23},
        features: [{$type: 'blue.moji.richtext.facet', did: 'did:plc:a'}],
      },
    ],
  },
  indexedAt: '2026-01-01T00:00:00Z',
}

describe('AdditionalPostText', () => {
  it('previews the text with the record facets, not a bare string', () => {
    // @ts-expect-error only the fields the preview reads
    render(<AdditionalPostText post={post} />)
    const value = mockRichText.mock.calls[0][0].value as {
      text: string
      facets: unknown[]
    }
    expect(typeof value).toBe('object')
    expect(value.text).toBe('so lovely :party_heart:')
    expect(value.facets).toHaveLength(1)
  })
})
