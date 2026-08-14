import {Asset} from 'expo-asset'
import {Image} from 'expo-image'
import {act, renderHook} from '@testing-library/react-native'

import {useWelcomeModal} from './useWelcomeModal.ts'

jest.mock('#/env', () => ({IS_WEB: true}))
jest.mock('#/state/session', () => ({
  useSession: jest.fn(() => ({hasSession: false})),
}))
jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({uri: 'asset://welcome-modal-bg'})),
  },
}))
jest.mock('expo-image', () => ({
  Image: {
    prefetch: jest.fn(() => Promise.resolve(true)),
  },
}))

describe('useWelcomeModal', () => {
  const localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
  }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    Object.assign(globalThis, {
      localStorage,
      window: {location: {pathname: '/'}},
    })
    localStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('prefetches the background and opens after the delay', () => {
    const {result} = renderHook(() => useWelcomeModal())

    expect(Asset.fromModule).toHaveBeenCalledTimes(1)
    expect(Image.prefetch).toHaveBeenCalledWith('asset://welcome-modal-bg')
    expect(result.current.isOpen).toBe(false)

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(result.current.isOpen).toBe(true)
  })

  it('does not open after unmounting before the delay', () => {
    const {result, unmount} = renderHook(() => useWelcomeModal())

    unmount()

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(result.current.isOpen).toBe(false)
  })
})
