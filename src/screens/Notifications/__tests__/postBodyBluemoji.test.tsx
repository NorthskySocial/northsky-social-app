import {describe, expect, it, jest} from '@jest/globals'
import {render, screen} from '@testing-library/react-native'

import {PostBody} from '../components/NotificationItem/Item/post'

/*
 * The Mentions, Replies and Quotes notifications show a post through
 * `PostBody`, which draws its own text and embed. A Bluemoji sticker is not an
 * app.bsky embed, so nothing hydrates it: it has to be drawn from the record,
 * as `Post` and `PostFeedItem` do. This guards that `PostBody` does so too.
 */
const mockRichText = jest.fn<(props: {value: unknown}) => null>(() => null)
const mockSticker = jest.fn<(props: {post: unknown}) => null>(() => null)

jest.mock('#/features/bluemoji/BluemojiSticker', () => ({
  BluemojiSticker: (props: {post: unknown}) => mockSticker(props),
}))
jest.mock('#/components/RichText', () => ({
  RichText: (props: {value: unknown}) => mockRichText(props),
}))
jest.mock('#/components/Post/Embed', () => ({
  Embed: () => null,
  PostEmbedViewContext: {Feed: 'Feed'},
}))
jest.mock('#/components/moderation/ContentHider', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ContentHider: (require('react-native') as typeof import('react-native')).View,
}))
jest.mock('#/alf', () => ({
  atoms: new Proxy({}, {get: () => ({})}),
  useTheme: () => ({atoms: new Proxy({}, {get: () => ({})}), palette: {}}),
  web: () => ({}),
}))
// post.tsx also exports rows that use these; PostBody does not, so stub them
// to keep this test from loading the whole app.
jest.mock('#/components/Link', () => ({
  Link: () => null,
  WebOnlyInlineLinkText: () => null,
}))
jest.mock('#/components/PostControls', () => ({PostControls: () => null}))
jest.mock('#/components/ProfileBadges', () => ({ProfileBadges: () => null}))
jest.mock('#/components/ProfileHoverCard', () => ({
  ProfileHoverCard: () => null,
}))
jest.mock('#/components/SubtleHover', () => ({SubtleHover: () => null}))
jest.mock('#/components/Post/ShowMoreTextButton', () => ({
  ShowMoreTextButton: () => null,
}))
jest.mock('#/view/com/util/UserAvatar', () => ({UserAvatar: () => null}))
jest.mock('#/view/com/util/TimeElapsed', () => ({TimeElapsed: () => null}))
jest.mock('#/lib/hooks/useOpenComposer', () => ({useOpenComposer: () => ({})}))
jest.mock('#/state/queries/slingshot', () => ({
  useSlingshotRecordQuery: () => ({}),
}))
jest.mock('#/state/session', () => ({useSession: () => ({})}))
jest.mock('#/state/cache/post-shadow', () => ({
  POST_TOMBSTONE: Symbol('tombstone'),
  usePostShadow: (p: unknown) => p,
}))
jest.mock('#/components/moderation/PostAlerts', () => ({
  PostAlerts: () => null,
}))
jest.mock('#/state/preferences/moderation-opts', () => ({
  useModerationOpts: () => undefined,
}))

const post = {
  uri: 'at://did:plc:a/app.bsky.feed.post/1',
  cid: 'bafy',
  author: {did: 'did:plc:a', handle: 'a.test'},
  record: {
    $type: 'app.bsky.feed.post',
    text: 'hi :cat:',
    createdAt: '2026-01-01T00:00:00Z',
    facets: [
      {
        index: {byteStart: 3, byteEnd: 8},
        features: [{$type: 'blue.moji.richtext.facet', did: 'did:plc:a'}],
      },
    ],
    embed: {$type: 'blue.moji.embed.sticker'},
  },
  indexedAt: '2026-01-01T00:00:00Z',
}

describe('notification PostBody', () => {
  it('draws the post text with its facets and the Bluemoji sticker', () => {
    // @ts-expect-error only the fields PostBody reads
    render(<PostBody post={post} />)
    expect(screen).toBeTruthy()

    const rich = mockRichText.mock.calls[0][0].value as {
      text: string
      facets: unknown[]
    }
    expect(rich.text).toBe('hi :cat:')
    expect(rich.facets).toHaveLength(1)

    expect(mockSticker).toHaveBeenCalledTimes(1)
    expect(mockSticker.mock.calls[0][0].post).toBe(post)
  })
})
