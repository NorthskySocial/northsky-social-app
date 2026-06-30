import {getRecordByUri, resolveMiniDoc, SLINGSHOT_SERVICE} from '../client'

const realFetch = global.fetch
const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>()

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  global.fetch = realFetch
})

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

describe('SLINGSHOT_SERVICE', () => {
  it('points to Microcosm Slingshot', () => {
    expect(SLINGSHOT_SERVICE).toBe('https://slingshot.microcosm.blue')
  })
})

describe('getRecordByUri', () => {
  it('returns record on successful fetch', async () => {
    const mockRecord = {
      uri: 'at://did:plc:abc/app.bsky.feed.post/3xyz',
      cid: 'bafyrei123',
      value: {$type: 'app.bsky.feed.post', text: 'hello'},
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(mockRecord))

    const result = await getRecordByUri(
      'at://did:plc:abc/app.bsky.feed.post/3xyz',
    )
    expect(result).toEqual(mockRecord)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        'blue.microcosm.repo.getRecordByUri?at_uri=at%3A%2F%2Fdid%3Aplc%3Aabc',
      ),
      expect.any(Object),
    )
  })

  it('returns undefined on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(undefined, false, 404))

    const result = await getRecordByUri('at://did:plc:abc/app.bsky.feed.post/x')
    expect(result).toBeUndefined()
  })

  it('returns undefined on network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'))

    const result = await getRecordByUri('at://did:plc:abc/app.bsky.feed.post/x')
    expect(result).toBeUndefined()
  })
})

describe('resolveMiniDoc', () => {
  it('returns miniDoc on successful fetch', async () => {
    const mockMiniDoc = {
      did: 'did:plc:abc',
      handle: 'alice.test',
      pds: 'https://pds.example.com',
      signing_key: 'did:key:z123',
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(mockMiniDoc))

    const result = await resolveMiniDoc('did:plc:abc')
    expect(result).toEqual(mockMiniDoc)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        'blue.microcosm.identity.resolveMiniDoc?identifier=did%3Aplc%3Aabc',
      ),
      expect.any(Object),
    )
  })

  it('returns undefined on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(undefined, false, 500))

    const result = await resolveMiniDoc('did:plc:abc')
    expect(result).toBeUndefined()
  })

  it('returns undefined on network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'))

    const result = await resolveMiniDoc('did:plc:abc')
    expect(result).toBeUndefined()
  })
})

describe('concurrency semaphore', () => {
  it('allows up to 5 concurrent requests', async () => {
    let inFlight = 0
    let maxInFlight = 0

    fetchMock.mockImplementation(async () => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      // Simulate async work
      await new Promise(r => setTimeout(r, 50))
      inFlight--
      return jsonResponse({})
    })

    // Fire 10 concurrent requests
    const promises = Array.from({length: 10}, (_, i) =>
      getRecordByUri(`at://did:plc:abc/app.bsky.feed.post/${i}`),
    )
    await Promise.all(promises)

    expect(maxInFlight).toBeLessThanOrEqual(5)
    expect(maxInFlight).toBeGreaterThan(1) // Sanity: some parallelism happened
  })
})
