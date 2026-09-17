import {type CidString, type Client, XrpcResponseError} from '@atproto/lex'
import {type AtUriString} from '@atproto/syntax'

import {app, com} from '#/lexicons'
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
jest.mock('#/state/session', () => ({useAppviewClient: jest.fn()}))

const {getRecordByUri, resolveMiniDoc} = jest.requireMock(
  '#/lib/slingshot/client',
) as {
  getRecordByUri: jest.Mock
  resolveMiniDoc: jest.Mock
}
const {getPostInteractionCounts} = jest.requireMock(
  '#/lib/slingshot/constellation',
) as {getPostInteractionCounts: jest.Mock}

const URI = 'at://did:plc:author/app.bsky.feed.post/3abc' as AtUriString
const LABEL: com.atproto.label.defs.Label = {
  src: 'did:plc:labeler',
  uri: URI,
  val: 'warn',
  cts: '2026-09-01T00:00:00.000Z',
}

/**
 * A lex client stub that dispatches `call` to one jest mock per lexicon
 * method. A lex client returns the response body directly and throws on
 * failure, so each mock resolves the body alone.
 */
function createClient() {
  const queryLabels = jest.fn()
  const getProfile = jest.fn()
  return {
    client: {
      call: (method: unknown, params: unknown) => {
        if (method === com.atproto.label.queryLabels) return queryLabels(params)
        if (method === app.bsky.actor.getProfile) return getProfile(params)
        throw new Error('unexpected lexicon method')
      },
    } as unknown as Client,
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
    const {client, queryLabels, getProfile} = createClient()
    queryLabels
      .mockResolvedValueOnce({labels: [LABEL], cursor: 'next'})
      .mockResolvedValueOnce({labels: [LABEL]})

    const post = await getSlingshotPost({client, atUri: URI})

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
    const {client, queryLabels, getProfile} = createClient()
    queryLabels.mockResolvedValue({labels: []})

    const post = await getSlingshotPost({client, atUri: URI})

    expect(post?.labels).toEqual([])
    expect(getProfile).not.toHaveBeenCalled()
  })

  it('uses profile labels when exact post-label lookup fails', async () => {
    const {client, queryLabels, getProfile} = createClient()
    queryLabels.mockRejectedValue(new Error('label service unavailable'))
    getProfile.mockResolvedValue({labels: [LABEL]})

    const post = await getSlingshotPost({client, atUri: URI})

    expect(post?.labels).toEqual([LABEL])
    expect(getProfile).toHaveBeenCalledWith({actor: 'did:plc:author'})
  })

  /*
   * A lex client throws on an unsuccessful response instead of returning a
   * `success: false` body, so the failed-lookup case above is the only shape
   * this fallback has to handle.
   */

  it('does not recover when neither label source answers', async () => {
    const {client, queryLabels, getProfile} = createClient()
    queryLabels.mockRejectedValue(new Error('label service unavailable'))
    getProfile.mockRejectedValue(new Error('profile unavailable'))

    await expect(
      getSlingshotPost({client, atUri: URI}),
    ).resolves.toBeUndefined()
  })

  it('does not recover a non-post record', async () => {
    const {client, queryLabels} = createClient()
    getRecordByUri.mockResolvedValue({
      uri: URI,
      cid: 'bafyrecord',
      value: {$type: 'app.bsky.actor.profile'},
    })

    await expect(
      getSlingshotPost({client, atUri: URI}),
    ).resolves.toBeUndefined()
    expect(queryLabels).not.toHaveBeenCalled()
  })
})

function threadResponse(
  thread: app.bsky.unspecced.getPostThreadV2.ThreadItem[],
): app.bsky.unspecced.getPostThreadV2.$OutputBody {
  return {thread, hasOtherReplies: true}
}

function missingAnchor(): app.bsky.unspecced.getPostThreadV2.ThreadItem {
  return {
    uri: URI,
    depth: 0,
    value: {
      $type: 'app.bsky.unspecced.defs#threadItemNotFound',
    },
  }
}

