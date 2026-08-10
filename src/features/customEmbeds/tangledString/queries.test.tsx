import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {renderHook, waitFor} from '@testing-library/react-native'

import {useTangledStringQuery} from './queries'

jest.mock('#/lib/slingshot/client', () => ({
  getRecordByUri: jest.fn(),
  resolveMiniDoc: jest.fn(),
}))

const mockGetProfile = jest.fn()
jest.mock('#/state/session', () => ({
  useAgent: () => ({
    getProfile: (...args: unknown[]) => mockGetProfile(...args),
  }),
}))

const {getRecordByUri, resolveMiniDoc} = jest.requireMock(
  '#/lib/slingshot/client',
) as {
  getRecordByUri: jest.Mock
  resolveMiniDoc: jest.Mock
}

const DID = 'did:plc:usagi'
const PROFILE = {did: DID, handle: 'usagi.test', displayName: 'Usagi'}

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
  it('resolves the actor and returns the record with its author', async () => {
    resolveMiniDoc.mockResolvedValue({did: DID})
    getRecordByUri.mockResolvedValue({value: {contents: 'moon prism power'}})
    mockGetProfile.mockResolvedValue({data: PROFILE})

    const {result} = render({actor: 'usagi.test', rkey: 'rkey'})

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      did: DID,
      value: {contents: 'moon prism power'},
      author: PROFILE,
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
    mockGetProfile.mockResolvedValue({data: PROFILE})

    const {result} = render({actor: 'usagi.test', rkey: 'gone'})

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('still returns the snippet when the profile lookup fails', async () => {
    resolveMiniDoc.mockResolvedValue({did: DID})
    getRecordByUri.mockResolvedValue({value: {contents: 'sailor say'}})
    mockGetProfile.mockRejectedValue(new Error('appview down'))

    const {result} = render({actor: 'usagi.test', rkey: 'rkey'})

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.value).toEqual({contents: 'sailor say'})
    expect(result.current.data?.author).toBeUndefined()
  })

  it('does not fetch when disabled or when the ref is empty', () => {
    render({actor: 'usagi.test', rkey: 'rkey', enabled: false})
    render({actor: '', rkey: ''})

    expect(resolveMiniDoc).not.toHaveBeenCalled()
  })
})
