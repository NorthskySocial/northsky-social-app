import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {renderHook, waitFor} from '@testing-library/react-native'

import {useTangledStringQuery} from './queries'

jest.mock('#/lib/slingshot/client', () => ({
  getRecordByUri: jest.fn(),
  resolveMiniDoc: jest.fn(),
}))

const {getRecordByUri, resolveMiniDoc} = jest.requireMock(
  '#/lib/slingshot/client',
) as {
  getRecordByUri: jest.Mock
  resolveMiniDoc: jest.Mock
}

const DID = 'did:plc:usagi'

function wrapper({children}: {children: React.ReactNode}) {
  const client = new QueryClient({
    defaultOptions: {queries: {retry: false, gcTime: 0}},
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function render(args: {actor: string; rkey: string; enabled?: boolean}) {
  return renderHook(() => useTangledStringQuery(args), {wrapper})
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useTangledStringQuery', () => {
  it('resolves the actor and returns the record', async () => {
    resolveMiniDoc.mockResolvedValue({did: DID})
    getRecordByUri.mockResolvedValue({value: {contents: 'moon prism power'}})

    const {result} = render({actor: 'usagi.test', rkey: 'rkey'})

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // No author: the byline reads the shared profile cache instead, so this
    // query must not carry a second copy of the profile.
    expect(result.current.data).toEqual({
      did: DID,
      value: {contents: 'moon prism power'},
    })
    expect(getRecordByUri).toHaveBeenCalledWith(
      `at://${DID}/sh.tangled.string/rkey`,
    )
  })

  it('errors when the actor cannot be resolved', async () => {
    resolveMiniDoc.mockResolvedValue(undefined)

    const {result} = render({actor: 'ghost.test', rkey: 'rkey'})

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(getRecordByUri).not.toHaveBeenCalled()
  })

  it('errors when the record is missing', async () => {
    resolveMiniDoc.mockResolvedValue({did: DID})
    getRecordByUri.mockResolvedValue(undefined)

    const {result} = render({actor: 'usagi.test', rkey: 'gone'})

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('does not fetch when disabled', () => {
    render({actor: 'usagi.test', rkey: 'rkey', enabled: false})

    expect(resolveMiniDoc).not.toHaveBeenCalled()
  })

  it('does not fetch when the actor is missing', () => {
    render({actor: '', rkey: 'rkey'})

    expect(resolveMiniDoc).not.toHaveBeenCalled()
  })

  it('does not fetch when the rkey is missing', () => {
    render({actor: 'usagi.test', rkey: ''})

    expect(resolveMiniDoc).not.toHaveBeenCalled()
  })
})