function blockedAnchor(): app.bsky.unspecced.getPostThreadV2.ThreadItem {
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
  post: app.bsky.feed.defs.PostView,
): app.bsky.unspecced.getPostThreadV2.ThreadItem {
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

const NORMAL_POST: app.bsky.feed.defs.PostView = {
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
    const {client, queryLabels} = createClient()
    const reply = {
      ...NORMAL_POST,
      uri: `${URI}reply` as AtUriString,
      cid: 'bafyreply' as CidString,
    }
    const response = threadResponse([
      postThreadItem(NORMAL_POST),
      {...postThreadItem(reply), depth: 1},
    ])

    const result = await getPostThreadWithSlingshotFallback({
      client,
      anchor: URI,
      getThread: () => Promise.resolve(response),
      toThreadItem: postThreadItem,
    })

    expect(result).toBe(response)
    expect(getRecordByUri).not.toHaveBeenCalled()
    expect(queryLabels).not.toHaveBeenCalled()
  })

  it('does not recover a blocked anchor', async () => {
    const {client} = createClient()
    const response = threadResponse([blockedAnchor()])

    const result = await getPostThreadWithSlingshotFallback({
      client,
      anchor: URI,
      getThread: () => Promise.resolve(response),
      toThreadItem: postThreadItem,
    })

    expect(result).toBe(response)
    expect(getRecordByUri).not.toHaveBeenCalled()
  })

  it('recovers only a missing depth-zero anchor', async () => {
    const {client, queryLabels} = createClient()
    queryLabels.mockResolvedValue({labels: []})

    const result = await getPostThreadWithSlingshotFallback({
      client,
      anchor: URI,
      getThread: () => Promise.resolve(threadResponse([missingAnchor()])),
      toThreadItem: postThreadItem,
    })

    expect(result.thread).toHaveLength(1)
    expect(result.thread[0]?.depth).toBe(0)
    expect(result.hasOtherReplies).toBe(false)
  })

  it('preserves a missing anchor when Slingshot cannot recover it', async () => {
    const {client} = createClient()
    const response = threadResponse([missingAnchor()])
    getRecordByUri.mockResolvedValue(undefined)

    const result = await getPostThreadWithSlingshotFallback({
      client,
      anchor: URI,
      getThread: () => Promise.resolve(response),
      toThreadItem: postThreadItem,
    })

    expect(result).toBe(response)
  })

  it('recovers a retryable request failure', async () => {
    const {client, queryLabels} = createClient()
    queryLabels.mockResolvedValue({labels: []})

    const result = await getPostThreadWithSlingshotFallback({
      client,
      anchor: URI,
      getThread: () => Promise.reject(new Error('Network request failed')),
      toThreadItem: postThreadItem,
    })

    expect(result.thread).toHaveLength(1)
    expect(result.hasOtherReplies).toBe(false)
  })

  it('rethrows a non-retryable request failure', async () => {
    const {client} = createClient()
    const error = new Error('Forbidden')

    await expect(
      getPostThreadWithSlingshotFallback({
        client,
        anchor: URI,
        getThread: () => Promise.reject(error),
        toThreadItem: postThreadItem,
      }),
    ).rejects.toThrow(error)
    expect(getRecordByUri).not.toHaveBeenCalled()
  })

  it('does not recover an unauthenticated anchor', async () => {
    const {client} = createClient()
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
      client,
      anchor: URI,
      getThread: () => Promise.resolve(response),
      toThreadItem: postThreadItem,
    })

    expect(result).toBe(response)
    expect(getRecordByUri).not.toHaveBeenCalled()
  })

  it('does not recover an authorization failure', async () => {
    const {client} = createClient()
    const error = new XrpcResponseError(
      app.bsky.unspecced.getPostThreadV2.main,
      new Response(JSON.stringify({error: 'Forbidden'}), {
        status: 403,
        headers: {'content-type': 'application/json'},
      }),
    )

    await expect(
      getPostThreadWithSlingshotFallback({
        client,
        anchor: URI,
        getThread: () => Promise.reject(error),
        toThreadItem: postThreadItem,
      }),
    ).rejects.toThrow(error)
    expect(getRecordByUri).not.toHaveBeenCalled()
  })
})
