import {
  type AppBskyFeedDefs,
  type AppBskyUnspeccedGetPostThreadV2,
  type AtpAgent,
  type ComAtprotoLabelDefs,
  XRPCError,
} from '@atproto/api'

import {
  getPostThreadWithSlingshotFallback,
  getSlingshotPost,
} from '../slingshot'

jest.mock('#/lib/slingshot/client', () => ({
  getRecordByUri: jest.fn(),
  resolveMiniDoc: jest.fn(),
}))
jest.mock('#/lib/slingshot/constellation', () => ({
  getPostInteractionCounts: jest.fn(),
}))
jest.mock('#/state/session', () => ({useAgent: jest.fn()}))

const {getRecordByUri, resolveMiniDoc} = jest.requireMock(
  '#/lib/slingshot/client',
) as {
  getRecordByUri: jest.Mock
  resolveMiniDoc: jest.Mock
}
const {getPostInteractionCounts} = jest.requireMock(
  '#/lib/slingshot/constellation',
) as {getPostInteractionCounts: jest.Mock}

const URI = 'at://did:plc:author/app.bsky.feed.post/3abc'
const LABEL: ComAtprotoLabelDefs.Label = {
  src: 'did:plc:labeler',
  uri: URI,
  val: 'warn',
  cts: '2026-09-01T00:00:00.000Z',
}

