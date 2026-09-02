import {
  createDonationSession,
  DonationError,
  getDonationStatus,
} from '#/features/support/api'

function mockFetch(response: Partial<Response> & {json?: () => unknown}) {
  const fetch: jest.Mock<Promise<Response>, [RequestInfo, RequestInit?]> = jest
    .fn()
    .mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      ...response,
    })
  global.fetch = fetch as unknown as typeof global.fetch
  return fetch
}

describe('createDonationSession', () => {
  it('sends a one-time interval as one_time', async () => {
    const fetch = mockFetch({
      json: () => Promise.resolve({clientSecret: 'cs_test'}),
    })

    await createDonationSession({
      amountCents: 500,
      currency: 'cad',
      interval: 'oneTime',
    })

    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/donations/session')
    expect(JSON.parse(init!.body as string)).toEqual({
      amountCents: 500,
      currency: 'cad',
      interval: 'one_time',
      did: undefined,
    })
  })

  it('sends a monthly interval as month, with the did', async () => {
    const fetch = mockFetch({
      json: () => Promise.resolve({clientSecret: 'cs_test'}),
    })

    await createDonationSession({
      amountCents: 1000,
      currency: 'eur',
      interval: 'monthly',
      did: 'did:plc:motoko',
    })

    const [, init] = fetch.mock.calls[0]
    expect(JSON.parse(init!.body as string)).toEqual({
      amountCents: 1000,
      currency: 'eur',
      interval: 'month',
      did: 'did:plc:motoko',
    })
  })

  it('returns the client secret', async () => {
    mockFetch({json: () => Promise.resolve({clientSecret: 'cs_test'})})

    await expect(
      createDonationSession({
        amountCents: 500,
        currency: 'usd',
        interval: 'oneTime',
      }),
    ).resolves.toBe('cs_test')
  })

  it('throws the server error message on a failed request', async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: () => Promise.resolve({error: 'amount too small'}),
    })

    await expect(
      createDonationSession({
        amountCents: 1,
        currency: 'cad',
        interval: 'oneTime',
      }),
    ).rejects.toThrow(new DonationError('amount too small'))
  })

  it('falls back to a status message when the error body is not JSON', async () => {
    mockFetch({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    })

    await expect(
      createDonationSession({
        amountCents: 500,
        currency: 'cad',
        interval: 'oneTime',
      }),
    ).rejects.toThrow('donation request failed with status 500')
  })

  it('rejects when the server omits the client secret', async () => {
    mockFetch({json: () => Promise.resolve({})})

    await expect(
      createDonationSession({
        amountCents: 500,
        currency: 'cad',
        interval: 'oneTime',
      }),
    ).rejects.toThrow('the server did not return a client secret')
  })
})

describe('getDonationStatus', () => {
  it('url-encodes the session id', async () => {
    const fetch = mockFetch({
      json: () => Promise.resolve({status: 'complete'}),
    })

    await getDonationStatus('cs_test session/id')

    expect(fetch.mock.calls[0][0]).toBe(
      '/api/donations/status?session_id=cs_test%20session%2Fid',
    )
  })

  it('returns the parsed status', async () => {
    mockFetch({json: () => Promise.resolve({status: 'expired'})})

    await expect(getDonationStatus('cs_test')).resolves.toBe('expired')
  })

  it('defaults to open when the server omits the status', async () => {
    mockFetch({json: () => Promise.resolve({})})

    await expect(getDonationStatus('cs_test')).resolves.toBe('open')
  })

  it('rejects an unknown status', async () => {
    mockFetch({json: () => Promise.resolve({status: 'processing'})})

    await expect(getDonationStatus('cs_test')).rejects.toThrow(
      'the server returned an invalid donation status',
    )
  })

  it('throws the server error message on a failed request', async () => {
    mockFetch({
      ok: false,
      status: 404,
      json: () => Promise.resolve({error: 'session not found'}),
    })

    await expect(getDonationStatus('cs_missing')).rejects.toThrow(
      new DonationError('session not found'),
    )
  })
})
