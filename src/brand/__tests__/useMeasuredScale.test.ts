import {type LayoutChangeEvent} from 'react-native'
import {act, renderHook} from '@testing-library/react-native'

import {useMeasuredScale} from '../useMeasuredScale'

function layout(width: number, height: number) {
  return {
    nativeEvent: {layout: {width, height, x: 0, y: 0}},
  } as LayoutChangeEvent
}

describe('useMeasuredScale', () => {
  it('rests until layout reports a size', () => {
    const {result} = renderHook(() => useMeasuredScale(-3))

    expect(result.current.scaleX).toBe(1)
    expect(result.current.scaleY).toBe(1)
  })

  it('shrinks each axis by the same distance', () => {
    const {result} = renderHook(() => useMeasuredScale(-3))

    act(() => result.current.onLayout(layout(600, 200)))

    expect(600 * result.current.scaleX - 600).toBeCloseTo(-3)
    expect(200 * result.current.scaleY - 200).toBeCloseTo(-3)
  })

  it('moves a narrow element the same distance as a wide one', () => {
    const wide = renderHook(() => useMeasuredScale(-3))
    const narrow = renderHook(() => useMeasuredScale(-3))

    act(() => wide.result.current.onLayout(layout(600, 400)))
    act(() => narrow.result.current.onLayout(layout(120, 400)))

    expect(600 * wide.result.current.scaleX - 600).toBeCloseTo(-3)
    expect(120 * narrow.result.current.scaleX - 120).toBeCloseTo(-3)
  })

  it('grows for a positive delta', () => {
    const {result} = renderHook(() => useMeasuredScale(2))

    act(() => result.current.onLayout(layout(400, 40)))

    expect(result.current.scaleX).toBeGreaterThan(1)
    expect(400 * result.current.scaleX - 400).toBeCloseTo(2)
  })

  it('stops rendering once layout repeats the same size', () => {
    let renders = 0
    const {result} = renderHook(() => {
      renders++
      return useMeasuredScale(-3)
    })

    // React can render once more before it bails out on an unchanged state,
    // so let the repeats settle before the count is read.
    act(() => result.current.onLayout(layout(600, 200)))
    act(() => result.current.onLayout(layout(600, 200)))
    const settled = renders

    act(() => result.current.onLayout(layout(600, 200)))
    act(() => result.current.onLayout(layout(600, 200)))

    expect(renders).toBe(settled)
  })

  it('follows the element when it resizes', () => {
    const {result} = renderHook(() => useMeasuredScale(-3))

    act(() => result.current.onLayout(layout(600, 200)))
    act(() => result.current.onLayout(layout(320, 200)))

    expect(320 * result.current.scaleX - 320).toBeCloseTo(-3)
  })
})
