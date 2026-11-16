import {type ReactNode} from 'react'
import {act, renderHook} from '@testing-library/react-native'

import {
  DEFAULT_ACCENTS,
  Provider,
  useAccents,
  useSetAccents,
} from '#/features/northskyAppearance'

/* In-memory stand-in for the MMKV-backed device storage. */
const mockStore = new Map<string, unknown>()
const mockListeners = new Set<() => void>()
jest.mock('#/storage', () => ({
  device: {
    get: ([key]: [string]) => mockStore.get(key),
    set: ([key]: [string], data: unknown) => {
      mockStore.set(key, data)
      mockListeners.forEach(fn => fn())
    },
    addOnValueChangedListener: (_scopes: [string], callback: () => void) => {
      mockListeners.add(callback)
      return {remove: () => mockListeners.delete(callback)}
    },
  },
}))

function wrapper({children}: {children: ReactNode}) {
  return <Provider>{children}</Provider>
}

function renderAccents() {
  return renderHook(
    () => ({accents: useAccents(), setAccents: useSetAccents()}),
    {wrapper},
  )
}

beforeEach(() => {
  mockStore.clear()
  mockListeners.clear()
})

describe('accents setting', () => {
  it('defaults to lively', () => {
    const {result} = renderAccents()
    expect(DEFAULT_ACCENTS).toBe('lively')
    expect(result.current.accents).toBe('lively')
  })

  it('reads the stored value on mount', () => {
    mockStore.set('accents', 'calm')
    const {result} = renderAccents()
    expect(result.current.accents).toBe('calm')
  })

  it('updates context and writes to storage on set', () => {
    const {result} = renderAccents()
    act(() => result.current.setAccents('calm'))
    expect(result.current.accents).toBe('calm')
    expect(mockStore.get('accents')).toBe('calm')
  })

  it('follows a change written elsewhere', () => {
    const {result} = renderAccents()
    act(() => {
      mockStore.set('accents', 'calm')
      mockListeners.forEach(fn => fn())
    })
    expect(result.current.accents).toBe('calm')
  })

  it('stops listening on unmount', () => {
    const {unmount} = renderAccents()
    expect(mockListeners.size).toBe(1)
    unmount()
    expect(mockListeners.size).toBe(0)
  })
})
