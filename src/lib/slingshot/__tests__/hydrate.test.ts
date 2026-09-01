import {
  type ComAtprotoLabelDefs,
  moderatePost,
  type ModerationOpts,
} from '@atproto/api'

import {hydratePostView, hydratePostViewRecord} from '../hydrate'

const URI = 'at://did:plc:author/app.bsky.feed.post/3abc'
const LABELER_DID = 'did:plc:labeler'
const LABEL: ComAtprotoLabelDefs.Label = {
  src: LABELER_DID,
  uri: URI,
  val: 'warn',
  cts: '2026-09-01T00:00:00.000Z',
}
const RECORD = {
  $type: 'app.bsky.feed.post',
  text: 'Recovered post',
  createdAt: '2026-09-01T00:00:00.000Z',
}
const MINI_DOC = {
  did: 'did:plc:author',
  handle: 'author.test',
  pds: 'https://pds.example.com',
  signing_key: 'did:key:z123',
}

const moderationOpts: ModerationOpts = {
  userDid: undefined,
  prefs: {
    adultContentEnabled: false,
    labels: {},
    labelers: [{did: LABELER_DID, labels: {warn: 'warn'}}],
    mutedWords: [],
    hiddenPosts: [],
  },
  labelDefs: {
    [LABELER_DID]: [
      {
        identifier: 'warn',
        severity: 'alert',
        blurs: 'content',
        defaultSetting: 'warn',
        locales: [],
        definedBy: LABELER_DID,
        configurable: true,
        flags: [],
        behaviors: {content: {contentView: 'alert'}},
      },
    ],
  },
}

describe('Slingshot post hydration', () => {
  it('adds recovered labels to the post rather than its author', () => {
    const post = hydratePostView(
      RECORD,
      URI,
      'bafyrecord',
      MINI_DOC,
      undefined,
      [LABEL],
    )
    const quote = hydratePostViewRecord(
      RECORD,
      URI,
      'bafyrecord',
      MINI_DOC,
      undefined,
      [LABEL],
    )

    expect(post.labels).toEqual([LABEL])
    expect(post.author.labels).toBeUndefined()
    expect(quote.labels).toEqual([LABEL])
    expect(quote.author.labels).toBeUndefined()
  })

  it('passes recovered labels to content moderation', () => {
    const post = hydratePostView(
      RECORD,
      URI,
      'bafyrecord',
      MINI_DOC,
      undefined,
      [LABEL],
    )

    const decision = moderatePost(post, moderationOpts)

    expect(decision.labelCauses).toEqual(
      expect.arrayContaining([expect.objectContaining({target: 'content'})]),
    )
  })
})
