const mockIsTabletOrDesktop = {value: false}
const mockGtPhone = {value: false}
const mockBottomInset = {value: 0}
const mockHasSession = {value: true}
const mockFooterHeight = {value: 0}

jest.mock('#/env', () => ({IS_WEB: true}))
jest.mock('#/alf', () => ({
  useBreakpoints: () => ({gtPhone: mockGtPhone.value}),
}))
jest.mock('#/lib/hooks/useWebMediaQueries', () => ({
  useWebMediaQueries: () => ({
    isTabletOrDesktop: mockIsTabletOrDesktop.value,
  }),
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: mockBottomInset.value}),
}))
jest.mock('#/state/session', () => ({
  useSession: () => ({hasSession: mockHasSession.value}),
}))
jest.mock('#/state/shell/shell-layout', () => ({
  useShellLayout: () => ({
    footerHeight: {get: () => mockFooterHeight.value},
  }),
}))

import {renderHook} from '@testing-library/react-native'

import {useBottomBarOffset} from './useBottomBarOffset'

function offset(modifier?: number) {
  return renderHook(() =>
    modifier === undefined
      ? useBottomBarOffset()
      : useBottomBarOffset(modifier),
  ).result.current
}

beforeEach(() => {
  mockIsTabletOrDesktop.value = false
  mockGtPhone.value = false
  mockBottomInset.value = 0
  mockHasSession.value = true
  mockFooterHeight.value = 0
})

describe('useBottomBarOffset', () => {
  it('reserves nothing when the bar is not shown', () => {
    mockIsTabletOrDesktop.value = true
    expect(offset()).toBe(0)
    expect(offset(12)).toBe(12)
  })

  it('uses the measured bar height, including web safe area padding', () => {
    mockFooterHeight.value = 94
    expect(offset()).toBe(94)
    expect(offset(12)).toBe(106)
  })

  it('falls back to the bar content height before a layout is measured', () => {
    expect(offset()).toBe(60)
  })

  it('reserves nothing on wider web layouts without a bottom bar', () => {
    mockGtPhone.value = true
    mockIsTabletOrDesktop.value = true
    mockFooterHeight.value = 94
    mockBottomInset.value = 34
    expect(offset()).toBe(0)
  })

  it('ignores native insets on web', () => {
    mockBottomInset.value = 34
    expect(offset()).toBe(60)
  })
})