function createAgent() {
  const queryLabels = jest.fn()
  const getProfile = jest.fn()
  return {
    agent: {
      api: {com: {atproto: {label: {queryLabels}}}},
      getProfile,
    } as unknown as AtpAgent,
    queryLabels,
    getProfile,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  getRecordByUri.mockResolvedValue({
    uri: URI,
    cid: 'bafyrecord',
    value: {
      $type: 'app.bsky.feed.post',
      text: 'Recovered post',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
  })
  resolveMiniDoc.mockResolvedValue({
    did: 'did:plc:author',
    handle: 'author.test',
    pds: 'https://pds.example.com',
    signing_key: 'did:key:z123',
  })
  getPostInteractionCounts.mockResolvedValue({
    likeCount: 1,
    repostCount: 2,
    replyCount: 3,
    quoteCount: 4,
  })
})

describe('getSlingshotPost', () => {
  it('uses every page of exact post labels', async () => {
    const {agent, queryLabels, getProfile} = createAgent()
    queryLabels
      .mockResolvedValueOnce({
        success: true,
        data: {labels: [LABEL], cursor: 'next'},
      })
      .mockResolvedValueOnce({success: true, data: {labels: [LABEL]}})

    const post = await getSlingshotPost({agent, atUri: URI})

    expect(post?.labels).toEqual([LABEL, LABEL])
    expect(queryLabels).toHaveBeenNthCalledWith(1, {
      uriPatterns: [URI],
      sources: expect.any(Array),
      limit: 100,
      cursor: undefined,
    })
    expect(queryLabels).toHaveBeenNthCalledWith(2, {
      uriPatterns: [URI],
      sources: expect.any(Array),
      limit: 100,
      cursor: 'next',
    })
    expect(getProfile).not.toHaveBeenCalled()
  })

  it('keeps a successful empty post-label response empty', async () => {
    const {agent, queryLabels, getProfile} = createAgent()
    queryLabels.mockResolvedValue({success: true, data: {labels: []}})

    const post = await getSlingshotPost({agent, atUri: URI})

    expect(post?.labels).toEqual([])
    expect(getProfile).not.toHaveBeenCalled()
  })

  it('uses profile labels when exact post-label lookup fails', async () => {
    const {agent, queryLabels, getProfile} = createAgent()
    queryLabels.mockRejectedValue(new Error('label service unavailable'))
    getProfile.mockResolvedValue({success: true, data: {labels: [LABEL]}})

    const post = await getSlingshotPost({agent, atUri: URI})

    expect(post?.labels).toEqual([LABEL])
    expect(getProfile).toHaveBeenCalledWith({actor: 'did:plc:author'})
  })

  it('uses profile labels when exact post-label lookup is unsuccessful', async () => {
    const {agent, queryLabels, getProfile} = createAgent()
    queryLabels.mockResolvedValue({success: false, data: {labels: []}})
    getProfile.mockResolvedValue({success: true, data: {labels: [LABEL]}})

    const post = await getSlingshotPost({agent, atUri: URI})

    expect(post?.labels).toEqual([LABEL])
    expect(getProfile).toHaveBeenCalledWith({actor: 'did:plc:author'})
  })

  it('does not recover when neither label source answers', async () => {
    const {agent, queryLabels, getProfile} = createAgent()
    queryLabels.mockRejectedValue(new Error('label service unavailable'))
    getProfile.mockRejectedValue(new Error('profile unavailable'))

    await expect(getSlingshotPost({agent, atUri: URI})).resolves.toBeUndefined()
  })

  it('does not recover a non-post record', async () => {
    const {agent, queryLabels} = createAgent()
    getRecordByUri.mockResolvedValue({
      uri: URI,
      cid: 'bafyrecord',
      value: {$type: 'app.bsky.actor.profile'},
    })

    await expect(getSlingshotPost({agent, atUri: URI})).resolves.toBeUndefined()
    expect(queryLabels).not.toHaveBeenCalled()
  })
})

function threadResponse(
  thread: AppBskyUnspeccedGetPostThreadV2.ThreadItem[],
): AppBskyUnspeccedGetPostThreadV2.OutputSchema {
  return {thread, hasOtherReplies: true}
}

function missingAnchor(): AppBskyUnspeccedGetPostThreadV2.ThreadItem {
  return {
    uri: URI,
    depth: 0,
    value: {
      $type: 'app.bsky.unspecced.defs#threadItemNotFound',
    },
  }
}

function blockedAnchor(): AppBskyUnspeccedGetPostThreadV2.ThreadItem {
  return {
    uri: URI,
    depth: 0,
    value: {
      $type: 'app.bsky.unspecced.defs#threadItemBlocked',
      author: {did: 'did:plc:blocked'},
    },
  }
}

function postThreadItem(
  post: AppBskyFeedDefs.PostView,
): AppBskyUnspeccedGetPostThreadV2.ThreadItem {
  return {
    uri: post.uri,
    depth: 0,
    value: {
      $type: 'app.bsky.unspecced.defs#threadItemPost',
      post,
      opThread: false,
      moreParents: false,
      moreReplies: 0,
      hiddenByThreadgate: false,
      mutedByViewer: false,
    },
  }
}

const NORMAL_POST: AppBskyFeedDefs.PostView = {
  uri: 'at://did:plc:parent/app.bsky.feed.post/3parent',
  cid: 'bafyparent',
  author: {did: 'did:plc:parent', handle: 'parent.test'},
  record: {
    $type: 'app.bsky.feed.post',
    text: 'A normal thread post',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  embed: {
    $type: 'app.bsky.embed.record#view',
    record: {
      $type: 'app.bsky.embed.record#viewNotFound',
      uri: URI,
      notFound: true,
    },
  },
  indexedAt: '2026-09-01T00:00:00.000Z',
}

describe('getPostThreadWithSlingshotFallback', () => {
  it('preserves a normal thread response without loading Slingshot', async () => {
    const {agent, queryLabels} = createAgent()
    const reply = {...NORMAL_POST, uri: `${URI}reply`, cid: 'bafyreply'}
    const response = threadResponse([
      postThreadItem(NORMAL_POST),
      {...postThreadItem(reply), depth: 1},
    ])

    const result = await getPostThreadWithSlingshotFallback({
      agent,
      anchor: URI,
      getThread: () => Promise.resolve(response),
      toThreadItem: postThreadItem,
    })

    expect(result).toBe(response)
    expect(getRecordByUri).not.toHaveBeenCalled()
    expect(queryLabels).not.toHaveBeenCalled()
  })

  it('does not recover a blocked anchor', async () => {
    const {agent} = createAgent()
    const response = threadResponse([blockedAnchor()])

    const result = await getPostThreadWithSlingshotFallback({
      agent,
      anchor: URI,
      getThread: () => Promise.resolve(response),
      toThreadItem: postThreadItem,
    })

    expect(result).toBe(response)
    expect(getRecordByUri).not.toHaveBeenCalled()
  })

  it('recovers only a missing depth-zero anchor', async () => {
    const {agent, queryLabels} = createAgent()
    queryLabels.mockResolvedValue({success: true, data: {labels: []}})

    const result = await getPostThreadWithSlingshotFallback({
      agent,
      anchor: URI,
      getThread: () => Promise.resolve(threadResponse([missingAnchor()])),
      toThreadItem: postThreadItem,
    })

    expect(result.thread).toHaveLength(1)
    expect(result.thread[0]?.depth).toBe(0)
    expect(result.hasOtherReplies).toBe(false)
  })

  it('preserves a missing anchor when Slingshot cannot recover it', async () => {
    const {agent} = createAgent()
    const response = threadResponse([missingAnchor()])
    getRecordByUri.mockResolvedValue(undefined)

    const result = await getPostThreadWithSlingshotFallback({
      agent,
      anchor: URI,
      getThread: () => Promise.resolve(response),
      toThreadItem: postThreadItem,
    })

    expect(result).toBe(response)
  })

  it('recovers a retryable request failure', async () => {
    const {agent, queryLabels} = createAgent()
    queryLabels.mockResolvedValue({success: true, data: {labels: []}})

    const result = await getPostThreadWithSlingshotFallback({
      agent,
      anchor: URI,
      getThread: () => Promise.reject(new Error('Network request failed')),
      toThreadItem: postThreadItem,
    })

    expect(result.thread).toHaveLength(1)
    expect(result.hasOtherReplies).toBe(false)
  })

  it('rethrows a non-retryable request failure', async () => {
    const {agent} = createAgent()
    const error = new Error('Forbidden')

    await expect(
      getPostThreadWithSlingshotFallback({
        agent,
        anchor: URI,
        getThread: () => Promise.reject(error),
        toThreadItem: postThreadItem,
      }),
    ).rejects.toThrow(error)
    expect(getRecordByUri).not.toHaveBeenCalled()
  })

  it('does not recover an unauthenticated anchor', async () => {
    const {agent} = createAgent()
    const response = threadResponse([
      {
        uri: URI,
        depth: 0,
        value: {
          $type: 'app.bsky.unspecced.defs#threadItemNoUnauthenticated',
        },
      },
    ])

    const result = await getPostThreadWithSlingshotFallback({
      agent,
      anchor: URI,
      getThread: () => Promise.resolve(response),
      toThreadItem: postThreadItem,
    })

    expect(result).toBe(response)
    expect(getRecordByUri).not.toHaveBeenCalled()
  })

  it('does not recover an authorization failure', async () => {
    const {agent} = createAgent()
    const error = new XRPCError(403, 'Forbidden', 'Forbidden')

    await expect(
      getPostThreadWithSlingshotFallback({
        agent,
        anchor: URI,
        getThread: () => Promise.reject(error),
        toThreadItem: postThreadItem,
      }),
    ).rejects.toThrow(error)
    expect(getRecordByUri).not.toHaveBeenCalled()
  })
})
