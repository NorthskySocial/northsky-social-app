import {createElement} from 'react'
import {moderatePost} from '@bsky/sdk/moderation'
import {act, create, type ReactTestRenderer} from 'react-test-renderer'

import {useSlingshotRecordQuery} from '#/state/queries/slingshot'
import {InlineImages} from '#/screens/Notifications/components/NotificationItem/Item/media'
import {
  PostBody,
  QuoteCard,
  ReplyContext,
} from '#/screens/Notifications/components/NotificationItem/Item/post'
import {ContentHider} from '#/components/moderation/ContentHider'
import {Embed, PostEmbedViewContext} from '#/components/Post/Embed'
import {RichText} from '#/components/RichText'
import {type app} from '#/lexicons'

jest.mock('@bsky/sdk/moderation', () => ({
  moderatePost: jest.fn(() => ({
    ui: (context: string) => ({context, blur: context === 'contentList'}),
  })),
}))
jest.mock('#/state/queries/slingshot', () => ({
  useSlingshotRecordQuery: jest.fn(),
}))
jest.mock('#/state/preferences/moderation-opts', () => ({
  useModerationOpts: () => ({}),
}))
jest.mock('#/state/session', () => ({useSession: () => ({})}))
jest.mock('#/state/cache/post-shadow', () => ({}))
jest.mock('#/lib/hooks/useOpenComposer', () => ({}))
jest.mock('#/alf', () => ({
  atoms: {},
  useTheme: () => ({
    atoms: {text: {color: 'normal'}, text_contrast_medium: {color: 'muted'}},
  }),
}))
jest.mock('@lingui/react', () => ({
  useLingui: () => ({_: (message: {message?: string}) => message.message}),
  Trans: ({
    components,
    values,
  }: {
    components?: Record<string, React.ReactNode>
    values?: Record<string, React.ReactNode>
  }) => {
    const {createElement: createMockElement, Fragment} =
      jest.requireActual<typeof React>('react')
    return createMockElement(
      Fragment,
      null,
      ...Object.values(components ?? {}),
      ...Object.values(values ?? {}),
    )
  },
}))
jest.mock('#/components/Link', () => ({
  Link: ({
    children,
  }: {
    children: (state: {hovered: boolean; pressed: boolean}) => React.ReactNode
  }) => children({hovered: false, pressed: false}),
}))
jest.mock('#/components/moderation/ContentHider', () => ({
  ContentHider: ({children}: React.PropsWithChildren) => children,
}))
jest.mock('#/components/moderation/PostAlerts', () => ({
  PostAlerts: () => null,
}))
jest.mock('#/components/Post/Embed', () => ({
  Embed: () => null,
  PostEmbedViewContext: {Feed: 'feed'},
}))
jest.mock('#/components/Post/ShowMoreTextButton', () => ({
  ShowMoreTextButton: () => null,
}))
jest.mock('#/components/PostControls', () => ({}))
jest.mock('#/components/ProfileBadges', () => ({}))
jest.mock('#/components/ProfileHoverCard', () => ({}))
jest.mock('#/components/RichText', () => ({RichText: () => null}))
jest.mock('#/components/SubtleHover', () => ({SubtleHover: () => null}))
jest.mock('#/components/Typography', () => ({
  Text: ({children}: React.PropsWithChildren) => children,
}))
jest.mock('#/components/icons/Arrow', () => ({
  ArrowCornerDownRight_Stroke2_Corner2_Rounded: () => null,
}))
jest.mock('#/view/com/util/UserAvatar', () => ({UserAvatar: () => null}))
jest.mock('#/view/com/util/TimeElapsed', () => ({TimeElapsed: () => null}))
jest.mock(
  '#/screens/Notifications/components/NotificationItem/Item/media',
  () => ({
    Card: ({children}: React.PropsWithChildren) => children,
    InlineImages: jest.fn(() => null),
  }),
)
jest.mock(
  '#/screens/Notifications/components/NotificationItem/Item/text',
  () => ({
    Strong: ({children}: React.PropsWithChildren) => children,
    useDisplayName: () => 'Example',
  }),
)

