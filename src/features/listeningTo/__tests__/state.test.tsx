import {type ReactNode} from 'react'
import {act, renderHook} from '@testing-library/react-native'

import {
  DEFAULT_LISTENING_TO_ENABLED,
  Provider,
  useListeningToEnabled,
  useSetListeningToEnabled,
} from '#/features/listeningTo/state'

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

function renderListeningTo() {
  return renderHook(
    () => ({
      enabled: useListeningToEnabled(),
      setEnabled: useSetListeningToEnabled(),
    }),
    {wrapper},
  )
}

beforeEach(() => {
  mockStore.clear()
  mockListeners.clear()
})

describe('listening to setting', () => {
  it('defaults to enabled', () => {
    const {result} = renderListeningTo()
    expect(DEFAULT_LISTENING_TO_ENABLED).toBe(true)
    expect(result.current.enabled).toBe(true)
  })

  it('reads and updates stored value', () => {
    mockStore.set('listeningToEnabled', false)
    const {result} = renderListeningTo()
    expect(result.current.enabled).toBe(false)

    act(() => result.current.setEnabled(true))
    expect(result.current.enabled).toBe(true)
    expect(mockStore.get('listeningToEnabled')).toBe(true)
  })
})