const view: app.bsky.embed.record.ViewRecord = {
  $type: 'app.bsky.embed.record#viewRecord',
  uri: 'at://did:plc:example/app.bsky.feed.post/test',
  cid: 'test-cid',
  author: {did: 'did:plc:example', handle: 'example.test'},
  value: {text: 'long recovered text', $type: 'app.bsky.feed.post'},
  labels: [
    {
      src: 'did:plc:labeler',
      uri: 'at://did:plc:example/app.bsky.feed.post/test',
      val: 'test-label',
      cts: '2026-01-01T00:00:00Z',
    },
  ],
  indexedAt: '2026-01-01T00:00:00Z',
}
const post: app.bsky.feed.defs.PostView = {
  ...view,
  $type: 'app.bsky.feed.defs#postView',
  record: view.value,
  embed: {$type: 'app.bsky.embed.record#view', record: view},
}
let rendered: ReactTestRenderer

function render(element: React.ReactElement) {
  act(() => {
    rendered = create(element)
  })
  return rendered.root
}

beforeEach(() => {
  jest.clearAllMocks()
  jest
    .mocked(useSlingshotRecordQuery)
    .mockReturnValue({data: view, isLoading: false} as ReturnType<
      typeof useSlingshotRecordQuery
    >)
})
afterEach(() => {
  act(() => rendered.unmount())
})

test('notification bodies pass unmodified embeds and moderation to the shared router', () => {
  const root = render(createElement(PostBody, {post}))
  expect(root.findAllByType(Embed)).toHaveLength(1)
  expect(root.findByType(Embed).props).toMatchObject({
    embed: post.embed,
    post,
    moderation: jest.mocked(moderatePost).mock.results[0].value,
    viewContext: PostEmbedViewContext.Feed,
  })
})

test.each([
  ['body', () => createElement(PostBody, {post})],
  ['reply', () => createElement(ReplyContext, {parent: {type: 'post', post}})],
  [
    'quote',
    () =>
      createElement(QuoteCard, {
        embed: {$type: 'app.bsky.embed.record#view', record: view},
      }),
  ],
] as const)('%s text retains formatting', (_name, element) => {
  jest.mocked(moderatePost).mockReturnValueOnce({
    ui: () => ({blur: false}),
  } as ReturnType<typeof moderatePost>)
  const root = render(element())
  expect(root.findByType(RichText).props).toMatchObject({
    enableCode: true,
    enableEmphasis: true,
  })
})

test.each([
  {
    $type: 'app.bsky.embed.record#viewBlocked',
    uri: view.uri,
    blocked: true,
    author: {did: view.author.did},
  },
  {$type: 'app.bsky.embed.record#viewDetached', uri: view.uri, detached: true},
] as const)('does not recover blocked or detached quotes (%#)', record => {
  render(
    createElement(QuoteCard, {
      embed: {$type: 'app.bsky.embed.record#view', record},
    }),
  )
  expect(useSlingshotRecordQuery).not.toHaveBeenCalled()
})

test('recovered quotes render compact text with moderation and muted styling', () => {
  const root = render(
    createElement(QuoteCard, {
      embed: {
        $type: 'app.bsky.embed.record#view',
        record: {
          $type: 'app.bsky.embed.record#viewNotFound',
          uri: view.uri,
          notFound: true,
        },
      },
      numberOfLines: 1,
      isMuted: true,
    }),
  )
  expect(useSlingshotRecordQuery).toHaveBeenCalledWith({
    atUri: view.uri,
    enabled: true,
  })
  expect(root.findByType(RichText).props).toMatchObject({
    numberOfLines: 1,
    style: expect.arrayContaining([{color: 'muted'}]),
    enableCode: true,
    enableEmphasis: true,
  })
  expect(moderatePost).toHaveBeenCalledWith(
    expect.objectContaining({labels: view.labels, record: view.value}),
    {},
  )
  expect(root.findByType(ContentHider).props).toMatchObject({
    modui: {context: 'contentList', blur: true},
  })
  expect(root.findAllByType(InlineImages)).toHaveLength(0)
})
